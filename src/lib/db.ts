import Dexie, { type Table } from 'dexie'
import { initialPlaylists, tracks } from '@/data/mock'
import type { Playlist, ProviderId, Track } from '@/types/music'

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

export type TrackRow = Track

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
  }
}

export const db = new LovifyDatabase()

export async function seedDatabase(): Promise<void> {
  const seeded = await db.settings.get('seeded')
  if (seeded) return

  await db.transaction(
    'rw',
    [db.tracks, db.playlists, db.playlistTracks, db.likes, db.settings],
    async () => {
      await db.tracks.bulkPut(tracks)
      await db.playlists.bulkPut(initialPlaylists.map((playlist) => ({ ...playlist })))

      const rows = initialPlaylists.flatMap((playlist) =>
        playlist.trackIds.map((trackId, position) => ({
          playlistId: playlist.id,
          trackId,
          position,
        })),
      )
      await db.playlistTracks.bulkAdd(rows)

      const liked = initialPlaylists.find((playlist) => playlist.system === 'liked')
      if (liked) {
        await db.likes.bulkPut(
          liked.trackIds.map((trackId, index) => ({
            trackId,
            addedAt: Date.now() - index * 1000,
          })),
        )
      }

      await db.settings.put({ key: 'seeded', value: true })
    },
  )
}

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

export async function updatePlaylist(
  id: string,
  changes: Partial<Pick<PlaylistRow, 'name' | 'description' | 'trackIds'>>,
): Promise<void> {
  await db.playlists.update(id, {
    ...changes,
    updatedAt: Date.now(),
  })

  if (changes.trackIds) {
    await db.transaction('rw', db.playlistTracks, async () => {
      await db.playlistTracks.where('playlistId').equals(id).delete()
      await db.playlistTracks.bulkAdd(
        changes.trackIds!.map((trackId, position) => ({
          playlistId: id,
          trackId,
          position,
        })),
      )
    })
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  await db.transaction('rw', [db.playlists, db.playlistTracks], async () => {
    await db.playlists.delete(id)
    await db.playlistTracks.where('playlistId').equals(id).delete()
  })
}

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
