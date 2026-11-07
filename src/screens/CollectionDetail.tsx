import { Link, useLocation, useParams } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { TrackRow } from '@/components/media/TrackRow'
import { albums, artists, initialPlaylists, tracks, tracksByIds } from '@/data/mock'
import { cn } from '@/lib/cn'
import { totalDuration } from '@/lib/format'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import type { Playlist, Track } from '@/types/music'

type DetailKind = 'playlist' | 'album' | 'artist'

export function CollectionDetailScreen() {
  const { id = '' } = useParams()
  const location = useLocation()
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)
  const storedPlaylists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const loaded = useLibraryStore((state) => state.loaded)

  const kind: DetailKind = location.pathname.startsWith('/album/')
    ? 'album'
    : location.pathname.startsWith('/artist/')
      ? 'artist'
      : 'playlist'

  let title = ''
  let subtitle = ''
  let description = ''
  let items: Track[] = []
  let coverSeed = id
  let circle = false
  let extra: string[] = []

  if (kind === 'playlist') {
    const playlist: Playlist | undefined =
      storedPlaylists.find((item) => item.id === id) ??
      initialPlaylists.find((item) => item.id === id)
    if (!playlist) {
      if (!loaded) return <DetailSkeleton />
      return <NotFoundDetail label="This playlist could not be found." />
    }
    title = playlist.name
    description = playlist.description ?? ''
    const ids = playlist.system === 'liked' ? likedIds : playlist.trackIds
    items = tracksByIds(ids)
    subtitle = `${playlist.system === 'liked' ? 'Liked songs' : 'Playlist'} · ${items.length} tracks`
    extra = [totalDuration(items.map((track) => track.duration))]
    coverSeed = playlist.id
  }

  if (kind === 'album') {
    const album = albums.find((item) => item.id === id)
    if (!album) return <NotFoundDetail label="This album could not be found." />
    title = album.title
    subtitle = `${album.artist} · ${album.kind} · ${album.year}`
    description = `Released by ${album.artist}.`
    items = tracksByIds(album.trackIds)
    extra = [`${items.length} tracks`, totalDuration(items.map((track) => track.duration))]
    coverSeed = album.id
  }

  if (kind === 'artist') {
    const artist = artists.find((item) => item.id === id)
    if (!artist) return <NotFoundDetail label="This artist could not be found." />
    title = artist.name
    subtitle = `Artist · ${tracks.filter((track) => track.artistId === artist.id).length} tracks`
    description = artist.bio ?? ''
    items = tracks.filter((track) => track.artistId === artist.id)
    extra = albums
      .filter((album) => album.artistId === artist.id)
      .map((album) => `${album.kind} · ${album.title}`)
    coverSeed = artist.id
    circle = true
  }

  const contextLabel = title
  const playAll = () =>
    playQueue(items, 0, { type: kind, label: contextLabel, id })
  const shuffleAll = () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    playQueue(shuffled, 0, { type: kind, label: `${contextLabel} · shuffle`, id })
    showToast('Shuffling this collection.')
  }

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · Lovify`, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        showToast('Link copied.')
      }
    } catch {
      showToast('Sharing is not available in this browser.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-margin pb-10">
      <div
        className={cn(
          'relative mt-3 flex flex-col items-center gap-4 overflow-hidden rounded-2xl bg-surface-container-low p-5 text-center shadow-lg',
          kind !== 'artist' && 'sm:flex-row sm:text-left',
        )}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-container/10 blur-3xl" />
        <div
          className={cn(
            'relative z-10 h-40 w-40 flex-shrink-0 overflow-hidden shadow-xl',
            circle ? 'rounded-full ring-4 ring-surface-container-highest' : 'rounded-xl',
          )}
        >
          <Artwork
            seed={coverSeed}
            alt={`${title} artwork`}
            rounded={circle ? 'rounded-full' : 'rounded-xl'}
            className="h-full w-full"
          >
            <span className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/15">
              <Icon name={kind === 'playlist' ? 'queue_music' : kind === 'album' ? 'album' : 'person'} size="lg" className="text-white/70" />
            </span>
          </Artwork>
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <p className="font-caption text-caption uppercase tracking-[0.16em] text-primary">
            {kind}
          </p>
          <h1 className="mt-1 font-headline-lg text-headline-lg tracking-tight text-on-surface">
            {title}
          </h1>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
          {description && (
            <p className="mt-2 line-clamp-2 font-body-md text-body-md text-on-surface-variant">
              {description}
            </p>
          )}
          {extra.length > 0 && (
            <p className="mt-1 font-caption text-caption uppercase tracking-wider text-outline">
              {extra.filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={playAll}
              disabled={!items.length}
              className="flex h-12 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.3)]"
            >
              <Icon name="play_arrow" filled size="sm" />
              Play
            </button>
            <button
              type="button"
              onClick={shuffleAll}
              disabled={!items.length}
              aria-label="Shuffle"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:text-primary"
            >
              <Icon name="shuffle" size="sm" />
            </button>
            <button
              type="button"
              onClick={() => void share()}
              aria-label="Share"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:text-primary"
            >
              <Icon name="share" size="sm" />
            </button>
            <button
              type="button"
              onClick={() => showToast('Collection options are coming in Phase 3.')}
              aria-label="More options"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:text-primary"
            >
              <Icon name="more_vert" size="sm" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-title-lg text-title-lg text-on-surface">
          {kind === 'artist' ? 'Popular tracks' : 'Track list'}
        </h2>
        {kind === 'playlist' && (
          <span className="font-caption text-caption text-on-surface-variant">
            {items.length} tracks · {totalDuration(items.map((track) => track.duration))}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {items.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            queue={items}
            showIndex={index + 1}
            showAlbum={kind !== 'album'}
          />
        ))}
        {items.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-6 text-center">
            <p className="font-title-md text-title-md text-on-surface">No tracks yet</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              {kind === 'playlist'
                ? 'Find something you love and add it to this playlist in Phase 2.'
                : 'Tracks will appear here once this collection is available.'}
            </p>
            {kind === 'playlist' && (
              <Link
                to="/search"
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-surface-container-high px-5 font-label-lg text-label-lg text-primary"
              >
                Search music
              </Link>
            )}
          </div>
        )}
      </div>

      {kind === 'artist' && extra.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-title-lg text-title-lg text-on-surface">Appears on</h2>
          <div className="flex flex-col gap-1.5">
            {albums
              .filter((album) => album.artistId === id)
              .map((album) => (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5 transition-colors hover:bg-surface-container"
                >
                  <Artwork seed={album.id} alt="" rounded="rounded-lg" className="h-12 w-12 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-title-md text-title-md text-on-surface">{album.title}</p>
                    <p className="truncate font-body-md text-body-md text-on-surface-variant">
                      {album.kind} · {album.year} · {album.trackIds.length} tracks
                    </p>
                  </div>
                  <Icon name="chevron_right" className="text-on-surface-variant" />
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-margin pt-5">
      <div className="h-48 animate-pulse rounded-2xl bg-surface-container" />
       <div className="mt-4 h-6 w-2/3 animate-pulse rounded-full bg-surface-container" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded-full bg-surface-container" />
    </div>
  )
}

function NotFoundDetail({ label }: { label: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <Icon name="music_note" size="lg" className="text-primary" />
      <h1 className="mt-3 font-headline-md text-headline-md text-on-surface">Nothing here</h1>
      <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{label}</p>
      <Link
        to="/library"
        className="mt-5 flex min-h-11 items-center rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
      >
        Back to your library
      </Link>
    </div>
  )
}
