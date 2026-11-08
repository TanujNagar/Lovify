import { expect, test } from '@playwright/test'
import { installMusicFixtures, playFirstResult } from './fixtures'

test.describe('Lovify shell', () => {
  test.beforeEach(async ({ page }) => {
    await installMusicFixtures(page)
  })

  test('navigates every primary tab', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Search', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible()

    await page.getByRole('link', { name: 'Explore', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Explore' })).toBeVisible()

    await page.getByRole('link', { name: 'Library', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Your Library' })).toBeVisible()

    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()

    await page.getByRole('link', { name: 'Home', exact: true }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ }),
    ).toBeVisible()
  })

  test('opens the full player from the mini player', async ({ page }) => {
    const mini = await playFirstResult(page)

    await mini.getByRole('link', { name: /Open player: Aurora Lines by Night Sky/i }).click()

    await expect(page).toHaveURL(/\/player$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Aurora Lines' })).toBeVisible()
    await expect(page.getByLabel('Track progress')).toBeVisible()
  })

  test('creates a playlist and opens its detail page', async ({ page }) => {
    await page.goto('/library')
    await page.getByRole('button', { name: 'New', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'New playlist' })
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Name').fill('Rainy Window')
    await dialog.getByLabel(/Description/i).fill('Soft rain and slow chords')
    await dialog.getByRole('button', { name: 'Create playlist' }).click()

    await expect(page).toHaveURL(/\/playlist\/playlist-[^/]+$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Rainy Window' }),
    ).toBeVisible()
    await expect(page.getByText('No tracks yet')).toBeVisible()
  })

  test('persists the light theme after a reload', async ({ page }) => {
    await page.goto('/settings')
    const toggle = page.getByRole('switch', { name: 'Dark theme' })
    await expect(toggle).toBeChecked()

    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(toggle).not.toBeChecked()

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('switch', { name: 'Dark theme' })).not.toBeChecked()
  })

  test('is installable as a PWA', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()

    const cdp = await context.newCDPSession(page)
    const manifest = await cdp.send('Page.getAppManifest')
    expect(manifest.errors).toEqual([])

    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors).toEqual([])
  })

  test('serves the app shell while offline', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    await page.reload()
    await expect(page.getByRole('link', { name: 'Lovify home' })).toBeVisible()

    await context.setOffline(true)
    try {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.getByRole('link', { name: 'Lovify home' })).toBeVisible()
      await expect(
        page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ }),
      ).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })
})
