import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { MixCard } from '@/components/media/MixCard'
import { QuickTile } from '@/components/media/QuickTile'
import { TrackRow } from '@/components/media/TrackRow'
import { Chip } from '@/components/ui/Chip'
import { LazySection } from '@/components/ui/LazySection'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { homeFilters } from '@/data/editorial'
import { greetingForHour } from '@/lib/format'
import { buildRecommendations } from '@/lib/recommendations'
import { useCatalogStore } from '@/stores/catalog'
import { useDownloadsStore } from '@/stores/downloads'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useSourcesStore } from '@/stores/sources'
import { useUiStore } from '@/stores/ui'
import type { CollectionItem, HistoryEntry, Track } from '@/types/music'

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
  const downloadedTracks = useDownloadsStore((state) => state.tracks)

  const [playHistory, setPlayHistory] = useState<HistoryEntry[]>([])
  const [cachedTracks, setCachedTracks] = useState<Track[]>([])

  useEffect(() => {
    void load()
  }, [load])

  const historyVersion = history[0]?.playedAt ?? 0

  useEffect(() => {
    let active = true
    void import('@/lib/db')
      .then(({ getAllCachedTracks, getPlayHistory }) =>
        Promise.all([getPlayHistory(600), getAllCachedTracks(300)]),
      )
      .then(([nextHistory, nextTracks]) => {
        if (!active) return
        setPlayHistory(nextHistory)
        setCachedTracks(nextTracks)
      })
      .catch(() => {
        if (!active) return
        setPlayHistory([])
        setCachedTracks([])
      })
    return () => {
      active = false
    }
  }, [history.length, historyVersion, likedIds, playlists])

  const greeting = greetingForHour(new Date().getHours())
  const featured = useMemo(() => albums.slice(0, 8).map(albumItem), [albums])

  const candidates = useMemo(() => {
    const byId = new Map<string, Track>()
    for (const track of [...cachedTracks, ...trending]) byId.set(track.id, track)
    return Array.from(byId.values())
  }, [cachedTracks, trending])

  const downloadedIds = useMemo(
    () => downloadedTracks.map((track) => track.id),
    [downloadedTracks],
  )

  const signals = useMemo(
    () => ({
      history: playHistory.length ? playHistory : history,
      likedTracks: candidates.filter((track) => likedIds.includes(track.id)),
      likedIds,
      playlists,
      downloadedIds,
      trendingIds: trending.map((track) => track.id),
    }),
    [candidates, downloadedIds, history, likedIds, playHistory, playlists, trending],
  )

  const recommendations = useMemo(
    () => buildRecommendations(candidates, signals, 12),
    [candidates, signals],
  )

  const quickAccess = useMemo<CollectionItem[]>(
    () =>
      recommendations.jumpBackIn.map((entry) => ({
        id: entry.track.id,
        title: entry.track.title,
        subtitle: `${entry.track.artist} · ${entry.track.album}`,
        kind: 'track',
        href: `/album/${entry.track.albumId}`,
        artwork: entry.track.artwork,
      })),
    [recommendations.jumpBackIn],
  )

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

  const baseRecommendations = useMemo(
    () => recommendations.tracksYouMightLove.map((entry) => entry.track),
    [recommendations.tracksYouMightLove],
  )

  const recommended = useMemo<Track[]>(() => {
    const terms = filterTerms[filter]
    if (!terms || !baseRecommendations.length) return baseRecommendations
    const matches = baseRecommendations.filter((track) => {
      const haystack = `${track.title} ${track.album} ${track.genre ?? ''}`.toLowerCase()
      return terms.some((term) => haystack.includes(term))
    })
    return matches.length ? matches : baseRecommendations
  }, [baseRecommendations, filter])

  const shuffle = () => {
    if (!recommended.length) {
      showToast('Free music is still loading. Try again in a moment.')
      return
    }
    const shuffled = [...recommended].sort(() => Math.random() - 0.5)
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
            <SectionHeader
              title="Jump back in"
              subtitle="Pick up where your listening left off"
            />
            <div className="grid grid-cols-2 gap-2.5">
              {quickAccess.map((item) => (
                <QuickTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {recommendations.madeForYou.length > 0 && (
          <LazySection minHeight={300} className="pb-7">
            <section>
              <div className="px-margin">
                <SectionHeader
                  title="Made for you"
                  subtitle={
                    playHistory.length || history.length
                      ? 'Local mixes shaped by what you actually play'
                      : 'Trending collections from free sources'
                  }
                  actionLabel="See all"
                  actionTo="/explore"
                />
              </div>
              <div className="flex gap-4 overflow-x-auto px-margin pb-2 no-scrollbar">
                {recommendations.madeForYou.map((mix) => (
                  <MixCard key={mix.id} mix={mix} />
                ))}
              </div>
            </section>
          </LazySection>
        )}

        {featured.length > 0 && (
          <LazySection minHeight={300} className="pb-7">
            <section>
              <div className="px-margin">
                <SectionHeader
                  title="Fresh collections"
                  subtitle="New releases from free sources"
                  actionLabel="Explore"
                  actionTo="/explore"
                />
              </div>
              <div className="flex gap-4 overflow-x-auto px-margin pb-2 no-scrollbar">
                {featured.map((item) => (
                  <AlbumCard key={item.id} item={item} label="New" />
                ))}
              </div>
            </section>
          </LazySection>
        )}

        {recent.length > 0 && (
          <LazySection minHeight={260} className="pb-7">
            <section>
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
          </LazySection>
        )}

        {recommended.length > 0 && (
          <LazySection minHeight={420} className="px-margin pb-10">
            <section>
              <SectionHeader
                title={filter === 'all' || filter === 'music' ? 'Tracks you might love' : 'For this mood'}
                subtitle={
                  playHistory.length || history.length
                    ? 'Picked by your local listening signals'
                    : 'Picked from free music sources'
                }
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
          </LazySection>
        )}
      </div>
    </div>
  )
}
