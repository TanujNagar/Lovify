import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { AlbumCard } from '@/components/media/AlbumCard'
import { ArtistCircle } from '@/components/media/ArtistCircle'
import { QuickTile } from '@/components/media/QuickTile'
import { TrackRow } from '@/components/media/TrackRow'
import { Chip } from '@/components/ui/Chip'
import { SectionHeader } from '@/components/ui/SectionHeader'
import {
  artists,
  madeForYou,
  quickAccess,
  recentlyPlayed,
  recommendedTracks,
} from '@/data/mock'
import { tracks } from '@/data/mock'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

const filters = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'night', label: 'Night Focus', icon: 'bedtime' },
  { id: 'atmospheric', label: 'Atmospheric', icon: 'graphic_eq' },
]

const labels = [
  { label: 'Mix 01', dot: 'bg-primary-container' },
  { label: 'Deep Vibe', dot: 'bg-tertiary' },
  { label: 'Weekly', dot: 'bg-secondary' },
  { label: 'Radar', dot: 'bg-primary' },
]

export function HomeScreen() {
  const [filter, setFilter] = useState('all')
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)

  const shuffle = () => {
    const shuffled = [...tracks].sort(() => Math.random() - 0.5)
    playQueue(shuffled, 0, { type: 'track', label: 'Shuffled for you' })
    showToast('Shuffling your recommendations.')
  }

  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute -left-20 -top-16 h-72 w-72 rounded-full ambient-a" />
      <div className="pointer-events-none absolute -right-16 top-44 h-60 w-60 rounded-full ambient-b" />

      <div className="relative mx-auto w-full max-w-4xl">
        <section className="flex flex-col gap-3 px-margin pb-5 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                Good evening
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Your sound, your space.
              </p>
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-1.5 rounded-full bg-surface-container/80 px-2.5 py-2"
              aria-label="Music source status: Free, local demo library"
            >
              <span className="h-2 w-2 rounded-full bg-primary-container" />
              <span className="font-label-md text-label-md text-primary">Free</span>
            </Link>
          </div>

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
        </section>

        <section className="px-margin pb-6">
          <div className="grid grid-cols-2 gap-2.5">
            {quickAccess.map((item) => (
              <QuickTile key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section className="defer-render pb-7">
          <div className="px-margin">
            <SectionHeader
              title="Made for you"
              subtitle="Personalized curations based on your nocturnal habits"
              actionLabel="See all"
              actionTo="/explore"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto px-margin pb-2 no-scrollbar">
            {madeForYou.map((item, index) => (
              <AlbumCard
                key={item.id}
                item={item}
                label={labels[index]?.label}
                dotClass={labels[index]?.dot}
              />
            ))}
          </div>
        </section>

        <section className="defer-render pb-7">
          <div className="px-margin">
            <SectionHeader
              title="Recently played"
              actionLabel=""
              actionIcon=""
            >
              <button
                type="button"
                onClick={() => showToast('Listening history is coming in Phase 2.')}
                aria-label="Open listening history"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <Icon name="history" />
              </button>
            </SectionHeader>
          </div>
          <div className="flex gap-3 overflow-x-auto px-margin no-scrollbar">
            {recentlyPlayed.map((item) => {
              if (item.kind === 'artist') {
                const artist = artists.find((entry) => entry.id === item.id)
                return artist ? (
                  <ArtistCircle key={item.id} artist={artist} />
                ) : null
              }
              return (
                <AlbumCard
                  key={item.id}
                  item={item}
                  size="sm"
                  showPlay={false}
                />
              )
            })}
          </div>
        </section>

        <section className="defer-render px-margin pb-10">
          <SectionHeader
            title="Tracks you might love"
            subtitle="Picked from your recent listening"
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
            {recommendedTracks.map((track) => (
              <TrackRow key={track.id} track={track} queue={recommendedTracks} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
