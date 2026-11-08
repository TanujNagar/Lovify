import type { HistoryEntry, Track } from '@/types/music'

export type ArtistStat = {
  artistId: string
  name: string
  plays: number
  minutes: number
  artwork?: string
  provider?: Track['provider']
  trackIds: string[]
}

export type GenreStat = {
  name: string
  plays: number
  share: number
}

export type PeakWindow = {
  start: number
  end: number
  plays: number
  label: string
}

export type ListeningStats = {
  plays: number
  uniqueTracks: number
  minutes: number
  uniqueArtists: number
  topArtist: ArtistStat | null
  topArtists: ArtistStat[]
  topGenre: GenreStat | null
  peakWindow: PeakWindow | null
  /** Plays indexed by local hour, 0–23. */
  hourly: number[]
}

const PEAK_WINDOW_HOURS = 3

export function peakLabelForHour(hour: number): string {
  if (hour >= 22 || hour < 5) return 'Night owl'
  if (hour < 12) return 'Morning listener'
  if (hour < 17) return 'Afternoon drift'
  return 'Evening calm'
}

function bestPeakWindow(hourly: number[]): PeakWindow | null {
  const total = hourly.reduce((sum, count) => sum + count, 0)
  if (!total) return null

  let bestStart = 0
  let bestCount = -1
  for (let start = 0; start < 24; start += 1) {
    let count = 0
    for (let offset = 0; offset < PEAK_WINDOW_HOURS; offset += 1) {
      count += hourly[(start + offset) % 24]
    }
    // Prefer the later window on a tie so a quiet midnight does not win by
    // default when the listener actually listens in the evening.
    if (count >= bestCount) {
      bestCount = count
      bestStart = start
    }
  }

  return {
    start: bestStart,
    end: (bestStart + PEAK_WINDOW_HOURS) % 24,
    plays: bestCount,
    label: peakLabelForHour(bestStart),
  }
}

/**
 * Turns raw play rows (duplicates included) into the numbers shown on the
 * profile. It is intentionally pure so the scoring and the UI stay in sync.
 */
export function computeListeningStats(entries: HistoryEntry[]): ListeningStats {
  const hourly = Array.from({ length: 24 }, () => 0)
  const artists = new Map<string, ArtistStat>()
  const genres = new Map<string, number>()
  const uniqueTrackIds = new Set<string>()
  let minutes = 0
  let genrePlays = 0

  for (const entry of entries) {
    const { track, playedAt } = entry
    const durationMinutes = Number.isFinite(track.duration) ? Math.max(0, track.duration) / 60 : 0
    minutes += durationMinutes
    uniqueTrackIds.add(track.id)
    hourly[new Date(playedAt).getHours()] += 1

    const artistKey = track.artistId || track.artist
    const artist = artists.get(artistKey)
    if (artist) {
      artist.plays += 1
      artist.minutes += durationMinutes
      if (!artist.trackIds.includes(track.id)) artist.trackIds.push(track.id)
    } else {
      artists.set(artistKey, {
        artistId: track.artistId,
        name: track.artist,
        plays: 1,
        minutes: durationMinutes,
        artwork: track.artwork,
        provider: track.provider,
        trackIds: [track.id],
      })
    }

    const genre = track.genre?.trim()
    if (genre) {
      genres.set(genre, (genres.get(genre) ?? 0) + 1)
      genrePlays += 1
    }
  }

  const topArtists = Array.from(artists.values())
    .sort(
      (a, b) =>
        b.plays - a.plays ||
        b.minutes - a.minutes ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 6)

  const genreEntry = Array.from(genres.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]

  const topGenre: GenreStat | null = genreEntry
    ? {
        name: genreEntry[0],
        plays: genreEntry[1],
        share: genrePlays ? Math.round((genreEntry[1] / genrePlays) * 100) : 0,
      }
    : null

  return {
    plays: entries.length,
    uniqueTracks: uniqueTrackIds.size,
    minutes: Math.round(minutes),
    uniqueArtists: artists.size,
    topArtist: topArtists[0] ?? null,
    topArtists,
    topGenre,
    peakWindow: bestPeakWindow(hourly),
    hourly,
  }
}

export function formatListeningTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (!rest) return `${hours} hr`
  return `${hours} hr ${rest} min`
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}
