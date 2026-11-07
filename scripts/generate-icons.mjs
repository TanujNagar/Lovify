import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const mark = await readFile(resolve(root, 'src/assets/logo-mark.svg'), 'utf8')
const markData = `data:image/svg+xml;base64,${Buffer.from(mark).toString('base64')}`

async function renderIcon(size, markScale, path) {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })

  await page.setContent(`
    <!doctype html>
    <html>
      <body style="margin:0;width:${size}px;height:${size}px;background:#131316;overflow:hidden">
        <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:
          radial-gradient(circle at 30% 20%, rgba(249,87,115,0.22), transparent 55%),
          radial-gradient(circle at 75% 85%, rgba(135,35,63,0.35), transparent 60%),
          #131316;">
          <img src="${markData}" alt="" style="width:${Math.round(size * markScale)}px;height:${Math.round(size * markScale)}px;display:block" />
        </div>
      </body>
    </html>
  `)

  await page.screenshot({ path, clip: { x: 0, y: 0, width: size, height: size } })
  await browser.close()
  console.log(`wrote ${path}`)
}

await mkdir(resolve(root, 'public/icons'), { recursive: true })
await renderIcon(192, 0.82, resolve(root, 'public/icons/icon-192.png'))
await renderIcon(512, 0.82, resolve(root, 'public/icons/icon-512.png'))
await renderIcon(512, 0.62, resolve(root, 'public/icons/maskable-512.png'))
await renderIcon(180, 0.76, resolve(root, 'public/apple-touch-icon.png'))
await renderIcon(32, 0.94, resolve(root, 'public/favicon-32.png'))

// A crisp SVG favicon with the same mark.
await writeFile(resolve(root, 'public/favicon.svg'), mark, 'utf8')
console.log('wrote public/favicon.svg')
