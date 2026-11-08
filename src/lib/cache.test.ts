import { beforeEach, describe, expect, it } from 'vitest'
import {
  SEARCH_TTL_MS,
  YOUTUBE_DAILY_UNITS,
  addYouTubeUsage,
  blockYouTubeForToday,
  getYouTubeUsage,
  isYouTubeBlocked,
  readSearchCache,
  searchCacheKey,
  writeSearchCache,
} from '@/lib/cache'
import { db } from '@/lib/db'
import type { SearchResults } from '@/types/music'

const results: SearchResults = {
  tracks: [
    {
      id: 'audius:1',
      provider: 'audius',
      providerId: '1',
      title: 'Aurora',
      artist: 'Night Sky',
      artistId: 'audius:user:1',
      album: 'Aurora',
      albumId: 'audius:playlist:1',
      duration: 200,
    },
  ],
  artists: [],
  albums: [],
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('search cache', () => {
  it('normalizes the query into a per-provider cache key', () => {
    expect(searchCacheKey('audius', '  Aurora  Skies ')).toBe('audius:aurora skies')
    expect(searchCacheKey('youtube', 'AURORA')).toBe('youtube:aurora')
  })

  it('returns cached results for 24 hours and then deletes them', async () => {
    const now = Date.now()
    await writeSearchCache('audius', 'aurora', results, now)

    expect(await readSearchCache('audius', 'AURORA', now + 60_000)).toEqual(results)

    expect(await readSearchCache('audius', 'aurora', now + SEARCH_TTL_MS)).toBeNull()
    expect(await db.searchCache.count()).toBe(0)
  })

  it('keeps providers independent even for the same query', async () => {
    const now = Date.now()
    await writeSearchCache('audius', 'aurora', results, now)

    expect(await readSearchCache('jamendo', 'aurora', now)).toBeNull()
    expect(await readSearchCache('audius', 'aurora', now)).toEqual(results)
  })

  it('drops malformed rows instead of trusting them', async () => {
    await db.searchCache.put({
      key: searchCacheKey('audius', 'broken'),
      query: 'broken',
      provider: 'audius',
      results: { tracks: 'not-an-array' },
      expiresAt: Date.now() + 60_000,
    })

    expect(await readSearchCache('audius', 'broken')).toBeNull()
    expect(await db.searchCache.count()).toBe(0)
  })
})

describe('YouTube quota usage', () => {
  const now = new Date('2026-01-15T10:00:00')

  it('counts units, caps at the daily limit and warns at 80 percent', async () => {
    await addYouTubeUsage(100, now)
    expect((await getYouTubeUsage(now)).units).toBe(100)

    await addYouTubeUsage(8_100, now)
    const usage = await getYouTubeUsage(now)
    expect(usage.units).toBe(8_200)
    expect(usage.percent).toBe(82)
    expect(usage.warning).toBe(true)

    await addYouTubeUsage(YOUTUBE_DAILY_UNITS * 2, now)
    expect((await getYouTubeUsage(now)).units).toBe(YOUTUBE_DAILY_UNITS)
  })

  it('blocks YouTube for the rest of the local day only', async () => {
    await blockYouTubeForToday(now)

    expect(await isYouTubeBlocked(now)).toBe(true)
    expect((await getYouTubeUsage(now)).blocked).toBe(true)

    const tomorrow = new Date('2026-01-16T09:00:00')
    expect(await isYouTubeBlocked(tomorrow)).toBe(false)
    expect((await getYouTubeUsage(tomorrow)).blocked).toBe(false)
  })
})
