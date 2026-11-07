import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 4 })
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.locator('header').screenshot({ path: 'screenshots/zoom-header.png' })
await page.locator('section[aria-label="Now playing"]').screenshot({ path: 'screenshots/zoom-miniplayer.png' })
await browser.close()
