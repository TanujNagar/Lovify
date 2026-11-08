import { beforeEach, describe, expect, it } from 'vitest'
import {
  cacheTracks,
  createPlaylist,
  db,
  deletePlaylist,
  getHistory,
  getHistoryStats,
  getLikedTrackIds,
  getPlaylistById,
  getPlaylists,
  getTracksByIds,
  recordPlay,
  seedDatabase,
  toggleLike,
  updatePlaylist,
} from '@/lib/db'
import type { Track } from '@/types/music'

function makeTrack(id: string, duration = 120): Track {
  return {
    id: `audius:${id}`,
    provider: 'audius',
    providerId: id,
    title: `Song ${id}`,
    artist: `Artist ${id}`,
    artistId: `audius:user:${id}`,
    album: `Album ${id}`,
    albumId: `audius:playlist:${id}`,
    duration,
  }
}

const first = makeTrack('one', 120)
const second = makeTrack('two', 180)

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('Dexie schema and seed data', () => {
  it('seeds only the liked playlist once and never fakes tracks', async () => {
    await seedDatabase()
    await seedDatabase()

    expect(await db.tracks.count()).toBe(0)
    expect(await db.playlists.count()).toBe(1)

    const playlists = await getPlaylists()
    expect(playlists[0]).toMatchObject({
      id: 'playlist-liked',
      system: 'liked',
      trackIds: [],
    })
  })

  it('creates a playlist with ordered track rows', async () => {
    const playlist = await createPlaylist('Rainy window', 'Soft rain and slow chords', [
      first.id,
      second.id,
    ])

    const stored = await getPlaylistById(playlist.id)
    expect(stored?.name).toBe('Rainy window')
    expect(stored?.description).toBe('Soft rain and slow chords')

    const rows = await db.playlistTracks.where('playlistId').equals(playlist.id).toArray()
    expect(rows.map((row) => [row.position, row.trackId])).toEqual([
      [0, first.id],
      [1, second.id],
    ])
  })

  it('updates and deletes a playlist with its rows', async () => {
    const playlist = await createPlaylist('Temporary', '', [first.id])

    await updatePlaylist(playlist.id, {
      name: 'Kept',
      trackIds: [second.id, first.id],
    })

    expect((await getPlaylistById(playlist.id))?.name).toBe('Kept')
    expect(await db.playlistTracks.where('playlistId').equals(playlist.id).count()).toBe(2)

    await deletePlaylist(playlist.id)
    expect(await getPlaylistById(playlist.id)).toBeUndefined()
    expect(await db.playlistTracks.where('playlistId').equals(playlist.id).count()).toBe(0)
  })

  it('toggles likes and returns them newest first', async () => {
    expect(await toggleLike(first.id)).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 2))
    expect(await toggleLike(second.id)).toBe(true)
    expect(await getLikedTrackIds()).toEqual([second.id, first.id])

    expect(await toggleLike(first.id)).toBe(false)
    expect(await db.likes.get(first.id)).toBeUndefined()
  })

  it('caches real provider tracks and restores them by id', async () => {
    await cacheTracks([first, second])

    expect(await db.tracks.count()).toBe(2)
    const restored = await getTracksByIds([second.id, first.id, 'audius:missing'])
    expect(restored.map((track) => track.id)).toEqual([second.id, first.id])
  })

  it('records play history with real statistics and de-duplicates the list', async () => {
    await recordPlay(first)
    await recordPlay(second)
    await recordPlay(first)

    expect(await db.history.count()).toBe(3)

    const history = await getHistory(10)
    expect(history).toHaveLength(2)
    expect(history[0].track.id).toBe(first.id)

    const stats = await getHistoryStats()
    expect(stats.plays).toBe(3)
    expect(stats.minutes).toBe(Math.round((120 + 180 + 120) / 60))
  })
})
