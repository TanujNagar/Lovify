export type ProviderId = 'youtube' | 'jamendo' | 'audius'

export type Track = {
  /** Stable id in the form provider:nativeId. */
  id: string
  provider: ProviderId
  /** Native id used by the provider API. */
  providerId: string
  title: string
  artist: string
  artistId: string
  album: string
  albumId: string
  duration: number
  artwork?: string
  /** Direct audio URL for Jamendo/Audius. YouTube resolves through IFrame. */
  streamUrl?: string
  genre?: string
  year?: number
}

export type Artist = {
  id: string
  provider: ProviderId
  providerId: string
  name: string
  bio?: string
  verified?: boolean
  artwork?: string
}

export type Album = {
  id: string
  provider: ProviderId
  providerId: string
  title: string
  artist: string
  artistId: string
  year: number
  kind: 'Album' | 'EP' | 'Single' | 'Playlist'
  trackIds: string[]
  artwork?: string
  description?: string
}

export type Playlist = {
  id: string
  name: string
  description?: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
  system?: 'liked' | 'downloads' | 'radio'
}

export type Mood = {
  id: string
  name: string
  subtitle: string
  icon: string
  gradient: string
  query: string
}

export type Genre = {
  id: string
  name: string
  subtitle: string
  gradient: string
  query: string
}

export type PlayerContext = {
  type: 'track' | 'playlist' | 'album' | 'artist' | 'radio'
  label: string
  id?: string
}

export type CollectionItem = {
  id: string
  title: string
  subtitle: string
  kind: 'playlist' | 'album' | 'artist' | 'track'
  trackIds?: string[]
  href: string
  artwork?: string
  provider?: ProviderId
}

export type SearchResults = {
  tracks: Track[]
  artists: Artist[]
  albums: Album[]
}

export type PlaybackSource =
  | { kind: 'audio'; url: string }
  | { kind: 'youtube'; videoId: string }

export type RepeatMode = 'off' | 'all' | 'one'

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export type HistoryEntry = {
  track: Track
  playedAt: number
}
