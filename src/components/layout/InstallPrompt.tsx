import { useEffect, useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { dismissInstall, promptInstall, useInstallPrompt } from '@/lib/pwa'
import { useUiStore } from '@/stores/ui'

export function InstallPrompt() {
  const canInstall = useInstallPrompt()
  const showToast = useUiStore((state) => state.showToast)
  const [installing, setInstalling] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!canInstall) {
      setVisible(false)
      return
    }
    const timer = window.setTimeout(() => setVisible(true), 1800)
    return () => window.clearTimeout(timer)
  }, [canInstall])

  if (!canInstall || !visible) return null

  return (
    <aside
      aria-label="Install Lovify"
      className="fixed inset-x-3 bottom-[8.25rem] z-[55] rounded-xl border border-outline-variant/30 bg-surface-container-high/98 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:left-auto sm:right-4 sm:w-80 lg:bottom-24"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
          <Icon name="install_mobile" filled />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-title-md text-title-md text-on-surface">Install Lovify</p>
          <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
            A calm, full-screen player that works offline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissInstall()
            setVisible(false)
          }}
          aria-label="Not now"
          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="close" size="sm" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={installing}
          onClick={async () => {
            setInstalling(true)
            const outcome = await promptInstall()
            setInstalling(false)
            if (outcome === 'accepted') showToast('Lovify installed. Find it on your home screen.')
          }}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container"
        >
          {installing ? 'Installing…' : 'Install'}
        </button>
        <button
          type="button"
          onClick={() => {
            dismissInstall()
            setVisible(false)
          }}
          className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant"
        >
          Not now
        </button>
      </div>
    </aside>
  )
}
