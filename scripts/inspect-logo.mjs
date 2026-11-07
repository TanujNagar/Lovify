import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(300)
const html = await page.locator('header svg').first().evaluate((el) => el.outerHTML)
console.log(html)
await browser.close()
