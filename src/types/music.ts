export type ProviderId = 'mock' | 'youtube' | 'jamendo' | 'audius'

export type Track = {
  id: string
  title: string
  artist: string
  artistId: string
  album: string
  albumId: string
  duration: number
  provider: ProviderId
  artwork?: string
}

export type Artist = {
  id: string
  name: string
  bio?: string
  verified?: boolean
}

export type Album = {
  id: string
  title: string
  artist: string
  artistId: string
  year: number
  kind: 'Album' | 'EP' | 'Single'
  trackIds: string[]
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
}

export type Genre = {
  id: string
  name: string
  subtitle: string
  gradient: string
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
}
