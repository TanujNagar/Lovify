import { beforeEach, describe, expect, it } from 'vitest'
import {
  backupFileName,
  buildBackup,
  exportBackup,
  importBackup,
  parseBackup,
  summarizeBackup,
} from '@/lib/backup'
import { db, type PlaylistRow } from '@/lib/db'
import { JAMENDO_CLIENT_ID_SETTING } from '@/lib/providers/jamendo'
import { YOUTUBE_KEY_SETTING } from '@/lib/youtube'
import type { Track } from '@/types/music'

const track: Track = {
  id: 'audius:42',
  provider: 'audius',
  providerId: '42',
  title: 'Slow Light',
  artist: 'Nova Hale',
  artistId: 'artist-nova',
  album: 'Night Signals',
  albumId: 'album-night',
  duration: 214,
  genre: 'Ambient',
}

const playlist: PlaylistRow = {
  id: 'playlist-liked',
  name: 'Liked Songs',
  trackIds: [track.id],
  createdAt: 1,
  updatedAt: 1,
  system: 'liked',
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function seed() {
  await db.tracks.put(track)
  await db.playlists.put(playlist)
  await db.playlistTracks.add({ playlistId: playlist.id, trackId: track.id, position: 0 })
  await db.likes.put({ trackId: track.id, addedAt: 100 })
  await db.history.bulkAdd([
    { trackId: track.id, playedAt: 1000 },
    { trackId: track.id, playedAt: 2000 },
  ])
  await db.settings.bulkPut([
    { key: YOUTUBE_KEY_SETTING, value: 'AIza-secret' },
    { key: JAMENDO_CLIENT_ID_SETTING, value: 'jamendo-secret' },
    { key: 'profileAvatar', value: 'data:image/jpeg;base64,abc' },
    { key: 'playerState', value: { trackId: track.id } },
  ])
}

describe('backup export', () => {
  it('never includes provider API keys or session state', async () => {
    await seed()

    const backup = await buildBackup()
    const keys = backup.settings.map((row) => row.key)

    expect(keys).toEqual(['profileAvatar'])
    const text = await exportBackup()
    expect(text).not.toContain('AIza-secret')
    expect(text).not.toContain('jamendo-secret')
    expect(text).not.toContain('playerState')
    expect(JSON.parse(text).history).toHaveLength(2)
  })

  it('summarizes what the file contains', async () => {
    await seed()
    const backup = await buildBackup()

    expect(summarizeBackup(backup)).toEqual({
      tracks: 1,
      playlists: 1,
      likes: 1,
      plays: 2,
      settings: 1,
    })
  })
})

describe('backup import', () => {
  it('restores playlists, likes, history and safe settings', async () => {
    await seed()
    const text = await exportBackup()

    await db.delete()
    await db.open()

    const result = await importBackup(text)

    expect(result.playlists).toBe(1)
    expect(result.plays).toBe(2)
    expect(await db.playlists.get(playlist.id)).toMatchObject({
      name: 'Liked Songs',
      trackIds: [track.id],
    })
    expect(await db.likes.get(track.id)).toMatchObject({ trackId: track.id })
    expect(await db.history.count()).toBe(2)
    expect(await db.settings.get('profileAvatar')).toBeTruthy()
    expect(await db.settings.get(YOUTUBE_KEY_SETTING)).toBeUndefined()
    expect(await db.playlistTracks.count()).toBe(1)
  })

  it('replaces the previous library instead of merging it', async () => {
    await seed()
    const text = await exportBackup()

    await db.playlists.put({ ...playlist, id: 'playlist-extra', system: undefined })
    await db.likes.put({ trackId: 'audius:99', addedAt: 500 })

    await importBackup(text)

    expect(await db.playlists.get('playlist-extra')).toBeUndefined()
    expect(await db.likes.get('audius:99')).toBeUndefined()
  })

  it('keeps Liked Songs even when the backup does not contain it', async () => {
    await db.playlists.put({ ...playlist, system: undefined })
    const backup = await buildBackup()
    backup.playlists = []

    await importBackup(JSON.stringify(backup))

    const liked = await db.playlists.get('playlist-liked')
    expect(liked?.system).toBe('liked')
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow('not valid JSON')
    expect(() => parseBackup(JSON.stringify({ app: 'other' }))).toThrow('not a Lovify backup')
    expect(() =>
      parseBackup(JSON.stringify({ app: 'lovify', version: 99, playlists: [], tracks: [] })),
    ).toThrow('newer version')
  })
})

describe('backup file name', () => {
  it('uses a date-stamped json name', () => {
    expect(backupFileName(new Date(2026, 10, 8))).toBe('lovify-backup-2026-11-08.json')
  })
})
