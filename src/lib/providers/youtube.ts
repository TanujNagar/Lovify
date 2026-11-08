import {
  YOUTUBE_DETAIL_COST,
  YOUTUBE_SEARCH_COST,
  addYouTubeUsage,
  blockYouTubeForToday,
  isYouTubeBlocked,
} from '@/lib/cache'
import { getTracksByArtist } from '@/lib/db'
import {
  ProviderError,
  dedupeArtists,
  dedupeTracks,
  makeAlbumId,
  makeTrackId,
  makeUserArtistId,
  parseIsoDuration,
  type MusicProvider,
  type ProviderSearchOptions,
} from '@/lib/providers/types'
import type { Artist, PlaybackSource, SearchResults, Track } from '@/types/music'
import { getYouTubeKey } from '@/lib/youtube'

const API = 'https://www.googleapis.com/youtube/v3'
const PROVIDER = 'youtube' as const

type YouTubeThumbnails = {
  default?: { url?: string }
  medium?: { url?: string }
  high?: { url?: string }
  maxres?: { url?: string }
}

type YouTubeSnippet = {
  title?: string
  channelTitle?: string
  channelId?: string
  publishedAt?: string
  thumbnails?: YouTubeThumbnails
}

type YouTubeSearchItem = {
  id?: { videoId?: string }
  snippet?: YouTubeSnippet
}

type YouTubeVideoItem = {
  id?: string
  snippet?: YouTubeSnippet
  contentDetails?: { duration?: string }
}

export type YouTubeSearchPayload = {
  items?: YouTubeSearchItem[]
  details?: YouTubeVideoItem[]
}

type YouTubeErrorPayload = {
  error?: {
    code?: number
    message?: string
    errors?: Array<{ reason?: string }>
  }
}

export type YouTubeSourceStatus = {
  available: boolean
  mode: 'user' | 'shared' | 'none'
  blocked: boolean
}

let probePromise: Promise<YouTubeSourceStatus> | null = null

function thumb(snippet: YouTubeSnippet | undefined): string | undefined {
  return (
    snippet?.thumbnails?.high?.url ??
    snippet?.thumbnails?.medium?.url ??
    snippet?.thumbnails?.default?.url
  )
}

async function requestJson<T>(
  url: URL,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; payload: T | null }> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    const payload = (await response.json().catch(() => null)) as T | null
    return { ok: response.ok, status: response.status, payload }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const aborted = Boolean(signal?.aborted)
      throw new ProviderError(
        aborted ? 'aborted' : 'network',
        PROVIDER,
        aborted ? 'Search was cancelled.' : 'YouTube did not answer in time.',
      )
    }
    throw new ProviderError('network', PROVIDER, 'Could not reach YouTube.')
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

function quotaOrAuthError(status: number, payload: YouTubeErrorPayload | null): ProviderError {
  const reason = payload?.error?.errors?.[0]?.reason
  if (
    status === 403 ||
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    reason === 'rateLimitExceeded'
  ) {
    void blockYouTubeForToday().then(() => resetYouTubeProbe())
    return new ProviderError(
      'quota',
      PROVIDER,
      'YouTube quota is used up for today. Lovify switched to free sources.',
    )
  }
  return new ProviderError(
    'unauthorized',
    PROVIDER,
    'YouTube rejected this key. Check it in Settings or use free sources.',
  )
}

/**
 * Checks whether YouTube is usable without spending quota.
 * A user key wins; otherwise we ask the tiny status route. No key ever leaves
 * the browser when a user key exists.
 */
export async function probeYouTubeStatus(force = false): Promise<YouTubeSourceStatus> {
  if (probePromise && !force) return probePromise

  probePromise = (async () => {
    const blocked = await isYouTubeBlocked()
    const userKey = await getYouTubeKey()
    if (userKey) {
      return { available: !blocked, mode: 'user' as const, blocked }
    }

    try {
      const response = await fetch('/api/youtube/status', { cache: 'no-store' })
      if (response.ok) {
        const data = (await response.json()) as { configured?: boolean }
        if (data.configured) {
          return { available: !blocked, mode: 'shared' as const, blocked }
        }
      }
    } catch {
      // Static hosting without the server route: free sources only.
    }

    return { available: false, mode: 'none' as const, blocked }
  })()

  return probePromise
}

export function resetYouTubeProbe(): void {
  probePromise = null
}

function mapVideoToTrack(item: YouTubeVideoItem): Track | null {
  const videoId = item.id
  if (!videoId || !item.snippet) return null
  const snippet = item.snippet

  return {
    id: makeTrackId(PROVIDER, videoId),
    provider: PROVIDER,
    providerId: videoId,
    title: snippet.title || 'YouTube video',
    artist: snippet.channelTitle || 'YouTube',
    artistId: makeUserArtistId(PROVIDER, snippet.channelId || snippet.channelTitle || 'unknown'),
    album: 'YouTube',
    albumId: makeAlbumId(PROVIDER, videoId),
    duration: parseIsoDuration(item.contentDetails?.duration),
    artwork: thumb(snippet),
    year: Number((snippet.publishedAt ?? '').slice(0, 4)) || undefined,
  }
}

function mapSearchPayload(payload: YouTubeSearchPayload): SearchResults {
  const detailMap = new Map<string, YouTubeVideoItem>()
  for (const detail of payload.details ?? []) {
    if (detail.id) detailMap.set(detail.id, detail)
  }

  const tracks: Track[] = []
  const artists = new Map<string, Artist>()

  for (const item of payload.items ?? []) {
    const videoId = item.id?.videoId
    if (!videoId || !item.snippet) continue
    const detail = detailMap.get(videoId)
    const track = mapVideoToTrack({
      id: videoId,
      snippet: item.snippet,
      contentDetails: detail?.contentDetails,
    })
    if (!track) continue
    tracks.push(track)

    const channelId = item.snippet.channelId
    if (channelId && !artists.has(channelId)) {
      artists.set(channelId, {
        id: makeUserArtistId(PROVIDER, channelId),
        provider: PROVIDER,
        providerId: channelId,
        name: item.snippet.channelTitle || 'YouTube channel',
        verified: false,
      })
    }
  }

  return {
    tracks: dedupeTracks(tracks),
    artists: dedupeArtists(Array.from(artists.values())).slice(0, 8),
    albums: [],
  }
}

async function directSearch(
  query: string,
  key: string,
  signal?: AbortSignal,
): Promise<YouTubeSearchPayload> {
  const searchUrl = new URL(`${API}/search`)
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '20')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('key', key)

  const search = await requestJson<YouTubeSearchPayload & YouTubeErrorPayload>(searchUrl, signal)
  if (!search.ok || !search.payload) {
    throw quotaOrAuthError(search.status, search.payload)
  }

  const ids = (search.payload.items ?? [])
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))

  if (!ids.length) return { items: [], details: [] }

  const detailUrl = new URL(`${API}/videos`)
  detailUrl.searchParams.set('part', 'snippet,contentDetails')
  detailUrl.searchParams.set('id', ids.join(','))
  detailUrl.searchParams.set('key', key)

  let details: YouTubeVideoItem[] = []
  try {
    const detailResponse = await requestJson<{ items?: YouTubeVideoItem[] } & YouTubeErrorPayload>(
      detailUrl,
      signal,
    )
    if (detailResponse.ok) details = detailResponse.payload?.items ?? []
  } catch {
    // Search results are still useful without exact durations.
  }

  return { items: search.payload.items ?? [], details }
}

async function serverSearch(
  query: string,
  signal?: AbortSignal,
): Promise<YouTubeSearchPayload> {
  const url = new URL('/api/youtube/search', window.location.origin)
  url.searchParams.set('q', query)

  const response = await requestJson<YouTubeSearchPayload & { error?: string } & YouTubeErrorPayload>(
    url,
    signal,
  )

  if (!response.ok || !response.payload) {
    if (response.status === 403) throw quotaOrAuthError(response.status, response.payload)
    if (response.status === 503) {
      probePromise = null
      throw new ProviderError(
        'not_configured',
        PROVIDER,
        'The shared YouTube key is not configured. Lovify is using free sources.',
      )
    }
    throw new ProviderError('network', PROVIDER, 'YouTube is unavailable right now.')
  }

  return response.payload
}

export const youtubeProvider: MusicProvider = {
  id: PROVIDER,
  label: 'YouTube',

  async isConfigured() {
    const status = await probeYouTubeStatus()
    return status.available
  },

  async search(query: string, options?: ProviderSearchOptions): Promise<SearchResults> {
    const status = await probeYouTubeStatus()
    if (!status.available) {
      throw new ProviderError(
        status.blocked ? 'quota' : 'not_configured',
        PROVIDER,
        status.blocked
          ? 'YouTube quota is used up for today. Lovify switched to free sources.'
          : 'YouTube is not connected. Lovify is using free sources.',
      )
    }

    const key = await getYouTubeKey()
    const payload = key
      ? await directSearch(query, key, options?.signal)
      : await serverSearch(query, options?.signal)

    await addYouTubeUsage(YOUTUBE_SEARCH_COST + YOUTUBE_DETAIL_COST)
    return mapSearchPayload(payload)
  },

  async getTrack(id: string) {
    const nativeId = id.startsWith(`${PROVIDER}:`) ? id.slice(PROVIDER.length + 1) : id
    if (!nativeId || nativeId.includes(':')) return null

    const status = await probeYouTubeStatus()
    if (!status.available) return null

    const key = await getYouTubeKey()
    if (key) {
      const url = new URL(`${API}/videos`)
      url.searchParams.set('part', 'snippet,contentDetails')
      url.searchParams.set('id', nativeId)
      url.searchParams.set('key', key)
      const response = await requestJson<{ items?: YouTubeVideoItem[] } & YouTubeErrorPayload>(url)
      if (!response.ok || !response.payload) throw quotaOrAuthError(response.status, response.payload)
      const item = response.payload.items?.[0]
      if (!item) return null
      await addYouTubeUsage(YOUTUBE_DETAIL_COST)
      return mapVideoToTrack(item)
    }

    const url = new URL('/api/youtube/video', window.location.origin)
    url.searchParams.set('id', nativeId)
    const response = await requestJson<{ item?: YouTubeVideoItem } & YouTubeErrorPayload>(url)
    if (!response.ok || !response.payload) {
      if (response.status === 403) throw quotaOrAuthError(response.status, response.payload)
      return null
    }
    return response.payload.item ? mapVideoToTrack(response.payload.item) : null
  },

  async getArtist(id: string) {
    const tracks = await getTracksByArtist(id)
    const first = tracks[0]
    if (!first) return null
    return {
      id,
      provider: PROVIDER,
      providerId: first.artist,
      name: first.artist,
      bio: 'Channel results cached from your searches.',
    }
  },

  async getArtistTracks(id: string, options?: ProviderSearchOptions) {
    const tracks = await getTracksByArtist(id)
    return tracks.slice(0, options?.limit ?? 50)
  },

  async getAlbum(id: string) {
    const nativeId = id.replace(`${PROVIDER}:album:`, '')
    const track = await youtubeProvider.getTrack(nativeId)
    if (!track) return null
    return {
      id,
      provider: PROVIDER,
      providerId: nativeId,
      title: track.title,
      artist: track.artist,
      artistId: track.artistId,
      year: track.year ?? new Date().getFullYear(),
      kind: 'Single',
      trackIds: [track.id],
      artwork: track.artwork,
    }
  },

  async getPlayback(track: Track): Promise<PlaybackSource> {
    return { kind: 'youtube', videoId: track.providerId }
  },

  async getAlbumTracks(id: string) {
    const album = await youtubeProvider.getAlbum(id)
    if (!album) return []
    const track = await youtubeProvider.getTrack(album.providerId)
    return track ? [track] : []
  },
}
