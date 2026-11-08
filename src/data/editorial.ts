import type { Genre, Mood } from '@/types/music'

/** Hand-written editorial groupings. No catalog data lives here. */
export const moods: Mood[] = [
  {
    id: 'mood-late-night',
    name: 'Late Night',
    subtitle: 'Low light, slow pulse',
    icon: 'bedtime',
    gradient: 'from-secondary-container via-surface-container-high to-surface-container-lowest',
    query: 'late night',
  },
  {
    id: 'mood-focus',
    name: 'Deep Focus',
    subtitle: 'Instrumental, no distractions',
    icon: 'graphic_eq',
    gradient: 'from-surface-container-high via-surface-container to-surface-container-lowest',
    query: 'ambient instrumental',
  },
  {
    id: 'mood-rainy',
    name: 'Rainy Day',
    subtitle: 'Soft static and warm keys',
    icon: 'cloud_off',
    gradient: 'from-outline-variant via-surface-container-high to-surface-container-lowest',
    query: 'rainy day chill',
  },
  {
    id: 'mood-commute',
    name: 'Night Drive',
    subtitle: 'Headlights, empty roads',
    icon: 'explore',
    gradient: 'from-primary/30 via-secondary-container to-surface-container-lowest',
    query: 'night drive electronic',
  },
  {
    id: 'mood-sunday',
    name: 'Slow Morning',
    subtitle: 'Unhurried and gentle',
    icon: 'auto_awesome',
    gradient: 'from-tertiary/25 via-surface-container to-surface-container-lowest',
    query: 'slow morning acoustic',
  },
  {
    id: 'mood-reset',
    name: 'Reset',
    subtitle: 'A clean, quiet room',
    icon: 'refresh',
    gradient: 'from-secondary/20 via-surface-container-high to-surface-container-lowest',
    query: 'calm piano',
  },
]

export const genres: Genre[] = [
  {
    id: 'electronic',
    name: 'Electronic',
    subtitle: 'Club & synth',
    gradient: 'from-secondary-container via-surface-container-high to-surface-container-lowest',
    query: 'electronic',
  },
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    subtitle: 'Boom bap & trap',
    gradient: 'from-surface-container-highest via-surface-container to-surface-container-lowest',
    query: 'hip hop',
  },
  {
    id: 'indie',
    name: 'Indie & Alt',
    subtitle: 'Dreampop',
    gradient: 'from-outline-variant via-surface-container-low to-surface-container-lowest',
    query: 'indie alternative',
  },
  {
    id: 'chill',
    name: 'Chill & Lo-Fi',
    subtitle: 'Beats & ambient',
    gradient: 'from-surface-container-high via-surface-container to-surface-container-lowest',
    query: 'lofi chill',
  },
  {
    id: 'rock',
    name: 'Rock & Heavy',
    subtitle: 'Modern riffs',
    gradient: 'from-error/30 via-surface-container-high to-surface-container-lowest',
    query: 'rock',
  },
  {
    id: 'acoustic',
    name: 'Acoustic',
    subtitle: 'Strings & piano',
    gradient: 'from-tertiary-fixed/25 via-surface-variant to-surface-container-lowest',
    query: 'acoustic',
  },
  {
    id: 'pop',
    name: 'Pop & Dance',
    subtitle: 'Top charts',
    gradient: 'from-secondary-container via-surface-container-low to-surface-container-lowest',
    query: 'pop dance',
  },
  {
    id: 'night-drive',
    name: 'Night Drive',
    subtitle: 'Midnight moods',
    gradient: 'from-primary/25 via-surface-container-high to-surface-container-lowest',
    query: 'night drive',
  },
]

export const homeFilters = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'night', label: 'Night Focus', icon: 'bedtime' },
  { id: 'atmospheric', label: 'Atmospheric', icon: 'graphic_eq' },
]

export const radioStations = [
  {
    id: 'radio-rose',
    name: 'Rose Hour',
    subtitle: 'Warm, slow, after dark',
    icon: 'graphic_eq',
    query: 'chill',
  },
  {
    id: 'radio-focus',
    name: 'Deep Focus',
    subtitle: 'No words, just space',
    icon: 'headphones',
    query: 'ambient instrumental',
  },
  {
    id: 'radio-drive',
    name: 'Night Drive',
    subtitle: 'Neon on wet asphalt',
    icon: 'explore',
    query: 'electronic night',
  },
]
