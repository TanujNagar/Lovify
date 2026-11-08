import { expect, test, type Page } from '@playwright/test'

/**
 * Tracks used by the reorder test. They are written straight into IndexedDB so
 * the test focuses on drag-and-drop and persistence rather than on search.
 */
const reorderTracks = [
  {
    id: 'audius:track-1',
    provider: 'audius',
    providerId: 'track-1',
    title: 'Aurora Lines',
    artist: 'Night Sky',
    artistId: 'user-1',
    album: 'Afterglow',
    albumId: '10',
    duration: 212,
    genre: 'Ambient',
  },
  {
    id: 'audius:track-2',
    provider: 'audius',
    providerId: 'track-2',
    title: 'Slow Orbit',
    artist: 'Lumen Bay',
    artistId: 'user-2',
    album: 'Afterglow',
    albumId: '10',
    duration: 188,
    genre: 'Downtempo',
  },
  {
    id: 'audius:track-3',
    provider: 'audius',
    providerId: 'track-3',
    title: 'Velvet Rain',
    artist: 'Night Sky',
    artistId: 'user-1',
    album: 'Afterglow',
    albumId: '10',
    duration: 241,
    genre: 'Lo-Fi',
  },
]

async function seedReorderPlaylist(page: Page) {
  await page.goto('/library')
  await expect(page.getByRole('heading', { level: 1, name: 'Your Library' })).toBeVisible()

  await page.evaluate(async (tracks) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('lovify')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        ['tracks', 'playlists', 'playlistTracks', 'settings'],
        'readwrite',
      )
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)

      const trackStore = transaction.objectStore('tracks')
      for (const track of tracks) trackStore.put(track)

      transaction.objectStore('playlists').put({
        id: 'playlist-e2e',
        name: 'Phase 3 Order',
        description: 'Reorder me',
        trackIds: tracks.map((track) => track.id),
        createdAt: 1,
        updatedAt: 1,
      })

      const playlistTracks = transaction.objectStore('playlistTracks')
      tracks.forEach((track, position) => {
        playlistTracks.add({ playlistId: 'playlist-e2e', trackId: track.id, position })
      })

      transaction.objectStore('settings').put({ key: 'seeded-v2', value: true })
    })

    database.close()
  }, reorderTracks)

  await page.goto('/playlist/playlist-e2e')
  await expect(page.getByRole('heading', { level: 1, name: 'Phase 3 Order' })).toBeVisible()
}

async function trackOrder(page: Page): Promise<string[]> {
  return page
    .locator('#main-content')
    .getByRole('button', { name: /^Play .+ by .+$/ })
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label')?.replace(/^Play /, '') ?? ''),
    )
}

test.describe('Phase 3 playlist reorder', () => {
  test('reorders a playlist with the keyboard and keeps it after reload', async ({ page }) => {
    await seedReorderPlaylist(page)

    expect(await trackOrder(page)).toEqual([
      'Aurora Lines by Night Sky',
      'Slow Orbit by Lumen Bay',
      'Velvet Rain by Night Sky',
    ])

    const handle = page.getByRole('button', { name: /^Reorder Aurora Lines/ })
    await handle.focus()
    await page.keyboard.press('Space')
    await page.waitForTimeout(250)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(250)
    await page.keyboard.press('Space')
    await page.waitForTimeout(250)

    await expect
      .poll(() => trackOrder(page), { timeout: 10_000 })
      .toEqual([
        'Slow Orbit by Lumen Bay',
        'Aurora Lines by Night Sky',
        'Velvet Rain by Night Sky',
      ])

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Phase 3 Order' })).toBeVisible()

    expect(await trackOrder(page)).toEqual([
      'Slow Orbit by Lumen Bay',
      'Aurora Lines by Night Sky',
      'Velvet Rain by Night Sky',
    ])
  })
})
