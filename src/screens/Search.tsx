import { useMemo, useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { TrackRow } from '@/components/media/TrackRow'
import { genres, recentSearches as initialRecents, searchCatalog, tracks } from '@/data/mock'
import { cn } from '@/lib/cn'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

export function SearchScreen() {
  const [query, setQuery] = useState('')
  const [recents, setRecents] = useState(initialRecents)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)
  const results = useMemo(() => searchCatalog(query), [query])
  const hasQuery = query.trim().length > 0
  const noResults =
    hasQuery &&
    results.tracks.length === 0 &&
    results.albums.length === 0 &&
    results.artists.length === 0

  const commitSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setRecents((current) => [trimmed, ...current.filter((item) => item !== trimmed)].slice(0, 6))
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => showToast('Voice search arrives in a later phase.')}
            aria-label="Voice search (coming soon)"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:text-primary"
          >
            <Icon name="graphic_eq" />
          </button>
          <button
            type="button"
            onClick={() => showToast('Camera search arrives in a later phase.')}
            aria-label="Camera search (coming soon)"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:text-primary"
          >
            <Icon name="photo_camera" />
          </button>
        </div>
      </div>

      <form
        role="search"
        className="px-margin py-2"
        onSubmit={(event) => {
          event.preventDefault()
          commitSearch(query)
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
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => showToast('Voice search arrives in a later phase.')}
              aria-label="Voice input (coming soon)"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-primary"
            >
              <Icon name="mic" />
            </button>
          )}
        </div>
      </form>

      {hasQuery ? (
        <section aria-label="Search results" className="px-margin pb-10 pt-4">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Results for “{query.trim()}”
          </h2>
          {noResults && (
            <div className="mt-6 flex flex-col items-center rounded-xl bg-surface-container-low px-6 py-10 text-center">
              <Icon name="search" className="text-primary" size="lg" />
              <p className="mt-3 font-title-md text-title-md text-on-surface">Nothing here yet</p>
              <p className="mt-1 max-w-xs font-body-md text-body-md text-on-surface-variant">
                Try a different spelling, an artist name, or one of the genres below.
              </p>
            </div>
          )}

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
                {results.tracks.slice(0, 8).map((track) => (
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
                      subtitle: `${album.artist} • ${album.kind}`,
                      kind: 'album',
                      href: `/album/${album.id}`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <section aria-label="Recent Searches" className="mt-4">
            <div className="mb-2 flex items-center justify-between px-margin">
              <span className="font-label-lg text-label-lg uppercase tracking-wider text-on-surface-variant">
                Recent searches
              </span>
              {recents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecents([])}
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
                    onClick={() => {
                      setQuery(recent)
                      commitSearch(recent)
                    }}
                    className="max-w-40 truncate font-label-lg text-label-lg"
                  >
                    {recent}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecents((current) => current.filter((item) => item !== recent))}
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
                  Auto-generated from your recent listening
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  playQueue(tracks.slice(0, 10), 0, {
                    type: 'radio',
                    label: 'Vibe Radio',
                  })
                }
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
                    setQuery(genre.name)
                    commitSearch(genre.name)
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
                    <Icon name={genre.id === 'night-drive' ? 'explore' : 'music_note'} size="lg" className="text-white/70" />
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
