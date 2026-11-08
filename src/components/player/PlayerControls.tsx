import { Icon } from '@/components/brand/Icon'
import { cn } from '@/lib/cn'
import { usePlayerStore } from '@/stores/player'

type PlayerControlsProps = {
  className?: string
}

const repeatLabels = {
  off: 'Repeat is off',
  all: 'Repeat all',
  one: 'Repeat one track',
}

export function PlayerControls({ className }: PlayerControlsProps) {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const shuffle = usePlayerStore((state) => state.shuffle)
  const repeat = usePlayerStore((state) => state.repeat)
  const hasTrack = usePlayerStore((state) => Boolean(state.currentTrack))
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const previous = usePlayerStore((state) => state.previous)
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle)
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat)

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <button
        type="button"
        onClick={toggleShuffle}
        aria-label="Shuffle"
        aria-pressed={shuffle}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          shuffle ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        <Icon name="shuffle" />
      </button>
      <button
        type="button"
        onClick={() => previous()}
        disabled={!hasTrack}
        aria-label="Previous track"
        className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface transition-colors hover:text-primary disabled:opacity-40"
      >
        <Icon name="skip_previous" size="lg" className="text-[28px]" />
      </button>
      <button
        type="button"
        onClick={toggle}
        disabled={!hasTrack}
        aria-label={isPlaying ? 'Pause playback' : 'Play'}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-[0_8px_24px_rgba(249,87,115,0.35)] transition-transform active:scale-95 disabled:opacity-50"
      >
        <Icon name={isPlaying ? 'pause' : 'play_arrow'} filled size="lg" className="text-[32px]" />
      </button>
      <button
        type="button"
        onClick={() => next()}
        disabled={!hasTrack}
        aria-label="Next track"
        className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface transition-colors hover:text-primary disabled:opacity-40"
      >
        <Icon name="skip_next" size="lg" className="text-[28px]" />
      </button>
      <button
        type="button"
        onClick={cycleRepeat}
        aria-label={repeatLabels[repeat]}
        aria-pressed={repeat !== 'off'}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
          repeat !== 'off'
            ? 'bg-surface-container-high text-primary'
            : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        <Icon name={repeat === 'one' ? 'repeat_one' : 'repeat'} />
      </button>
    </div>
  )
}
