import { fetchJson } from '@/lib/providers/http'
import {
  ProviderError,
  dedupeAlbums,
  dedupeArtists,
  makeAlbumId,
  makeTrackId,
  makeUserArtistId,
  type MusicProvider,
  type ProviderSearchOptions,
} from '@/lib/providers/types'
import type { Album, Artist, PlaybackSource, SearchResults, Track } from '@/types/music'

const API = 'https://api.audius.co/v1'
const APP_NAME = 'LOVIFY'
const PROVIDER = 'audius' as const

type AudiusImages = Record<string, string | string[] | undefined>

type AudiusUser = {
  id?: string
  name?: string
  handle?: string
  bio?: string | null
  is_verified?: boolean
  profile_picture?: AudiusImages | null
}

type AudiusTrackJson = {
  id: string
  title: string
  duration: number
  genre?: string | null
  mood?: string | null
  is_available?: boolean
  is_delete?: boolean
  is_streamable?: boolean
  is_stream_gated?: boolean
  release_date?: string | null
  created_at?: string | null
  user?: AudiusUser | null
  artwork?: AudiusImages | null
  cover_art?: string | null
  album_backlink?: { playlist_id?: number; playlist_name?: string } | null
}

type AudiusPlaylistJson = {
  id: string
  playlist_name: string
  is_album?: boolean
  is_delete?: boolean
  is_private?: boolean
  track_count?: number
  description?: string | null
  created_at?: string | null
  release_date?: string | null
  user?: AudiusUser | null
  artwork?: AudiusImages | null
  tracks?: AudiusTrackJson[]
  access?: { stream?: boolean } | null
}

type AudiusList<T> = { data?: T[] }

type AudiusSingle<T> = { data?: T[] | T }

function withApp(path: string, params: Record<string, string | number | undefined> = {}): URL {
  const url = new URL(`${API}${path}`)
  url.searchParams.set('app_name', APP_NAME)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

function pickImage(images: AudiusImages | null | undefined): string | undefined {
  if (!images) return undefined
  for (const size of ['480x480', '150x150', '1000x1000']) {
    const value = images[size]
    if (typeof value === 'string') return value
  }
  for (const value of Object.values(images)) {
    if (typeof value === 'string' && /^https?:\/\//.test(value)) return value
  }
  return undefined
}

function artistFromUser(user: AudiusUser | null | undefined): Artist {
  const id = user?.id ?? 'unknown'
  return {
    id: makeUserArtistId(PROVIDER, id),
    provider: PROVIDER,
    providerId: id,
    name: user?.name || user?.handle || 'Audius artist',
    bio: user?.bio ?? undefined,
    verified: user?.is_verified,
    artwork: pickImage(user?.profile_picture),
  }
}

function isPlayable(track: AudiusTrackJson): boolean {
  return (
    track.is_available !== false &&
    track.is_delete !== true &&
    track.is_streamable !== false &&
    track.is_stream_gated !== true
  )
}

function mapTrack(track: AudiusTrackJson): Track {
  const artist = artistFromUser(track.user)
  const albumNativeId = track.album_backlink?.playlist_id
  const albumId =
    typeof albumNativeId === 'number' && albumNativeId > 0
      ? makeAlbumId(PROVIDER, String(albumNativeId))
      : `${PROVIDER}:track:${track.id}`

  return {
    id: makeTrackId(PROVIDER, track.id),
    provider: PROVIDER,
    providerId: track.id,
    title: track.title,
    artist: artist.name,
    artistId: artist.id,
    album:
      track.album_backlink?.playlist_name ||
      (track.genre ? `${track.genre} on Audius` : 'Audius'),
    albumId,
    duration: Math.max(0, Math.round(track.duration || 0)),
    artwork: pickImage(track.artwork) ?? pickImage(track.user?.profile_picture),
    streamUrl: `${API}/tracks/${track.id}/stream?app_name=${APP_NAME}`,
    genre: track.genre ?? track.mood ?? undefined,
    year: Number((track.release_date ?? track.created_at ?? '').slice(0, 4)) || undefined,
  }
}

function mapPlaylist(playlist: AudiusPlaylistJson): Album {
  const tracks = (playlist.tracks ?? []).filter(isPlayable).map(mapTrack)
  const artist = artistFromUser(playlist.user)
  return {
    id: makeAlbumId(PROVIDER, playlist.id),
    provider: PROVIDER,
    providerId: playlist.id,
    title: playlist.playlist_name,
    artist: artist.name,
    artistId: artist.id,
    year: Number((playlist.release_date ?? playlist.created_at ?? '').slice(0, 4)) || new Date().getFullYear(),
    kind: playlist.is_album ? 'Album' : 'Playlist',
    trackIds: tracks.map((track) => track.id),
    artwork: pickImage(playlist.artwork) ?? artist.artwork,
    description: playlist.description ?? undefined,
  }
}

function unwrapSingle<T>(payload: AudiusSingle<T>): T | null {
  if (Array.isArray(payload.data)) return payload.data[0] ?? null
  return payload.data ?? null
}

async function searchTracks(
  query: string,
  options?: ProviderSearchOptions,
): Promise<AudiusTrackJson[]> {
  const payload = await fetchJson<AudiusList<AudiusTrackJson>>(
    withApp('/tracks/search', {
      query,
      limit: options?.limit ?? 24,
    }),
    { provider: PROVIDER, signal: options?.signal },
  )
  return (payload.data ?? []).filter(isPlayable)
}

export const audiusProvider: MusicProvider = {
  id: PROVIDER,
  label: 'Audius',

  async isConfigured() {
    return true
  },

  async search(query: string, options?: ProviderSearchOptions): Promise<SearchResults> {
    const limit = options?.limit ?? 24
    const settled = await Promise.allSettled([
      searchTracks(query, options),
      fetchJson<AudiusList<AudiusUser>>(
        withApp('/users/search', { query, limit: 6 }),
        { provider: PROVIDER, signal: options?.signal },
      ),
      fetchJson<AudiusList<AudiusPlaylistJson>>(
        withApp('/playlists/search', { query, limit: 6 }),
        { provider: PROVIDER, signal: options?.signal },
      ),
    ])

    const tracksResult = settled[0]
    if (tracksResult.status === 'rejected') {
      const reason = tracksResult.reason
      if (reason instanceof ProviderError) throw reason
      throw new ProviderError('network', PROVIDER, 'Audius is unavailable right now.')
    }

    const tracks = tracksResult.value.filter(isPlayable).map(mapTrack).slice(0, limit)
    const users = settled[1].status === 'fulfilled' ? settled[1].value.data ?? [] : []
    const playlists = settled[2].status === 'fulfilled' ? settled[2].value.data ?? [] : []

    return {
      tracks,
      artists: dedupeArtists(users.map(artistFromUser)).slice(0, 8),
      albums: dedupeAlbums(
        playlists
          .filter((playlist) => playlist.is_delete !== true && playlist.is_private !== true)
          .map(mapPlaylist),
      ).slice(0, 8),
    }
  },

  async getTrack(id: string) {
    const nativeId = id.startsWith(`${PROVIDER}:`) ? id.slice(PROVIDER.length + 1) : id
    if (nativeId.includes(':')) return null
    const payload = await fetchJson<AudiusSingle<AudiusTrackJson>>(
      withApp(`/tracks/${nativeId}`),
      { provider: PROVIDER },
    )
    const track = unwrapSingle(payload)
    if (!track || !isPlayable(track)) return null
    return mapTrack(track)
  },

  async getArtist(id: string) {
    const nativeId = id.startsWith(`${PROVIDER}:user:`)
      ? id.slice(`${PROVIDER}:user:`.length)
      : id.replace(`${PROVIDER}:artist:`, '')
    if (!nativeId || nativeId === id) return null
    const payload = await fetchJson<AudiusSingle<AudiusUser>>(
      withApp(`/users/${nativeId}`),
      { provider: PROVIDER },
    )
    const user = unwrapSingle(payload)
    return user ? artistFromUser(user) : null
  },

  async getArtistTracks(id: string, options?: ProviderSearchOptions) {
    const nativeId = id.startsWith(`${PROVIDER}:user:`)
      ? id.slice(`${PROVIDER}:user:`.length)
      : id.replace(`${PROVIDER}:artist:`, '')
    if (!nativeId || nativeId === id) return []
    const payload = await fetchJson<AudiusList<AudiusTrackJson>>(
      withApp(`/users/${nativeId}/tracks`, {
        limit: options?.limit ?? 40,
        sort: 'plays',
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    return (payload.data ?? []).filter(isPlayable).map(mapTrack)
  },

  async getAlbum(id: string) {
    const nativeId = id.startsWith(`${PROVIDER}:playlist:`)
      ? id.slice(`${PROVIDER}:playlist:`.length)
      : id.replace(`${PROVIDER}:album:`, '')

    if (id.startsWith(`${PROVIDER}:track:`)) {
      const payload = await fetchJson<AudiusSingle<AudiusTrackJson>>(
        withApp(`/tracks/${id.slice(`${PROVIDER}:track:`.length)}`),
        { provider: PROVIDER },
      )
      const single = unwrapSingle(payload)
      const track = single && isPlayable(single) ? mapTrack(single) : null
      if (!track) return null
      return {
        id,
        provider: PROVIDER,
        providerId: track.providerId,
        title: track.album,
        artist: track.artist,
        artistId: track.artistId,
        year: track.year ?? new Date().getFullYear(),
        kind: 'Single',
        trackIds: [track.id],
        artwork: track.artwork,
      }
    }

    if (!nativeId || nativeId === id) return null
    const payload = await fetchJson<AudiusSingle<AudiusPlaylistJson>>(
      withApp(`/playlists/${nativeId}`),
      { provider: PROVIDER },
    )
    const playlist = unwrapSingle(payload)
    if (!playlist) return null
    const album = mapPlaylist(playlist)
    return album
  },

  async getPlayback(track: Track): Promise<PlaybackSource> {
    return {
      kind: 'audio',
      url:
        track.streamUrl ??
        `${API}/tracks/${track.providerId}/stream?app_name=${APP_NAME}`,
    }
  },

  async getAlbumTracks(id: string, options?: ProviderSearchOptions) {
    if (id.startsWith(`${PROVIDER}:track:`)) {
      const payload = await fetchJson<AudiusSingle<AudiusTrackJson>>(
        withApp(`/tracks/${id.slice(`${PROVIDER}:track:`.length)}`),
        { provider: PROVIDER, signal: options?.signal },
      )
      const single = unwrapSingle(payload)
      return single && isPlayable(single) ? [mapTrack(single)] : []
    }

    const nativeId = id.startsWith(`${PROVIDER}:playlist:`)
      ? id.slice(`${PROVIDER}:playlist:`.length)
      : id.replace(`${PROVIDER}:album:`, '')
    if (!nativeId || nativeId === id) return []
    const payload = await fetchJson<AudiusSingle<AudiusPlaylistJson>>(
      withApp(`/playlists/${nativeId}`),
      { provider: PROVIDER, signal: options?.signal },
    )
    const playlist = unwrapSingle(payload)
    if (!playlist) return []
    return (playlist.tracks ?? []).filter(isPlayable).map(mapTrack)
  },

  async trending(options?: ProviderSearchOptions) {
    const payload = await fetchJson<AudiusList<AudiusTrackJson>>(
      withApp('/tracks/trending', {
        limit: options?.limit ?? 24,
        time: 'week',
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    return (payload.data ?? []).filter(isPlayable).map(mapTrack)
  },

  async featuredAlbums(options?: ProviderSearchOptions) {
    const payload = await fetchJson<AudiusList<AudiusPlaylistJson>>(
      withApp('/playlists/trending', {
        limit: options?.limit ?? 10,
        time: 'week',
      }),
      { provider: PROVIDER, signal: options?.signal },
    )
    return (payload.data ?? [])
      .filter((playlist) => playlist.is_delete !== true && playlist.is_private !== true)
      .map(mapPlaylist)
  },
}
