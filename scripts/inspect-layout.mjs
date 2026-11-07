import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const info = await page.evaluate(() => {
  const out = {}
  out.docWidth = document.documentElement.scrollWidth
  out.bodyWidth = document.body.scrollWidth
  out.viewport = window.innerWidth
  out.carousels = Array.from(document.querySelectorAll('.no-scrollbar')).map((el) => ({
    cls: el.className,
    scrollLeft: el.scrollLeft,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    paddingLeft: getComputedStyle(el).paddingLeft,
    rect: el.getBoundingClientRect().toJSON(),
  }))
  const logo = document.querySelector('header svg')
  out.logo = logo ? { rect: logo.getBoundingClientRect().toJSON(), viewBox: logo.getAttribute('viewBox') } : null
  return out
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
