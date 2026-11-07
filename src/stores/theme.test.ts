import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, getStoredTheme } from '@/stores/theme'

describe('theme store helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark', 'light')
    document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.remove())
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  })

  it('defaults to dark when nothing is stored', () => {
    expect(getStoredTheme()).toBe('dark')
  })

  it('persists the chosen theme and reflects it on the document', () => {
    applyTheme('light')

    expect(localStorage.getItem('lovify-theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(getStoredTheme()).toBe('light')
  })

  it('restores dark and updates the browser theme colour meta tag', () => {
    applyTheme('dark')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    ).toBe('#131316')
  })
})
