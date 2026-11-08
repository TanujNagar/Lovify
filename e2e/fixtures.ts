import type { Page } from '@playwright/test'

const user = {
  id: 'user-1',
  name: 'Night Sky',
  handle: 'nightsky',
  is_verified: true,
}

const users = [
  user,
  { id: 'user-2', name: 'Lumen Bay', handle: 'lumenbay' },
]

const tracks = [
  {
    id: 'track-1',
    title: 'Aurora Lines',
    duration: 212,
    genre: 'Ambient',
    is_available: true,
    is_streamable: true,
    is_delete: false,
    is_stream_gated: false,
    release_date: '2025-04-12T00:00:00Z',
    user,
    album_backlink: { playlist_id: 10, playlist_name: 'Afterglow' },
  },
  {
    id: 'track-2',
    title: 'Slow Orbit',
    duration: 188,
    genre: 'Downtempo',
    is_available: true,
    is_streamable: true,
    user: users[1],
    album_backlink: { playlist_id: 10, playlist_name: 'Afterglow' },
  },
  {
    id: 'track-3',
    title: 'Velvet Rain',
    duration: 241,
    genre: 'Lo-Fi',
    is_available: true,
    is_streamable: true,
    user,
    album_backlink: { playlist_id: 10, playlist_name: 'Afterglow' },
  },
  {
    id: 'track-4',
    title: 'Quiet Hours',
    duration: 203,
    genre: 'Ambient',
    is_available: true,
    is_streamable: true,
    user: users[1],
    album_backlink: { playlist_id: 10, playlist_name: 'Afterglow' },
  },
]

const playlists = [
  {
    id: '10',
    playlist_name: 'Afterglow',
    is_album: true,
    track_count: tracks.length,
    description: 'Slow light and softer edges.',
    user,
    tracks,
  },
  {
    id: '11',
    playlist_name: 'Rain Window',
    is_album: false,
    track_count: 2,
    description: 'A quiet room and steady rain.',
    user: users[1],
    tracks: tracks.slice(0, 2),
  },
]

/**
 * A short, valid silent WAV so the real <audio> element can start playback in
 * headless Chromium without reaching the network.
 */
function silentWav(seconds = 30): Buffer {
  const sampleRate = 8_000
  const samples = sampleRate * seconds
  const dataSize = samples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  return buffer
}

const audio = silentWav()

export type AudiusFixtureCounts = { search: number; youtube: number }

/**
 * Intercepts every Audius response and the optional YouTube status route so
 * tests are deterministic and never touch the real APIs.
 */
export async function installMusicFixtures(page: Page): Promise<AudiusFixtureCounts> {
  const counts: AudiusFixtureCounts = { search: 0, youtube: 0 }

  await page.route('https://api.audius.co/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.endsWith('/tracks/search')) {
      counts.search += 1
      await route.fulfill({ json: { data: tracks } })
      return
    }

    if (path.endsWith('/users/search')) {
      await route.fulfill({ json: { data: users } })
      return
    }

    if (path.endsWith('/playlists/search')) {
      await route.fulfill({ json: { data: playlists } })
      return
    }

    if (path.endsWith('/tracks/trending')) {
      await route.fulfill({ json: { data: tracks } })
      return
    }

    if (path.endsWith('/playlists/trending')) {
      await route.fulfill({ json: { data: playlists } })
      return
    }

    if (/\/tracks\/[^/]+\/stream$/.test(path)) {
      await route.fulfill({ status: 200, contentType: 'audio/wav', body: audio })
      return
    }

    if (path.endsWith('/tracks') || /\/users\/[^/]+\/tracks$/.test(path)) {
      await route.fulfill({ json: { data: tracks } })
      return
    }

    if (/\/tracks\/[^/]+$/.test(path)) {
      const id = path.split('/').pop()
      const track = tracks.find((item) => item.id === id) ?? tracks[0]
      await route.fulfill({ json: { data: [track] } })
      return
    }

    if (/\/playlists\/[^/]+$/.test(path)) {
      const id = path.split('/').pop()
      const playlist = playlists.find((item) => item.id === id) ?? playlists[0]
      await route.fulfill({ json: { data: [playlist] } })
      return
    }

    await route.fulfill({ json: { data: [] } })
  })

  await page.route('**/api/youtube/**', async (route) => {
    counts.youtube += 1
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/status')) {
      await route.fulfill({ json: { configured: false } })
      return
    }
    await route.fulfill({
      status: 503,
      json: { error: 'not_configured', message: 'The shared YouTube key is not configured.' },
    })
  })

  return counts
}

export async function searchFor(page: Page, query = 'aurora') {
  await page.goto('/search')
  const input = page.getByRole('searchbox', { name: 'Search artists, songs, albums' })
  await input.fill(query)
  const playButton = page.getByRole('button', { name: 'Play Aurora Lines by Night Sky' })
  await playButton.waitFor({ state: 'visible', timeout: 15_000 })
  return playButton
}

export async function playFirstResult(page: Page) {
  const button = await searchFor(page)
  await button.click()
  const mini = page.getByRole('region', { name: 'Now playing' })
  await mini.waitFor({ state: 'visible', timeout: 10_000 })
  return mini
}
