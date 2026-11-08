import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { TrackRow } from '@/components/media/TrackRow'
import { PlaylistManageSheet } from '@/components/playlist/PlaylistManageSheet'
import { SortableTrackList } from '@/components/playlist/SortableTrackList'
import { cn } from '@/lib/cn'
import { getTracksByIds } from '@/lib/db'
import { totalDuration } from '@/lib/format'
import { getArtistTracks, getProviderAlbum, getProviderArtist } from '@/lib/providers'
import { ProviderError } from '@/lib/providers/types'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import { createShareUrl } from '@/lib/share'
import type { Album, Artist, Playlist, Track } from '@/types/music'

type DetailKind = 'playlist' | 'album' | 'artist'

type DetailData = {
  title: string
  subtitle: string
  description: string
  items: Track[]
  artwork?: string
  circle?: boolean
  extra: string[]
}

export function CollectionDetailScreen() {
  const { id = '' } = useParams()
  const location = useLocation()
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)
  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const loaded = useLibraryStore((state) => state.loaded)
  const movePlaylistTrack = useLibraryStore((state) => state.movePlaylistTrack)

  const [data, setData] = useState<DetailData | null>(null)
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [managed, setManaged] = useState<Playlist | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const kind: DetailKind = location.pathname.startsWith('/album/')
    ? 'album'
    : location.pathname.startsWith('/artist/')
      ? 'artist'
      : 'playlist'

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const run = async () => {
      if (kind === 'playlist') {
        const current = playlists.find((item) => item.id === id)
        if (!current) {
          if (!loaded) return
          throw new ProviderError('unavailable', 'audius', 'This playlist could not be found.')
        }
        const ids = current.system === 'liked' ? likedIds : current.trackIds
        const items = await getTracksByIds(ids)
        if (!active) return
        setPlaylist(current)
        setData({
          title: current.name,
          subtitle: `${current.system === 'liked' ? 'Liked songs' : 'Playlist'} · ${items.length} tracks`,
          description: current.description ?? '',
          items,
          artwork: items[0]?.artwork,
          extra: [totalDuration(items.map((track) => track.duration))],
        })
        setLoading(false)
        return
      }

      if (kind === 'album') {
        const album: Album | null = await getProviderAlbum(id)
        if (!active) return
        if (!album) throw new ProviderError('unavailable', 'audius', 'This album could not be found.')
        const items = await getTracksByIds(album.trackIds)
        if (!active) return
        setData({
          title: album.title,
          subtitle: `${album.artist} · ${album.kind} · ${album.year}`,
          description: album.description || `Released by ${album.artist}.`,
          items,
          artwork: album.artwork,
          extra: [`${items.length} tracks`, totalDuration(items.map((track) => track.duration))],
        })
        setLoading(false)
        return
      }

      const artist: Artist | null = await getProviderArtist(id)
      if (!active) return
      if (!artist) throw new ProviderError('unavailable', 'audius', 'This artist could not be found.')
      const items = await getArtistTracks(id)
      if (!active) return
      setData({
        title: artist.name,
        subtitle: `Artist · ${items.length} tracks`,
        description: artist.bio ?? '',
        items,
        artwork: artist.artwork,
        circle: true,
        extra: [],
      })
      setLoading(false)
    }

    void run().catch((caught: unknown) => {
      if (!active) return
      setLoading(false)
      setError(
        caught instanceof ProviderError
          ? caught.message
          : 'This collection could not be loaded right now.',
      )
    })

    return () => {
      active = false
    }
  }, [id, kind, likedIds, loaded, playlists, retryKey])

  const albumLinks = useMemo(() => {
    if (!data) return []
    const seen = new Map<string, { id: string; title: string; artwork?: string; year?: number }>()
    for (const track of data.items) {
      if (!track.albumId || seen.has(track.albumId)) continue
      seen.set(track.albumId, {
        id: track.albumId,
        title: track.album,
        artwork: track.artwork,
        year: track.year,
      })
    }
    return Array.from(seen.values())
  }, [data])

  if (loading && !data) return <DetailSkeleton />

  if (error || !data) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
        <Icon name="music_note" size="lg" className="text-primary" />
        <h1 className="mt-3 font-headline-md text-headline-md text-on-surface">Nothing here</h1>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {error ?? 'This collection could not be found.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
          >
            <Icon name="refresh" size="sm" />
            Try again
          </button>
          <Link
            to="/library"
            className="flex min-h-11 items-center rounded-full bg-surface-container-high px-5 font-label-lg text-label-lg text-on-surface"
          >
            Back to your library
          </Link>
        </div>
      </div>
    )
  }

  const { title, subtitle, description, items, artwork, circle, extra } = data

  const playAll = () => {
    if (!items.length) {
      showToast('This collection has no playable tracks yet.')
      return
    }
    playQueue(items, 0, { type: kind, label: title, id })
  }

  const shuffleAll = () => {
    if (!items.length) return
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    playQueue(shuffled, 0, { type: kind, label: `${title} · shuffle`, id })
    showToast('Shuffling this collection.')
  }

  const canReorder = kind === 'playlist' && playlist !== null && playlist.system !== 'liked'

  const handleReorder = (from: number, to: number) => {
    if (!playlist) return
    // Reorder locally first so the row lands under the finger immediately,
    // then persist the full order in IndexedDB.
    setData((current) => {
      if (!current) return current
      const next = [...current.items]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { ...current, items: next }
    })
    void movePlaylistTrack(playlist.id, from, to).catch(() => {
      showToast('Could not save the new order. Check that storage is available.')
    })
  }

  const share = async () => {
    const url = createShareUrl(items, title, description)
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · Lovify`, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Shareable link copied.')
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
            seed={id}
            src={artwork}
            alt={`${title} artwork`}
            rounded={circle ? 'rounded-full' : 'rounded-xl'}
            className="h-full w-full"
          >
            <span className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/15">
              <Icon
                name={kind === 'playlist' ? 'queue_music' : kind === 'album' ? 'album' : 'person'}
                size="lg"
                className="text-white/70"
              />
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
          {extra.filter(Boolean).length > 0 && (
            <p className="mt-1 font-caption text-caption uppercase tracking-wider text-outline">
              {extra.filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={playAll}
              disabled={!items.length}
              className="flex h-12 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.3)] disabled:opacity-50"
            >
              <Icon name="play_arrow" filled size="sm" />
              Play
            </button>
            <button
              type="button"
              onClick={shuffleAll}
              disabled={!items.length}
              aria-label="Shuffle"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:text-primary disabled:opacity-50"
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
            {kind === 'playlist' && playlist && playlist.system !== 'liked' && (
              <button
                type="button"
                onClick={() => setManaged(playlist)}
                aria-label="More options"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:text-primary"
              >
                <Icon name="more_vert" size="sm" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h2 className="font-title-lg text-title-lg text-on-surface">
            {kind === 'artist' ? 'Popular tracks' : 'Track list'}
          </h2>
          {canReorder && items.length > 1 && (
            <p className="mt-0.5 font-caption text-caption text-on-surface-variant">
              Drag the handle to reorder. Keyboard: focus a handle, press Space, move with the
              arrow keys, then Space again.
            </p>
          )}
        </div>
        <span className="font-caption text-caption text-on-surface-variant">
          {items.length} tracks · {totalDuration(items.map((track) => track.duration))}
        </span>
      </div>

      <div className="mt-2">
        {canReorder ? (
          <SortableTrackList
            tracks={items}
            onReorder={handleReorder}
            playlistId={playlist?.id ?? null}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((track, index) => (
              <TrackRow
                key={`${track.id}-${index}`}
                track={track}
                queue={items}
                showIndex={index + 1}
                showAlbum={kind !== 'album'}
                playlistId={kind === 'playlist' && playlist?.system !== 'liked' ? playlist?.id : null}
              />
            ))}
          </div>
        )}
        {items.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-6 text-center">
            <p className="font-title-md text-title-md text-on-surface">No tracks yet</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              {kind === 'playlist'
                ? 'Search for something you love and add it from the track menu.'
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

      {albumLinks.length > 0 && kind !== 'album' && (
        <div className="mt-6">
          <h2 className="mb-2 font-title-lg text-title-lg text-on-surface">
            {kind === 'artist' ? 'Appears on' : 'From these albums'}
          </h2>
          <div className="flex flex-col gap-1.5">
            {albumLinks.slice(0, 8).map((album) => (
              <Link
                key={album.id}
                to={`/album/${album.id}`}
                className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5 transition-colors hover:bg-surface-container"
              >
                <Artwork
                  seed={album.id}
                  src={album.artwork}
                  alt=""
                  rounded="rounded-lg"
                  className="h-12 w-12 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-title-md text-title-md text-on-surface">{album.title}</p>
                  <p className="truncate font-body-md text-body-md text-on-surface-variant">
                    {album.year ? `${album.year} · ` : ''}Album
                  </p>
                </div>
                <Icon name="chevron_right" className="text-on-surface-variant" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <PlaylistManageSheet
        playlist={managed}
        onClose={() => setManaged(null)}
        onDeleted={() => showToast('Playlist deleted.')}
        onRenamed={(name) =>
          setData((current) => (current ? { ...current, title: name } : current))
        }
      />
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
