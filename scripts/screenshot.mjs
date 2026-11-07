import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const base = process.env.BASE_URL ?? 'http://localhost:4173'
const root = resolve(process.cwd())
const outDir = resolve(root, 'screenshots')
await mkdir(outDir, { recursive: true })

const routes = [
  ['home', '/'],
  ['search', '/search'],
  ['explore', '/explore'],
  ['library', '/library'],
  ['profile', '/profile'],
  ['player', '/player'],
  ['queue', '/queue'],
  ['playlist-night-flow', '/playlist/playlist-night-flow'],
  ['album-velvet-pulses', '/album/album-velvet-pulses'],
  ['artist-lunar-collective', '/artist/artist-lunar-collective'],
  ['settings', '/settings'],
  ['offline', '/offline'],
  ['not-found', '/nope'],
]

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const page = await context.newPage()
const errors = []
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`[console] ${message.text()}`)
})
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`))

for (const theme of ['dark', 'light']) {
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  await page.evaluate((value) => {
    localStorage.setItem('lovify-theme', value)
  }, theme)
  await page.reload({ waitUntil: 'networkidle' })

  for (const [name, path] of routes) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.screenshot({
      path: resolve(outDir, `${theme}-${name}.png`),
      fullPage: true,
    })
    console.log(`shot ${theme} ${name}`)
  }
}

await browser.close()

if (errors.length) {
  console.log('\nConsole errors:')
  for (const error of errors) console.log(error)
} else {
  console.log('\nNo console errors.')
}
