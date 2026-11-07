import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

await mkdir('screenshots/viewport', { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()

const shots = [
  ['home', '/'],
  ['library', '/library'],
  ['explore', '/explore'],
  ['profile', '/profile'],
  ['settings', '/settings'],
]

for (const theme of ['dark', 'light']) {
  await page.goto('http://localhost:4173/', { waitUntil: 'load' })
  await page.evaluate((value) => localStorage.setItem('lovify-theme', value), theme)
  for (const [name, path] of shots) {
    await page.goto('http://localhost:4173' + path, { waitUntil: 'load' })
    await page.waitForSelector('#root h1, #root main', { timeout: 15_000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `screenshots/viewport/${theme}-${name}.png` })
  }
}
await browser.close()
