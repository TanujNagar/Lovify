import { useNavigate, Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { PlayerControls } from '@/components/player/PlayerControls'
import { SeekSlider } from '@/components/player/SeekSlider'
import { cn } from '@/lib/cn'
import { PROVIDER_LABELS } from '@/lib/providers/types'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

export function PlayerScreen() {
  const navigate = useNavigate()
  const track = usePlayerStore((state) => state.currentTrack)
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const status = usePlayerStore((state) => state.status)
  const error = usePlayerStore((state) => state.error)
  const volume = usePlayerStore((state) => state.volume)
  const seek = usePlayerStore((state) => state.seek)
  const setVolume = usePlayerStore((state) => state.setVolume)
  const queue = usePlayerStore((state) => state.queue)
  const index = usePlayerStore((state) => state.index)
  const context = usePlayerStore((state) => state.context)
  const liked = useLibraryStore((state) => (track ? state.likedIds.includes(track.id) : false))
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const openTrackMenu = useUiStore((state) => state.openTrackMenu)

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

  const total = duration || track.duration
  const provider = PROVIDER_LABELS[track.provider]

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
        <button
          type="button"
          onClick={() => openTrackMenu(track)}
          aria-label="Track options"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="more_vert" />
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-5 pb-8 pt-2">
        <p className="sr-only" aria-live="polite">
          Now playing {track.title} by {track.artist}
        </p>

        <div className="mx-auto mt-1 w-full max-w-[340px]">
          <Artwork
            seed={track.id}
            src={track.artwork}
            alt={`${track.album} artwork`}
            rounded="rounded-2xl"
            className="aspect-square w-full shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
          >
            <span className="absolute inset-0 flex items-end justify-between p-4">
              <span className="rounded-full bg-surface-container-lowest/50 px-2.5 py-1 font-caption text-caption uppercase tracking-wider text-white/80 backdrop-blur-sm">
                {provider}
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
            {track.album && (
              <Link
                to={`/album/${track.albumId}`}
                className="mt-0.5 block truncate font-caption text-caption text-outline hover:text-primary"
              >
                {track.album}
              </Link>
            )}
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
          value={Math.min(progress, total)}
          max={total}
          onChange={seek}
          label="Track progress"
        />

        <PlayerControls className="mt-4" />

        {status === 'error' && error && (
          <p role="status" className="mt-4 rounded-xl bg-error-container/20 px-3 py-2 font-body-md text-body-md text-error">
            {error}
          </p>
        )}

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

        {track.provider === 'youtube' && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-container-low p-3 font-body-md text-body-md text-on-surface-variant">
            <Icon name="info" size="sm" className="mt-1 flex-shrink-0 text-primary" />
            YouTube plays through the official visible player. EQ and visualizer are available for
            free-source tracks.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-6">
          <Link
            to="/queue"
            className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="queue_music" size="sm" />
            Up next · {Math.max(0, queue.length - 1)}
          </Link>
          <Link
            to="/lyrics"
            className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="lyrics" size="sm" />
            Lyrics
          </Link>
          <span className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container/60 px-3 font-caption text-caption uppercase tracking-wider text-on-surface-variant">
            <Icon name="queue_music" size="sm" />
            {index + 1}/{queue.length}
          </span>
        </div>
      </main>
    </div>
  )
}
