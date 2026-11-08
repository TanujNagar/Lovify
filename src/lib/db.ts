import Dexie, { type Table } from 'dexie'
import type { HistoryEntry, Playlist, ProviderId, Track } from '@/types/music'

export type PlaylistRow = Playlist

export type PlaylistTrackRow = {
  id?: number
  playlistId: string
  trackId: string
  position: number
}

export type LikeRow = {
  trackId: string
  addedAt: number
}

export type HistoryRow = {
  id?: number
  trackId: string
  playedAt: number
}

export type SettingRow = {
  key: string
  value: unknown
}

export type SearchCacheRow = {
  key: string
  query: string
  provider: ProviderId
  results: unknown
  expiresAt: number
}

export type DownloadRow = {
  trackId: string
  status: 'queued' | 'downloading' | 'ready' | 'failed'
  bytes?: number
  addedAt: number
}

export type UsageRow = {
  key: string
  count: number
  updatedAt: number
}

export type LyricsCacheRow = {
  key: string
  payload: unknown
  expiresAt: number
}

export type TrackRow = Track

const LIKED_PLAYLIST_ID = 'playlist-liked'

class LovifyDatabase extends Dexie {
  tracks!: Table<TrackRow, string>
  playlists!: Table<PlaylistRow, string>
  playlistTracks!: Table<PlaylistTrackRow, number>
  likes!: Table<LikeRow, string>
  history!: Table<HistoryRow, number>
  settings!: Table<SettingRow, string>
  searchCache!: Table<SearchCacheRow, string>
  downloads!: Table<DownloadRow, string>
  usage!: Table<UsageRow, string>
  lyricsCache!: Table<LyricsCacheRow, string>

  constructor() {
    super('lovify')
    this.version(1).stores({
      tracks: 'id, provider, artistId, albumId, title',
      playlists: 'id, name, updatedAt, system',
      playlistTracks: '++id, playlistId, position, trackId, [playlistId+position]',
      likes: 'trackId, addedAt',
      history: '++id, trackId, playedAt',
      settings: 'key',
      searchCache: 'key, provider, expiresAt',
      downloads: 'trackId, status, addedAt',
      usage: 'key',
    })

    this.version(2)
      .stores({
        tracks: 'id, provider, artistId, albumId, title',
        playlists: 'id, name, updatedAt, system',
        playlistTracks: '++id, playlistId, position, trackId, [playlistId+position]',
        likes: 'trackId, addedAt',
        history: '++id, trackId, playedAt',
        settings: 'key',
        searchCache: 'key, provider, expiresAt',
        downloads: 'trackId, status, addedAt',
        usage: 'key',
        lyricsCache: 'key, expiresAt',
      })
      .upgrade(async (transaction) => {
        // Phase 1 shipped a fictional catalog. Remove those rows so no fake
        // artist or track can leak into the real provider catalog.
        await transaction.table('tracks').where('provider').equals('mock').delete()
        const seededPlaylistIds = [
          'playlist-atmospheric-focus',
          'playlist-night-flow',
          'playlist-quiet-storm',
        ]
        await transaction.table('playlists').bulkDelete(seededPlaylistIds)
        for (const playlistId of seededPlaylistIds) {
          await transaction
            .table('playlistTracks')
            .where('playlistId')
            .equals(playlistId)
            .delete()
        }
        await transaction.table('searchCache').clear()
        await transaction.table('settings').delete('seeded')
      })
  }
}

export const db = new LovifyDatabase()

export async function seedDatabase(): Promise<void> {
  const seeded = await db.settings.get('seeded-v2')
  if (seeded) return

  await db.transaction('rw', [db.playlists, db.settings], async () => {
    const liked = await db.playlists.get(LIKED_PLAYLIST_ID)
    if (!liked) {
      await db.playlists.put({
        id: LIKED_PLAYLIST_ID,
        name: 'Liked Songs',
        description: 'Everything you have kept close.',
        trackIds: [],
        createdAt: 0,
        updatedAt: 0,
        system: 'liked',
      })
    } else if (!liked.system) {
      await db.playlists.update(LIKED_PLAYLIST_ID, { system: 'liked' })
    }
    await db.settings.put({ key: 'seeded-v2', value: true })
  })
}

/* -------------------------------------------------------------------------- */
/* Tracks                                                                      */
/* -------------------------------------------------------------------------- */

export async function cacheTracks(tracks: Track[]): Promise<void> {
  if (!tracks.length) return
  await db.tracks.bulkPut(tracks)
}

export async function getTrackById(id: string): Promise<Track | undefined> {
  return db.tracks.get(id)
}

export async function getTracksByIds(ids: string[]): Promise<Track[]> {
  if (!ids.length) return []
  const rows = await db.tracks.bulkGet(ids)
  return rows.filter((row): row is Track => Boolean(row))
}

export async function getTracksByAlbum(albumId: string): Promise<Track[]> {
  return db.tracks.where('albumId').equals(albumId).toArray()
}

export async function getTracksByArtist(artistId: string): Promise<Track[]> {
  return db.tracks.where('artistId').equals(artistId).toArray()
}

/** Local catalogue snapshot used by recommendations and offline browsing. */
export async function getAllCachedTracks(limit = 400): Promise<Track[]> {
  const rows = await db.tracks.toArray()
  return rows.slice(0, limit)
}

/* -------------------------------------------------------------------------- */
/* Playlists                                                                   */
/* -------------------------------------------------------------------------- */

export async function getPlaylists(): Promise<PlaylistRow[]> {
  const playlists = await db.playlists.toArray()
  return playlists.sort((a, b) => {
    if (a.system === 'liked') return -1
    if (b.system === 'liked') return 1
    return b.updatedAt - a.updatedAt
  })
}

export async function getPlaylistById(id: string): Promise<PlaylistRow | undefined> {
  return db.playlists.get(id)
}

export async function createPlaylist(
  name: string,
  description: string,
  trackIds: string[] = [],
): Promise<PlaylistRow> {
  const now = Date.now()
  const playlist: PlaylistRow = {
    id: `playlist-${crypto.randomUUID()}`,
    name: name.trim(),
    description: description.trim() || undefined,
    trackIds,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', [db.playlists, db.playlistTracks], async () => {
    await db.playlists.add(playlist)
    await db.playlistTracks.bulkAdd(
      trackIds.map((trackId, position) => ({
        playlistId: playlist.id,
        trackId,
        position,
      })),
    )
  })

  return playlist
}

export async function setPlaylistTracks(id: string, trackIds: string[]): Promise<void> {
  await db.transaction('rw', [db.playlists, db.playlistTracks], async () => {
    await db.playlists.update(id, { trackIds, updatedAt: Date.now() })
    await db.playlistTracks.where('playlistId').equals(id).delete()
    if (trackIds.length) {
      await db.playlistTracks.bulkAdd(
        trackIds.map((trackId, position) => ({
          playlistId: id,
          trackId,
          position,
        })),
      )
    }
  })
}

export async function updatePlaylist(
  id: string,
  changes: Partial<Pick<PlaylistRow, 'name' | 'description' | 'trackIds'>>,
): Promise<void> {
  const { trackIds, ...rest } = changes
  if (Object.keys(rest).length > 0) {
    await db.playlists.update(id, {
      ...rest,
      updatedAt: Date.now(),
    })
  }
  if (trackIds) {
    await setPlaylistTracks(id, trackIds)
  }
}

export async function renamePlaylist(
  id: string,
  name: string,
  description?: string,
): Promise<void> {
  await db.playlists.update(id, {
    name: name.trim(),
    description: description?.trim() || undefined,
    updatedAt: Date.now(),
  })
}

export async function addTracksToPlaylist(id: string, trackIds: string[]): Promise<void> {
  const playlist = await db.playlists.get(id)
  if (!playlist) return
  const existing = new Set(playlist.trackIds)
  const additions = trackIds.filter((trackId) => !existing.has(trackId))
  if (!additions.length) return
  await setPlaylistTracks(id, [...playlist.trackIds, ...additions])
}

export async function removeTrackFromPlaylist(id: string, trackId: string): Promise<void> {
  const playlist = await db.playlists.get(id)
  if (!playlist) return
  await setPlaylistTracks(
    id,
    playlist.trackIds.filter((item) => item !== trackId),
  )
}

export async function movePlaylistTrack(
  id: string,
  fromIndex: number,
  toIndex: number,
): Promise<void> {
  const playlist = await db.playlists.get(id)
  if (!playlist) return
  const next = [...playlist.trackIds]
  if (
    fromIndex < 0 ||
    fromIndex >= next.length ||
    toIndex < 0 ||
    toIndex >= next.length ||
    fromIndex === toIndex
  ) {
    return
  }
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  await setPlaylistTracks(id, next)
}

export async function deletePlaylist(id: string): Promise<void> {
  await db.transaction('rw', [db.playlists, db.playlistTracks], async () => {
    await db.playlists.delete(id)
    await db.playlistTracks.where('playlistId').equals(id).delete()
  })
}

/* -------------------------------------------------------------------------- */
/* Likes                                                                       */
/* -------------------------------------------------------------------------- */

export async function getLikedTrackIds(): Promise<string[]> {
  const likes = await db.likes.toArray()
  return likes.sort((a, b) => b.addedAt - a.addedAt).map((like) => like.trackId)
}

export async function toggleLike(trackId: string): Promise<boolean> {
  const existing = await db.likes.get(trackId)
  if (existing) {
    await db.likes.delete(trackId)
    return false
  }

  await db.likes.add({ trackId, addedAt: Date.now() })
  return true
}

/* -------------------------------------------------------------------------- */
/* History                                                                     */
/* -------------------------------------------------------------------------- */

const HISTORY_LIMIT = 500

export async function recordPlay(track: Track): Promise<void> {
  await db.transaction('rw', [db.tracks, db.history], async () => {
    await db.tracks.put(track)
    await db.history.add({ trackId: track.id, playedAt: Date.now() })
    const total = await db.history.count()
    if (total > HISTORY_LIMIT) {
      const oldRows = await db.history
        .orderBy('playedAt')
        .reverse()
        .offset(HISTORY_LIMIT)
        .toArray()
      const ids = oldRows
        .map((row) => row.id)
        .filter((id): id is number => typeof id === 'number')
      if (ids.length) await db.history.bulkDelete(ids)
    }
  })
}

export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const rows = await db.history.orderBy('playedAt').reverse().toArray()
  const trackIds = Array.from(new Set(rows.map((row) => row.trackId)))
  const tracks = await getTracksByIds(trackIds)
  const byId = new Map(tracks.map((track) => [track.id, track]))
  const seen = new Set<string>()
  const entries: HistoryEntry[] = []

  for (const row of rows) {
    if (seen.has(row.trackId)) continue
    const track = byId.get(row.trackId)
    if (!track) continue
    seen.add(row.trackId)
    entries.push({ track, playedAt: row.playedAt })
    if (entries.length >= limit) break
  }

  return entries
}

/**
 * Every play row in reverse chronological order, including repeats. Profile
 * statistics need the repeats; the visual history list uses getHistory().
 */
export async function getPlayHistory(limit = 2000): Promise<HistoryEntry[]> {
  const rows = await db.history.orderBy('playedAt').reverse().limit(limit).toArray()
  const trackIds = Array.from(new Set(rows.map((row) => row.trackId)))
  const tracks = await getTracksByIds(trackIds)
  const byId = new Map(tracks.map((track) => [track.id, track]))
  const entries: HistoryEntry[] = []

  for (const row of rows) {
    const track = byId.get(row.trackId)
    if (track) entries.push({ track, playedAt: row.playedAt })
  }

  return entries
}

export async function getHistoryStats(): Promise<{
  plays: number
  minutes: number
}> {
  const rows = await db.history.toArray()
  const trackIds = Array.from(new Set(rows.map((row) => row.trackId)))
  const tracks = await getTracksByIds(trackIds)
  const byId = new Map(tracks.map((track) => [track.id, track]))
  const seconds = rows.reduce((sum, row) => sum + (byId.get(row.trackId)?.duration ?? 0), 0)
  return { plays: rows.length, minutes: Math.round(seconds / 60) }
}

export async function clearHistory(): Promise<void> {
  await db.history.clear()
}

/* -------------------------------------------------------------------------- */
/* Settings, cache and usage                                                   */
/* -------------------------------------------------------------------------- */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key)
  return row?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}

export async function removeSetting(key: string): Promise<void> {
  await db.settings.delete(key)
}

export async function clearSearchCache(): Promise<void> {
  await db.searchCache.clear()
}

export async function getStorageSummary(): Promise<{ downloads: number; bytes: number }> {
  const downloads = await db.downloads.toArray()
  return {
    downloads: downloads.length,
    bytes: downloads.reduce((sum, item) => sum + (item.bytes ?? 0), 0),
  }
}

export { LIKED_PLAYLIST_ID }
