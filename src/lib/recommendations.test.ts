import { describe, expect, it } from 'vitest'
import {
  buildRecommendations,
  recommendTracks,
  scoreTrack,
  type RecommendationSignals,
} from '@/lib/recommendations'
import type { HistoryEntry, Track } from '@/types/music'

const NOW = new Date(2026, 4, 8, 21, 0, 0).getTime()
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function track(overrides: Partial<Track> & Pick<Track, 'id' | 'title'>): Track {
  return {
    provider: 'audius',
    providerId: overrides.id,
    artist: 'Night Sky',
    artistId: 'audius:user:nightsky',
    album: 'Afterglow',
    albumId: 'audius:playlist:afterglow',
    duration: 180,
    genre: 'Ambient',
    ...overrides,
  }
}

const aurora = track({ id: 'a1', title: 'Aurora Lines', artwork: 'https://art/a1.jpg' })
const ember = track({ id: 'a2', title: 'Ember Hours' })
const rain = track({
  id: 'b1',
  title: 'Rain Window',
  artist: 'Lumen Bay',
  artistId: 'audius:user:lumen',
  genre: 'Lo-Fi',
})
const slow = track({
  id: 'b2',
  title: 'Slow Orbit',
  artist: 'Lumen Bay',
  artistId: 'audius:user:lumen',
  genre: 'Lo-Fi',
})
const staticLine = track({
  id: 'c1',
  title: 'Static Line',
  artist: 'Glass Coast',
  artistId: 'audius:user:glass',
  genre: 'Rock',
})
const glassEcho = track({
  id: 'c2',
  title: 'Glass Echo',
  artist: 'Glass Coast',
  artistId: 'audius:user:glass',
  genre: 'Rock',
})

const pool = [aurora, ember, rain, slow, staticLine]
const trendingIds = [aurora.id, staticLine.id, rain.id]

function plays(trackValue: Track, count: number, step = HOUR): HistoryEntry[] {
  return Array.from({ length: count }, (_, index) => ({
    track: trackValue,
    playedAt: NOW - (index + 1) * step,
  }))
}

function signals(overrides: Partial<RecommendationSignals> = {}): RecommendationSignals {
  return {
    history: [],
    likedTracks: [],
    likedIds: [],
    trendingIds,
    ...overrides,
  }
}

describe('rule-based recommendation scoring', () => {
  it('keeps the trending order when there is no listening history', () => {
    const result = recommendTracks(pool, signals(), 5, { now: NOW })
    expect(result.map((entry) => entry.track.id)).toEqual(['a1', 'c1', 'b1', 'a2', 'b2'])
  })

  it('raises an unheard track from the artist you return to', () => {
    const result = recommendTracks(
      pool,
      signals({ history: plays(aurora, 2), trendingIds: [] }),
      5,
      { now: NOW },
    )

    expect(result[0].track.id).toBe('a2')
    expect(result[0].reasons).toContain('2 artist plays')
    expect(result[0].score).toBeGreaterThan(
      result.find((entry) => entry.track.id === 'b2')?.score ?? 0,
    )
  })

  it('changes its favourites as a different artist takes over the history', () => {
    const nightSignals = signals({ history: plays(aurora, 2) })
    const daySignals = signals({ history: plays(rain, 5) })

    const night = buildRecommendations(pool, nightSignals, 5)
    const day = buildRecommendations(pool, daySignals, 5)

    expect(night.madeForYou[0].title).toBe('More like Night Sky')
    expect(day.madeForYou[0].title).toBe('More like Lumen Bay')
    expect(night.tracksYouMightLove[0].track.id).not.toBe(day.tracksYouMightLove[0].track.id)
  })

  it('uses liked artists and genres as extra signals', () => {
    const result = recommendTracks(
      [...pool, glassEcho],
      signals({ likedTracks: [staticLine], likedIds: [staticLine.id], trendingIds: [] }),
      5,
      { now: NOW, excludeLiked: true },
    )

    expect(result[0].track.id).toBe('c2')
    expect(result.map((entry) => entry.track.id)).not.toContain('c1')
  })

  it('pushes a track down when it was played today', () => {
    const fresh = track({ id: 'a3', title: 'Fresh Static' })
    const recentHistory: HistoryEntry[] = [
      { track: ember, playedAt: NOW - HOUR },
    ]

    const emberScore = scoreTrack(ember, signals({ history: recentHistory }), undefined, {
      now: NOW,
    })
    const freshScore = scoreTrack(fresh, signals({ history: recentHistory }), undefined, {
      now: NOW,
    })

    expect(freshScore.score).toBeGreaterThan(emberScore.score)
    expect(emberScore.reasons).toContain('played today')
  })

  it('is deterministic for equal scores', () => {
    const first = recommendTracks(pool, signals({ trendingIds: [] }), 5, { now: NOW })
    const second = recommendTracks(pool, signals({ trendingIds: [] }), 5, { now: NOW })
    expect(first.map((entry) => entry.track.id)).toEqual(second.map((entry) => entry.track.id))
  })

  it('deduplicates recent history for Jump back in', () => {
    const history: HistoryEntry[] = [
      { track: aurora, playedAt: NOW - 1 * DAY },
      { track: aurora, playedAt: NOW - 2 * DAY },
      { track: rain, playedAt: NOW - 3 * DAY },
    ]
    const result = buildRecommendations(pool, signals({ history }), 5)
    expect(result.jumpBackIn.map((entry) => entry.track.id)).toEqual(['a1', 'b1'])
  })
})
