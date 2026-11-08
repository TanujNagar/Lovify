import { db } from '@/lib/db'
import type { Track } from '@/types/music'

export type LyricLine = { time: number; text: string }

export type LyricsResult = {
  kind: 'synced' | 'plain' | 'instrumental' | 'none'
  lines: LyricLine[]
  plain?: string
  matchedTitle?: string
  matchedArtist?: string
}

const LYRICS_TTL_MS = 7 * 24 * 60 * 60 * 1000
const LRCLIB = 'https://lrclib.net/api'

type LrclibPayload = {
  trackName?: string
  artistName?: string
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

function cleanTitle(title: string): string {
  return title
    .replace(/[([][^)\]]*(official|video|audio|lyrics?|visuali[sz]er|hd|4k|remaster)[^)\]]*[)\]]/gi, ' ')
    .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyrics?\s*video|with\s*lyrics|audio\s*only)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parses LRC lines, including multiple timestamps on one line. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  const timestamp = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g

  for (const rawLine of lrc.split(/\r?\n/)) {
    const matches = Array.from(rawLine.matchAll(timestamp))
    if (!matches.length) continue
    const text = rawLine.replace(timestamp, '').trim()
    if (!text) continue

    for (const match of matches) {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const fractionText = match[3] ?? '0'
      const fraction = Number(fractionText.padEnd(3, '0').slice(0, 3)) / 1000
      lines.push({ time: minutes * 60 + seconds + fraction, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

/** Returns the index of the active line, or -1 before the first line. */
export function activeLyricIndex(lines: LyricLine[], time: number): number {
  if (!lines.length) return -1
  let low = 0
  let high = lines.length - 1
  let result = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (lines[middle].time <= time + 0.05) {
      result = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return result
}

function fromPayload(payload: LrclibPayload): LyricsResult {
  if (payload.instrumental) {
    return { kind: 'instrumental', lines: [], matchedTitle: payload.trackName, matchedArtist: payload.artistName }
  }

  if (payload.syncedLyrics) {
    const lines = parseLrc(payload.syncedLyrics)
    if (lines.length) {
      return {
        kind: 'synced',
        lines,
        plain: payload.plainLyrics ?? undefined,
        matchedTitle: payload.trackName,
        matchedArtist: payload.artistName,
      }
    }
  }

  if (payload.plainLyrics?.trim()) {
    const lines = payload.plainLyrics
      .split(/\r?\n/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ time: 0, text }))
    return {
      kind: 'plain',
      lines,
      plain: payload.plainLyrics,
      matchedTitle: payload.trackName,
      matchedArtist: payload.artistName,
    }
  }

  return { kind: 'none', lines: [] }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10_000)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

  try {
    const response = await fetch(`${LRCLIB}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 404) return null
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

function cacheKey(track: Track): string {
  return `lyrics:${track.id}`
}

export async function getLyrics(track: Track, signal?: AbortSignal): Promise<LyricsResult> {
  const key = cacheKey(track)
  const cached = await db.lyricsCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload as LyricsResult
  }

  const title = cleanTitle(track.title)
  const params = new URLSearchParams({
    artist_name: track.artist,
    track_name: title,
  })
  if (track.album && track.album !== 'YouTube') params.set('album_name', track.album)
  if (track.duration > 0) params.set('duration', String(Math.round(track.duration)))

  let result = fromPayload(
    (await request<LrclibPayload>(`/get?${params.toString()}`, signal)) ?? {},
  )

  if (result.kind === 'none') {
    const searchParams = new URLSearchParams({
      track_name: title,
      artist_name: track.artist,
    })
    const found = await request<LrclibPayload[]>(
      `/search?${searchParams.toString()}`,
      signal,
    )
    if (Array.isArray(found)) {
      const best = found.find(
        (entry) => entry.syncedLyrics || entry.plainLyrics || entry.instrumental,
      )
      if (best) result = fromPayload(best)
    }
  }

  await db.lyricsCache.put({
    key,
    payload: result,
    expiresAt: Date.now() + LYRICS_TTL_MS,
  })

  return result
}
