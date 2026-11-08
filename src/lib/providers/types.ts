import type {
  Album,
  Artist,
  PlaybackSource,
  ProviderId,
  SearchResults,
  Track,
} from '@/types/music'

export type ProviderErrorCode =
  | 'not_configured'
  | 'quota'
  | 'unauthorized'
  | 'network'
  | 'unavailable'
  | 'aborted'
  | 'invalid'

export class ProviderError extends Error {
  readonly code: ProviderErrorCode
  readonly provider: ProviderId

  constructor(code: ProviderErrorCode, provider: ProviderId, message: string) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.provider = provider
  }
}

export type ProviderSearchOptions = {
  limit?: number
  signal?: AbortSignal
  /** Editorial buttons and radio use this to avoid spending YouTube quota. */
  skipYouTube?: boolean
}

export interface MusicProvider {
  readonly id: ProviderId
  readonly label: string
  isConfigured(): Promise<boolean>
  search(query: string, options?: ProviderSearchOptions): Promise<SearchResults>
  getTrack(id: string): Promise<Track | null>
  getArtist(id: string): Promise<Artist | null>
  getArtistTracks(id: string, options?: ProviderSearchOptions): Promise<Track[]>
  getAlbum(id: string): Promise<Album | null>
  getAlbumTracks(id: string, options?: ProviderSearchOptions): Promise<Track[]>
  getPlayback(track: Track): Promise<PlaybackSource>
  trending?(options?: ProviderSearchOptions): Promise<Track[]>
  featuredAlbums?(options?: ProviderSearchOptions): Promise<Album[]>
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  audius: 'Audius',
  jamendo: 'Jamendo',
  youtube: 'YouTube',
}

export function makeTrackId(provider: ProviderId, nativeId: string): string {
  return `${provider}:${nativeId}`
}

export function makeArtistId(provider: ProviderId, nativeId: string): string {
  return `${provider}:artist:${nativeId}`
}

export function makeUserArtistId(provider: ProviderId, nativeId: string): string {
  return `${provider}:user:${nativeId}`
}

export function makeAlbumId(provider: ProviderId, nativeId: string): string {
  return `${provider}:album:${nativeId}`
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>()
  const result: Track[] = []
  for (const track of tracks) {
    const key = `${normalizeText(track.artist)}::${normalizeText(track.title)}`
    if (!key.trim() || seen.has(key)) continue
    seen.add(key)
    result.push(track)
  }
  return result
}

export function dedupeArtists(artists: Artist[]): Artist[] {
  const seen = new Set<string>()
  return artists.filter((artist) => {
    const key = normalizeText(artist.name)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function dedupeAlbums(albums: Album[]): Album[] {
  const seen = new Set<string>()
  return albums.filter((album) => {
    const key = `${normalizeText(album.artist)}::${normalizeText(album.title)}`
    if (!key.trim() || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Parses ISO-8601 video durations such as PT3M42S into seconds. */
export function parseIsoDuration(value: string | undefined): number {
  if (!value) return 0
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  if (!match) return 0
  const [, days, hours, minutes, seconds] = match
  return (
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  )
}
