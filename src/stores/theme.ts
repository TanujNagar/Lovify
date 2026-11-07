import { create } from 'zustand'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'lovify-theme'

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', theme === 'dark')

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#fff8f7' : '#131316')

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* Private browsing can block storage; the in-memory theme still works. */
  }
}

type ThemeState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: typeof document === 'undefined' ? 'dark' : getStoredTheme(),
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
}))
