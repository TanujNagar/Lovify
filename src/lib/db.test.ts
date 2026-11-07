import { beforeEach, describe, expect, it } from 'vitest'
import {
  createPlaylist,
  db,
  deletePlaylist,
  getLikedTrackIds,
  getPlaylistById,
  getPlaylists,
  seedDatabase,
  toggleLike,
  updatePlaylist,
} from '@/lib/db'
import { initialPlaylists, tracks } from '@/data/mock'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('Dexie schema and seed data', () => {
  it('seeds tracks, playlists, playlist rows and initial likes once', async () => {
    await seedDatabase()
    await seedDatabase()

    expect(await db.tracks.count()).toBe(tracks.length)
    expect(await db.playlists.count()).toBe(initialPlaylists.length)
    expect(await db.likes.count()).toBe(
      initialPlaylists.find((playlist) => playlist.system === 'liked')?.trackIds.length,
    )

    const playlists = await getPlaylists()
    expect(playlists[0].system).toBe('liked')
  })

  it('creates a playlist with ordered track rows', async () => {
    const playlist = await createPlaylist('Rainy window', 'Soft rain and slow chords', [
      'track-echoes-rain',
      'track-soft-focus',
    ])

    const stored = await getPlaylistById(playlist.id)
    expect(stored?.name).toBe('Rainy window')
    expect(stored?.description).toBe('Soft rain and slow chords')

    const rows = await db.playlistTracks.where('playlistId').equals(playlist.id).toArray()
    expect(rows.map((row) => [row.position, row.trackId])).toEqual([
      [0, 'track-echoes-rain'],
      [1, 'track-soft-focus'],
    ])
  })

  it('updates and deletes a playlist with its rows', async () => {
    const playlist = await createPlaylist('Temporary', '', ['track-subtle-glow'])

    await updatePlaylist(playlist.id, {
      name: 'Kept',
      trackIds: ['track-midnight-echoes', 'track-lunar-tides'],
    })

    expect((await getPlaylistById(playlist.id))?.name).toBe('Kept')
    expect(await db.playlistTracks.where('playlistId').equals(playlist.id).count()).toBe(2)

    await deletePlaylist(playlist.id)
    expect(await getPlaylistById(playlist.id)).toBeUndefined()
    expect(await db.playlistTracks.where('playlistId').equals(playlist.id).count()).toBe(0)
  })

  it('toggles likes and returns them newest first', async () => {
    expect(await toggleLike('track-midnight-echoes')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 2))
    expect(await toggleLike('track-quiet-storm')).toBe(true)
    expect(await getLikedTrackIds()).toEqual(['track-quiet-storm', 'track-midnight-echoes'])

    expect(await toggleLike('track-midnight-echoes')).toBe(false)
    expect(await db.likes.get('track-midnight-echoes')).toBeUndefined()
  })
})
