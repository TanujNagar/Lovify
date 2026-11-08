import { getSetting } from '@/lib/db'
import { fetchJson } from '@/lib/providers/http'
import {
  ProviderError,
  dedupeAlbums,
  dedupeArtists,
  makeAlbumId,
  makeArtistId,
  makeTrackId,
  type MusicProvider,
  type ProviderSearchOptions,
} from '@/lib/providers/types'
import type { Album, Artist, PlaybackSource, SearchResults, Track } from '@/types/music'

const API = 'https://api.jamendo.com/v3.0'
const PROVIDER = 'jamendo' as const
export const JAMENDO_CLIENT_ID_SETTING = 'jamendoClientId'
export const JAMENDO_CLIENT_ID_HELP_URL = 'https://devportal.jamendo.com/'

type JamendoHeaders = {
  status?: string
  code?: number
  error_message?: string
}

type JamendoResponse<T> = {
  headers?: JamendoHeaders
  results?: T[]
}

type JamendoTrackJson = {
  id: string
  name: string
  artist_id: string
  artist_name: string
  album_id: string
  album_name: string
  duration: number
  image?: string
  album_image?: string
  audio?: string
  releasedate?: string
  musicinfo?: { tags?: { genres?: string[] } }
}

type JamendoAlbumJson = {
  id: string
  name: string
  artist_id: string
  artist_name: string
  image?: string
  releasedate?: string
}

type JamendoArtistJson = {
  id: string
  name: string
  image?: string
  website?: string
  joindate?: string
}

let clientIdPromise: Promise<string | undefined> | null = null

function envClientId(): string | undefined {
  const value = import.meta.env.VITE_JAMENDO_CLIENT_ID as string | undefined
  return value?.trim() || undefined
}

/** The free Jamendo client id can come from the build env or from Settings. */
export async function getJamendoClientId(): Promise<string | undefined> {
  const fromEnv = envClientId()
  if (fromEnv) return fromEnv
  if (!clientIdPromise) {
    clientIdPromise = getSetting<string>(JAMENDO_CLIENT_ID_SETTING).then(
      (value) => value?.trim() || undefined,
    )
  }
  return clientIdPromise
}

export function invalidateJamendoClientId(): void {
  clientIdPromise = null
}

function requireClientId(clientId: string | undefined): string {
  if (!clientId) {
    throw new ProviderError(
      'not_configured',
      PROVIDER,
      'Jamendo needs a free client id. Add one in Settings to include Jamendo.',
    )
  }
  return clientId
}

function withClient(
  path: string,
  clientId: string,
  params: Record<string, string | number | undefined> = {},
): URL {
  const url = new URL(`${API}${path}`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

function checkResponse<T>(payload: JamendoResponse<T>): T[] {
  const status = payload.headers?.status
  if (status && status !== 'success') {
    const code = payload.headers?.code
    if (code === 5) {
      throw new ProviderError(
        'not_configured',
        PROVIDER,
        'This Jamendo client id is not authorised. Check it in Settings.',
      )
    }
    if (code === 11) {
      throw new ProviderError(
        'unauthorized',
        PROVIDER,
        'The Jamendo application is suspended. Use Audius or add another client id.',
      )
    }
    throw new ProviderError('network', PROVIDER, 'Jamendo is unavailable right now.')
  }
  return payload.results ?? []
}

function mapTrack(track: JamendoTrackJson): Track {
  return {
    id: makeTrackId(PROVIDER, track.id),
    provider: PROVIDER,
    providerId: track.id,
    title: track.name,
    artist: track.artist_name,
    artistId: makeArtistId(PROVIDER, track.artist_id),
    album: track.album_name || 'Jamendo',
    albumId: makeAlbumId(PROVIDER, track.album_id),
    duration: Math.max(0, Math.round(track.duration || 0)),
    artwork: track.album_image || track.image,
    streamUrl: track.audio,
    genre: track.musicinfo?.tags?.genres?.[0],
    year: Number((track.releasedate ?? '').slice(0, 4)) || undefined,
  }
}

function mapAlbum(album: JamendoAlbumJson, tracks: JamendoTrackJson[] = []): Album {
  return {
    id: makeAlbumId(PROVIDER, album.id),
    provider: PROVIDER,
    providerId: album.id,
    title: album.name,
    artist: album.artist_name,
    artistId: makeArtistId(PROVIDER, album.artist_id),
    year: Number((album.releasedate ?? '').slice(0, 4)) || new Date().getFullYear(),
    kind: tracks.length > 0 ? 'Album' : 'Album',
    trackIds: tracks.map((track) => makeTrackId(PROVIDER, track.id)),
    artwork: album.image,
  }
}

function mapArtist(artist: JamendoArtistJson): Artist {
  return {
    id: makeArtistId(PROVIDER, artist.id),
    provider: PROVIDER,
    providerId: artist.id,
    name: artist.name,
    artwork: artist.image,
  }
}

async function requestTracks(
  clientId: string,
  options?: ProviderSearchOptions,
  params: Record<string, string | number | undefined> = {},
): Promise<Track[]> {
  const payload = await fetchJson<JamendoResponse<JamendoTrackJson>>(
    withClient('/tracks/', clientId, {
      limit: options?.limit ?? 24,
      audioformat: 'mp32',
      include: 'musicinfo',
      imagesize: 300,
      ...params,
    }),
    { provider: PROVIDER, signal: options?.signal },
  )
  return checkResponse(payload).map(mapTrack)
}

export const jamendoProvider: MusicProvider = {
  id: PROVIDER,
  label: 'Jamendo',

  async isConfigured() {
    return Boolean(await getJamendoClientId())
  },

  async search(query: string, options?: ProviderSearchOptions): Promise<SearchResults> {
    const clientId = requireClientId(await getJamendoClientId())
    const payload = await fetchJson<JamendoResponse<JamendoTrackJson>>(
      withClient('/tracks/', clientId, {
        limit: options?.limit ?? 24,
        search: query,
        audioformat: 'mp32',
        include: 'musicinfo',
        imagesize: 300,
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    const raw = checkResponse(payload)
    const tracks = raw.map(mapTrack)

    const albumMap = new Map<string, { album: JamendoAlbumJson; tracks: JamendoTrackJson[] }>()
    for (const track of raw) {
      const key = track.album_id || `${track.id}-single`
      const entry = albumMap.get(key)
      if (entry) {
        entry.tracks.push(track)
      } else {
        albumMap.set(key, {
          album: {
            id: track.album_id || track.id,
            name: track.album_name || track.name,
            artist_id: track.artist_id,
            artist_name: track.artist_name,
            image: track.album_image || track.image,
            releasedate: track.releasedate,
          },
          tracks: [track],
        })
      }
    }

    const artistMap = new Map<string, JamendoArtistJson>()
    for (const track of raw) {
      if (!artistMap.has(track.artist_id)) {
        artistMap.set(track.artist_id, {
          id: track.artist_id,
          name: track.artist_name,
          image: track.image,
        })
      }
    }

    return {
      tracks,
      artists: dedupeArtists(Array.from(artistMap.values()).map(mapArtist)).slice(0, 8),
      albums: dedupeAlbums(
        Array.from(albumMap.values()).map(({ album, tracks: albumTracks }) =>
          mapAlbum(album, albumTracks),
        ),
      ).slice(0, 8),
    }
  },

  async getTrack(id: string) {
    const clientId = await getJamendoClientId()
    if (!clientId) return null
    const nativeId = id.startsWith(`${PROVIDER}:`) ? id.slice(PROVIDER.length + 1) : id
    const payload = await fetchJson<JamendoResponse<JamendoTrackJson>>(
      withClient('/tracks/', clientId, {
        id: nativeId,
        limit: 1,
        audioformat: 'mp32',
        include: 'musicinfo',
        imagesize: 300,
      }),
      { provider: PROVIDER },
    )
    const track = checkResponse(payload)[0]
    return track ? mapTrack(track) : null
  },

  async getArtist(id: string) {
    const clientId = await getJamendoClientId()
    if (!clientId) return null
    const nativeId = id.replace(`${PROVIDER}:artist:`, '')
    const payload = await fetchJson<JamendoResponse<JamendoArtistJson>>(
      withClient('/artists/', clientId, { id: nativeId, limit: 1, imagesize: 300 }),
      { provider: PROVIDER },
    )
    const artist = checkResponse(payload)[0]
    return artist ? mapArtist(artist) : null
  },

  async getArtistTracks(id: string, options?: ProviderSearchOptions) {
    const clientId = await getJamendoClientId()
    if (!clientId) return []
    const nativeId = id.replace(`${PROVIDER}:artist:`, '')
    const payload = await fetchJson<JamendoResponse<JamendoTrackJson>>(
      withClient('/artists/tracks/', clientId, {
        id: nativeId,
        limit: options?.limit ?? 50,
        audioformat: 'mp32',
        include: 'musicinfo',
        imagesize: 300,
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    return checkResponse(payload).map(mapTrack)
  },

  async getAlbum(id: string) {
    const clientId = await getJamendoClientId()
    if (!clientId) return null
    const nativeId = id.replace(`${PROVIDER}:album:`, '')

    const tracksPayload = await fetchJson<JamendoResponse<JamendoTrackJson>>(
      withClient('/albums/tracks/', clientId, {
        id: nativeId,
        limit: 100,
        audioformat: 'mp32',
        include: 'musicinfo',
        imagesize: 300,
      }),
      { provider: PROVIDER },
    )
    const tracks = checkResponse(tracksPayload)
    if (tracks.length) {
      const first = tracks[0]
      return mapAlbum(
        {
          id: nativeId,
          name: first.album_name,
          artist_id: first.artist_id,
          artist_name: first.artist_name,
          image: first.album_image || first.image,
          releasedate: first.releasedate,
        },
        tracks,
      )
    }

    const albumPayload = await fetchJson<JamendoResponse<JamendoAlbumJson>>(
      withClient('/albums/', clientId, { id: nativeId, limit: 1, imagesize: 300 }),
      { provider: PROVIDER },
    )
    const album = checkResponse(albumPayload)[0]
    return album ? mapAlbum(album) : null
  },

  async getPlayback(track: Track): Promise<PlaybackSource> {
    if (!track.streamUrl) {
      throw new ProviderError(
        'unavailable',
        PROVIDER,
        'This Jamendo track has no free audio stream.',
      )
    }
    return { kind: 'audio', url: track.streamUrl }
  },

  async getAlbumTracks(id: string, options?: ProviderSearchOptions) {
    const clientId = await getJamendoClientId()
    if (!clientId) return []
    const nativeId = id.replace(`${PROVIDER}:album:`, '')
    const payload = await fetchJson<JamendoResponse<JamendoTrackJson>>(
      withClient('/albums/tracks/', clientId, {
        id: nativeId,
        limit: options?.limit ?? 100,
        audioformat: 'mp32',
        include: 'musicinfo',
        imagesize: 300,
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    return checkResponse(payload).map(mapTrack)
  },

  async trending(options?: ProviderSearchOptions) {
    const clientId = await getJamendoClientId()
    if (!clientId) return []
    return requestTracks(clientId, options, { order: 'popularity_month' })
  },

  async featuredAlbums(options?: ProviderSearchOptions) {
    const clientId = await getJamendoClientId()
    if (!clientId) return []
    const payload = await fetchJson<JamendoResponse<JamendoAlbumJson>>(
      withClient('/albums/', clientId, {
        limit: options?.limit ?? 10,
        order: 'popularity_month',
        imagesize: 300,
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    return checkResponse(payload).map((album) => mapAlbum(album))
  },
}
