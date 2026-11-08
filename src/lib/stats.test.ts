import { describe, expect, it } from 'vitest'
import {
  computeListeningStats,
  formatHour,
  formatListeningTime,
  peakLabelForHour,
} from '@/lib/stats'
import type { HistoryEntry, Track } from '@/types/music'

function track(overrides: Partial<Track> = {}): Track {
  return {
    id: 'audius:track-1',
    provider: 'audius',
    providerId: 'track-1',
    title: 'Aurora Lines',
    artist: 'Night Sky',
    artistId: 'audius:user:1',
    album: 'Afterglow',
    albumId: 'audius:playlist:1',
    duration: 180,
    genre: 'Ambient',
    ...overrides,
  }
}

function play(trackValue: Track, hour: number, minute = 0): HistoryEntry {
  return {
    track: trackValue,
    playedAt: new Date(2026, 4, 8, hour, minute, 0).getTime(),
  }
}

describe('listening statistics', () => {
  it('returns a calm empty state without invented data', () => {
    const stats = computeListeningStats([])
    expect(stats).toMatchObject({
      plays: 0,
      uniqueTracks: 0,
      minutes: 0,
      uniqueArtists: 0,
      topArtist: null,
      topGenre: null,
      peakWindow: null,
    })
    expect(stats.hourly).toHaveLength(24)
    expect(formatListeningTime(0)).toBe('0 min')
  })

  it('counts every play, unique tracks and real minutes', () => {
    const first = track({ id: 'audius:a', duration: 120 })
    const second = track({
      id: 'audius:b',
      duration: 240,
      title: 'Slow Orbit',
      genre: 'Downtempo',
      artist: 'Lumen Bay',
      artistId: 'audius:user:2',
    })

    const stats = computeListeningStats([play(first, 9), play(second, 10), play(first, 11)])

    expect(stats.plays).toBe(3)
    expect(stats.uniqueTracks).toBe(2)
    expect(stats.minutes).toBe(8)
    expect(stats.uniqueArtists).toBe(2)
  })

  it('ranks artists by plays, then minutes, and keeps artwork', () => {
    const first = track({ id: 'audius:a', duration: 120, artwork: 'https://art/a.jpg' })
    const second = track({
      id: 'audius:b',
      duration: 60,
      title: 'Slow Orbit',
      artist: 'Lumen Bay',
      artistId: 'audius:user:2',
      artwork: 'https://art/b.jpg',
    })

    const stats = computeListeningStats([
      play(first, 8),
      play(second, 9),
      play(first, 10),
      play(second, 11),
      play(first, 12),
    ])

    expect(stats.topArtists.map((artist) => [artist.name, artist.plays])).toEqual([
      ['Night Sky', 3],
      ['Lumen Bay', 2],
    ])
    expect(stats.topArtist?.artwork).toBe('https://art/a.jpg')
    expect(stats.topArtists[0].trackIds).toEqual(['audius:a'])
  })

  it('calculates the genre share from tagged plays only', () => {
    const ambient = track({ id: 'audius:a', genre: 'Ambient' })
    const ambientAgain = track({ id: 'audius:b', genre: 'Ambient' })
    const lofi = track({ id: 'audius:c', genre: 'Lo-Fi' })
    const untagged = track({ id: 'audius:d', genre: undefined })

    const stats = computeListeningStats([
      play(ambient, 8),
      play(ambientAgain, 9),
      play(lofi, 10),
      play(untagged, 11),
    ])

    expect(stats.topGenre).toEqual({
      name: 'Ambient',
      plays: 2,
      share: 67,
    })
  })

  it('finds the busiest three-hour window instead of a single hour', () => {
    const first = track({ id: 'audius:a' })
    const stats = computeListeningStats([
      play(first, 7),
      play(first, 20),
      play(first, 21),
      play(first, 22),
    ])

    expect(stats.peakWindow).toEqual({
      start: 20,
      end: 23,
      plays: 3,
      label: 'Evening calm',
    })
    expect(stats.hourly[21]).toBe(1)
    expect(stats.hourly[5]).toBe(0)
  })

  it('labels parts of the day and formats hours for display', () => {
    expect(peakLabelForHour(2)).toBe('Night owl')
    expect(peakLabelForHour(8)).toBe('Morning listener')
    expect(peakLabelForHour(14)).toBe('Afternoon drift')
    expect(peakLabelForHour(19)).toBe('Evening calm')
    expect(formatHour(7)).toBe('07:00')
    expect(formatListeningTime(42)).toBe('42 min')
    expect(formatListeningTime(60)).toBe('1 hr')
    expect(formatListeningTime(185)).toBe('3 hr 5 min')
  })
})
