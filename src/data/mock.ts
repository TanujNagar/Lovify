import type {
  Album,
  Artist,
  CollectionItem,
  Genre,
  Mood,
  Playlist,
  Track,
} from '@/types/music'

export const tracks: Track[] = [
  {
    id: 'track-midnight-echoes',
    title: 'Midnight Echoes',
    artist: 'Aura Nova',
    artistId: 'artist-aura-nova',
    album: 'Midnight Reverie',
    albumId: 'album-midnight-reverie',
    duration: 222,
    provider: 'mock',
  },
  {
    id: 'track-starlight-mirage',
    title: 'Starlight Mirage',
    artist: 'Velvet Pulse',
    artistId: 'artist-velvet-pulse',
    album: 'Velvet Pulses',
    albumId: 'album-velvet-pulses',
    duration: 222,
    provider: 'mock',
  },
  {
    id: 'track-shadow-rhythm',
    title: 'Shadow Rhythm',
    artist: 'Kaelen Vance',
    artistId: 'artist-kaelen-vance',
    album: 'Echoes of the Void',
    albumId: 'album-echoes-of-the-void',
    duration: 251,
    provider: 'mock',
  },
  {
    id: 'track-subtle-glow',
    title: 'Subtle Glow',
    artist: 'The Nocturnals',
    artistId: 'artist-the-nocturnals',
    album: 'Afterglow',
    albumId: 'album-afterglow',
    duration: 178,
    provider: 'mock',
  },
  {
    id: 'track-midnight-reverie',
    title: 'Midnight Reverie',
    artist: 'Aura Bloom',
    artistId: 'artist-aura-bloom',
    album: 'Midnight Reverie',
    albumId: 'album-midnight-reverie',
    duration: 218,
    provider: 'mock',
  },
  {
    id: 'track-velvet-pulses',
    title: 'Velvet Pulses',
    artist: 'Lunar Collective',
    artistId: 'artist-lunar-collective',
    album: 'Velvet Pulses',
    albumId: 'album-velvet-pulses',
    duration: 245,
    provider: 'mock',
  },
  {
    id: 'track-echoes-rain',
    title: 'Echoes & Rain',
    artist: 'Lunar Collective',
    artistId: 'artist-lunar-collective',
    album: 'Velvet Pulses',
    albumId: 'album-velvet-pulses',
    duration: 201,
    provider: 'mock',
  },
  {
    id: 'track-neon-solitude',
    title: 'Neon Solitude',
    artist: 'Starlight Mirage',
    artistId: 'artist-starlight-mirage',
    album: 'Neon Solitude',
    albumId: 'album-neon-solitude',
    duration: 234,
    provider: 'mock',
  },
  {
    id: 'track-quiet-storm',
    title: 'Quiet Storm',
    artist: 'Aura Nova',
    artistId: 'artist-aura-nova',
    album: 'Prism Hours',
    albumId: 'album-prism-hours',
    duration: 272,
    provider: 'mock',
  },
  {
    id: 'track-chamber-echoes',
    title: 'Chamber Echoes',
    artist: 'Kaelen Vance',
    artistId: 'artist-kaelen-vance',
    album: 'Soft Focus',
    albumId: 'album-soft-focus',
    duration: 302,
    provider: 'mock',
  },
  {
    id: 'track-crimson-drive',
    title: 'Crimson Drive',
    artist: 'The Nocturnals',
    artistId: 'artist-the-nocturnals',
    album: 'Afterglow',
    albumId: 'album-afterglow',
    duration: 196,
    provider: 'mock',
  },
  {
    id: 'track-acoustic-soul',
    title: 'Acoustic Soul',
    artist: 'Kaelen Vance',
    artistId: 'artist-kaelen-vance',
    album: 'Soft Focus',
    albumId: 'album-soft-focus',
    duration: 288,
    provider: 'mock',
  },
  {
    id: 'track-lunar-tides',
    title: 'Lunar Tides',
    artist: 'Lunar Collective',
    artistId: 'artist-lunar-collective',
    album: 'Velvet Pulses',
    albumId: 'album-velvet-pulses',
    duration: 263,
    provider: 'mock',
  },
  {
    id: 'track-velvet-static',
    title: 'Velvet Static',
    artist: 'Velvet Pulse',
    artistId: 'artist-velvet-pulse',
    album: 'Neon Solitude',
    albumId: 'album-neon-solitude',
    duration: 209,
    provider: 'mock',
  },
  {
    id: 'track-night-bus-home',
    title: 'Night Bus Home',
    artist: 'Aura Bloom',
    artistId: 'artist-aura-bloom',
    album: 'Midnight Reverie',
    albumId: 'album-midnight-reverie',
    duration: 241,
    provider: 'mock',
  },
  {
    id: 'track-soft-focus',
    title: 'Soft Focus',
    artist: 'Kaelen Vance',
    artistId: 'artist-kaelen-vance',
    album: 'Soft Focus',
    albumId: 'album-soft-focus',
    duration: 227,
    provider: 'mock',
  },
  {
    id: 'track-paper-moons',
    title: 'Paper Moons',
    artist: 'Starlight Mirage',
    artistId: 'artist-starlight-mirage',
    album: 'Neon Solitude',
    albumId: 'album-neon-solitude',
    duration: 215,
    provider: 'mock',
  },
  {
    id: 'track-afterglow',
    title: 'Afterglow',
    artist: 'The Nocturnals',
    artistId: 'artist-the-nocturnals',
    album: 'Afterglow',
    albumId: 'album-afterglow',
    duration: 204,
    provider: 'mock',
  },
  {
    id: 'track-slow-motion',
    title: 'Slow Motion',
    artist: 'Aura Nova',
    artistId: 'artist-aura-nova',
    album: 'Prism Hours',
    albumId: 'album-prism-hours',
    duration: 236,
    provider: 'mock',
  },
  {
    id: 'track-midnight-horizon',
    title: 'Midnight Horizon',
    artist: 'Lunar Collective',
    artistId: 'artist-lunar-collective',
    album: 'Velvet Pulses',
    albumId: 'album-velvet-pulses',
    duration: 249,
    provider: 'mock',
  },
]

export const artists: Artist[] = [
  {
    id: 'artist-lunar-collective',
    name: 'Lunar Collective',
    bio: 'Ambient textures and slow-burning nocturnal grooves.',
    verified: true,
  },
  {
    id: 'artist-aura-nova',
    name: 'Aura Nova',
    bio: 'Dream-pop songs built for the quiet hours.',
    verified: true,
  },
  {
    id: 'artist-velvet-pulse',
    name: 'Velvet Pulse',
    bio: 'Warm synths, soft edges, analogue heart.',
  },
  {
    id: 'artist-kaelen-vance',
    name: 'Kaelen Vance',
    bio: 'Acoustic guitar, late-night field recordings.',
  },
  {
    id: 'artist-the-nocturnals',
    name: 'The Nocturnals',
    bio: 'Indie post-rock for empty streets.',
  },
  {
    id: 'artist-aura-bloom',
    name: 'Aura Bloom',
    bio: 'Slow motion electronic soul.',
  },
  {
    id: 'artist-starlight-mirage',
    name: 'Starlight Mirage',
    bio: 'Chromatic pop from a softer timeline.',
  },
]

export const albums: Album[] = [
  {
    id: 'album-midnight-reverie',
    title: 'Midnight Reverie',
    artist: 'Aura Bloom',
    artistId: 'artist-aura-bloom',
    year: 2024,
    kind: 'Album',
    trackIds: [
      'track-midnight-echoes',
      'track-midnight-reverie',
      'track-night-bus-home',
    ],
  },
  {
    id: 'album-velvet-pulses',
    title: 'Velvet Pulses',
    artist: 'Lunar Collective',
    artistId: 'artist-lunar-collective',
    year: 2025,
    kind: 'Album',
    trackIds: [
      'track-starlight-mirage',
      'track-velvet-pulses',
      'track-echoes-rain',
      'track-lunar-tides',
      'track-midnight-horizon',
    ],
  },
  {
    id: 'album-echoes-of-the-void',
    title: 'Echoes of the Void',
    artist: 'Kaelen Vance',
    artistId: 'artist-kaelen-vance',
    year: 2025,
    kind: 'EP',
    trackIds: ['track-shadow-rhythm', 'track-soft-focus'],
  },
  {
    id: 'album-neon-solitude',
    title: 'Neon Solitude',
    artist: 'Starlight Mirage',
    artistId: 'artist-starlight-mirage',
    year: 2024,
    kind: 'EP',
    trackIds: ['track-neon-solitude', 'track-paper-moons', 'track-velvet-static'],
  },
  {
    id: 'album-afterglow',
    title: 'Afterglow',
    artist: 'The Nocturnals',
    artistId: 'artist-the-nocturnals',
    year: 2025,
    kind: 'Album',
    trackIds: ['track-subtle-glow', 'track-crimson-drive', 'track-afterglow'],
  },
  {
    id: 'album-soft-focus',
    title: 'Soft Focus',
    artist: 'Kaelen Vance',
    artistId: 'artist-kaelen-vance',
    year: 2023,
    kind: 'Album',
    trackIds: ['track-chamber-echoes', 'track-acoustic-soul', 'track-soft-focus'],
  },
  {
    id: 'album-prism-hours',
    title: 'Prism Hours',
    artist: 'Aura Nova',
    artistId: 'artist-aura-nova',
    year: 2026,
    kind: 'Album',
    trackIds: ['track-quiet-storm', 'track-midnight-echoes', 'track-slow-motion'],
  },
]

export const initialPlaylists: Playlist[] = [
  {
    id: 'playlist-liked',
    name: 'Liked Songs',
    description: 'Everything you have kept close.',
    trackIds: [
      'track-midnight-echoes',
      'track-starlight-mirage',
      'track-subtle-glow',
      'track-quiet-storm',
    ],
    createdAt: 0,
    updatedAt: 0,
    system: 'liked',
  },
  {
    id: 'playlist-atmospheric-focus',
    name: 'Atmospheric Focus',
    description: 'Soft edges for deep work and long nights.',
    trackIds: [
      'track-echoes-rain',
      'track-chamber-echoes',
      'track-lunar-tides',
      'track-soft-focus',
      'track-paper-moons',
    ],
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'playlist-night-flow',
    name: 'Night Flow',
    description: 'Curated nocturnal rhythms and seamless deep grooves.',
    trackIds: [
      'track-midnight-echoes',
      'track-shadow-rhythm',
      'track-crimson-drive',
      'track-night-bus-home',
      'track-afterglow',
      'track-slow-motion',
    ],
    createdAt: 2,
    updatedAt: 2,
  },
  {
    id: 'playlist-quiet-storm',
    name: 'Quiet Storm',
    description: 'Rain against the window, low light, no rush.',
    trackIds: [
      'track-quiet-storm',
      'track-echoes-rain',
      'track-subtle-glow',
      'track-neon-solitude',
    ],
    createdAt: 3,
    updatedAt: 3,
  },
]

export const moods: Mood[] = [
  {
    id: 'mood-late-night',
    name: 'Late Night',
    subtitle: 'Low light, slow pulse',
    icon: 'bedtime',
    gradient: 'from-secondary-container via-surface-container-high to-surface-container-lowest',
  },
  {
    id: 'mood-focus',
    name: 'Deep Focus',
    subtitle: 'Instrumental, no distractions',
    icon: 'graphic_eq',
    gradient: 'from-surface-container-high via-surface-container to-surface-container-lowest',
  },
  {
    id: 'mood-rainy',
    name: 'Rainy Day',
    subtitle: 'Soft static and warm keys',
    icon: 'cloud_off',
    gradient: 'from-outline-variant via-surface-container-high to-surface-container-lowest',
  },
  {
    id: 'mood-commute',
    name: 'Night Drive',
    subtitle: 'Headlights, empty roads',
    icon: 'explore',
    gradient: 'from-primary/30 via-secondary-container to-surface-container-lowest',
  },
  {
    id: 'mood-sunday',
    name: 'Slow Morning',
    subtitle: 'Unhurried and gentle',
    icon: 'auto_awesome',
    gradient: 'from-tertiary/25 via-surface-container to-surface-container-lowest',
  },
  {
    id: 'mood-reset',
    name: 'Reset',
    subtitle: 'A clean, quiet room',
    icon: 'refresh',
    gradient: 'from-secondary/20 via-surface-container-high to-surface-container-lowest',
  },
]

export const genres: Genre[] = [
  {
    id: 'electronic',
    name: 'Electronic',
    subtitle: 'Club & synth',
    gradient: 'from-secondary-container via-surface-container-high to-surface-container-lowest',
  },
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    subtitle: 'Boom bap & trap',
    gradient: 'from-surface-container-highest via-surface-container to-surface-container-lowest',
  },
  {
    id: 'indie',
    name: 'Indie & Alt',
    subtitle: 'Dreampop',
    gradient: 'from-outline-variant via-surface-container-low to-surface-container-lowest',
  },
  {
    id: 'chill',
    name: 'Chill & Lo-Fi',
    subtitle: 'Beats & ambient',
    gradient: 'from-surface-container-high via-surface-container to-surface-container-lowest',
  },
  {
    id: 'rock',
    name: 'Rock & Heavy',
    subtitle: 'Modern riffs',
    gradient: 'from-error/30 via-surface-container-high to-surface-container-lowest',
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    subtitle: 'Strings & piano',
    gradient: 'from-tertiary-fixed/25 via-surface-variant to-surface-container-lowest',
  },
  {
    id: 'pop',
    name: 'Pop & Dance',
    subtitle: 'Top charts',
    gradient: 'from-secondary-container via-surface-container-low to-surface-container-lowest',
  },
  {
    id: 'night-drive',
    name: 'Night Drive',
    subtitle: 'Midnight moods',
    gradient: 'from-primary/25 via-surface-container-high to-surface-container-lowest',
  },
]

export const recentSearches = ['Aura Nova', 'Deep Focus', 'Crimson Skyline', 'Lo-Fi Beats']

export const madeForYou: CollectionItem[] = [
  {
    id: 'album-prism-hours',
    title: 'Daily Mix 01',
    subtitle: 'Lunar Collective, Kaelen Vance, Aura Nova',
    kind: 'album',
    href: '/album/album-prism-hours',
  },
  {
    id: 'playlist-night-flow',
    title: 'Night Flow',
    subtitle: 'Curated nocturnal rhythms and seamless deep grooves',
    kind: 'playlist',
    href: '/playlist/playlist-night-flow',
  },
  {
    id: 'album-afterglow',
    title: 'Discover Weekly',
    subtitle: 'Fresh releases picked for your taste',
    kind: 'album',
    href: '/album/album-afterglow',
  },
  {
    id: 'album-neon-solitude',
    title: 'Release Radar',
    subtitle: 'New drops from artists you follow',
    kind: 'album',
    href: '/album/album-neon-solitude',
  },
]

export const quickAccess: CollectionItem[] = [
  {
    id: 'quick-velvet',
    title: 'Velvet Pulses',
    subtitle: 'Lunar Collective',
    kind: 'album',
    href: '/album/album-velvet-pulses',
  },
  {
    id: 'quick-rain',
    title: 'Echoes & Rain',
    subtitle: 'Lunar Collective',
    kind: 'track',
    href: '/',
  },
  {
    id: 'quick-radio',
    title: 'Vibe Radio',
    subtitle: 'Auto-generated mix',
    kind: 'playlist',
    href: '/explore',
  },
  {
    id: 'quick-horizon',
    title: 'Midnight Horizon',
    subtitle: 'Lunar Collective',
    kind: 'track',
    href: '/',
  },
  {
    id: 'quick-drive',
    title: 'Crimson Drive',
    subtitle: 'The Nocturnals',
    kind: 'track',
    href: '/',
  },
  {
    id: 'quick-acoustic',
    title: 'Acoustic Soul',
    subtitle: 'Kaelen Vance',
    kind: 'track',
    href: '/',
  },
]

export const recentlyPlayed: CollectionItem[] = [
  {
    id: 'artist-lunar-collective',
    title: 'Lunar Collective',
    subtitle: 'Artist',
    kind: 'artist',
    href: '/artist/artist-lunar-collective',
  },
  {
    id: 'album-neon-solitude',
    title: 'Neon Solitude',
    subtitle: 'EP • Starlight Mirage',
    kind: 'album',
    href: '/album/album-neon-solitude',
  },
  {
    id: 'playlist-quiet-storm',
    title: 'Quiet Storm',
    subtitle: 'Playlist • 4 tracks',
    kind: 'playlist',
    href: '/playlist/playlist-quiet-storm',
  },
  {
    id: 'album-soft-focus',
    title: 'Chamber Echoes',
    subtitle: 'Classical crossover',
    kind: 'album',
    href: '/album/album-soft-focus',
  },
]

export const recommendedTracks = tracks.slice(0, 4)

export const newReleases = [
  'album-prism-hours',
  'album-afterglow',
  'album-velvet-pulses',
  'album-neon-solitude',
].map((id) => albums.find((album) => album.id === id)!)

export const trendingTracks = [
  'track-shadow-rhythm',
  'track-midnight-echoes',
  'track-neon-solitude',
  'track-crimson-drive',
  'track-lunar-tides',
].map((id) => tracks.find((track) => track.id === id)!)

export const vibeStations = [
  {
    id: 'radio-rose',
    name: 'Rose Hour',
    subtitle: 'Warm, slow, after dark',
    trackIds: ['track-midnight-echoes', 'track-quiet-storm', 'track-slow-motion'],
  },
  {
    id: 'radio-focus',
    name: 'Deep Focus',
    subtitle: 'No words, just space',
    trackIds: ['track-echoes-rain', 'track-chamber-echoes', 'track-lunar-tides'],
  },
  {
    id: 'radio-drive',
    name: 'Night Drive',
    subtitle: 'Neon on wet asphalt',
    trackIds: ['track-crimson-drive', 'track-night-bus-home', 'track-afterglow'],
  },
]

export function getTrack(id: string): Track | undefined {
  return tracks.find((track) => track.id === id)
}

export function getAlbum(id: string): Album | undefined {
  return albums.find((album) => album.id === id)
}

export function getArtist(id: string): Artist | undefined {
  return artists.find((artist) => artist.id === id)
}

export function getPlaylist(id: string): Playlist | undefined {
  return initialPlaylists.find((playlist) => playlist.id === id)
}

export function tracksByIds(ids: string[]): Track[] {
  return ids.map((id) => getTrack(id)).filter((track): track is Track => Boolean(track))
}

export function tracksForPlaylist(playlist: Playlist): Track[] {
  return tracksByIds(playlist.trackIds)
}

export function searchCatalog(query: string): {
  tracks: Track[]
  albums: Album[]
  artists: Artist[]
} {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return { tracks: [], albums: [], artists: [] }

  return {
    tracks: tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(normalized) ||
        track.artist.toLowerCase().includes(normalized) ||
        track.album.toLowerCase().includes(normalized),
    ),
    albums: albums.filter(
      (album) =>
        album.title.toLowerCase().includes(normalized) ||
        album.artist.toLowerCase().includes(normalized),
    ),
    artists: artists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(normalized) ||
        (artist.bio?.toLowerCase().includes(normalized) ?? false),
    ),
  }
}

export function tracksForCollection(item: CollectionItem): Track[] {
  if (item.kind === 'track') {
    const track = getTrack(item.id)
    return track ? [track] : []
  }
  if (item.kind === 'artist') {
    return tracks.filter((track) => track.artistId === item.id)
  }
  if (item.kind === 'album') {
    const album = getAlbum(item.id)
    return album ? tracksByIds(album.trackIds) : []
  }
  const playlist = getPlaylist(item.id)
  return playlist ? tracksByIds(playlist.trackIds) : []
}

