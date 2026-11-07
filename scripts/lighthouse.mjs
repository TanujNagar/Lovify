import { preview } from 'vite'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const runs = Number(process.env.LH_RUNS ?? 3)
const port = Number(process.env.LH_PORT ?? 4174)
const url = process.env.LH_URL ?? `http://localhost:${port}/`
const chromeFlags = ['--headless=new', '--no-sandbox', '--disable-gpu']

// Reuse Playwright's bundled Chromium so the audit runs without a system Chrome.
process.env.CHROME_PATH ??= chromium.executablePath()

const server = await preview({
  root: process.cwd(),
  preview: { port, strictPort: true, host: 'localhost' },
})

const chrome = await launch({ chromeFlags })

try {
  const scores = []
  for (let index = 1; index <= runs; index += 1) {
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
          disabled: false,
        },
      },
      {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'mobile',
          throttlingMethod: 'simulate',
          throttling: {
            rttMs: 150,
            throughputKbps: 1638.4,
            requestLatencyMs: 562.5,
            downloadThroughputKbps: 1474.56,
            uploadThroughputKbps: 675,
            cpuSlowdownMultiplier: Number(process.env.LH_CPU ?? 4),
          },
        },
      },
    )

    const report = result.lhr
    const summary = {
      run: index,
      performance: Math.round((report.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((report.categories.accessibility?.score ?? 0) * 100),
      bestPractices: Math.round((report.categories['best-practices']?.score ?? 0) * 100),
      fcp: report.audits['first-contentful-paint'].displayValue,
      lcp: report.audits['largest-contentful-paint'].displayValue,
      speedIndex: report.audits['speed-index'].displayValue,
      tbt: report.audits['total-blocking-time'].displayValue,
      tti: report.audits['interactive'].displayValue,
    }
    scores.push(summary)
    console.log(JSON.stringify(summary))
    await writeFile(`lighthouse-report-${index}.json`, JSON.stringify(report, null, 2))
  }

  const best = scores.reduce((a, b) => (b.performance > a.performance ? b : a))
  console.log('BEST', JSON.stringify(best))
} finally {
  await chrome.kill()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
