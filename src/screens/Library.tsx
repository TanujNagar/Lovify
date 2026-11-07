import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { Artwork } from '@/components/media/Artwork'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { Chip } from '@/components/ui/Chip'
import { albums, artists, initialPlaylists, tracks } from '@/data/mock'
import { cn } from '@/lib/cn'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'

type LibraryRow = {
  id: string
  kind: 'liked' | 'playlist' | 'album' | 'artist'
  title: string
  subtitle: string
  href: string
  meta: string
  verified?: boolean
  pinned?: boolean
  trackCount?: number
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
  const openCreatePlaylist = useUiStore((state) => state.openCreatePlaylist)
  const showToast = useUiStore((state) => state.showToast)

  const [filter, setFilter] = useState('playlists')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [downloadedOnly, setDownloadedOnly] = useState(false)

  const effectivePlaylists = playlists.length > 0 ? playlists : initialPlaylists

  const rows = useMemo<LibraryRow[]>(() => {
    const normalized = search.trim().toLowerCase()
    const matches = (title: string) => !normalized || title.toLowerCase().includes(normalized)

    const playlistRows: LibraryRow[] = effectivePlaylists
      .filter((playlist) => playlist.system !== 'liked')
      .map((playlist) => ({
        id: playlist.id,
        kind: 'playlist',
        title: playlist.name,
        subtitle:
          playlist.description ||
          `${playlist.trackIds.length} tracks • ${playlist.id.startsWith('playlist-') ? 'Created by you' : 'Curated'}`,
        href: `/playlist/${playlist.id}`,
        meta: `${playlist.trackIds.length} tracks`,
      }))

    const albumRows: LibraryRow[] = albums.map((album) => ({
      id: album.id,
      kind: 'album',
      title: album.title,
      subtitle: `${album.artist} • ${album.kind} • ${album.year}`,
      href: `/album/${album.id}`,
      meta: `${album.trackIds.length} tracks`,
    }))

    const artistRows: LibraryRow[] = artists.map((artist) => ({
      id: artist.id,
      kind: 'artist',
      title: artist.name,
      subtitle: `Artist • ${tracks.filter((track) => track.artistId === artist.id).length} tracks`,
      href: `/artist/${artist.id}`,
      meta: 'Artist',
      verified: artist.verified,
    }))

    let result: LibraryRow[] = []

    if (filter === 'albums') {
      result = albumRows
    } else if (filter === 'artists') {
      result = artistRows
    } else if (filter === 'downloaded') {
      result = []
    } else {
      const currentLiked = likedIds.length > 0 ? likedIds : initialPlaylists[0]?.trackIds ?? []
      const likedRow: LibraryRow = {
        id: 'playlist-liked',
        kind: 'liked',
        title: 'Liked Songs',
        subtitle: `Playlist • ${currentLiked.length} tracks`,
        href: '/playlist/playlist-liked',
        meta: `${currentLiked.length} tracks`,
        pinned: true,
        trackCount: currentLiked.length,
      }

      // The Stitch "Playlists" view mixes pinned playlists, recent albums and
      // the artist you opened last. Keep that feel while real filters stay live.
      const featured: LibraryRow[] = []
      const atmospheric = playlistRows.find((row) => row.id === 'playlist-atmospheric-focus')
      const midnight = albumRows.find((row) => row.id === 'album-midnight-reverie')
      const lunar = artistRows.find((row) => row.id === 'artist-lunar-collective')
      const voidEp = albumRows.find((row) => row.id === 'album-echoes-of-the-void')
      if (atmospheric) featured.push(atmospheric)
      if (midnight) featured.push(midnight)
      if (lunar) featured.push(lunar)
      if (voidEp) featured.push(voidEp)

      const remainingPlaylists = playlistRows.filter(
        (row) => row.id !== 'playlist-atmospheric-focus',
      )
      result = [likedRow, ...featured, ...remainingPlaylists]
    }

    result = result.filter((row) => matches(row.title))

    if (sort === 'name') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [effectivePlaylists, filter, likedIds, search, sort])

  const isDownloadedEmpty = filter === 'downloaded' || (downloadedOnly && rows.length === 0)

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
            onClick={openCreatePlaylist}
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
            onClick={() => {
              setFilter(item.id)
              if (item.id === 'downloaded') setDownloadedOnly(true)
            }}
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
          <button
            type="button"
            onClick={() => setDownloadedOnly((active) => !active)}
            aria-pressed={downloadedOnly}
            className={cn(
              'flex min-h-11 items-center gap-1.5 rounded-full px-2.5 font-label-md text-label-md transition-colors',
              downloadedOnly
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon name="cloud_off" size="sm" />
            <span>Downloaded only</span>
            <span
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                downloadedOnly ? 'bg-primary' : 'bg-outline-variant',
              )}
            />
          </button>
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
              Download free-source tracks and albums to keep the quiet hours close. Downloads arrive
              in Phase 3.
            </p>
            <button
              type="button"
              onClick={() => navigate('/explore')}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-5 font-label-lg text-label-lg text-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
            >
              <Icon name="travel_explore" size="sm" />
              <span>Explore downloadable music</span>
            </button>
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-secondary-container/10 blur-2xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-4 rounded-xl bg-surface-container-low p-8 text-center">
            <Icon name="search" className="text-primary" />
            <p className="mt-3 font-title-md text-title-md text-on-surface">Nothing matches yet</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Try another filter or create a new playlist.
            </p>
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-1.5">
            {rows.map((row) => (
              <LibraryListRow
                key={`${row.kind}-${row.id}`}
                row={row}
                onMore={() => showToast('Library item options are coming in Phase 3.')}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((row) =>
              row.kind === 'artist' ? (
                <ArtistCircle key={row.id} artist={artists.find((artist) => artist.id === row.id)!} size="md" className="w-full" />
              ) : (
                <AlbumCard
                  key={`${row.kind}-${row.id}`}
                  item={{
                    id: row.id,
                    title: row.title,
                    subtitle: row.subtitle,
                    kind: row.kind === 'liked' ? 'playlist' : row.kind,
                    href: row.href,
                  }}
                  label={row.kind === 'liked' ? 'Pinned' : undefined}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LibraryListRow({ row, onMore }: { row: LibraryRow; onMore: () => void }) {
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
            {row.kind === 'liked' && (
              <Icon name="check_circle" filled size="sm" className="flex-shrink-0 text-primary" />
            )}
            <span className="truncate">{row.subtitle}</span>
          </div>
        </div>
      </Link>

      <div className="flex flex-shrink-0 items-center gap-1 pl-2">
        {row.kind === 'liked' ? (
          <Icon name="chevron_right" className="text-on-surface-variant" />
        ) : (
          <button
            type="button"
            onClick={onMore}
            aria-label={`More options for ${row.title}`}
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="more_vert" />
          </button>
        )}
      </div>
    </div>
  )
}
