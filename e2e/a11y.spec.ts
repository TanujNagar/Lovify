import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

/**
 * Accessibility gate for the main screens. axe-core ships with Lighthouse, so
 * the audit runs without adding another dependency.
 */
const require = createRequire(import.meta.url)
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

type AxeViolation = {
  id: string
  impact: string | null
  help: string
  nodes: Array<{ target: string[]; html: string }>
}

async function audit(page: Page, path: string): Promise<AxeViolation[]> {
  await page.goto(path)
  // `main` matches both the app shell and the static offline fallback page.
  await expect(page.locator('main')).toBeVisible()
  await page.waitForTimeout(400)

  await page.addScriptTag({ content: axeSource })
  const violations = (await page.evaluate(async () => {
    const result = await (
      window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: unknown }> } }
    ).axe.run({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      // The YouTube iframe is a third-party document we do not control.
      rules: { 'frame-title': { enabled: false } },
    })
    return result.violations
  })) as AxeViolation[]

  return violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
}

const screens = [
  { path: '/', name: 'home' },
  { path: '/search', name: 'search' },
  { path: '/library', name: 'library' },
  { path: '/settings', name: 'settings' },
  { path: '/offline', name: 'offline' },
]

for (const screen of screens) {
  test(`${screen.name} has no serious accessibility violations`, async ({ page }) => {
    const violations = await audit(page, screen.path)
    expect(
      violations,
      violations
        .map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => n.target.join(' ')).join('\n')}`)
        .join('\n\n'),
    ).toEqual([])
  })
}
