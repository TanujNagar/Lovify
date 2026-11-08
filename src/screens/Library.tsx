import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { PlaylistManageSheet } from '@/components/playlist/PlaylistManageSheet'
import { AlbumCard } from '@/components/media/AlbumCard'
import { Artwork } from '@/components/media/Artwork'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { TrackRow } from '@/components/media/TrackRow'
import { Chip } from '@/components/ui/Chip'
import { cn } from '@/lib/cn'
import { getTracksByIds } from '@/lib/db'
import { formatBytes } from '@/lib/downloads'
import { useDownloadsStore } from '@/stores/downloads'
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
  sortTitle?: string
  sortArtist?: string
  updatedAt?: number
}

type SortMode = 'recent' | 'name' | 'artist'

const sortLabels: Record<SortMode, string> = {
  recent: 'Most recent',
  name: 'Name A–Z',
  artist: 'Artist A–Z',
}

const filters = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'albums', label: 'Albums' },
  { id: 'artists', label: 'Artists' },
  { id: 'downloaded', label: 'Downloaded', icon: 'download_done' },
]

export function LibraryScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const history = useLibraryStore((state) => state.history)
  const openCreatePlaylist = useUiStore((state) => state.openCreatePlaylist)
  const openTrackMenu = useUiStore((state) => state.openTrackMenu)
  const showToast = useUiStore((state) => state.showToast)
  const downloadedTracks = useDownloadsStore((state) => state.tracks)
  const downloadRows = useDownloadsStore((state) => state.rows)
  const downloadStorage = useDownloadsStore((state) => state.storage)
  const removeDownload = useDownloadsStore((state) => state.remove)
  const downloadBusy = useDownloadsStore((state) => state.busy)
  const loadDownloads = useDownloadsStore((state) => state.load)

  const [filter, setFilter] = useState(() => {
    const requested = searchParams.get('filter')
    return filters.some((item) => item.id === requested) ? (requested as string) : 'playlists'
  })
  const [sort, setSort] = useState<SortMode>('recent')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [cachedTracks, setCachedTracks] = useState<Track[]>([])
  const [managed, setManaged] = useState<Playlist | null>(null)

  useEffect(() => {
    void loadDownloads()
  }, [loadDownloads])

  useEffect(() => {
    const ids = Array.from(
      new Set([
        ...likedIds,
        ...history.map((entry) => entry.track.id),
        ...playlists.flatMap((playlist) => playlist.trackIds),
        ...downloadedTracks.map((track) => track.id),
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
  }, [downloadedTracks, history, likedIds, playlists])

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
        sortTitle: row.title,
        sortArtist: row.artist,
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
          sortTitle: artist.name,
          sortArtist: artist.name,
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
        sortTitle: playlist.name,
        sortArtist: 'You',
        updatedAt: playlist.updatedAt,
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
      sortTitle: 'Liked Songs',
      sortArtist: 'You',
      updatedAt: Number.MAX_SAFE_INTEGER,
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
      result = [...result].sort(
        (a, b) => (a.sortTitle ?? a.title).localeCompare(b.sortTitle ?? b.title),
      )
    } else if (sort === 'artist') {
      result = [...result].sort(
        (a, b) =>
          (a.sortArtist ?? '').localeCompare(b.sortArtist ?? '') ||
          a.title.localeCompare(b.title),
      )
    } else {
      result = [...result].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (b.pinned && !a.pinned) return 1
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      })
    }
    return result
  }, [albumRows, artistRows, cachedTracks, filter, likedIds, playlists, search, sort])

  const downloadedEntries = useMemo(() => {
    const byId = new Map(downloadedTracks.map((track) => [track.id, track]))
    const normalized = search.trim().toLowerCase()
    let entries = downloadRows
      .filter((row) => row.status === 'ready')
      .map((row) => ({ track: byId.get(row.trackId), addedAt: row.addedAt }))
      .filter((entry): entry is { track: Track; addedAt: number } => Boolean(entry.track))
      .filter(
        (entry) =>
          !normalized ||
          entry.track.title.toLowerCase().includes(normalized) ||
          entry.track.artist.toLowerCase().includes(normalized),
      )

    if (sort === 'name') {
      entries = [...entries].sort((a, b) => a.track.title.localeCompare(b.track.title))
    } else if (sort === 'artist') {
      entries = [...entries].sort(
        (a, b) =>
          a.track.artist.localeCompare(b.track.artist) ||
          a.track.title.localeCompare(b.track.title),
      )
    } else {
      entries = [...entries].sort((a, b) => b.addedAt - a.addedAt)
    }
    return entries
  }, [downloadRows, downloadedTracks, search, sort])

  const filterCounts: Record<string, number> = {
    playlists: playlists.filter((playlist) => playlist.system !== 'liked').length + 1,
    albums: albumRows.length,
    artists: artistRows.length,
    downloaded: downloadedTracks.length,
  }

  const downloadPercent =
    downloadStorage.quota > 0
      ? Math.min(100, (downloadStorage.usage / downloadStorage.quota) * 100)
      : 0

  const removeTrackDownload = async (track: Track) => {
    await removeDownload(track.id)
    showToast(`${track.title} removed from offline downloads.`)
  }

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
            count={filterCounts[item.id]}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-1">
        <button
          type="button"
          onClick={() =>
            setSort((current) =>
              current === 'recent' ? 'name' : current === 'name' ? 'artist' : 'recent',
            )
          }
          className="flex min-h-11 items-center gap-1.5 rounded px-1 font-label-lg text-label-lg text-on-surface transition-colors hover:text-primary"
          aria-label={`Sort by ${sortLabels[sort]}, click to change`}
        >
          <Icon name="swap_vert" size="sm" className="text-primary" />
          <span>{sortLabels[sort]}</span>
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
        {filter === 'downloaded' ? (
          downloadedEntries.length === 0 ? (
            <div className="relative mt-4 flex flex-col items-center overflow-hidden rounded-xl bg-surface-container-low p-4 text-center shadow-lg">
              <div className="relative mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container shadow-[0_0_24px_rgba(249,87,115,0.22)]">
                <Icon name="cloud_download" className="text-primary" size="lg" />
                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <Icon name="arrow_downward" size="sm" />
                </div>
              </div>
              <h2 className="mb-1 font-title-lg text-title-lg tracking-tight text-on-surface">
                No offline downloads yet
              </h2>
              <p className="mb-4 max-w-[280px] font-body-md text-body-md leading-relaxed text-on-surface-variant">
                Open any Jamendo or Audius track menu and choose “Download for offline”.
                YouTube tracks always play through their official player and cannot be saved.
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
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-surface-container-low p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/15 text-primary">
                      <Icon name="offline_bolt" size="sm" />
                    </span>
                    <div>
                      <p className="font-title-md text-title-md text-on-surface">Offline storage</p>
                      <p className="font-caption text-caption text-on-surface-variant">
                        {downloadStorage.downloads} saved · {formatBytes(downloadStorage.bytes)}
                        {downloadStorage.persisted ? ' · protected by your browser' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {downloadStorage.quota > 0
                      ? `${formatBytes(downloadStorage.usage)} / ${formatBytes(downloadStorage.quota)}`
                      : 'Local cache'}
                  </span>
                </div>
                <div
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"
                  role="progressbar"
                  aria-label="Offline storage used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(downloadPercent)}
                >
                  <div
                    className="h-full rounded-full bg-primary-container"
                    style={{ width: `${Math.max(downloadPercent, 2)}%` }}
                  />
                </div>
                <p className="mt-1.5 font-caption text-caption text-on-surface-variant">
                  Your browser shares this space with the app shell and its other sites.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {downloadedEntries.map(({ track }) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={downloadedEntries.map((entry) => entry.track)}
                    showAlbum
                    actions={
                      <>
                        <span className="flex h-11 w-11 items-center justify-center text-primary" aria-hidden="true">
                          <Icon name="download_done" size="sm" />
                        </span>
                        <button
                          type="button"
                          onClick={() => void removeTrackDownload(track)}
                          disabled={downloadBusy.includes(track.id)}
                          aria-label={`Remove ${track.title} from offline downloads`}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-error disabled:opacity-40"
                        >
                          <Icon name="delete" size="sm" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openTrackMenu(track)}
                          aria-label={`More options for ${track.title}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface"
                        >
                          <Icon name="more_vert" size="sm" />
                        </button>
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          )
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
