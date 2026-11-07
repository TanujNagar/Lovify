import { useNavigate, Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { PlayerControls } from '@/components/player/PlayerControls'
import { SeekSlider } from '@/components/player/SeekSlider'
import { cn } from '@/lib/cn'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

export function PlayerScreen() {
  const navigate = useNavigate()
  const track = usePlayerStore((state) => state.currentTrack)
  const progress = usePlayerStore((state) => state.progress)
  const volume = usePlayerStore((state) => state.volume)
  const seek = usePlayerStore((state) => state.seek)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const queueLength = usePlayerStore((state) => state.queue.length)
  const context = usePlayerStore((state) => state.context)
  const liked = useLibraryStore((state) => (track ? state.likedIds.includes(track.id) : false))
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const showToast = useUiStore((state) => state.showToast)

  if (!track) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <Icon name="music_note" size="lg" className="text-primary" />
        <p className="font-title-lg text-title-lg text-on-surface">Nothing playing yet</p>
        <Link
          to="/"
          className="flex min-h-11 items-center rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
        >
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-surface">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full ambient-a" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full ambient-b" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-safe">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          aria-label="Close player"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="min-w-0 px-2 text-center">
          <p className="font-caption text-caption uppercase tracking-[0.16em] text-on-surface-variant">
            Playing from
          </p>
          <p className="truncate font-label-lg text-label-lg text-on-surface">{context.label}</p>
        </div>
        <Link
          to="/queue"
          aria-label="Open queue"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="queue_music" />
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-5 pb-8 pt-2">
        <p className="sr-only" aria-live="polite">
          Now playing {track.title} by {track.artist}
        </p>

        <div className="mx-auto mt-1 w-full max-w-[340px]">
          <Artwork
            seed={track.id}
            alt={`${track.album} artwork`}
            rounded="rounded-2xl"
            className="aspect-square w-full shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
          >
            <span className="absolute inset-0 flex items-end justify-between p-4">
              <span className="rounded-full bg-surface-container-lowest/50 px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-white/80 backdrop-blur-sm">
                {track.provider === 'mock' ? 'Demo catalog' : track.provider}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/40 text-white/80 backdrop-blur-sm">
                <Icon name="graphic_eq" size="sm" />
              </span>
            </span>
          </Artwork>
        </div>

        <div className="mt-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-headline-md text-headline-md text-on-surface">{track.title}</h1>
            <Link
              to={`/artist/${track.artistId}`}
              className="mt-0.5 inline-block truncate font-body-lg text-body-lg text-on-surface-variant hover:text-primary"
            >
              {track.artist}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => void toggleLike(track.id)}
            aria-label={liked ? 'Remove from liked songs' : 'Like this track'}
            aria-pressed={liked}
            className={cn(
              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors',
              liked ? 'text-primary-container' : 'text-on-surface-variant hover:text-primary',
            )}
          >
            <Icon name="favorite" filled={liked} size="lg" />
          </button>
        </div>

        <SeekSlider
          className="mt-5"
          value={progress}
          max={track.duration}
          onChange={seek}
          label="Track progress"
        />

        <PlayerControls className="mt-4" />

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setVolume(volume === 0 ? 0.72 : 0)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <Icon name={volume === 0 ? 'volume_down' : 'volume_up'} size="sm" />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            aria-label="Volume"
            aria-valuetext={`${Math.round(volume * 100)} percent`}
            className="range flex-1"
            style={{ '--range-progress': `${volume * 100}%` } as React.CSSProperties}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-6">
          <Link
            to="/queue"
            className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="queue_music" size="sm" />
            Up next · {Math.max(0, queueLength - 1)}
          </Link>
          <button
            type="button"
            onClick={() => showToast('EQ and visualizer arrive in Phase 4.')}
            aria-label="Audio lab (coming later)"
            className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="equalizer" size="sm" />
            Audio lab
          </button>
        </div>
      </main>
    </div>
  )
}
