import { useEffect, useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { TrackRow } from '@/components/media/TrackRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { moods, radioStations } from '@/data/editorial'
import { cn } from '@/lib/cn'
import { searchFreeTracks } from '@/lib/providers'
import { ProviderError } from '@/lib/providers/types'
import { useCatalogStore } from '@/stores/catalog'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import { VibeRadioSlider } from '@/components/player/VibeRadioSlider'

export function ExploreScreen() {
  const trending = useCatalogStore((state) => state.trending)
  const albums = useCatalogStore((state) => state.albums)
  const loading = useCatalogStore((state) => state.loading)
  const error = useCatalogStore((state) => state.error)
  const load = useCatalogStore((state) => state.load)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const playQuery = async (query: string, label: string) => {
    if (busy) return
    setBusy(label)
    try {
      const tracks = await searchFreeTracks(query, 20)
      if (!tracks.length) {
        showToast(`No free tracks matched ${label}. Try another mood.`)
        return
      }
      playQueue(tracks, 0, { type: 'radio', label })
    } catch (caught) {
      showToast(
        caught instanceof ProviderError
          ? caught.message
          : 'Free music is unreachable right now. Try again in a moment.',
      )
    } finally {
      setBusy(null)
    }
  }

  const hasCatalog = trending.length > 0 || albums.length > 0

  return (
    <div className="mx-auto w-full max-w-4xl px-margin pb-10">
      <div className="flex items-start justify-between gap-3 pb-4 pt-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Explore</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            New releases, moods, and mixes that drift with you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          aria-label="Refresh Explore"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-primary disabled:opacity-50"
        >
          <Icon name="refresh" className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      <VibeRadioSlider />

      {!hasCatalog && loading && (
        <div className="mb-7 grid grid-cols-2 gap-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-xl bg-surface-container" />
          ))}
        </div>
      )}

      {!hasCatalog && !loading && error && (
        <div className="mb-7 rounded-xl bg-surface-container-low p-5 text-center">
          <Icon name="cloud_off" className="text-primary" size="lg" />
          <p className="mt-2 font-title-md text-title-md text-on-surface">Free music is out of reach</p>
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
      )}

      {albums.length > 0 && (
        <section className="mb-7">
          <SectionHeader
            title="New releases"
            subtitle="Fresh collections from free sources"
            actionLabel="Search"
            actionTo="/search"
          />
          <div className="-mx-margin flex gap-4 overflow-x-auto px-margin pb-2 no-scrollbar">
            {albums.slice(0, 10).map((album) => (
              <AlbumCard
                key={album.id}
                item={{
                  id: album.id,
                  title: album.title,
                  subtitle: `${album.artist} · ${album.kind}`,
                  kind: 'album',
                  href: `/album/${album.id}`,
                  artwork: album.artwork,
                  provider: album.provider,
                }}
                label={album.kind}
                dotClass="bg-primary-container"
              />
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section className="mb-7">
          <SectionHeader title="Trending now" subtitle="What the quiet crowd is playing" />
          <div className="flex flex-col gap-1.5">
            {trending.slice(0, 8).map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                queue={trending}
                showIndex={index + 1}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-7">
        <SectionHeader title="Moods & activities" subtitle="Pick a feeling, not a genre" />
        <div className="grid grid-cols-2 gap-3">
          {moods.map((mood) => (
            <button
              key={mood.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void playQuery(mood.query, mood.name)}
              className={cn(
                'group relative flex h-28 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br p-3 text-left shadow-md transition-transform active:scale-[0.98] disabled:opacity-70',
                mood.gradient,
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/40 backdrop-blur-sm">
                {busy === mood.name ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
                ) : (
                  <Icon name={mood.icon} className="text-primary" />
                )}
              </span>
              <span>
                <span className="block font-title-md text-title-md text-on-surface">{mood.name}</span>
                <span className="mt-0.5 block font-caption text-caption text-on-surface-variant">
                  {mood.subtitle}
                </span>
              </span>
              <Icon
                name="play_arrow"
                filled
                className="absolute bottom-3 right-3 text-primary opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Vibe Radio stations" subtitle="Three rooms, no algorithms to argue with" />
        <div className="flex flex-col gap-2">
          {radioStations.map((station, index) => (
            <div
              key={station.id}
              className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3"
            >
              <span
                className={cn(
                  'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl',
                  index === 0
                    ? 'bg-primary-container/20 text-primary'
                    : index === 1
                      ? 'bg-secondary-container/50 text-secondary'
                      : 'bg-tertiary-container/25 text-tertiary',
                )}
              >
                {busy === station.name ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                ) : (
                  <Icon name={station.icon} size="lg" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-title-md text-title-md text-on-surface">{station.name}</p>
                <p className="truncate font-body-md text-body-md text-on-surface-variant">
                  {station.subtitle}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void playQuery(station.query, station.name)}
                aria-label={`Play ${station.name} station`}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
              >
                <Icon name="play_arrow" filled />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
