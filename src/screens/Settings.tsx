import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Toggle } from '@/components/ui/Toggle'
import { formatUnits } from '@/lib/cache'
import {
  backupFileName,
  exportBackup as createBackupFile,
  importBackup as restoreBackup,
} from '@/lib/backup'
import {
  clearHistory as clearStoredHistory,
  clearSearchCache,
  getSetting,
  removeSetting,
  setSetting,
} from '@/lib/db'
import { formatBytes } from '@/lib/downloads'
import {
  JAMENDO_CLIENT_ID_HELP_URL,
  JAMENDO_CLIENT_ID_SETTING,
} from '@/lib/providers/jamendo'
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
import { useDownloadsStore } from '@/stores/downloads'
import { useLibraryStore } from '@/stores/library'
import { useSourcesStore } from '@/stores/sources'
import { useThemeStore } from '@/stores/theme'
import { useUiStore } from '@/stores/ui'

const envJamendoId = Boolean(import.meta.env.VITE_JAMENDO_CLIENT_ID)

function SourceRow({
  name,
  detail,
  active,
  warning,
}: {
  name: string
  detail: string
  active: boolean
  warning?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3">
      <div className="min-w-0">
        <p className="font-title-md text-title-md text-on-surface">{name}</p>
        <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">{detail}</p>
      </div>
      <span
        className={
          warning
            ? 'rounded-full bg-error-container/30 px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-error'
            : active
              ? 'rounded-full bg-secondary-container px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-on-secondary-container'
              : 'rounded-full bg-surface-container-high px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-on-surface-variant'
        }
      >
        {warning ? 'Quota' : active ? 'On' : 'Off'}
      </span>
    </div>
  )
}

export function SettingsScreen() {
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const showToast = useUiStore((state) => state.showToast)
  const clearLibraryHistory = useLibraryStore((state) => state.clearHistory)
  const canInstall = useInstallPrompt()

  const youtube = useSourcesStore((state) => state.youtube)
  const jamendo = useSourcesStore((state) => state.jamendo)
  const usage = useSourcesStore((state) => state.usage)
  const sourcesLoading = useSourcesStore((state) => state.loading)
  const refreshSources = useSourcesStore((state) => state.refresh)
  const refreshAfterKeyChange = useSourcesStore((state) => state.refreshAfterKeyChange)
  const refreshAfterJamendoChange = useSourcesStore((state) => state.refreshAfterJamendoChange)

  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [draftKey, setDraftKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('empty')
  const [keyMessage, setKeyMessage] = useState('Loading saved key…')
  const [testing, setTesting] = useState(false)
  const keyInputRef = useRef<HTMLInputElement>(null)

  const [savedJamendo, setSavedJamendo] = useState<string | null>(null)
  const [jamendoDraft, setJamendoDraft] = useState('')
  const [savingJamendo, setSavingJamendo] = useState(false)
  const [jamendoMessage, setJamendoMessage] = useState('Loading Jamendo client id…')

  const downloadStorage = useDownloadsStore((state) => state.storage)
  const loadDownloads = useDownloadsStore((state) => state.load)
  const refreshLibrary = useLibraryStore((state) => state.refresh)
  const [clearing, setClearing] = useState<'search' | 'history' | null>(null)
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null)
  const [backupMessage, setBackupMessage] = useState(
    'Backups include playlists, likes, history and settings. Provider keys and offline audio stay out.',
  )
  const backupInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    void refreshSources()
    void loadDownloads()
    void getYouTubeKey().then((key) => {
      if (!active) return
      if (key) {
        setSavedKey(key)
        setKeyStatus('valid')
        setKeyMessage(`A key is saved in this browser (${maskKey(key)}).`)
      } else {
        setSavedKey(null)
        setKeyStatus('empty')
        setKeyMessage(
          'No key saved. Lovify uses the shared server route when it is available, or free sources only.',
        )
      }
    })
    void getSetting<string>(JAMENDO_CLIENT_ID_SETTING).then((id) => {
      if (!active) return
      if (id) {
        setSavedJamendo(id)
        setJamendoMessage(`A client id is saved in this browser (${maskKey(id)}).`)
      } else {
        setSavedJamendo(null)
        setJamendoMessage('No Jamendo client id saved. Audius works without any key.')
      }
    })
    return () => {
      active = false
    }
  }, [loadDownloads, refreshSources])

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
      await refreshAfterKeyChange()
      showToast('YouTube key verified. Your searches use your own quota.')
    } else {
      setKeyMessage(result.message)
    }
  }

  const removeKey = async () => {
    await removeYouTubeKey()
    setSavedKey(null)
    setDraftKey('')
    setKeyStatus('empty')
    setKeyMessage('Key removed. Lovify uses the shared route or free sources.')
    await refreshAfterKeyChange()
    showToast('YouTube API key removed from this browser.')
  }

  const saveJamendo = async () => {
    const id = jamendoDraft.trim()
    if (!id) {
      setJamendoMessage('Paste a Jamendo client id first.')
      return
    }

    setSavingJamendo(true)
    try {
      await setSetting(JAMENDO_CLIENT_ID_SETTING, id)
      setSavedJamendo(id)
      setJamendoDraft('')
      setJamendoMessage(`Jamendo is connected in this browser (${maskKey(id)}).`)
      await refreshAfterJamendoChange()
      showToast('Jamendo client id saved. Jamendo is now part of search.')
    } catch {
      setJamendoMessage('Could not save the client id. Check that storage is available.')
    } finally {
      setSavingJamendo(false)
    }
  }

  const removeJamendo = async () => {
    await removeSetting(JAMENDO_CLIENT_ID_SETTING)
    setSavedJamendo(null)
    setJamendoDraft('')
    setJamendoMessage('Jamendo client id removed. Audius keeps working without a key.')
    await refreshAfterJamendoChange()
    showToast('Jamendo client id removed.')
  }

  const clearSearch = async () => {
    setClearing('search')
    try {
      await clearSearchCache()
      showToast('Search cache cleared. The next search may use quota again.')
    } finally {
      setClearing(null)
    }
  }

  const clearHistory = async () => {
    setClearing('history')
    try {
      await clearStoredHistory()
      await clearLibraryHistory()
      showToast('Listening history cleared.')
    } finally {
      setClearing(null)
    }
  }

  const exportLibrary = async () => {
    setBackupBusy('export')
    try {
      const text = await createBackupFile()
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = backupFileName()
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setBackupMessage('Backup downloaded as a JSON file on this device.')
      showToast('Backup downloaded.')
    } catch {
      setBackupMessage('Could not create the backup file. Check that storage is available.')
    } finally {
      setBackupBusy(null)
    }
  }

  const importLibrary = async (file: File | undefined) => {
    if (!file) return
    setBackupBusy('import')
    try {
      const result = await restoreBackup(await file.text())
      await refreshLibrary()
      await loadDownloads()
      await refreshAfterJamendoChange()
      await refreshAfterKeyChange()
      // Backups never contain provider keys, and the restore cleared the local
      // settings table, so reflect that in the key cards immediately.
      setSavedKey(null)
      setDraftKey('')
      setKeyStatus('empty')
      setKeyMessage('No key saved. Add your own or use the shared route.')
      setSavedJamendo(null)
      setJamendoDraft('')
      setJamendoMessage('No Jamendo client id saved. Audius works without any key.')
      setBackupMessage(
        `Restored ${result.playlists} playlists, ${result.likes} likes and ${result.plays} plays.`,
      )
      showToast('Backup restored. Your library is back.')
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : 'That backup could not be restored.',
      )
    } finally {
      setBackupBusy(null)
    }
  }

  const statusColor =
    keyStatus === 'valid'
      ? 'text-primary'
      : keyStatus === 'invalid' || keyStatus === 'error'
        ? 'text-error'
        : 'text-on-surface-variant'

  const youtubeDetail = youtube.available
    ? youtube.mode === 'user'
      ? 'Your own key · searches use your quota'
      : 'Shared server key · fair use'
    : youtube.blocked
      ? 'Daily quota used up · free sources only'
      : 'Not connected · free sources only'

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
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="source-heading" className="flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
            <Icon name="auto_awesome" filled className="text-primary" />
            Music sources
          </h2>
          <span className="rounded-full bg-surface-container-low px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-on-surface-variant">
            Free
          </span>
        </div>
        <div className="space-y-2">
          <SourceRow
            name="Audius"
            detail="Free · no key needed"
            active
          />
          <SourceRow
            name="Jamendo"
            detail={jamendo ? 'Connected with your free client id' : 'Add a free client id to include it'}
            active={jamendo}
          />
          <SourceRow
            name="YouTube"
            detail={youtubeDetail}
            active={youtube.available}
            warning={youtube.blocked}
          />
        </div>
        <p className="mt-3 font-caption text-caption leading-relaxed text-on-surface-variant">
          {sourcesLoading
            ? 'Checking which sources answer…'
            : 'All sources are free. No subscription, no tracking, and no sign-in is required.'}
        </p>
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
          Optional. Add your own YouTube Data API key to search with your own quota. It is stored
          only in this browser's IndexedDB and sent directly to Google — never to Lovify's server.
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

        <div className="mt-4 rounded-lg bg-surface-container-low p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-title-md text-title-md text-on-surface">Search quota today</p>
            <p className="font-caption text-caption text-on-surface-variant">
              {formatUnits(usage.units)} / {formatUnits(usage.limit)} units
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
            role="progressbar"
            aria-label="YouTube quota used today"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, usage.percent)}
          >
            <div
              className={`h-full rounded-full ${
                usage.warning ? 'bg-error' : 'bg-primary-container'
              }`}
              style={{ width: `${Math.min(100, usage.percent)}%` }}
            />
          </div>
          <p className="mt-2 font-caption text-caption leading-relaxed text-on-surface-variant">
            {usage.blocked
              ? 'YouTube is resting for today. Lovify is using Audius and Jamendo instead.'
              : usage.warning
                ? `A search costs about 101 units. You are past ${Math.round(
                    (usage.units / usage.limit) * 100,
                  )}% of the free daily quota.`
                : 'Counted locally. Repeating a cached search costs nothing.'}
          </p>
        </div>
      </section>

      <section aria-labelledby="jamendo-heading" className="mb-4 rounded-xl bg-surface-container p-4 shadow-sm">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 id="jamendo-heading" className="flex items-center gap-2 font-title-lg text-title-lg text-on-surface">
            <Icon name="public" className="text-primary" />
            Jamendo client id
          </h2>
          {savedJamendo && !envJamendoId && (
            <span className="rounded-full bg-secondary-container px-2 py-0.5 font-caption text-caption uppercase tracking-wider text-on-secondary-container">
              Saved
            </span>
          )}
        </div>
        <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
          Jamendo is a free catalogue of independent music. Create a free app in the Jamendo
          developer portal and paste its client id here. It stays on this device.
        </p>

        {envJamendoId && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-surface-container-low p-2.5 font-body-md text-body-md text-primary">
            <Icon name="check_circle" filled size="sm" className="mt-0.5 flex-shrink-0" />
            A build-time Jamendo client id is active and overrides the value below.
          </p>
        )}

        <label htmlFor="jamendo-id" className="mt-4 block font-label-lg text-label-lg text-on-surface">
          Client id
        </label>
        <div className="mt-1.5 flex h-12 items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-2 focus-within:ring-primary/60">
          <Icon name="vpn_key" size="sm" className="flex-shrink-0 text-on-surface-variant" />
          <input
            id="jamendo-id"
            type="text"
            value={jamendoDraft}
            onChange={(event) => setJamendoDraft(event.target.value)}
            placeholder={savedJamendo ? `Saved: ${maskKey(savedJamendo)}` : 'Paste your client id'}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveJamendo()}
            disabled={savingJamendo || !jamendoDraft.trim()}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container disabled:opacity-50"
          >
            <Icon name="save" size="sm" />
            {savingJamendo ? 'Saving…' : 'Save client id'}
          </button>
          {savedJamendo && !envJamendoId && (
            <button
              type="button"
              onClick={() => void removeJamendo()}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-error"
            >
              <Icon name="delete" size="sm" />
              Remove
            </button>
          )}
          <a
            href={JAMENDO_CLIENT_ID_HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-1.5 rounded-full px-3 font-label-md text-label-md text-primary underline-offset-4 hover:underline"
          >
            Get a free client id
            <Icon name="open_in_new" size="sm" />
          </a>
        </div>

        <p
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg bg-surface-container-low p-2.5 font-body-md text-body-md text-on-surface-variant"
        >
          {jamendoMessage}
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
              IndexedDB · playlists, likes, history, cache
            </p>
          </div>
          <span className="whitespace-nowrap font-label-md text-label-md text-on-surface-variant">
            {downloadStorage.downloads} downloads · {formatBytes(downloadStorage.bytes)}
          </span>
        </div>

        <div className="mt-2 rounded-lg bg-surface-container-low p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-title-md text-title-md text-on-surface">Offline audio storage</p>
            <p className="font-caption text-caption text-on-surface-variant">
              {downloadStorage.quota > 0
                ? `${formatBytes(downloadStorage.usage)} / ${formatBytes(downloadStorage.quota)}`
                : formatBytes(downloadStorage.bytes)}
            </p>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
            role="progressbar"
            aria-label="Browser storage used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              downloadStorage.quota > 0
                ? Math.round((downloadStorage.usage / downloadStorage.quota) * 100)
                : 0
            }
          >
            <div
              className="h-full rounded-full bg-primary-container"
              style={{
                width: `${
                  downloadStorage.quota > 0
                    ? Math.min(100, Math.max(2, (downloadStorage.usage / downloadStorage.quota) * 100))
                    : downloadStorage.bytes > 0
                      ? 2
                      : 0
                }%`,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-caption text-caption leading-relaxed text-on-surface-variant">
              {downloadStorage.persisted
                ? 'The browser marked Lovify storage as persistent.'
                : 'Free-source downloads live in Cache Storage. YouTube is never downloaded.'}
            </p>
            <Link
              to="/library?filter=downloaded"
              className="flex min-h-11 flex-shrink-0 items-center font-label-md text-label-md text-primary"
            >
              Manage
            </Link>
          </div>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void clearSearch()}
            disabled={clearing !== null}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-surface-container-high px-3 font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            <Icon name="search_off" size="sm" />
            {clearing === 'search' ? 'Clearing…' : 'Clear search cache'}
          </button>
          <button
            type="button"
            onClick={() => void clearHistory()}
            disabled={clearing !== null}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-surface-container-high px-3 font-label-lg text-label-lg text-on-surface-variant hover:text-error disabled:opacity-50"
          >
            <Icon name="history_toggle_off" size="sm" />
            {clearing === 'history' ? 'Clearing…' : 'Clear listening history'}
          </button>
        </div>

        <div className="mt-2 rounded-lg bg-surface-container-low p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-title-md text-title-md text-on-surface">Backup</p>
              <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                Save your library as a JSON file and restore it on any device.
              </p>
            </div>
            <Icon name="cloud_sync" size="sm" className="mt-1 flex-shrink-0 text-primary" />
          </div>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Choose a Lovify backup file to import"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void importLibrary(file)
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void exportLibrary()}
              disabled={backupBusy !== null}
              className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container disabled:opacity-50"
            >
              <Icon name="download" size="sm" />
              {backupBusy === 'export' ? 'Preparing…' : 'Export backup'}
            </button>
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              disabled={backupBusy !== null}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
            >
              <Icon name="upload" size="sm" />
              {backupBusy === 'import' ? 'Restoring…' : 'Import backup'}
            </button>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="mt-2 font-caption text-caption leading-relaxed text-on-surface-variant"
          >
            {backupMessage}
          </p>
        </div>

        <p className="mt-2 font-caption text-caption leading-relaxed text-on-surface-variant">
          Importing replaces the library on this device. API keys are never exported, and
          downloaded audio stays in Cache Storage rather than inside the file.
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
            <dd className="text-on-surface">0.3.0 · Phase 3</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Theme</dt>
            <dd className="text-on-surface capitalize">{theme}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Music</dt>
            <dd className="text-on-surface">Audius · Jamendo · YouTube</dd>
          </div>
        </dl>
        <p className="mt-3 font-caption text-caption leading-relaxed text-on-surface-variant">
          Original product, original name and logo. Built with free and open-source software.
          YouTube plays through its official visible player. No audio is ever extracted or
          downloaded.
        </p>
      </section>
    </div>
  )
}
