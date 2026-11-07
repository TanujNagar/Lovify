import { useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'lovify-install-dismissed'
const DISMISS_DAYS = 14

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    emit()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getInstallSnapshot(): boolean {
  return Boolean(deferredPrompt) && !isStandalone() && !isDismissed()
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isDismissed(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY))
    if (!dismissedAt) return false
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  emit()
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  await deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  emit()
  return choice.outcome
}

export function useInstallPrompt(): boolean {
  return useSyncExternalStore(
    subscribeInstall,
    getInstallSnapshot,
    () => false,
  )
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (listener) => {
      window.addEventListener('online', listener)
      window.addEventListener('offline', listener)
      return () => {
        window.removeEventListener('online', listener)
        window.removeEventListener('offline', listener)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}
