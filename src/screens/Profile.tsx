import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { artists, albums } from '@/data/mock'
import { initials } from '@/lib/artwork'
import { getYouTubeKey } from '@/lib/youtube'
import { useLibraryStore } from '@/stores/library'
import { useThemeStore } from '@/stores/theme'
import { useUiStore } from '@/stores/ui'

const plays = ['8.4k plays', '5.1k plays', '4.9k plays', '3.2k plays']

export function ProfileScreen() {
  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const theme = useThemeStore((state) => state.theme)
  const showToast = useUiStore((state) => state.showToast)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    let active = true
    void getYouTubeKey().then((key) => {
      if (active) setHasKey(Boolean(key))
    })
    return () => {
      active = false
    }
  }, [])

  const shareProfile = async () => {
    const url = window.location.origin
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Lovify', text: 'Your sound, your space.', url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Profile link copied.')
    } catch {
      showToast('Sharing is not available in this browser.')
    }
  }

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
          <div className="rounded-full bg-gradient-to-tr from-primary-container via-tertiary-container to-secondary p-1 shadow-[0_0_24px_rgba(249,87,115,0.35)]">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-secondary-container via-surface-container-highest to-surface-container-lowest text-3xl font-bold tracking-tight text-white">
              {initials('Elena Vance')}
            </div>
          </div>
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-high shadow-md">
            <Icon name="verified" filled size="sm" className="text-primary" />
          </div>
        </div>

        <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
          Elena Vance
        </h2>
        <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
          @elenavance • Joined 2023
        </p>

        <div className="mt-space-sm inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 shadow-sm">
          <Icon name="auto_awesome" filled size="sm" className="text-primary" />
          <span className="font-label-md text-label-md uppercase tracking-wide text-primary">
            Lovify Free
          </span>
        </div>

        <div className="my-space-lg flex w-full max-w-xs items-center justify-center gap-space-lg rounded-xl bg-surface-container-low py-space-sm">
          <div className="flex flex-col items-center">
            <span className="font-title-md text-title-md text-on-surface">{playlists.length || 4}</span>
            <span className="font-caption text-caption text-on-surface-variant">Playlists</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-surface-variant" />
          <div className="flex flex-col items-center">
            <span className="font-title-md text-title-md text-on-surface">{likedIds.length || 4}</span>
            <span className="font-caption text-caption text-on-surface-variant">Liked songs</span>
          </div>
          <div className="h-1 w-1 rounded-full bg-surface-variant" />
          <div className="flex flex-col items-center">
            <span className="font-title-md text-title-md text-on-surface">{albums.length}</span>
            <span className="font-caption text-caption text-on-surface-variant">Albums</span>
          </div>
        </div>

        <div className="flex w-full items-center gap-space-sm">
          <Link
            to="/settings"
            className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-primary-container font-label-lg text-label-lg text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.25)] transition-all hover:brightness-105 active:scale-95"
          >
            Edit profile
          </Link>
          <button
            type="button"
            onClick={() => void shareProfile()}
            aria-label="Share profile"
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
            <div className="font-title-lg text-title-lg tracking-tight text-on-surface">38,420</div>
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
            <div className="truncate font-title-md text-title-md text-[16px] text-on-surface">Nocturne ambient</div>
            <div className="mt-1 font-caption text-caption text-on-surface-variant">
              42% of listening sessions
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container p-3.5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">Tracks played</span>
            <Icon name="graphic_eq" size="sm" className="text-primary" />
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface">1,284</div>
            <div className="mt-1 font-caption text-caption text-on-surface-variant">
              From your local library
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-surface-container p-3.5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface-variant">Peak rhythm</span>
            <Icon name="bedtime" size="sm" className="text-secondary" />
          </div>
          <div>
            <div className="font-title-lg text-title-lg text-on-surface">Night owl</div>
            <div className="mt-1 font-caption text-caption text-on-surface-variant">
              11:00 PM – 3:00 AM
            </div>
          </div>
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-title-lg text-title-lg tracking-tight text-on-surface">
            Top artists this month
          </h3>
          <Link to="/explore" className="flex min-h-11 items-center font-label-md text-label-md text-primary">
            See all
          </Link>
        </div>
        <div className="-mx-margin flex items-center gap-space-md overflow-x-auto px-margin pb-2 no-scrollbar">
          {artists.slice(0, 4).map((artist, index) => (
            <ArtistCircle key={artist.id} artist={artist} size="sm" subtitle={plays[index]} />
          ))}
        </div>
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
          Your playlists, likes and history stay in this browser. The app shell works offline, and
          free music sources arrive in Phase 2.
        </p>
        <Link
          to="/settings"
          className="relative z-10 flex min-h-11 items-center justify-between rounded-lg bg-surface-container-lowest/40 p-2.5"
        >
          <span className="flex items-center gap-1.5 font-caption text-caption text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-primary-container" />
            Music source: local demo library
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
          to="/settings"
          icon="equalizer"
          title="Playback options"
          subtitle="Queue, crossfade and audio lab arrive in Phase 2"
        />
        <SettingsRow
          to="/settings"
          icon="storage"
          title="Storage & cache"
          subtitle="Local-first IndexedDB · No downloads yet"
        />
        <SettingsRow
          to="/settings"
          icon="verified"
          title="YouTube API key"
          subtitle={hasKey ? 'Your own key is saved in this browser' : 'Optional · Use your own quota'}
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
