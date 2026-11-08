import { normalizeText } from '@/lib/providers/types'
import type { ProviderId, SearchResults } from '@/types/music'

// Dexie is a sizeable dependency. Load it only when a cached search or the
// quota counter is actually used, never on the first paint.
const loadDb = () => import('@/lib/db')

export const SEARCH_TTL_MS = 24 * 60 * 60 * 1000

export const YOUTUBE_DAILY_UNITS = 10_000
export const YOUTUBE_SEARCH_COST = 100
export const YOUTUBE_DETAIL_COST = 1
export const YOUTUBE_WARNING_PERCENT = 80

const QUOTA_BLOCKED_SETTING = 'youtubeQuotaBlockedDay'

export function searchCacheKey(provider: ProviderId, query: string): string {
  return `${provider}:${normalizeText(query)}`
}

function isSearchResults(value: unknown): value is SearchResults {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SearchResults>
  return (
    Array.isArray(candidate.tracks) &&
    Array.isArray(candidate.artists) &&
    Array.isArray(candidate.albums)
  )
}

/**
 * Returns cached results only while they are younger than 24 hours.
 * Expired rows are removed instead of being left to grow forever.
 */
export async function readSearchCache(
  provider: ProviderId,
  query: string,
  now = Date.now(),
): Promise<SearchResults | null> {
  const { db } = await loadDb()
  const key = searchCacheKey(provider, query)
  const row = await db.searchCache.get(key)
  if (!row) return null

  if (row.expiresAt <= now || !isSearchResults(row.results)) {
    await db.searchCache.delete(key)
    return null
  }

  return row.results
}

export async function writeSearchCache(
  provider: ProviderId,
  query: string,
  results: SearchResults,
  now = Date.now(),
  ttl = SEARCH_TTL_MS,
): Promise<void> {
  const { db } = await loadDb()
  const key = searchCacheKey(provider, query)
  await db.searchCache.put({
    key,
    query: normalizeText(query),
    provider,
    results,
    expiresAt: now + ttl,
  })

  // Opportunistic cleanup keeps the table small without a background job.
  await db.searchCache.where('expiresAt').belowOrEqual(now).delete()
}

/** Local calendar day for the quota counter. */
export function dayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function usageKey(date = new Date()): string {
  return `youtube:${dayKey(date)}`
}

export type YouTubeUsage = {
  units: number
  limit: number
  percent: number
  warning: boolean
  blocked: boolean
}

export async function getYouTubeUsage(date = new Date()): Promise<YouTubeUsage> {
  const { db, getSetting } = await loadDb()
  const row = await db.usage.get(usageKey(date))
  const units = Math.min(YOUTUBE_DAILY_UNITS, Math.max(0, row?.count ?? 0))
  const blockedDay = await getSetting<string>(QUOTA_BLOCKED_SETTING)
  return {
    units,
    limit: YOUTUBE_DAILY_UNITS,
    percent: Math.round((units / YOUTUBE_DAILY_UNITS) * 100),
    warning: units >= (YOUTUBE_DAILY_UNITS * YOUTUBE_WARNING_PERCENT) / 100,
    blocked: blockedDay === dayKey(date),
  }
}

export async function addYouTubeUsage(units: number, date = new Date()): Promise<YouTubeUsage> {
  const { db } = await loadDb()
  const key = usageKey(date)
  const row = await db.usage.get(key)
  const next = Math.min(YOUTUBE_DAILY_UNITS, (row?.count ?? 0) + units)
  await db.usage.put({ key, count: next, updatedAt: Date.now() })
  return getYouTubeUsage(date)
}

export async function isYouTubeBlocked(date = new Date()): Promise<boolean> {
  const { getSetting } = await loadDb()
  const blockedDay = await getSetting<string>(QUOTA_BLOCKED_SETTING)
  return blockedDay === dayKey(date)
}

export async function blockYouTubeForToday(date = new Date()): Promise<void> {
  const { setSetting } = await loadDb()
  await setSetting(QUOTA_BLOCKED_SETTING, dayKey(date))
}

export function formatUnits(value: number): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(value)
}
