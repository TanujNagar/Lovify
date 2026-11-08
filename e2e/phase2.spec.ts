import { expect, test } from '@playwright/test'
import { installMusicFixtures, playFirstResult } from './fixtures'

test.describe('Phase 2 music flow', () => {
  test('searches, plays, likes and adds a track to a playlist', async ({ page }) => {
    await installMusicFixtures(page)

    await page.goto('/library')
    await page.getByRole('button', { name: 'New', exact: true }).click()
    const create = page.getByRole('dialog', { name: 'New playlist' })
    await create.getByLabel('Name').fill('Road Trip')
    await create.getByRole('button', { name: 'Create playlist' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Road Trip' })).toBeVisible()

    const mini = await playFirstResult(page)

    await mini.getByRole('button', { name: 'Like current track' }).click()
    await expect(mini.getByRole('button', { name: 'Remove from liked songs' })).toBeVisible()

    await page.getByRole('button', { name: 'More options for Aurora Lines' }).click()
    const trackMenu = page.getByRole('dialog', { name: 'Aurora Lines' })
    await expect(trackMenu).toBeVisible()
    await trackMenu.getByRole('button', { name: /Road Trip/ }).click()
    await expect(page.getByText('Added to playlist.')).toBeVisible()

    await page.getByRole('link', { name: 'Library', exact: true }).click()
    await page.getByRole('link', { name: /Road Trip/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Road Trip' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /(Play|Pause) Aurora Lines by Night Sky/i }),
    ).toBeVisible()
  })

  test('restores the paused queue after a reload', async ({ page }) => {
    await installMusicFixtures(page)
    await playFirstResult(page)
    // Player persistence debounces writes by 450 ms, and the media element may
    // report `playing` a little later, so give the write a comfortable margin.
    await page.waitForTimeout(1500)

    await page.reload()

    const mini = page.getByRole('region', { name: 'Now playing' })
    await expect(mini).toBeVisible({ timeout: 10_000 })
    await expect(mini.getByRole('button', { name: 'Resume playback' })).toBeVisible()

    await page.goto('/queue')
    const main = page.locator('#main-content')
    await expect(main.getByRole('heading', { level: 1, name: 'Queue' })).toBeVisible()
    await expect(main.getByText('Slow Orbit')).toBeVisible()
  })

  test('serves a repeated search from the local cache without another request', async ({
    page,
  }) => {
    const counts = await installMusicFixtures(page)

    await page.goto('/search')
    const input = page.getByRole('searchbox', { name: 'Search artists, songs, albums' })

    await input.fill('aurora')
    await expect(
      page.getByRole('button', { name: /Play Aurora Lines by Night Sky/i }),
    ).toBeVisible()
    expect(counts.search).toBe(1)

    await input.fill('')
    await input.fill('aurora')
    await expect(
      page.getByRole('button', { name: /Play Aurora Lines by Night Sky/i }),
    ).toBeVisible()

    expect(counts.search).toBe(1)
  })

  test('keeps YouTube off when no key is configured', async ({ page }) => {
    await installMusicFixtures(page)
    await page.goto('/search')

    await expect(page.getByText('YouTube is not connected')).toBeVisible()
    await expect(page.getByText('Audius and Jamendo only')).toBeVisible()
  })
})

test.describe('Lyrics', () => {
  test('seeks through synced lyrics and handles a miss gracefully', async ({ page }) => {
    await installMusicFixtures(page)
    await page.route('https://lrclib.net/api/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.endsWith('/get')) {
        await route.fulfill({
          json: {
            trackName: 'Aurora Lines',
            artistName: 'Night Sky',
            syncedLyrics: '[00:00.00]First light\n[00:04.00]A quiet sky\n[00:08.00]Slow orbit',
          },
        })
        return
      }
      await route.fulfill({ json: [] })
    })

    await playFirstResult(page)
    const mini = page.getByRole('region', { name: 'Now playing' })
    await mini.getByRole('link', { name: /Open player: Aurora Lines/i }).click()
    await page.getByRole('link', { name: 'Lyrics', exact: true }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Lyrics' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Jump to First light/ })).toBeVisible()
    await expect(page.getByText('Synced with LRCLIB')).toBeVisible()

    await page.getByRole('button', { name: /Jump to A quiet sky/ }).click()
    await expect(page.getByRole('button', { name: /Jump to A quiet sky/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  test('shows a graceful empty state when no lyrics exist', async ({ page }) => {
    await installMusicFixtures(page)
    await page.route('https://lrclib.net/api/**', async (route) => {
      await route.fulfill({ status: 404, json: {} })
    })

    await playFirstResult(page)
    const mini = page.getByRole('region', { name: 'Now playing' })
    await mini.getByRole('link', { name: /Open player: Aurora Lines/i }).click()
    await page.getByRole('link', { name: 'Lyrics', exact: true }).click()

    await expect(page.getByText('No lyrics for this track')).toBeVisible()
  })
})
