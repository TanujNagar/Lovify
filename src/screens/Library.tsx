import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { PlaylistManageSheet } from '@/components/playlist/PlaylistManageSheet'
import { AlbumCard } from '@/components/media/AlbumCard'
import { Artwork } from '@/components/media/Artwork'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import { getTracksByIds } from '@/lib/db'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import type { Artist, Playlist, Track } from '@/types/music'

type LibraryRow = {
  id: string
  kind: 'liked' | 'playlist' | 'album' | 'artist'
  title: string
  subtitle: string
  href: string
  meta: string
  artwork?: string
  verified?: boolean
  pinned?: boolean
  playlistId?: string
}

const filters = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'downloaded', label: 'Downloaded', icon: 'download_done' },
]

export function LibraryScreen() {
  const navigate = useNavigate()
  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const history = useLibraryStore((state) => state.history)
  const openCreatePlaylist = useUiStore((state) => state.openCreatePlaylist)
  const showToast = useUiStore((state) => state.showToast)

  const [filter, setFilter] = useState('playlists')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cachedTracks, setCachedTracks] = useState<Track[]>([])
  const [managed, setManaged] = useState<Playlist | null>(null)

  useEffect(() => {
    const ids = Array.from(
      new Set([
        ...likedIds,
        ...history.map((entry) => entry.track.id),
        ...playlists.flatMap((playlist) => playlist.trackIds),
      ]),
    )
    if (!ids.length) {
      setCachedTracks([])
      return
    }
    let active = true
    void getTracksByIds(ids)
      .then((tracks) => {
        if (active) setCachedTracks(tracks)
      })
      .catch(() => {
        if (active) setCachedTracks([])
      })
    return () => {
      active = false
    }
  }, [history, likedIds, playlists])

  const { albumRows, artists } = useMemo(() => {
    const albums = new Map<string, LibraryRow & { artist: string; year: number; count: number }>()
    const artistMap = new Map<string, Artist>()

    for (const track of cachedTracks) {
      if (track.artistId && !artistMap.has(track.artistId)) {
        artistMap.set(track.artistId, {
          id: track.artistId,
          provider: track.provider,
          providerId: track.providerId,
          name: track.artist,
          artwork: track.artwork,
        })
      }

      if (!track.albumId) continue
      const existing = albums.get(track.albumId)
      if (existing) {
        existing.count += 1
      } else {
        albums.set(track.albumId, {
          id: track.albumId,
          kind: 'album',
          title: track.album || track.title,
          subtitle: `${track.artist} · ${track.provider}`,
          href: `/album/${track.albumId}`,
          meta: '1 track',
          artwork: track.artwork,
          artist: track.artist,
          year: track.year ?? 0,
          count: 1,
        })
      }
    }

    return {
      albumRows: Array.from(albums.values()).map((row) => ({
        ...row,
        subtitle: `${row.artist}${row.year ? ` · ${row.year}` : ''}`,
        meta: `${row.count} track${row.count === 1 ? '' : 's'}`,
      })),
      artists: Array.from(artistMap.values()),
    }
  }, [cachedTracks])

  const artistRows = useMemo<LibraryRow[]>(
    () =>
      artists.map((artist) => {
        const count = cachedTracks.filter((track) => track.artistId === artist.id).length
        return {
          id: artist.id,
          kind: 'artist',
          title: artist.name,
          subtitle: `Artist · ${count} track${count === 1 ? '' : 's'}`,
          href: `/artist/${artist.id}`,
          meta: 'Artist',
          artwork: artist.artwork,
        }
      }),
    [artists, cachedTracks],
  )

  const rows = useMemo<LibraryRow[]>(() => {
    const normalized = search.trim().toLowerCase()
    const matches = (title: string) => !normalized || title.toLowerCase().includes(normalized)

    const playlistRows: LibraryRow[] = playlists
      .filter((playlist) => playlist.system !== 'liked')
      .map((playlist) => ({
        id: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        subtitle:
          playlist.description ||
          `${playlist.trackIds.length} tracks · ${playlist.trackIds.length ? 'Created by you' : 'Empty playlist'}`,
        href: `/playlist/${playlist.id}`,
        meta: `${playlist.trackIds.length} tracks`,
        artwork: cachedTracks.find((track) => playlist.trackIds.includes(track.id))?.artwork,
        playlistId: playlist.id,
      }))

    const likedRow: LibraryRow = {
      id: 'playlist-liked',
      kind: 'liked',
      title: 'Liked Songs',
      subtitle: `Playlist · ${likedIds.length} tracks`,
      href: '/playlist/playlist-liked',
      meta: `${likedIds.length} tracks`,
      pinned: true,
      artwork: cachedTracks.find((track) => likedIds.includes(track.id))?.artwork,
    }

    let result: LibraryRow[] = []
    if (filter === 'albums') {
      result = albumRows
    } else if (filter === 'artists') {
      result = artistRows
    } else if (filter === 'downloaded') {
      result = []
    } else {
      result = [likedRow, ...playlistRows]
    }

    result = result.filter((row) => matches(row.title))
    if (sort === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }
    return result
  }, [albumRows, artistRows, cachedTracks, filter, likedIds, playlists, search, sort])

  const isDownloadedEmpty = filter === 'downloaded'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-margin">
      <div className="flex items-center justify-between pb-2 pt-2">
        <div className="flex items-center gap-2">
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
            Your Library
          </h1>
          <span className="h-2 w-2 rounded-full bg-primary-container shadow-[0_0_10px_rgba(249,87,115,0.7)]" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? 'Close library search' : 'Search inside library'}
            aria-expanded={searchOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name={searchOpen ? 'close' : 'search'} />
          </button>
          <button
            type="button"
            onClick={() => openCreatePlaylist()}
            className="flex h-11 items-center gap-1.5 rounded-full bg-surface-container-high px-3.5 text-primary transition-colors hover:bg-surface-variant active:scale-95"
          >
            <Icon name="add" size="sm" />
            <span className="font-label-lg text-label-lg text-on-surface">New</span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="mb-3 flex h-12 items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-2 focus-within:ring-primary/50">
          <Icon name="search" size="sm" className="text-on-surface-variant" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter your library"
            aria-label="Filter your library"
            className="h-full min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear library filter"
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant"
            >
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>
      )}

      <div className="-mx-margin flex items-center gap-2 overflow-x-auto px-margin py-1 no-scrollbar">
        {filters.map((item) => (
          <Chip
            key={item.id}
            active={filter === item.id}
            icon={item.icon}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-1">
        <button
          type="button"
          onClick={() => setSort((current) => (current === 'recent' ? 'name' : 'recent'))}
          className="flex min-h-11 items-center gap-1.5 rounded px-1 font-label-lg text-label-lg text-on-surface transition-colors hover:text-primary"
          aria-label={`Sort by ${sort === 'recent' ? 'most recent' : 'name'}, click to change`}
        >
          <Icon name="swap_vert" size="sm" className="text-primary" />
          <span>{sort === 'recent' ? 'Most Recent' : 'Name A–Z'}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container px-2.5 font-label-md text-label-md text-on-surface-variant">
            <Icon name="library_music" size="sm" />
            {cachedTracks.length} cached
          </span>
          <button
            type="button"
            onClick={() => setView((current) => (current === 'list' ? 'grid' : 'list'))}
            aria-label={view === 'list' ? 'Switch to grid view' : 'Switch to list view'}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name={view === 'list' ? 'grid_view' : 'view_list'} size="sm" />
          </button>
        </div>
      </div>

      <div className="mt-4 pb-10">
        {isDownloadedEmpty ? (
          <div className="relative mt-4 flex flex-col items-center overflow-hidden rounded-xl bg-surface-container-low p-4 text-center shadow-lg">
            <div className="relative mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container shadow-[0_0_24px_rgba(249,87,115,0.22)]">
              <Icon name="cloud_off" className="text-primary" size="lg" />
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name="arrow_downward" size="sm" />
              </div>
            </div>
            <h2 className="mb-1 font-title-lg text-title-lg tracking-tight text-on-surface">
              No offline downloads yet
            </h2>
            <p className="mb-4 max-w-[270px] font-body-md text-body-md leading-relaxed text-on-surface-variant">
              Offline downloads arrive in Phase 3. Your playlists, likes and history already work
              offline.
            </p>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-5 font-label-lg text-label-lg text-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
            >
              <Icon name="travel_explore" size="sm" />
              <span>Explore free music</span>
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-xl bg-surface-container-low p-8 text-center">
            <Icon name={filter === 'albums' || filter === 'artists' ? 'music_note' : 'queue_music'} className="text-primary" />
            <p className="mt-3 font-title-md text-title-md text-on-surface">
              {filter === 'albums' || filter === 'artists'
                ? 'Nothing cached yet'
                : 'No playlists yet'}
            </p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              {filter === 'albums' || filter === 'artists'
                ? 'Play or save a track and its album and artist will appear here.'
                : 'Create your first playlist, or save a track from search.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => openCreatePlaylist()}
                className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
              >
                <Icon name="add" size="sm" />
                New playlist
              </button>
              <Link
                to="/search"
                className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-5 font-label-lg text-label-lg text-on-surface"
              >
                <Icon name="search" size="sm" />
                Search music
              </Link>
            </div>
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <LibraryListRow
                key={`${row.kind}-${row.id}`}
                row={row}
                onManage={() => {
                  const playlist = playlists.find((item) => item.id === row.playlistId)
                  if (playlist) setManaged(playlist)
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row) =>
              row.kind === 'artist' ? (
                <ArtistCircle
                  key={row.id}
                  artist={artists.find((artist) => artist.id === row.id)!}
                  size="md"
                  className="w-full"
                />
              ) : (
                <AlbumCard
                  key={`${row.kind}-${row.id}`}
                  item={{
                    id: row.id,
                    title: row.title,
                    subtitle: row.subtitle,
                    kind: row.kind === 'liked' || row.kind === 'playlist' ? 'playlist' : 'album',
                    href: row.href,
                    artwork: row.artwork,
                  }}
                  label={row.kind === 'liked' ? 'Pinned' : undefined}
                />
              ),
            )}
          </div>
        )}
      </div>

      <PlaylistManageSheet
        playlist={managed}
        onClose={() => setManaged(null)}
        onDeleted={() => showToast('Playlist deleted.')}
      />
    </div>
  )
}

function LibraryListRow({ row, onManage }: { row: LibraryRow; onManage: () => void }) {
  return (
    <div className="group flex items-center justify-between rounded-xl bg-surface-container-low p-2.5 transition-colors hover:bg-surface-container">
      <Link to={row.href} className="flex min-w-0 flex-1 items-center gap-3">
        {row.kind === 'liked' ? (
          <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container via-secondary-container to-surface-container-lowest shadow-[0_6px_20px_rgba(249,87,115,0.3)]">
            <Icon name="favorite" filled size="lg" className="text-on-primary-container" />
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-container-highest shadow-sm">
              <Icon name="push_pin" filled size="sm" className="text-[10px] text-primary" />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'h-14 w-14 flex-shrink-0 overflow-hidden shadow-md',
              row.kind === 'artist' ? 'rounded-full ring-2 ring-surface-container-highest' : 'rounded-xl',
            )}
          >
            <Artwork
              seed={row.id}
              src={row.artwork}
              alt=""
              rounded={row.kind === 'artist' ? 'rounded-full' : 'rounded-xl'}
              className="h-full w-full"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate font-title-md text-title-md text-on-surface transition-colors group-hover:text-primary">
              {row.title}
            </h2>
            {row.verified && (
              <Icon name="verified" filled size="sm" className="flex-shrink-0 text-primary" />
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate font-body-md text-body-md text-on-surface-variant">
            <span className="truncate">{row.subtitle}</span>
          </div>
        </div>
      </Link>

      <div className="flex flex-shrink-0 items-center gap-1 pl-2">
        {row.kind === 'playlist' ? (
          <button
            type="button"
            onClick={onManage}
            aria-label={`More options for ${row.title}`}
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="more_vert" />
          </button>
        ) : (
          <Icon name="chevron_right" className="text-on-surface-variant" />
        )}
      </div>
    </div>
  )
}
