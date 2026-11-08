import {
  getYouTubeUsage,
  readSearchCache,
  writeSearchCache,
} from '@/lib/cache'
import {
  cacheTracks,
  getLikedTrackIds,
  getPlaylistById,
  getTrackById,
  getTracksByAlbum,
  getTracksByArtist,
  getTracksByIds,
} from '@/lib/db'
import { audiusProvider } from '@/lib/providers/audius'
import { jamendoProvider } from '@/lib/providers/jamendo'
import {
  ProviderError,
  dedupeAlbums,
  dedupeArtists,
  dedupeTracks,
  type MusicProvider,
  type ProviderSearchOptions,
} from '@/lib/providers/types'
import {
  probeYouTubeStatus,
  youtubeProvider,
  type YouTubeSourceStatus,
} from '@/lib/providers/youtube'
import { usePlayerStore } from '@/stores/player'
import type {
  Album,
  Artist,
  CollectionItem,
  PlaybackSource,
  ProviderId,
  SearchResults,
  Track,
} from '@/types/music'

const providers: Record<ProviderId, MusicProvider> = {
  youtube: youtubeProvider,
  audius: audiusProvider,
  jamendo: jamendoProvider,
}

const searchOrder: MusicProvider[] = [youtubeProvider, audiusProvider, jamendoProvider]

export type SearchOutcome = {
  query: string
  results: SearchResults
  cachedProviders: ProviderId[]
  usedProviders: ProviderId[]
  youtube: 'user' | 'shared' | 'cached' | 'unavailable' | 'quota' | 'error'
  errors: Array<{ provider: ProviderId; code: string; message: string }>
}

const emptyResults = (): SearchResults => ({ tracks: [], artists: [], albums: [] })

export function getProvider(id: ProviderId): MusicProvider {
  return providers[id]
}

export function providerFromId(id: string): ProviderId | null {
  const [provider] = id.split(':')
  if (provider === 'youtube' || provider === 'audius' || provider === 'jamendo') {
    return provider
  }
  return null
}

function interleave<T>(groups: T[][]): T[] {
  const result: T[] = []
  const longest = Math.max(0, ...groups.map((group) => group.length))
  for (let index = 0; index < longest; index += 1) {
    for (const group of groups) {
      if (group[index] !== undefined) result.push(group[index])
    }
  }
  return result
}

function mergeResults(groups: SearchResults[]): SearchResults {
  return {
    tracks: dedupeTracks(interleave(groups.map((group) => group.tracks))).slice(0, 30),
    artists: dedupeArtists(interleave(groups.map((group) => group.artists))).slice(0, 12),
    albums: dedupeAlbums(interleave(groups.map((group) => group.albums))).slice(0, 12),
  }
}

/**
 * Searches every configured source and merges the result. Each provider's
 * response is cached for 24 hours before the network is touched, so repeating
 * a search costs no quota at all.
 */
export async function searchMusic(
  query: string,
  options: ProviderSearchOptions = {},
): Promise<SearchOutcome> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return {
      query: trimmed,
      results: emptyResults(),
      cachedProviders: [],
      usedProviders: [],
      youtube: 'unavailable',
      errors: [],
    }
  }

  const cached = new Map<ProviderId, SearchResults>()
  const order = options.skipYouTube
    ? searchOrder.filter((provider) => provider.id !== 'youtube')
    : searchOrder

  await Promise.all(
    order.map(async (provider) => {
      const results = await readSearchCache(provider.id, trimmed)
      if (results) cached.set(provider.id, results)
    }),
  )

  const misses = order.filter((provider) => !cached.has(provider.id))
  const configured = await Promise.all(
    misses.map(async (provider) => ({
      provider,
      ready: await provider.isConfigured().catch(() => false),
    })),
  )
  const toRun = configured.filter((entry) => entry.ready).map((entry) => entry.provider)

  const usedProviders: ProviderId[] = []
  const errors: SearchOutcome['errors'] = []
  const fresh = new Map<ProviderId, SearchResults>()

  const settled = await Promise.allSettled(
    toRun.map(async (provider) => {
      try {
        const results = await provider.search(trimmed, options)
        await writeSearchCache(provider.id, trimmed, results)
        fresh.set(provider.id, results)
        usedProviders.push(provider.id)
        return results
      } catch (error) {
        if (error instanceof ProviderError) {
          if (error.code === 'aborted') throw error
          errors.push({ provider: provider.id, code: error.code, message: error.message })
        } else {
          errors.push({
            provider: provider.id,
            code: 'unknown',
            message: 'This music source did not answer.',
          })
        }
        throw error
      }
    }),
  )

  if (options.signal?.aborted) {
    throw new ProviderError('aborted', 'audius', 'Search was cancelled.')
  }
  for (const entry of settled) {
    if (
      entry.status === 'rejected' &&
      entry.reason instanceof ProviderError &&
      entry.reason.code === 'aborted'
    ) {
      throw entry.reason
    }
  }

  const groups: SearchResults[] = []
  for (const provider of order) {
    const results = cached.get(provider.id) ?? fresh.get(provider.id)
    if (results) groups.push(results)
  }

  const results = mergeResults(groups)

  if (
    !results.tracks.length &&
    !results.artists.length &&
    !results.albums.length &&
    !cached.size
  ) {
    const meaningful = errors.find(
      (error) => error.code !== 'not_configured' && error.code !== 'quota',
    )
    if (meaningful) {
      throw new ProviderError(
        'unavailable',
        meaningful.provider,
        'Free music sources are unreachable right now. Check your connection and try again.',
      )
    }
    throw new ProviderError(
      'unavailable',
      'audius',
      'No free source answered. Add a YouTube or Jamendo key in Settings, or try again.',
    )
  }

  await cacheTracks(results.tracks)

  const status = await probeYouTubeStatus().catch((): YouTubeSourceStatus | null => null)
  let youtube: SearchOutcome['youtube'] = 'unavailable'
  if (cached.has('youtube')) youtube = 'cached'
  else if (status?.blocked) youtube = 'quota'
  else if (usedProviders.includes('youtube')) {
    youtube = status?.mode === 'user' ? 'user' : 'shared'
  } else if (errors.some((error) => error.provider === 'youtube' && error.code === 'quota')) {
    youtube = 'quota'
  } else if (status?.available) {
    youtube = 'error'
  }

  return {
    query: trimmed,
    results,
    cachedProviders: Array.from(cached.keys()),
    usedProviders,
    youtube,
    errors,
  }
}

export async function searchFreeTracks(query: string, limit = 20): Promise<Track[]> {
  const outcome = await searchMusic(query, { skipYouTube: true, limit })
  return outcome.results.tracks.slice(0, limit)
}

async function configuredProviders(): Promise<MusicProvider[]> {
  const entries = await Promise.all(
    [audiusProvider, jamendoProvider, youtubeProvider].map(async (provider) => ({
      provider,
      ready: await provider.isConfigured().catch(() => false),
    })),
  )
  return entries.filter((entry) => entry.ready).map((entry) => entry.provider)
}

export async function getTrendingTracks(limit = 24): Promise<Track[]> {
  const ready = await configuredProviders()
  const settled = await Promise.allSettled(
    ready
      .filter((provider) => typeof provider.trending === 'function')
      .map(async (provider) => {
        const tracks = (await provider.trending?.({ limit })) ?? []
        return { provider: provider.id, tracks }
      }),
  )

  const groups = settled
    .filter(
      (entry): entry is PromiseFulfilledResult<{ provider: ProviderId; tracks: Track[] }> =>
        entry.status === 'fulfilled' && entry.value.tracks.length > 0,
    )
    .map((entry) => entry.value.tracks)

  if (!groups.length) {
    throw new ProviderError(
      'unavailable',
      'audius',
      'Could not load free music right now. Check your connection and try again.',
    )
  }

  const tracks = dedupeTracks(interleave(groups)).slice(0, limit)
  await cacheTracks(tracks)
  return tracks
}

export async function getFeaturedAlbums(limit = 10): Promise<Album[]> {
  const ready = await configuredProviders()
  const settled = await Promise.allSettled(
    ready
      .filter((provider) => typeof provider.featuredAlbums === 'function')
      .map(async (provider) => {
        const albums = (await provider.featuredAlbums?.({ limit })) ?? []
        return albums
      }),
  )

  const groups = settled
    .filter(
      (entry): entry is PromiseFulfilledResult<Album[]> =>
        entry.status === 'fulfilled' && entry.value.length > 0,
    )
    .map((entry) => entry.value)

  return dedupeAlbums(interleave(groups)).slice(0, limit)
}

export async function getProviderTrack(id: string): Promise<Track | null> {
  const cached = await getTrackById(id)
  if (cached) return cached
  const providerId = providerFromId(id)
  if (!providerId) return null
  const track = await getProvider(providerId).getTrack(id)
  if (track) await cacheTracks([track])
  return track
}

function albumFromTracks(id: string, tracks: Track[]): Album {
  const first = tracks[0]
  return {
    id,
    provider: first.provider,
    providerId: first.providerId,
    title: first.album,
    artist: first.artist,
    artistId: first.artistId,
    year: first.year ?? new Date().getFullYear(),
    kind: 'Album',
    trackIds: tracks.map((track) => track.id),
    artwork: first.artwork,
  }
}

export async function getProviderAlbum(id: string): Promise<Album | null> {
  const cachedTracks = await getTracksByAlbum(id)
  if (cachedTracks.length) return albumFromTracks(id, cachedTracks)

  const providerId = providerFromId(id)
  if (!providerId) return null
  const provider = getProvider(providerId)
  const album = await provider.getAlbum(id)
  if (!album) return null

  const tracks = await provider.getAlbumTracks(id).catch(() => [])
  if (tracks.length) {
    await cacheTracks(tracks)
    return { ...album, trackIds: tracks.map((track) => track.id) }
  }
  return album
}

export async function getProviderArtist(id: string): Promise<Artist | null> {
  const cachedTracks = await getTracksByArtist(id)
  const first = cachedTracks[0]
  if (first) {
    return {
      id,
      provider: first.provider,
      providerId: id,
      name: first.artist,
      artwork: first.artwork,
    }
  }

  const providerId = providerFromId(id)
  if (!providerId) return null
  return getProvider(providerId).getArtist(id)
}

export async function getArtistTracks(id: string, limit = 50): Promise<Track[]> {
  const cachedTracks = await getTracksByArtist(id)
  if (cachedTracks.length) return cachedTracks.slice(0, limit)

  const providerId = providerFromId(id)
  if (!providerId) return []
  const tracks = await getProvider(providerId).getArtistTracks(id, { limit })
  if (tracks.length) await cacheTracks(tracks)
  return tracks
}

export async function resolveCollectionTracks(item: CollectionItem): Promise<Track[]> {
  if (item.kind === 'track') {
    const track = await getProviderTrack(item.id)
    return track ? [track] : []
  }

  if (item.kind === 'playlist') {
    const playlist = await getPlaylistById(item.id)
    const ids =
      playlist?.system === 'liked'
        ? await getLikedTrackIds()
        : playlist?.trackIds ?? item.trackIds ?? []
    return getTracksByIds(ids)
  }

  if (item.kind === 'album') {
    const album = await getProviderAlbum(item.id)
    if (!album) return []
    const tracks = await getTracksByIds(album.trackIds)
    return tracks
  }

  return getArtistTracks(item.id)
}

/** Resolves a card's tracks and starts playback. Returns how many tracks played. */
export async function playCollection(item: CollectionItem): Promise<number> {
  const tracks = await resolveCollectionTracks(item)
  if (!tracks.length) return 0
  usePlayerStore.getState().playQueue(tracks, 0, {
    type: item.kind,
    label: item.title,
    id: item.id,
  })
  return tracks.length
}

export async function getPlaybackSource(track: Track): Promise<PlaybackSource> {
  const provider = getProvider(track.provider)
  return provider.getPlayback(track)
}

export async function getSourceSnapshot(): Promise<{
  youtube: YouTubeSourceStatus
  jamendo: boolean
  usage: Awaited<ReturnType<typeof getYouTubeUsage>>
}> {
  const [youtube, jamendo, usage] = await Promise.all([
    probeYouTubeStatus(),
    jamendoProvider.isConfigured().catch(() => false),
    getYouTubeUsage(),
  ])
  return { youtube, jamendo, usage }
}
