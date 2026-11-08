import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { PROVIDER_LABELS } from '@/lib/providers/types'
import { cn } from '@/lib/cn'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'

type MiniPlayerProps = {
  className?: string
}

export function MiniPlayer({ className }: MiniPlayerProps) {
  const track = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const status = usePlayerStore((state) => state.status)
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const toggle = usePlayerStore((state) => state.toggle)
  const next = usePlayerStore((state) => state.next)
  const liked = useLibraryStore((state) =>
    track ? state.likedIds.includes(track.id) : false,
  )
  const toggleLike = useLibraryStore((state) => state.toggleLike)

  if (!track) return null

  const total = duration || track.duration
  const percent = total > 0 ? Math.min(100, Math.max(0, (progress / total) * 100)) : 0

  return (
    <section
      aria-label="Now playing"
      className={cn(
        'pointer-events-auto relative mx-3 mb-2 flex h-14 items-center justify-between overflow-hidden rounded-xl bg-surface-container-high/95 px-3 shadow-[0_12px_32px_rgba(0,0,0,0.55)]',
        className,
      )}
    >
      <Link
        to="/player"
        aria-label={`Open player: ${track.title} by ${track.artist}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Artwork
          seed={track.id}
          src={track.artwork}
          alt=""
          rounded="rounded-lg"
          requestWidth={48}
          className="h-10 w-10 flex-shrink-0"
        >
          <span className="absolute inset-0 flex items-center justify-center">
            <Icon name="music_note" size="sm" className="text-white/80" />
          </span>
        </Artwork>
        <span className="flex min-w-0 flex-col pr-2">
          <span className="truncate font-title-md text-title-md text-[14px] text-on-surface">
            {track.title}
          </span>
          <span className="truncate font-body-md text-body-md text-[12px] text-on-surface-variant">
            {track.artist} · {PROVIDER_LABELS[track.provider]}
          </span>
        </span>
      </Link>

      <div className="flex flex-shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => void toggleLike(track.id)}
          aria-label={liked ? 'Remove from liked songs' : 'Like current track'}
          aria-pressed={liked}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
            liked ? 'text-primary-container' : 'text-on-surface hover:text-primary',
          )}
        >
          <Icon name="favorite" filled={liked} />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? 'Pause playback' : 'Resume playback'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.35)]"
        >
          {status === 'loading' && isPlaying ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary-container/40 border-t-on-primary-container" />
          ) : (
            <Icon name={isPlaying ? 'pause' : 'play_arrow'} filled />
          )}
        </button>
        <button
          type="button"
          onClick={() => next()}
          aria-label="Skip next track"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:text-primary"
        >
          <Icon name="skip_next" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-surface-container-highest">
        <div
          className="h-full rounded-full bg-primary-container transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  )
}
