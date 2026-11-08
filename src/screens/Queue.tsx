import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { TrackRow } from '@/components/media/TrackRow'
import { formatDuration, totalDuration } from '@/lib/format'
import { PROVIDER_LABELS } from '@/lib/providers/types'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

export function QueueScreen() {
  const queue = usePlayerStore((state) => state.queue)
  const index = usePlayerStore((state) => state.index)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const playQueue = usePlayerStore((state) => state.playQueue)
  const moveInQueue = usePlayerStore((state) => state.moveInQueue)
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue)
  const clearQueue = usePlayerStore((state) => state.clearQueue)
  const context = usePlayerStore((state) => state.context)
  const showToast = useUiStore((state) => state.showToast)

  const upcoming = queue
    .map((track, trackIndex) => ({ track, trackIndex }))
    .filter(({ trackIndex }) => trackIndex > index)
  const total = duration || currentTrack?.duration || 0
  const percent = currentTrack && total > 0 ? (progress / total) * 100 : 0

  if (!queue.length || !currentTrack) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
        <Icon name="queue_music" size="lg" className="text-primary" />
        <p className="mt-3 font-title-lg text-title-lg text-on-surface">Your queue is empty</p>
        <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
          Start a mix and the next tracks will wait here.
        </p>
        <Link
          to="/"
          className="mt-5 flex min-h-11 items-center rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
        >
          Find something to play
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-margin pb-10">
      <div className="flex items-end justify-between pb-3 pt-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">Queue</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {queue.length} tracks · {totalDuration(queue.map((track) => track.duration))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              clearQueue()
              showToast('Queue cleared. The current track keeps playing.')
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container px-3 font-label-md text-label-md text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="clear_all" size="sm" />
            Clear
          </button>
          <Link
            to="/player"
            aria-label="Open full player"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface"
          >
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} filled />
          </Link>
        </div>
      </div>

      <section aria-label="Now playing" className="mb-5 rounded-xl bg-surface-container-high p-3 shadow-md">
        <div className="flex items-center gap-3">
          <Artwork
            seed={currentTrack.id}
            src={currentTrack.artwork}
            alt=""
            rounded="rounded-xl"
            className="h-16 w-16 flex-shrink-0"
          >
            <span className="absolute inset-0 flex items-center justify-center gap-0.5 bg-surface-container-lowest/40">
              <span className="h-4 w-1 animate-eq-1 rounded-full bg-primary-container" />
              <span className="h-5 w-1 animate-eq-2 rounded-full bg-primary-container" />
              <span className="h-3 w-1 animate-eq-3 rounded-full bg-primary-container" />
            </span>
          </Artwork>
          <div className="min-w-0 flex-1">
            <p className="font-caption text-caption uppercase tracking-[0.16em] text-primary">
              Now playing · {PROVIDER_LABELS[currentTrack.provider]}
            </p>
            <p className="truncate font-title-md text-title-md text-on-surface">{currentTrack.title}</p>
            <p className="truncate font-body-md text-body-md text-on-surface-variant">
              {currentTrack.artist} · {formatDuration(total)}
            </p>
          </div>
          <Link
            to="/player"
            aria-label="Open player"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container"
          >
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} filled />
          </Link>
        </div>
        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-surface-container-highest">
          <div className="h-full bg-primary-container" style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
      </section>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-title-lg text-title-lg text-on-surface">Up next</h2>
        <span className="font-caption text-caption text-on-surface-variant">
          Reorder with the arrows
        </span>
      </div>
      {upcoming.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low p-4 font-body-md text-body-md text-on-surface-variant">
          This is the last track in {context.label}. Pick a new mix to keep going.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {upcoming.map(({ track, trackIndex }, position) => (
            <TrackRow
              key={`${track.id}-${trackIndex}`}
              track={track}
              queue={queue}
              compact
              onPlay={() =>
                playQueue(queue, trackIndex, { type: context.type, label: context.label })
              }
              actions={
                <>
                  <button
                    type="button"
                    onClick={() => moveInQueue(trackIndex, trackIndex - 1)}
                    disabled={position === 0}
                    aria-label={`Move ${track.title} up`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                  >
                    <Icon name="arrow_upward" size="sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInQueue(trackIndex, trackIndex + 1)}
                    disabled={trackIndex === queue.length - 1}
                    aria-label={`Move ${track.title} down`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface disabled:opacity-30"
                  >
                    <Icon name="arrow_downward" size="sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(trackIndex)}
                    aria-label={`Remove ${track.title} from queue`}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:text-error"
                  >
                    <Icon name="close" size="sm" />
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
