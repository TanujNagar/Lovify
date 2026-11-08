import { db, getStorageSummary, type DownloadRow } from '@/lib/db'
import type { Track } from '@/types/music'

/**
 * Offline audio is kept in the browser Cache Storage, not in IndexedDB.
 * Only free-source tracks expose a direct audio URL, so only Jamendo and
 * Audius can be downloaded. YouTube always stays inside its official player.
 */
export const AUDIO_CACHE_NAME = 'lovify-audio-v1'

const CACHE_KEY_BASE = 'https://offline.lovify.local/audio/'

function cacheKey(trackId: string): string {
  return `${CACHE_KEY_BASE}${encodeURIComponent(trackId)}`
}

export function canDownloadTrack(track: Track): boolean {
  return track.provider !== 'youtube' && Boolean(track.streamUrl)
}

export function downloadUnavailableReason(track: Track): string | null {
  if (track.provider === 'youtube') {
    return 'YouTube plays through its official player and cannot be downloaded.'
  }
  if (!track.streamUrl) return 'This track has no free audio stream to download.'
  return null
}

export async function getDownloadRow(trackId: string): Promise<DownloadRow | undefined> {
  return db.downloads.get(trackId)
}

export async function getReadyDownloadIds(): Promise<string[]> {
  const rows = await db.downloads.where('status').equals('ready').toArray()
  return rows.map((row) => row.trackId)
}

export async function getDownloadedTrackIds(): Promise<string[]> {
  return getReadyDownloadIds()
}

export async function getDownloadedTracks(): Promise<Track[]> {
  const ids = await getReadyDownloadIds()
  if (!ids.length) return []
  const rows = await db.tracks.bulkGet(ids)
  return rows.filter((row): row is Track => Boolean(row))
}

/**
 * Resolves a downloaded track to a temporary object URL. The caller owns the
 * URL and must revoke it when playback moves on.
 */
export async function getDownloadedAudioUrl(trackId: string): Promise<string | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    const response = await cache.match(cacheKey(trackId))
    if (!response) return null
    const blob = await response.blob()
    if (!blob.size) return null
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function writeDownloadRow(row: DownloadRow): Promise<void> {
  await db.downloads.put(row)
}

/**
 * Downloads a free-source track into Cache Storage. The response is stored
 * under a synthetic same-origin key so playback never depends on the original
 * provider URL still being reachable.
 */
export async function downloadTrackAudio(track: Track): Promise<DownloadRow> {
  const reason = downloadUnavailableReason(track)
  if (reason || !track.streamUrl) {
    throw new Error(reason ?? 'This track cannot be downloaded.')
  }

  const existing = await db.downloads.get(track.id)
  if (existing?.status === 'ready') return existing

  const now = Date.now()
  const pending: DownloadRow = {
    trackId: track.id,
    status: 'downloading',
    addedAt: existing?.addedAt ?? now,
  }
  await writeDownloadRow(pending)

  try {
    await db.tracks.put(track)
    const response = await fetch(track.streamUrl, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    })
    if (!response.ok) {
      throw new Error(`The audio server answered with ${response.status}.`)
    }

    const blob = await response.blob()
    if (!blob.size) throw new Error('The audio file came back empty.')

    if (typeof caches === 'undefined') {
      throw new Error('This browser cannot keep offline downloads.')
    }
    const cache = await caches.open(AUDIO_CACHE_NAME)
    await cache.put(
      cacheKey(track.id),
      new Response(blob, {
        headers: {
          'Content-Type': blob.type || 'audio/mpeg',
          'Content-Length': String(blob.size),
        },
      }),
    )

    const ready: DownloadRow = {
      trackId: track.id,
      status: 'ready',
      bytes: blob.size,
      addedAt: pending.addedAt,
    }
    await writeDownloadRow(ready)
    return ready
  } catch (error) {
    await writeDownloadRow({
      trackId: track.id,
      status: 'failed',
      addedAt: pending.addedAt,
    })
    throw error
  }
}

export async function removeDownloadedTrack(trackId: string): Promise<void> {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME)
      await cache.delete(cacheKey(trackId))
    } catch {
      // The cache may be unavailable in private browsing; the row still goes.
    }
  }
  await db.downloads.delete(trackId)
}

export type DownloadStorage = {
  downloads: number
  bytes: number
  quota: number
  usage: number
  persisted: boolean
}

export async function getDownloadStorage(): Promise<DownloadStorage> {
  const summary = await getStorageSummary()
  let quota = 0
  let usage = summary.bytes
  let persisted = false

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      quota = estimate.quota ?? 0
      usage = Math.max(estimate.usage ?? 0, summary.bytes)
    } catch {
      // Estimates are optional; the download byte total is always available.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
    try {
      persisted = await navigator.storage.persisted()
    } catch {
      persisted = false
    }
  }

  return { downloads: summary.downloads, bytes: summary.bytes, quota, usage, persisted }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
