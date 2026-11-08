import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { initials } from '@/lib/artwork'
import { getPlayHistory } from '@/lib/db'
import {
  computeListeningStats,
  formatHour,
  formatListeningTime,
} from '@/lib/stats'
import { useLibraryStore } from '@/stores/library'
import { useProfileStore } from '@/stores/profile'
import { useSourcesStore } from '@/stores/sources'
import { useThemeStore } from '@/stores/theme'
import { useUiStore } from '@/stores/ui'
import type { Artist, HistoryEntry } from '@/types/music'

type TopArtist = Artist & { plays: number }

export function ProfileScreen() {
  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const history = useLibraryStore((state) => state.history)
  const loaded = useLibraryStore((state) => state.loaded)
  const loadLibrary = useLibraryStore((state) => state.load)
  const theme = useThemeStore((state) => state.theme)
  const showToast = useUiStore((state) => state.showToast)
  const youtube = useSourcesStore((state) => state.youtube)
  const jamendo = useSourcesStore((state) => state.jamendo)
  const refreshSources = useSourcesStore((state) => state.refresh)

  const avatar = useProfileStore((state) => state.avatar)
  const avatarSaving = useProfileStore((state) => state.saving)
  const avatarError = useProfileStore((state) => state.error)
  const loadProfile = useProfileStore((state) => state.load)
  const uploadAvatar = useProfileStore((state) => state.upload)
  const removeAvatar = useProfileStore((state) => state.remove)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playHistory, setPlayHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (!loaded) void loadLibrary()
    void refreshSources()
    void loadProfile()
  }, [loadLibrary, loadProfile, loaded, refreshSources])

  const historyVersion = history[0]?.playedAt ?? 0

  useEffect(() => {
    let active = true
    void getPlayHistory()
      .then((next) => {
        if (active) setPlayHistory(next)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [history.length, historyVersion])

  const stats = useMemo(
    () => computeListeningStats(playHistory.length ? playHistory : history),
    [history, playHistory],
  )

  const topArtists = useMemo<TopArtist[]>(
    () =>
      stats.topArtists.map((artist) => ({
        id: artist.artistId,
        provider: artist.provider ?? 'audius',
        providerId: artist.artistId,
        name: artist.name,
        artwork: artist.artwork,
        plays: artist.plays,
      })),
    [stats.topArtists],
  )

  const topGenre = stats.topGenre
  const peakRhythm = stats.peakWindow
    ? {
        label: stats.peakWindow.label,
        window: `${formatHour(stats.peakWindow.start)} – ${formatHour(stats.peakWindow.end)}`,
      }
    : null

  const peakHourSet = useMemo(() => {
    if (!stats.peakWindow) return new Set<number>()
    return new Set([
      stats.peakWindow.start,
      (stats.peakWindow.start + 1) % 24,
      (stats.peakWindow.start + 2) % 24,
    ])
  }, [stats.peakWindow])

  const maxHourly = Math.max(1, ...stats.hourly)

  const chooseAvatar = async (file: File | undefined) => {
    if (!file) return
    const saved = await uploadAvatar(file)
    showToast(
      saved
        ? 'Profile photo saved on this device.'
        : (useProfileStore.getState().error ?? 'That photo could not be saved.'),
    )
  }

  const clearAvatar = async () => {
    await removeAvatar()
    showToast('Profile photo removed from this device.')
  }

  const shareProfile = async () => {
    const url = window.location.origin
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Lovify', text: 'Your sound, your space.', url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Lovify link copied.')
    } catch {
      showToast('Sharing is not available in this browser.')
    }
  }

  const sourceSummary = [
    'Audius',
    jamendo ? 'Jamendo' : null,
    youtube.available ? 'YouTube' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-margin pb-10">
      <div className="mb-4 flex items-center justify-between py-2">
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Profile</h1>
        <Link
          to="/settings"
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:text-primary"
        >
          <Icon name="settings" />
        </Link>
      </div>

      <section className="relative mb-6 flex w-full flex-col items-center overflow-hidden rounded-xl bg-surface-container p-space-lg text-center shadow-lg">
        <div className="pointer-events-none absolute -top-14 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary-container/10 blur-3xl" />

        <div className="relative mb-4">
          <input
            ref={fileInputRef}
            id="profile-avatar-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void chooseAvatar(file)
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={avatar ? 'Change profile photo' : 'Upload profile photo'}
            disabled={avatarSaving}
            className="group relative block rounded-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container disabled:opacity-70"
          >
            <div className="rounded-full bg-gradient-to-tr from-primary-container via-tertiary-container to-secondary p-1 shadow-[0_0_24px_rgba(249,87,115,0.35)]">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-secondary-container via-surface-container-highest to-surface-container-lowest text-3xl font-bold tracking-tight text-white">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials('Elena Vance')
                )}
              </div>
            </div>
            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-high text-primary shadow-md transition-colors group-hover:bg-primary-container group-hover:text-on-primary-container">
              <Icon name={avatarSaving ? 'hourglass_top' : 'photo_camera'} filled size="sm" />
            </span>
          </button>
        </div>

        <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
          Elena Vance
        </h2>
        <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
          @elenavance · On this device
        </p>
        {avatar && (
          <button
            type="button"
            onClick={() => void clearAvatar()}
            disabled={avatarSaving}
            className="mt-1 font-caption text-caption text-on-surface-variant underline-offset-4 hover:text-primary hover:underline disabled:opacity-50"
          >
            Remove photo
          </button>
        )}
        {avatarError && (
          <p role="status" className="mt-1 font-caption text-caption text-error">
            {avatarError}
          </p>
        )}

        <div className="mt-space-sm inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 shadow-sm">
          <Icon name="auto_awesome" filled size="sm" className="text-primary" />
          <span className="font-label-md text-label-md uppercase tracking-wide text-primary">
            Lovify Free
          </span>
        </div>

        <div className="my-space-lg flex w-full max-w-xs items-center justify-center gap-space-lg rounded-xl bg-surface-container-low py-space-sm">
          <div className="flex flex-col items-center">
            <span className="font-title-md text-title-md text-on-surface">
              {playlists.filter((playlist) => playlist.system !== 'liked').length}
            </span>
            <span className="font-caption text-caption text-on-surface-variant">Playlists</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-surface-variant" />
          <div className="flex flex-col items-center">
            <span className="font-title-md text-title-md text-on-surface">{likedIds.length}</span>
            <span className="font-caption text-caption text-on-surface-variant">Liked songs</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-surface-variant" />
          <div className="flex flex-col items-center">
            <span className="font-title-md text-title-md text-on-surface">{stats.uniqueArtists}</span>
            <span className="font-caption text-caption text-on-surface-variant">Artists</span>
          </div>
        </div>

        <div className="flex w-full items-center gap-space-sm">
          <Link
            to="/settings"
            className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.25)] transition-all hover:brightness-105 active:scale-95"
          >
            Open settings
          </Link>
          <button
            type="button"
            onClick={() => void shareProfile()}
            aria-label="Share Lovify"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:text-primary"
          >
            <Icon name="share" />
          </button>
        </div>
      </section>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-title-lg text-title-lg tracking-tight text-on-surface">Audio journey</h3>
        <span className="font-label-md text-label-md text-primary">All-time</span>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-2">
        <div className="flex flex-col justify-between rounded-xl bg-surface-container p-3.5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">
              Minutes streamed
            </span>
            <Icon name="headphones" size="sm" className="text-primary" />
          </div>
          <div>
            <div className="font-title-lg text-title-lg tracking-tight text-on-surface">
              {formatListeningTime(stats.minutes)}
            </div>
            <div className="mt-2 flex h-4 items-end gap-1" aria-hidden="true">
              <div className="h-2 flex-1 rounded-full bg-surface-variant" />
              <div className="h-3 flex-1 rounded-full bg-surface-variant" />
              <div className="h-4 flex-1 rounded-full bg-primary-container" />
              <div className="h-3 flex-1 rounded-full bg-primary-container" />
              <div className="h-2.5 flex-1 rounded-full bg-surface-variant" />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container p-3.5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">Top genre</span>
            <Icon name="album" size="sm" className="text-tertiary" />
          </div>
          <div>
            <div className="truncate font-title-md text-title-md text-[16px] text-on-surface">
              {topGenre?.name ?? 'Still discovering'}
            </div>
            <div className="mt-1 font-caption text-caption text-on-surface-variant">
              {topGenre
                ? `${topGenre.share}% of ${topGenre.plays === 1 ? '1 tagged play' : `${topGenre.plays} tagged plays`}`
                : 'Tagged genres appear after a few plays'}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container p-3.5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">Tracks played</span>
            <Icon name="graphic_eq" size="sm" className="text-primary" />
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface">
              {stats.plays.toLocaleString('en')}
            </div>
            <div className="mt-1 font-caption text-caption text-on-surface-variant">
              Recorded from your listening on this device
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container p-3.5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">Peak rhythm</span>
            <Icon name="bedtime" size="sm" className="text-secondary" />
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface">
              {peakRhythm?.label ?? 'Not enough data'}
            </div>
            <div className="mt-1 font-caption text-caption text-on-surface-variant">
              {peakRhythm?.window ?? 'Play a few tracks to see your rhythm'}
            </div>
          </div>
        </div>
      </div>

      <section className="mb-6 rounded-xl bg-surface-container p-3.5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-title-md text-title-md text-on-surface">Listening rhythm</h3>
          <span className="font-caption text-caption text-on-surface-variant">
            {stats.plays > 0 ? 'Local time · all-time' : 'Waiting for your first play'}
          </span>
        </div>
        <div
          className="flex h-24 items-end gap-0.5"
          role="img"
          aria-label={
            stats.peakWindow
              ? `Plays by hour of day. Peak window ${formatHour(stats.peakWindow.start)} to ${formatHour(stats.peakWindow.end)}.`
              : 'Plays by hour of day. No plays recorded yet.'
          }
        >
          {stats.hourly.map((count, hour) => {
            const height = count > 0 ? Math.max(8, Math.round((count / maxHourly) * 100)) : 3
            const isPeak = peakHourSet.has(hour)
            return (
              <div
                key={hour}
                className="flex h-full flex-1 flex-col justify-end"
                title={`${formatHour(hour)} · ${count} ${count === 1 ? 'play' : 'plays'}`}
              >
                <div
                  className={`w-full rounded-t-sm transition-colors ${
                    isPeak ? 'bg-primary-container' : count > 0 ? 'bg-primary-container/40' : 'bg-surface-variant'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between font-caption text-caption text-on-surface-variant">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:00</span>
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-title-lg text-title-lg tracking-tight text-on-surface">
            Top artists from your history
          </h3>
          <Link to="/explore" className="flex min-h-11 items-center font-label-md text-label-md text-primary">
            Explore
          </Link>
        </div>
        {topArtists.length > 0 ? (
          <div className="-mx-margin flex items-center gap-space-md overflow-x-auto px-margin pb-2 no-scrollbar">
            {topArtists.slice(0, 4).map((artist) => (
              <ArtistCircle
                key={artist.id}
                artist={artist}
                size="sm"
                subtitle={`${artist.plays} ${artist.plays === 1 ? 'play' : 'plays'}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
            <Icon name="history" className="text-primary" />
            <div>
              <p className="font-title-md text-title-md text-on-surface">Your history starts here</p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Play something from Search or Home and the artists you return to will appear.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-space-lg shadow-lg">
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary-container/20 blur-2xl" />
        <div className="relative z-10 mb-space-sm flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container/20 text-primary">
              <Icon name="auto_awesome" filled />
            </div>
            <div>
              <span className="font-title-md text-title-md text-on-surface">Lovify Free</span>
              <div className="font-caption text-caption text-primary">No subscription, no tracking</div>
            </div>
          </div>
          <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-md text-label-md text-on-secondary-container">
            FREE
          </span>
        </div>
        <p className="relative z-10 mb-space-md font-body-md text-body-md leading-relaxed text-on-surface-variant">
          Your playlists, likes and history stay in this browser. Music comes from {sourceSummary.join(', ')}.
          The app shell keeps working offline.
        </p>
        <Link
          to="/settings"
          className="relative z-10 flex min-h-11 items-center justify-between rounded-lg bg-surface-container-lowest/40 p-2.5"
        >
          <span className="flex items-center gap-1.5 font-caption text-caption text-on-surface-variant">
            <span className={`h-2 w-2 rounded-full ${youtube.blocked ? 'bg-error' : 'bg-primary-container'}`} />
            Music sources: {sourceSummary.join(' · ')}
          </span>
          <span className="font-label-md text-label-md font-semibold text-primary">Manage</span>
        </Link>
      </section>

      <div className="flex flex-col gap-1 rounded-xl bg-surface-container p-1 shadow-sm">
        <SettingsRow
          to="/settings"
          icon="dark_mode"
          title="Appearance"
          subtitle={theme === 'dark' ? 'Dark theme · On' : 'Light theme · On'}
        />
        <SettingsRow
          to="/queue"
          icon="queue_music"
          title="Playback & queue"
          subtitle="Reorder, repeat and shuffle from the queue"
        />
        <SettingsRow
          to="/settings"
          icon="storage"
          title="Storage & cache"
          subtitle="Local-first IndexedDB · Search cache clears on demand"
        />
        <SettingsRow
          to="/settings"
          icon="verified"
          title="Music source keys"
          subtitle={
            youtube.mode === 'user'
              ? 'Your own YouTube key is saved in this browser'
              : youtube.available
                ? 'Shared YouTube key · add your own to save quota'
                : 'Optional · Audius works without any key'
          }
        />
      </div>
    </div>
  )
}

function SettingsRow({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string
  icon: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-surface-container-high"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors group-hover:text-primary">
          <Icon name={icon} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-title-md text-title-md text-on-surface">{title}</span>
          <span className="truncate font-body-md text-body-md text-on-surface-variant">
            {subtitle}
          </span>
        </div>
      </div>
      <Icon name="chevron_right" className="text-on-surface-variant" />
    </Link>
  )
}
