import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { QuickTile } from '@/components/media/QuickTile'
import { TrackRow } from '@/components/media/TrackRow'
import { Chip } from '@/components/ui/Chip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { homeFilters } from '@/data/editorial'
import { greetingForHour } from '@/lib/format'
import { useCatalogStore } from '@/stores/catalog'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useSourcesStore } from '@/stores/sources'
import { useUiStore } from '@/stores/ui'
import type { CollectionItem, Track } from '@/types/music'

const labels = [
  { label: 'Mix 01', dot: 'bg-primary-container' },
  { label: 'Deep Vibe', dot: 'bg-tertiary' },
  { label: 'Weekly', dot: 'bg-secondary' },
  { label: 'Radar', dot: 'bg-primary' },
]

const filterTerms: Record<string, string[]> = {
  night: ['night', 'chill', 'ambient', 'lofi', 'lo-fi', 'bedroom'],
  atmospheric: ['ambient', 'atmospheric', 'dream', 'electronic', 'downbeat'],
}

function albumItem(album: {
  id: string
  title: string
  artist: string
  kind: string
  artwork?: string
}): CollectionItem {
  return {
    id: album.id,
    title: album.title,
    subtitle: `${album.artist} · ${album.kind}`,
    kind: 'album',
    href: `/album/${album.id}`,
    artwork: album.artwork,
  }
}

export function HomeScreen() {
  const [filter, setFilter] = useState('all')
  const trending = useCatalogStore((state) => state.trending)
  const albums = useCatalogStore((state) => state.albums)
  const loading = useCatalogStore((state) => state.loading)
  const error = useCatalogStore((state) => state.error)
  const load = useCatalogStore((state) => state.load)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)
  const history = useLibraryStore((state) => state.history)
  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const youtube = useSourcesStore((state) => state.youtube)

  useEffect(() => {
    void load()
  }, [load])

  const greeting = greetingForHour(new Date().getHours())
  const featured = useMemo(() => albums.slice(0, 8).map(albumItem), [albums])

  const quickAccess = useMemo<CollectionItem[]>(() => {
    const items: CollectionItem[] = []
    const liked = playlists.find((playlist) => playlist.system === 'liked')
    if (liked) {
      items.push({
        id: liked.id,
        title: 'Liked Songs',
        subtitle: `${likedIds.length} tracks`,
        kind: 'playlist',
        href: `/playlist/${liked.id}`,
        artwork: history[0]?.track.artwork,
      })
    }

    for (const entry of history.slice(0, 3)) {
      items.push({
        id: entry.track.id,
        title: entry.track.title,
        subtitle: entry.track.artist,
        kind: 'track',
        href: `/album/${entry.track.albumId}`,
        artwork: entry.track.artwork,
      })
    }

    for (const track of trending.slice(0, 3)) {
      if (items.some((item) => item.id === track.id)) continue
      items.push({
        id: track.id,
        title: track.title,
        subtitle: track.artist,
        kind: 'track',
        href: `/album/${track.albumId}`,
        artwork: track.artwork,
      })
    }

    for (const album of albums.slice(0, 2)) {
      items.push(albumItem(album))
    }

    const seen = new Set<string>()
    return items.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    }).slice(0, 6)
  }, [albums, history, likedIds.length, playlists, trending])

  const recent = useMemo(
    () =>
      history.slice(0, 6).map((entry) => ({
        id: entry.track.albumId || entry.track.id,
        title: entry.track.album || entry.track.title,
        subtitle: `${entry.track.artist} · ${entry.track.provider}`,
        kind: 'album' as const,
        href: `/album/${entry.track.albumId}`,
        artwork: entry.track.artwork,
      })),
    [history],
  )

  const recommended = useMemo<Track[]>(() => {
    const terms = filterTerms[filter]
    if (!terms) return trending
    const matches = trending.filter((track) => {
      const haystack = `${track.title} ${track.album} ${track.genre ?? ''}`.toLowerCase()
      return terms.some((term) => haystack.includes(term))
    })
    return matches.length ? matches : trending
  }, [filter, trending])

  const shuffle = () => {
    if (!trending.length) {
      showToast('Free music is still loading. Try again in a moment.')
      return
    }
    const shuffled = [...trending].sort(() => Math.random() - 0.5)
    playQueue(shuffled, 0, { type: 'radio', label: 'Shuffled for you' })
    showToast('Shuffling your recommendations.')
  }

  const sourceLabel = youtube.available ? 'Free + YouTube' : 'Free sources'
  const hasCatalog = trending.length > 0 || albums.length > 0

  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute -left-20 -top-16 h-72 w-72 rounded-full ambient-a" />
      <div className="pointer-events-none absolute -right-16 top-44 h-60 w-60 rounded-full ambient-b" />

      <div className="relative mx-auto w-full max-w-4xl">
        <section className="flex flex-col gap-3 px-margin pb-5 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                {greeting}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Your sound, your space.
              </p>
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-1.5 rounded-full bg-surface-container/80 px-2.5 py-2"
              aria-label={`Music source status: ${sourceLabel}`}
            >
              <span className="h-2 w-2 rounded-full bg-primary-container" />
              <span className="font-label-md text-label-md text-primary">Free</span>
            </Link>
          </div>

          <div className="-mx-margin flex items-center gap-2 overflow-x-auto px-margin py-1 no-scrollbar">
            {homeFilters.map((item) => (
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
          <p className="font-caption text-caption text-on-surface-variant">{sourceLabel}</p>
        </section>

        {!hasCatalog && loading && (
          <div className="grid grid-cols-2 gap-2.5 px-margin pb-6" aria-busy="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-lg bg-surface-container" />
            ))}
          </div>
        )}

        {!hasCatalog && !loading && error && (
          <section className="px-margin pb-6">
            <div className="rounded-xl bg-surface-container-low p-5 text-center">
              <Icon name="cloud_off" className="text-primary" size="lg" />
              <p className="mt-2 font-title-md text-title-md text-on-surface">
                Free music is out of reach
              </p>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{error}</p>
              <button
                type="button"
                onClick={() => void load(true)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
              >
                <Icon name="refresh" size="sm" />
                Try again
              </button>
            </div>
          </section>
        )}

        {quickAccess.length > 0 && (
          <section className="px-margin pb-6">
            <div className="grid grid-cols-2 gap-2.5">
              {quickAccess.map((item) => (
                <QuickTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="defer-render pb-7">
            <div className="px-margin">
              <SectionHeader
                title="Made for you"
                subtitle="Trending collections from free sources"
                actionLabel="See all"
                actionTo="/explore"
              />
            </div>
            <div className="flex gap-4 overflow-x-auto px-margin pb-2 no-scrollbar">
              {featured.map((item, index) => (
                <AlbumCard
                  key={item.id}
                  item={item}
                  label={labels[index]?.label}
                  dotClass={labels[index]?.dot}
                />
              ))}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section className="defer-render pb-7">
            <div className="px-margin">
              <SectionHeader title="Recently played" subtitle="From your local listening history">
                <Link
                  to="/library"
                  aria-label="Open your library"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <Icon name="history" />
                </Link>
              </SectionHeader>
            </div>
            <div className="flex gap-3 overflow-x-auto px-margin no-scrollbar">
              {recent.map((item) => (
                <AlbumCard key={item.id} item={item} size="sm" showPlay={false} />
              ))}
            </div>
          </section>
        )}

        {recommended.length > 0 && (
          <section className="defer-render px-margin pb-10">
            <SectionHeader
              title={filter === 'all' || filter === 'music' ? 'Tracks you might love' : 'For this mood'}
              subtitle="Picked from free music sources"
            >
              <button
                type="button"
                onClick={shuffle}
                className="flex h-11 items-center gap-1 rounded-full bg-surface-container px-3 font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <Icon name="shuffle" size="sm" />
                <span>Shuffle</span>
              </button>
            </SectionHeader>
            <div className="flex flex-col gap-1.5">
              {recommended.slice(0, 6).map((track) => (
                <TrackRow key={track.id} track={track} queue={recommended} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
