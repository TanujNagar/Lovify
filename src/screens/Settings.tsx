import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { Toggle } from '@/components/ui/Toggle'
import { getStorageSummary } from '@/lib/db'
import { isIos, isStandalone, promptInstall, useInstallPrompt } from '@/lib/pwa'
import {
  YOUTUBE_KEY_HELP_URL,
  getYouTubeKey,
  maskKey,
  removeYouTubeKey,
  saveYouTubeKey,
  validateYouTubeKey,
  type KeyStatus,
} from '@/lib/youtube'
import { useThemeStore } from '@/stores/theme'
import { useUiStore } from '@/stores/ui'

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function SettingsScreen() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const showToast = useUiStore((state) => state.showToast)
  const canInstall = useInstallPrompt()

  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [draftKey, setDraftKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('empty')
  const [keyMessage, setKeyMessage] = useState('Loading saved key…')
  const [testing, setTesting] = useState(false)
  const keyInputRef = useRef<HTMLInputElement>(null)

  const [storage, setStorage] = useState({ downloads: 0, bytes: 0 })

  useEffect(() => {
    let active = true
    void getYouTubeKey().then((key) => {
      if (!active) return
      if (key) {
        setSavedKey(key)
        setKeyStatus('valid')
        setKeyMessage(`A key is saved in this browser (${maskKey(key)}).`)
      } else {
        setSavedKey(null)
        setKeyStatus('empty')
        setKeyMessage('No key saved. Lovify uses the shared server route in Phase 2.')
      }
    })
    void getStorageSummary().then((summary) => {
      if (active) setStorage(summary)
    })
    return () => {
      active = false
    }
  }, [])

  const saveAndTest = async () => {
    const candidate = draftKey.trim() || savedKey
    if (!candidate) {
      setKeyStatus('empty')
      setKeyMessage('Paste a YouTube API key first.')
      keyInputRef.current?.focus()
      return
    }

    setTesting(true)
    setKeyStatus('testing')
    setKeyMessage('Checking the key with one cheap YouTube request…')
    const result = await validateYouTubeKey(candidate)
    setTesting(false)
    setKeyStatus(result.status)

    if (result.ok) {
      await saveYouTubeKey(candidate)
      setSavedKey(candidate)
      setDraftKey('')
      setKeyMessage(`Key works. Saved only in this browser (${maskKey(candidate)}).`)
    } else {
      setKeyMessage(result.message)
    }
  }

  const removeKey = async () => {
    await removeYouTubeKey()
    setSavedKey(null)
    setDraftKey('')
    setKeyStatus('empty')
    setKeyMessage('Key removed. Lovify will use the shared route in Phase 2.')
    showToast('YouTube API key removed from this browser.')
  }

  const statusColor =
    keyStatus === 'valid'
      ? 'text-primary'
      : keyStatus === 'invalid' || keyStatus === 'error'
        ? 'text-error'
        : 'text-on-surface-variant'

  return (
    <div className="mx-auto w-full max-w-2xl px-margin pb-10">
      <div className="pb-4 pt-3">
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Quiet controls for how Lovify looks, plays, and respects your privacy.
        </p>
      </div>

      <section aria-labelledby="appearance-heading" className="mb-4 rounded-xl bg-surface-container p-4 shadow-sm">
        <h2 id="appearance-heading" className="mb-2 flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
          <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} className="text-primary" />
          Appearance
        </h2>
        <Toggle
          id="dark-theme"
          checked={theme === 'dark'}
          onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          label="Dark theme"
          description="Dark is the default. Your choice is remembered on this device."
        />
      </section>

      <section aria-labelledby="source-heading" className="mb-4 rounded-xl bg-surface-container p-4 shadow-sm">
        <h2 id="source-heading" className="mb-2 flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
          <Icon name="auto_awesome" filled className="text-primary" />
          Music source
        </h2>
        <div className="flex items-start gap-3 rounded-lg bg-surface-container-low p-3">
          <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-container" />
          <div>
            <p className="font-title-md text-title-md text-on-surface">Free · local demo library</p>
            <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
              The app shell, library and player run entirely on this device. Jamendo, Audius and
              YouTube providers connect in Phase 2.
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-full bg-surface-container-low px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-on-surface-variant">
            No subscription
          </span>
          <span className="rounded-full bg-surface-container-low px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-on-surface-variant">
            No tracking
          </span>
          <span className="rounded-full bg-surface-container-low px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-on-surface-variant">
            Offline shell
          </span>
        </div>
      </section>

      <section aria-labelledby="youtube-heading" className="mb-4 rounded-xl bg-surface-container p-4 shadow-sm">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 id="youtube-heading" className="flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
            <Icon name="key" className="text-primary" />
            YouTube API key
          </h2>
          {savedKey && (
            <span className="rounded-full bg-secondary-container px-2 py-0.5 font-caption text-caption uppercase tracking-wider text-on-secondary-container">
              Saved
            </span>
          )}
        </div>
        <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
          Optional. Add your own YouTube Data API key to search with your own quota in Phase 2.
          It is stored only in this browser's IndexedDB and sent directly to Google — never to
          Lovify's server.
        </p>

        <label htmlFor="youtube-key" className="mt-4 block font-label-lg text-label-lg text-on-surface">
          API key
        </label>
        <div className="mt-1.5 flex h-12 items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-2 focus-within:ring-primary/60">
          <Icon name="lock" size="sm" className="flex-shrink-0 text-on-surface-variant" />
          <input
            ref={keyInputRef}
            id="youtube-key"
            type={showKey ? 'text' : 'password'}
            value={draftKey}
            onChange={(event) => {
              setDraftKey(event.target.value)
              if (keyStatus === 'invalid' || keyStatus === 'error') {
                setKeyStatus(savedKey ? 'valid' : 'empty')
                setKeyMessage(savedKey ? `A key is saved (${maskKey(savedKey)}).` : 'No key saved.')
              }
            }}
            placeholder={savedKey ? `Saved: ${maskKey(savedKey)}` : 'Paste your key (AIza…)'}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowKey((shown) => !shown)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <Icon name={showKey ? 'visibility_off' : 'visibility'} size="sm" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveAndTest()}
            disabled={testing || (!draftKey.trim() && !savedKey)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container disabled:opacity-50"
          >
            <Icon name="verified" size="sm" />
            {testing ? 'Testing…' : 'Save and test'}
          </button>
          {savedKey && (
            <button
              type="button"
              onClick={() => void removeKey()}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-error"
            >
              <Icon name="delete" size="sm" />
              Remove
            </button>
          )}
          <a
            href={YOUTUBE_KEY_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1.5 rounded-full px-3 font-label-md text-label-md text-primary underline-offset-4 hover:underline"
          >
            How to get a free key
            <Icon name="open_in_new" size="sm" />
          </a>
        </div>

        <div
          role="status"
          aria-live="polite"
          className={`mt-3 flex items-start gap-2 rounded-lg bg-surface-container-low p-2.5 font-body-md text-body-md ${statusColor}`}
        >
          <span
            className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
              keyStatus === 'valid'
                ? 'bg-primary-container'
                : keyStatus === 'invalid' || keyStatus === 'error'
                  ? 'bg-error'
                  : keyStatus === 'testing'
                    ? 'animate-pulse bg-primary'
                    : 'bg-outline-variant'
            }`}
          />
          <span>{keyMessage}</span>
        </div>
        <p className="mt-2 font-caption text-caption leading-relaxed text-on-surface-variant">
          One validation call uses 1 quota unit. The key is never printed, logged, committed or
          sent to our own servers.
        </p>
      </section>

      <section aria-labelledby="storage-heading" className="mb-4 rounded-xl bg-surface-container p-4 shadow-sm">
        <h2 id="storage-heading" className="mb-2 flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
          <Icon name="storage" className="text-primary" />
          Storage & data
        </h2>
        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-3">
          <div>
            <p className="font-title-md text-title-md text-on-surface">On this device</p>
            <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
              IndexedDB · playlists, likes, settings
            </p>
          </div>
          <span className="whitespace-nowrap font-label-md text-label-md text-on-surface-variant">
            {storage.downloads} downloads · {formatBytes(storage.bytes)}
          </span>
        </div>
        <p className="mt-2 font-caption text-caption leading-relaxed text-on-surface-variant">
          Lovify is local-first. Nothing here is synced to a server, and there is no analytics.
          Backup export and import arrive in Phase 3.
        </p>
      </section>

      <section aria-labelledby="install-heading" className="mb-4 rounded-xl bg-surface-container p-4 shadow-sm">
        <h2 id="install-heading" className="mb-2 flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
          <Icon name="install_mobile" className="text-primary" />
          Install Lovify
        </h2>
        {isStandalone() ? (
          <p className="flex items-center gap-2 rounded-lg bg-surface-container-low p-3 font-body-md text-body-md text-primary">
            <Icon name="check_circle" filled size="sm" />
            Installed. Lovify is running as an app.
          </p>
        ) : (
          <>
            <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
              {isIos()
                ? 'On iPhone or iPad: open the Share menu in Safari, then choose “Add to Home Screen”.'
                : 'Install for a full-screen, offline-ready player. Your browser may also offer this from its menu.'}
            </p>
            {canInstall && (
              <button
                type="button"
                onClick={async () => {
                  const outcome = await promptInstall()
                  if (outcome === 'accepted') showToast('Lovify installed.')
                }}
                className="mt-3 flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container"
              >
                <Icon name="install_mobile" size="sm" />
                Install app
              </button>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="about-heading" className="rounded-xl bg-surface-container p-4 shadow-sm">
        <h2 id="about-heading" className="mb-2 flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
          <Icon name="auto_awesome" className="text-primary" />
          About
        </h2>
        <dl className="space-y-1 font-body-md text-body-md">
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Version</dt>
            <dd className="text-on-surface">0.1.0 · Phase 1</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Theme</dt>
            <dd className="text-on-surface capitalize">{theme}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Music</dt>
            <dd className="text-on-surface">Demo catalog</dd>
          </div>
        </dl>
        <p className="mt-3 font-caption text-caption leading-relaxed text-on-surface-variant">
          Original product, original name and logo. Built with free and open-source software.
          No data leaves this device except the optional key check you start yourself.
        </p>
      </section>
    </div>
  )
}
