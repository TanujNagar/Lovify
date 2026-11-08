import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { TrackRow } from '@/components/media/TrackRow'
import { genres } from '@/data/editorial'
import { cn } from '@/lib/cn'
import { searchMusic, type SearchOutcome } from '@/lib/providers'
import { PROVIDER_LABELS } from '@/lib/providers/types'
import { ProviderError } from '@/lib/providers/types'
import { useCatalogStore } from '@/stores/catalog'
import { usePlayerStore } from '@/stores/player'
import { useSourcesStore } from '@/stores/sources'
import { useUiStore } from '@/stores/ui'

const RECENTS_KEY = 'lovify-recent-searches'
const MIN_QUERY = 3
const DEBOUNCE_MS = 500

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : []
  } catch {
    return []
  }
}

function writeRecents(values: string[]): void {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(values.slice(0, 6)))
  } catch {
    // Private browsing may block localStorage; search still works.
  }
}

export function SearchScreen() {
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState<string[]>(readRecents)
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)
  const youtube = useSourcesStore((state) => state.youtube)
  const refreshUsage = useSourcesStore((state) => state.refreshUsage)
  const trending = useCatalogStore((state) => state.trending)
  const loadCatalog = useCatalogStore((state) => state.load)

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const trimmed = query.trim()
  const ready = trimmed.length >= MIN_QUERY

  useEffect(() => {
    if (!ready) {
      setOutcome(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      void searchMusic(trimmed, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) return
          setOutcome(result)
          setLoading(false)
          if (result.usedProviders.length) void refreshUsage()
          if (result.youtube === 'quota') {
            void useSourcesStore.getState().markYouTubeQuota()
          }
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return
          setLoading(false)
          setError(
            caught instanceof ProviderError
              ? caught.message
              : 'Search could not reach the free music sources. Check your connection.',
          )
        })
    }, DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [ready, retryKey, trimmed, refreshUsage])

  const commitRecent = (value: string) => {
    const term = value.trim()
    if (term.length < MIN_QUERY) return
    const next = [term, ...recents.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6)
    setRecents(next)
    writeRecents(next)
  }

  const results = outcome?.results
  const hasResults = Boolean(
    results &&
      (results.tracks.length || results.artists.length || results.albums.length),
  )
  const noResults = ready && !loading && !error && outcome && !hasResults
  const providers = useMemo(() => {
    if (!outcome) return []
    return Array.from(new Set([...outcome.usedProviders, ...outcome.cachedProviders]))
  }, [outcome])

  const playVibeRadio = () => {
    if (!trending.length) {
      showToast('Free music is still loading. Try again in a moment.')
      return
    }
    const shuffled = [...trending].sort(() => Math.random() - 0.5).slice(0, 20)
    playQueue(shuffled, 0, { type: 'radio', label: 'Vibe Radio' })
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between px-margin pb-2 pt-2">
        <div className="flex min-w-0 flex-col">
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Search</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Explore songs, creators, and moods
          </p>
        </div>
        <Link
          to="/settings"
          aria-label="Music source settings"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:text-primary"
        >
          <Icon name="tune" />
        </Link>
      </div>

      <form
        role="search"
        className="px-margin py-2"
        onSubmit={(event) => {
          event.preventDefault()
          commitRecent(query)
        }}
      >
        <div className="relative flex h-12 w-full items-center rounded-full bg-surface-container-low px-4 shadow-[0_2px_12px_rgba(0,0,0,0.28)] transition-shadow focus-within:shadow-[0_0_0_2px_rgba(249,87,115,0.4)]">
          <Icon name="search" className="mr-3 flex-shrink-0 text-outline" size="lg" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search artists, songs, albums"
            placeholder="Artists, songs, albums..."
            className="h-full w-full min-w-0 bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setOutcome(null)
                setError(null)
              }}
              aria-label="Clear search"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" />
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 px-4 font-caption text-caption text-on-surface-variant">
          {ready
            ? 'Results are cached for 24 hours, so repeating a search costs no quota.'
            : 'Type at least 3 characters to search free music sources.'}
        </p>
      </form>

      {!youtube.available && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-xl bg-surface-container p-3 font-body-md text-body-md text-on-surface-variant">
          <Icon name="info" size="sm" className="mt-1 flex-shrink-0 text-primary" />
          <span>
            YouTube is not connected, so Lovify searches Audius and Jamendo only.{' '}
            <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
              Add a free key
            </Link>
            .
          </span>
        </div>
      )}

      {ready ? (
        <section aria-label="Search results" className="px-margin pb-10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              Results for “{trimmed}”
            </h2>
            {providers.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {providers.map((provider) => (
                  <span
                    key={provider}
                    className="rounded-full bg-surface-container px-2 py-0.5 font-caption text-caption uppercase tracking-wider text-on-surface-variant"
                  >
                    {PROVIDER_LABELS[provider]}
                  </span>
                ))}
              </span>
            )}
          </div>

          {loading && (
            <div
              className="mt-6 flex items-center justify-center gap-3 rounded-xl bg-surface-container-low px-6 py-10"
              aria-busy="true"
            >
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-container-highest border-t-primary-container" />
              <span className="font-body-md text-body-md text-on-surface-variant">
                Searching free sources…
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 flex flex-col items-center rounded-xl bg-surface-container-low px-6 py-10 text-center">
              <Icon name="cloud_off" className="text-primary" size="lg" />
              <p className="mt-3 font-title-md text-title-md text-on-surface">Search paused</p>
              <p className="mt-1 max-w-sm font-body-md text-body-md text-on-surface-variant">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((key) => key + 1)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
              >
                <Icon name="refresh" size="sm" />
                Try again
              </button>
            </div>
          )}

          {noResults && (
            <div className="mt-6 flex flex-col items-center rounded-xl bg-surface-container-low px-6 py-10 text-center">
              <Icon name="search" className="text-primary" size="lg" />
              <p className="mt-3 font-title-md text-title-md text-on-surface">Nothing here yet</p>
              <p className="mt-1 max-w-xs font-body-md text-body-md text-on-surface-variant">
                Try a different spelling, an artist name, or one of the genres below.
              </p>
            </div>
          )}

          {!loading && !error && results && (
            <>
              {results.artists.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface-variant">
                    Artists
                  </h3>
                  <div className="mt-2 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {results.artists.map((artist) => (
                      <ArtistCircle key={artist.id} artist={artist} size="sm" subtitle="Artist" />
                    ))}
                  </div>
                </div>
              )}

              {results.tracks.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface-variant">
                    Tracks
                  </h3>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {results.tracks.slice(0, 12).map((track) => (
                      <TrackRow key={track.id} track={track} queue={results.tracks} showAlbum />
                    ))}
                  </div>
                </div>
              )}

              {results.albums.length > 0 && (
                <div className="mt-5">
                  <h3 className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface-variant">
                    Albums & playlists
                  </h3>
                  <div className="mt-2 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {results.albums.map((album) => (
                      <AlbumCard
                        key={album.id}
                        size="sm"
                        item={{
                          id: album.id,
                          title: album.title,
                          subtitle: `${album.artist} · ${album.kind}`,
                          kind: 'album',
                          href: `/album/${album.id}`,
                          artwork: album.artwork,
                          provider: album.provider,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          {trimmed.length > 0 && (
            <p className="px-margin pt-3 font-body-md text-body-md text-on-surface-variant">
              Keep typing — {MIN_QUERY - trimmed.length} more character
              {MIN_QUERY - trimmed.length === 1 ? '' : 's'} needed.
            </p>
          )}

          <section aria-label="Recent Searches" className="mt-4">
            <div className="mb-2 flex items-center justify-between px-margin">
              <span className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface-variant">
                Recent searches
              </span>
              {recents.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRecents([])
                    writeRecents([])
                  }}
                  className="min-h-11 font-label-md text-label-md text-primary-container transition-colors hover:text-primary"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto px-margin pb-1 no-scrollbar">
              {recents.length === 0 && (
                <span className="py-2 font-body-md text-body-md italic text-outline">
                  No recent searches yet
                </span>
              )}
              {recents.map((recent) => (
                <div
                  key={recent}
                  className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-surface-container-high pl-3.5 pr-1 text-on-surface shadow-sm"
                >
                  <Icon name="history" size="sm" className="text-outline" />
                  <button
                    type="button"
                    onClick={() => setQuery(recent)}
                    className="max-w-40 truncate font-label-lg text-label-lg"
                  >
                    {recent}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = recents.filter((item) => item !== recent)
                      setRecents(next)
                      writeRecents(next)
                    }}
                    aria-label={`Remove ${recent} from recent searches`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="px-margin pt-6">
            <div className="relative flex w-full items-center justify-between overflow-hidden rounded-xl bg-gradient-to-r from-secondary-container via-surface-container-high to-surface-container p-4 shadow-lg">
              <div className="z-10 flex max-w-[68%] flex-col">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-primary-container" />
                  <span className="font-caption text-caption font-semibold uppercase tracking-wider text-primary">
                    Vibe Radio
                  </span>
                </div>
                <span className="font-title-md text-title-md leading-tight text-on-surface">
                  A mix tuned to right now
                </span>
                <span className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
                  Auto-generated from trending free music
                </span>
              </div>
              <button
                type="button"
                onClick={playVibeRadio}
                aria-label="Play Vibe Radio"
                className="z-10 flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.45)] transition-transform hover:scale-105 active:scale-95"
              >
                <Icon name="play_arrow" filled size="lg" />
              </button>
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-primary-container/20 blur-xl" />
            </div>
          </div>

          <section aria-label="Browse all genres and categories" className="mt-6 px-margin pb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
                Browse all
              </h2>
              <span className="font-label-md text-label-md text-on-surface-variant">
                {genres.length} genres
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => {
                    setQuery(genre.query)
                    commitRecent(genre.query)
                  }}
                  className={cn(
                    'group relative flex h-28 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br p-3 text-left shadow-md transition-all active:scale-[0.98]',
                    genre.gradient,
                  )}
                >
                  <span className="z-10 font-title-lg text-title-lg font-bold tracking-tight text-on-surface transition-colors group-hover:text-primary">
                    {genre.name}
                  </span>
                  <span className="z-10 flex items-center gap-1">
                    <span className="rounded-full bg-surface-container-lowest/60 px-2 py-0.5 font-caption text-caption text-on-surface-variant backdrop-blur-md">
                      {genre.subtitle}
                    </span>
                  </span>
                  <span className="absolute -bottom-3 -right-3 flex h-20 w-20 rotate-12 items-center justify-center rounded-lg bg-surface-container-lowest/50 shadow-2xl transition-transform group-hover:rotate-6 group-hover:scale-110">
                    <Icon
                      name={genre.id === 'night-drive' ? 'explore' : 'music_note'}
                      size="lg"
                      className="text-white/70"
                    />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
