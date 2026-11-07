import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { TrackRow } from '@/components/media/TrackRow'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { moods, newReleases, tracks, trendingTracks, vibeStations } from '@/data/mock'
import { cn } from '@/lib/cn'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

export function ExploreScreen() {
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)

  const playStation = (stationId: string) => {
    const station = vibeStations.find((item) => item.id === stationId)
    if (!station) return
    const queue = station.trackIds
      .map((id) => tracks.find((track) => track.id === id))
      .filter((track): track is (typeof tracks)[number] => Boolean(track))
    playQueue(queue, 0, { type: 'radio', label: station.name })
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-margin pb-10">
      <div className="pb-4 pt-2">
        <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Explore</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          New releases, moods, and mixes that drift with you.
        </p>
      </div>

      <section className="relative mb-7 overflow-hidden rounded-2xl bg-gradient-to-br from-secondary-container via-surface-container-high to-surface-container-lowest p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary-container/25 blur-3xl" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary-container" />
              <span className="font-caption text-caption font-semibold uppercase tracking-[0.16em] text-primary">
                Vibe Radio
              </span>
            </div>
            <h2 className="mt-2 font-headline-md text-headline-md leading-tight text-on-surface">
              Your night, in motion
            </h2>
            <p className="mt-1 max-w-[250px] font-body-md text-body-md leading-relaxed text-on-surface-variant">
              An auto-generated mix shaped by your recent listening. It changes as you do.
            </p>
          </div>
          <span className="hidden h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-surface-container-lowest/30 text-primary sm:flex">
            <Icon name="graphic_eq" size="lg" />
          </span>
        </div>
        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => playQueue(tracks.slice(0, 12), 0, { type: 'radio', label: 'Vibe Radio' })}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.4)]"
          >
            <Icon name="play_arrow" filled size="sm" />
            Play Vibe Radio
          </button>
          <button
            type="button"
            onClick={() => {
              const shuffled = [...tracks].sort(() => Math.random() - 0.5).slice(0, 12)
              playQueue(shuffled, 0, { type: 'radio', label: 'Vibe Radio' })
              showToast('A fresh Vibe Radio mix is playing.')
            }}
            className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-lowest/25 px-4 font-label-lg text-label-lg text-on-surface backdrop-blur-sm"
          >
            <Icon name="refresh" size="sm" />
            Regenerate
          </button>
        </div>
      </section>

      <section className="mb-7">
        <SectionHeader title="New releases" subtitle="Fresh from artists in your orbit" actionLabel="See all" actionTo="/search" />
        <div className="-mx-margin flex gap-4 overflow-x-auto px-margin pb-2 no-scrollbar">
          {newReleases.map((album) => (
            <AlbumCard
              key={album.id}
              item={{
                id: album.id,
                title: album.title,
                subtitle: `${album.artist} • ${album.kind}`,
                kind: 'album',
                href: `/album/${album.id}`,
              }}
              label={album.kind}
              dotClass="bg-primary-container"
            />
          ))}
        </div>
      </section>

      <section className="mb-7">
        <SectionHeader title="Trending now" subtitle="What the quiet crowd is playing" />
        <div className="flex flex-col gap-1.5">
          {trendingTracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              queue={trendingTracks}
              showIndex={index + 1}
            />
          ))}
        </div>
      </section>

      <section className="mb-7">
        <SectionHeader title="Moods & activities" subtitle="Pick a feeling, not a genre" />
        <div className="grid grid-cols-2 gap-3">
          {moods.map((mood, index) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => {
                const start = (index * 3) % tracks.length
                const queue = [
                  ...tracks.slice(start, start + 4),
                  ...tracks.slice(0, Math.max(0, 4 - (tracks.length - start))),
                ]
                playQueue(queue, 0, { type: 'radio', label: mood.name })
              }}
              className={cn(
                'group relative flex h-28 flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br p-3 text-left shadow-md transition-transform active:scale-[0.98]',
                mood.gradient,
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest/40 backdrop-blur-sm">
                <Icon name={mood.icon} className="text-primary" />
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
          {vibeStations.map((station, index) => (
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
                <Icon name={index === 0 ? 'graphic_eq' : index === 1 ? 'headphones' : 'explore'} size="lg" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-title-md text-title-md text-on-surface">{station.name}</p>
                <p className="truncate font-body-md text-body-md text-on-surface-variant">
                  {station.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => playStation(station.id)}
                aria-label={`Play ${station.name} station`}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface transition-colors hover:bg-primary-container hover:text-on-primary-container"
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
