import type { HistoryEntry, Playlist, Track } from '@/types/music'

export type RecommendationSignals = {
  history: HistoryEntry[]
  likedTracks?: Track[]
  likedIds?: string[]
  playlists?: Playlist[]
  downloadedIds?: string[]
  trendingIds?: string[]
}

export type ScoredTrack = {
  track: Track
  score: number
  reasons: string[]
}

export type LocalMix = {
  id: string
  title: string
  subtitle: string
  badge: string
  artwork?: string
  tracks: Track[]
  score: number
}

export type Recommendations = {
  jumpBackIn: HistoryEntry[]
  madeForYou: LocalMix[]
  tracksYouMightLove: ScoredTrack[]
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

type Affinity = {
  artistPlays: Map<string, number>
  genrePlays: Map<string, number>
  lastPlayed: Map<string, number>
  likedArtistIds: Set<string>
  likedGenres: Set<string>
  playsByTrack: Map<string, number>
}

function keyForArtist(track: Track): string {
  return track.artistId || `artist:${track.artist.toLowerCase()}`
}

function normalizeGenre(value: string | undefined): string | null {
  const genre = value?.trim().toLowerCase()
  return genre || null
}

export function buildAffinity(signals: RecommendationSignals): Affinity {
  const artistPlays = new Map<string, number>()
  const genrePlays = new Map<string, number>()
  const lastPlayed = new Map<string, number>()
  const playsByTrack = new Map<string, number>()
  const likedArtistIds = new Set<string>()
  const likedGenres = new Set<string>()

  for (const entry of signals.history) {
    const { track } = entry
    const artistKey = keyForArtist(track)
    artistPlays.set(artistKey, (artistPlays.get(artistKey) ?? 0) + 1)
    playsByTrack.set(track.id, (playsByTrack.get(track.id) ?? 0) + 1)

    const genre = normalizeGenre(track.genre)
    if (genre) genrePlays.set(genre, (genrePlays.get(genre) ?? 0) + 1)

    const previous = lastPlayed.get(track.id) ?? 0
    if (entry.playedAt > previous) lastPlayed.set(track.id, entry.playedAt)
  }

  for (const track of signals.likedTracks ?? []) {
    likedArtistIds.add(keyForArtist(track))
    const genre = normalizeGenre(track.genre)
    if (genre) likedGenres.add(genre)
  }

  return { artistPlays, genrePlays, lastPlayed, likedArtistIds, likedGenres, playsByTrack }
}

export type ScoreOptions = {
  now?: number
  excludeLiked?: boolean
  excludeDownloaded?: boolean
}

/**
 * Deterministic, rules-only scoring. Listening history raises the artists and
 * genres you return to; recent plays and already-liked tracks are pushed down
 * so the result keeps moving instead of repeating the same row.
 */
export function scoreTrack(
  track: Track,
  signals: RecommendationSignals,
  affinity: Affinity = buildAffinity(signals),
  options: ScoreOptions = {},
): ScoredTrack {
  const now = options.now ?? Date.now()
  const likedIds = new Set(signals.likedIds ?? [])
  const downloadedIds = new Set(signals.downloadedIds ?? [])
  const trendingIndex = signals.trendingIds?.indexOf(track.id) ?? -1
  const reasons: string[] = []
  let score = 0

  if (trendingIndex >= 0) {
    score += Math.max(0, 24 - trendingIndex)
    reasons.push('trending')
  }

  const artistKey = keyForArtist(track)
  const artistPlays = affinity.artistPlays.get(artistKey) ?? 0
  if (artistPlays > 0) {
    score += Math.min(40, artistPlays * 10)
    reasons.push(`${artistPlays} artist plays`)
  }

  const genre = normalizeGenre(track.genre)
  const genrePlays = genre ? (affinity.genrePlays.get(genre) ?? 0) : 0
  if (genre && genrePlays > 0) {
    score += Math.min(18, genrePlays * 3)
    reasons.push(`${genre} affinity`)
  }

  if (affinity.likedArtistIds.has(artistKey)) {
    score += 8
    reasons.push('liked artist')
  }
  if (genre && affinity.likedGenres.has(genre)) {
    score += 4
    reasons.push('liked genre')
  }
  if (downloadedIds.has(track.id)) {
    score += 2
    reasons.push('offline')
  }

  const plays = affinity.playsByTrack.get(track.id) ?? 0
  const last = affinity.lastPlayed.get(track.id)
  if (plays > 0) {
    score -= Math.min(12, plays * 3)
    reasons.push('heard before')
  }
  if (last) {
    const age = now - last
    if (age < DAY) {
      score -= 30
      reasons.push('played today')
    } else if (age < 7 * DAY) {
      score -= 10
      reasons.push('played this week')
    }
  }

  if (likedIds.has(track.id)) {
    score += 25
    reasons.push('liked')
    if (options.excludeLiked) score -= 100
  }
  if (options.excludeDownloaded && downloadedIds.has(track.id)) score -= 100

  return { track, score, reasons }
}

export function recommendTracks(
  candidates: Track[],
  signals: RecommendationSignals,
  limit = 12,
  options: ScoreOptions = {},
): ScoredTrack[] {
  const affinity = buildAffinity(signals)
  const likedIds = new Set(signals.likedIds ?? [])
  const downloadedIds = new Set(signals.downloadedIds ?? [])
  const seen = new Set<string>()
  const scored: ScoredTrack[] = []

  for (const track of candidates) {
    if (!track.id || seen.has(track.id)) continue
    if (options.excludeLiked && likedIds.has(track.id)) continue
    if (options.excludeDownloaded && downloadedIds.has(track.id)) continue
    seen.add(track.id)
    scored.push(scoreTrack(track, signals, affinity, options))
  }

  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.track.title.localeCompare(b.track.title) ||
      a.track.id.localeCompare(b.track.id),
  ).slice(0, limit)
}

function dedupeById(tracks: Track[]): Track[] {
  const seen = new Set<string>()
  return tracks.filter((track) => {
    if (!track.id || seen.has(track.id)) return false
    seen.add(track.id)
    return true
  })
}

function uniqueHistory(history: HistoryEntry[], limit: number): HistoryEntry[] {
  const seen = new Set<string>()
  const result: HistoryEntry[] = []
  for (const entry of history) {
    if (seen.has(entry.track.id)) continue
    seen.add(entry.track.id)
    result.push(entry)
    if (result.length >= limit) break
  }
  return result
}

function createMix(
  id: string,
  title: string,
  subtitle: string,
  badge: string,
  tracks: Track[],
  score: number,
): LocalMix | null {
  if (!tracks.length) return null
  return {
    id,
    title,
    subtitle,
    badge,
    artwork: tracks[0]?.artwork,
    tracks,
    score,
  }
}

/**
 * Builds the three home sections. The same candidate pool can produce very
 * different mixes as the listener plays more: artist and genre affinity drive
 * scores, while fresh trending tracks keep the page from becoming a loop.
 */
export function buildRecommendations(
  candidates: Track[],
  signals: RecommendationSignals,
  limit = 12,
): Recommendations {
  const pool = dedupeById([
    ...(signals.trendingIds?.map((id) => candidates.find((track) => track.id === id)) ?? []),
    ...candidates,
  ].filter((track): track is Track => Boolean(track)))

  const affinity = buildAffinity(signals)
  const topArtistEntry = Array.from(affinity.artistPlays.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]
  const topGenreEntry = Array.from(affinity.genrePlays.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0]

  const topArtistName =
    topArtistEntry &&
    signals.history.find((entry) => keyForArtist(entry.track) === topArtistEntry[0])?.track.artist

  const tracksYouMightLove = recommendTracks(pool, signals, limit, {
    excludeLiked: true,
  })

  const mixes: LocalMix[] = []

  if (topArtistEntry && topArtistName) {
    const artistTracks = recommendTracks(
      pool.filter((track) => keyForArtist(track) === topArtistEntry[0]),
      signals,
      24,
      { excludeLiked: false },
    ).map((entry) => entry.track)
    const mix = createMix(
      `mix-artist-${topArtistEntry[0]}`,
      `More like ${topArtistName}`,
      `${topArtistEntry[1]} plays shaped this corner of your library`,
      'Because you play',
      artistTracks,
      topArtistEntry[1],
    )
    if (mix) mixes.push(mix)
  }

  if (topGenreEntry) {
    const [genre, plays] = topGenreEntry
    const genreTracks = recommendTracks(
      pool.filter((track) => normalizeGenre(track.genre) === genre),
      signals,
      24,
      { excludeLiked: false },
    ).map((entry) => entry.track)
    const label = genre.charAt(0).toUpperCase() + genre.slice(1)
    const mix = createMix(
      `mix-genre-${genre}`,
      `A ${label} room`,
      `${plays} tagged plays · new edges around your top genre`,
      'Your top genre',
      genreTracks,
      plays,
    )
    if (mix) mixes.push(mix)
  }

  const likedTracks = signals.likedTracks ?? []
  if (likedTracks.length) {
    const likedPool = recommendTracks(
      pool.filter((track) => new Set(signals.likedIds ?? []).has(track.id)),
      signals,
      24,
      { excludeLiked: false, excludeDownloaded: true },
    ).map((entry) => entry.track)
    const mix = createMix(
      'mix-liked',
      'Your liked gravity',
      `${likedTracks.length} saved ${likedTracks.length === 1 ? 'track' : 'tracks'}, reshuffled`,
      'Built from likes',
      likedPool,
      likedTracks.length,
    )
    if (mix) mixes.push(mix)
  }

  const fresh = tracksYouMightLove.map((entry) => entry.track)
  const freshMix = createMix(
    'mix-fresh',
    'Fresh for you',
    'New free-source tracks picked by your listening signals',
    'New in rotation',
    fresh.length ? fresh : pool.slice(0, 12),
    tracksYouMightLove[0]?.score ?? 0,
  )
  if (freshMix) mixes.push(freshMix)

  return {
    jumpBackIn: uniqueHistory(signals.history, 6),
    madeForYou: mixes.slice(0, 6),
    tracksYouMightLove,
  }
}
