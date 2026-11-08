import { db, type HistoryRow, type LikeRow, type SettingRow } from '@/lib/db'
import { JAMENDO_CLIENT_ID_SETTING } from '@/lib/providers/jamendo'
import { YOUTUBE_KEY_SETTING } from '@/lib/youtube'
import type { Playlist, Track } from '@/types/music'

/**
 * Settings that must never leave the device in a backup: provider credentials
 * and short-lived session/quota state. Everything else is the user's own
 * library and is safe to restore.
 */
export const BACKUP_EXCLUDED_SETTINGS = new Set<string>([
  YOUTUBE_KEY_SETTING,
  JAMENDO_CLIENT_ID_SETTING,
  'playerState',
  'youtubeQuotaBlockedDay',
])

export type BackupPayload = {
  app: 'lovify'
  version: 1
  exportedAt: string
  tracks: Track[]
  playlists: Playlist[]
  likes: LikeRow[]
  history: HistoryRow[]
  settings: SettingRow[]
}

export type BackupSummary = {
  tracks: number
  playlists: number
  likes: number
  plays: number
  settings: number
}

export type BackupImportResult = BackupSummary & {
  importedAt: string
}

const BACKUP_APP = 'lovify'
const BACKUP_VERSION = 1

export function summarizeBackup(backup: BackupPayload): BackupSummary {
  return {
    tracks: backup.tracks.length,
    playlists: backup.playlists.length,
    likes: backup.likes.length,
    plays: backup.history.length,
    settings: backup.settings.length,
  }
}

/**
 * Reads the local library and returns a plain JSON object. Provider API keys
 * are filtered out here, at the source, so they can never be serialized.
 */
export async function buildBackup(): Promise<BackupPayload> {
  const [tracks, playlists, likes, history, settings] = await Promise.all([
    db.tracks.toArray(),
    db.playlists.toArray(),
    db.likes.toArray(),
    db.history.orderBy('playedAt').toArray(),
    db.settings.toArray(),
  ])

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tracks,
    playlists,
    likes,
    history: history.map((row) => ({ trackId: row.trackId, playedAt: row.playedAt })),
    settings: settings.filter((row) => !BACKUP_EXCLUDED_SETTINGS.has(row.key)),
  }
}

export async function exportBackup(): Promise<string> {
  return JSON.stringify(await buildBackup(), null, 2)
}

export function backupFileName(date = new Date()): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  return `lovify-backup-${stamp}.json`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parsePlaylists(value: unknown): Playlist[] {
  if (!Array.isArray(value)) throw new Error('The backup is missing its playlists.')
  return value.map((item, index) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string') {
      throw new Error(`Playlist ${index + 1} in the backup is not valid.`)
    }
    return {
      id: item.id,
      name: item.name,
      description: typeof item.description === 'string' ? item.description : undefined,
      trackIds: stringArray(item.trackIds),
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : 0,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0,
      system:
        item.system === 'liked' || item.system === 'downloads' || item.system === 'radio'
          ? item.system
          : undefined,
    }
  })
}

function parseTracks(value: unknown): Track[] {
  if (!Array.isArray(value)) throw new Error('The backup is missing its tracks.')
  return value.filter((item): item is Track => {
    return (
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.provider === 'string' &&
      typeof item.title === 'string' &&
      typeof item.artist === 'string'
    )
  })
}

function parseLikes(value: unknown): LikeRow[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.trackId === 'string')
    .map((item) => ({
      trackId: item.trackId as string,
      addedAt: typeof item.addedAt === 'number' ? item.addedAt : 0,
    }))
}

function parseHistory(value: unknown): HistoryRow[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && typeof item.trackId === 'string' && typeof item.playedAt === 'number',
    )
    .map((item) => ({
      trackId: item.trackId as string,
      playedAt: item.playedAt as number,
    }))
}

function parseSettings(value: unknown): SettingRow[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.key === 'string')
    .filter((item) => !BACKUP_EXCLUDED_SETTINGS.has(item.key as string))
    .map((item) => ({ key: item.key as string, value: item.value }))
}

/** Parses and validates a JSON backup without touching the database. */
export function parseBackup(text: string): BackupPayload {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!isRecord(data) || data.app !== BACKUP_APP) {
    throw new Error('That file is not a Lovify backup.')
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of Lovify.')
  }

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    tracks: parseTracks(data.tracks),
    playlists: parsePlaylists(data.playlists),
    likes: parseLikes(data.likes),
    history: parseHistory(data.history),
    settings: parseSettings(data.settings),
  }
}

/**
 * Replaces the local library with the backup in one transaction. Keeping the
 * Liked Songs playlist seeded means the UI never has to handle a missing
 * system playlist mid-restore.
 */
export async function importBackup(text: string): Promise<BackupImportResult> {
  const backup = parseBackup(text)

  await db.transaction(
    'rw',
    [db.tracks, db.playlists, db.playlistTracks, db.likes, db.history, db.settings],
    async () => {
      await Promise.all([
        db.tracks.clear(),
        db.playlists.clear(),
        db.playlistTracks.clear(),
        db.likes.clear(),
        db.history.clear(),
        db.settings.clear(),
      ])

      if (backup.tracks.length) await db.tracks.bulkPut(backup.tracks)
      if (backup.likes.length) await db.likes.bulkPut(backup.likes)
      if (backup.settings.length) await db.settings.bulkPut(backup.settings)

      const playlists = [...backup.playlists]
      if (!playlists.some((playlist) => playlist.system === 'liked')) {
        playlists.unshift({
          id: 'playlist-liked',
          name: 'Liked Songs',
          description: 'Everything you have kept close.',
          trackIds: [],
          createdAt: 0,
          updatedAt: 0,
          system: 'liked',
        })
      }
      if (playlists.length) await db.playlists.bulkPut(playlists)

      const playlistTracks = playlists.flatMap((playlist) =>
        playlist.trackIds.map((trackId, position) => ({
          playlistId: playlist.id,
          trackId,
          position,
        })),
      )
      if (playlistTracks.length) await db.playlistTracks.bulkAdd(playlistTracks)

      // History uses auto-increment ids, so restore fresh rows in play order.
      if (backup.history.length) {
        await db.history.bulkAdd(
          [...backup.history].sort((a, b) => a.playedAt - b.playedAt),
        )
      }

      await db.settings.put({ key: 'seeded-v2', value: true })
    },
  )

  return {
    ...summarizeBackup(backup),
    importedAt: new Date().toISOString(),
  }
}
