import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { cn } from '@/lib/cn'
import { formatDuration } from '@/lib/format'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import type { Track } from '@/types/music'

type TrackRowProps = {
  track: Track
  active?: boolean
  onPlay?: () => void
  queue?: Track[]
  showAlbum?: boolean
  showIndex?: number | false
  compact?: boolean
  className?: string
  loved?: boolean
  onToggleLove?: () => void
}

export function TrackRow({
  track,
  active = false,
  onPlay,
  queue,
  showAlbum = false,
  showIndex = false,
  compact = false,
  className,
  loved,
  onToggleLove,
}: TrackRowProps) {
  const navigate = useNavigate()
  const player = usePlayerStore()
  const storeLiked = useLibraryStore((state) => state.likedIds.includes(track.id))
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const showToast = useUiStore((state) => state.showToast)

  const liked = loved ?? storeLiked
  const isActive = active || player.currentTrack?.id === track.id
  const isPlaying = isActive && player.isPlaying

  const handlePlay = () => {
    if (onPlay) {
      onPlay()
      return
    }
    player.play(track, queue, { type: 'track', label: showAlbum ? track.album : 'Now playing' })
  }

  const handleLike = async () => {
    if (onToggleLove) {
      onToggleLove()
      return
    }
    await toggleLike(track.id)
  }

  return (
    <div
      className={cn(
        'group relative flex h-16 items-center justify-between overflow-hidden rounded-xl transition-colors',
        isActive
          ? 'bg-surface-container-high/90 shadow-[0_4px_16px_rgba(249,87,115,0.12)]'
          : 'bg-surface-container/40 hover:bg-surface-container',
        className,
      )}
    >
      {isActive && (
        <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-primary-container" />
      )}

      <button
        type="button"
        onClick={handlePlay}
        aria-label={`${isActive && isPlaying ? 'Pause' : 'Play'} ${track.title} by ${track.artist}`}
        className={cn(
          'flex h-full min-w-0 flex-1 items-center gap-3 pl-3 text-left',
          isActive && 'pl-4',
          compact && 'gap-2.5 pl-2',
        )}
      >
        {showIndex !== false && showIndex > 0 && (
          <span className="w-4 flex-shrink-0 text-center font-caption text-caption text-on-surface-variant">
            {showIndex}
          </span>
        )}
        <Artwork
          seed={track.id}
          alt=""
          rounded="rounded-lg"
          className={cn(
            'flex-shrink-0',
            compact ? 'h-10 w-10' : 'h-12 w-12',
            isActive && 'shadow-sm',
          )}
        >
          {isActive && isPlaying ? (
            <span className="absolute inset-0 flex items-center justify-center gap-0.5 bg-surface-container-lowest/60">
              <span className="h-4 w-1 animate-eq-1 rounded-full bg-primary-container" />
              <span className="h-5 w-1 animate-eq-2 rounded-full bg-primary-container" />
              <span className="h-3 w-1 animate-eq-3 rounded-full bg-primary-container" />
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="play_arrow" filled className="text-on-surface" size="sm" />
            </span>
          )}
        </Artwork>

        <span className="flex min-w-0 flex-1 flex-col pr-1">
          <span
            className={cn(
              'truncate font-title-md text-title-md',
              isActive ? 'font-semibold text-primary' : 'text-on-surface',
            )}
          >
            {track.title}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 font-body-md text-body-md text-on-surface-variant">
            <span className="truncate">{track.artist}</span>
            <span className="h-1 w-1 flex-shrink-0 rounded-full bg-outline-variant" />
            <span className={cn('flex-shrink-0', isActive && 'font-medium text-primary')}>
              {isActive && isPlaying ? 'Playing' : formatDuration(track.duration)}
            </span>
            {showAlbum && (
              <>
                <span className="hidden h-1 w-1 flex-shrink-0 rounded-full bg-outline-variant sm:block" />
                <span className="hidden truncate sm:block">{track.album}</span>
              </>
            )}
          </span>
        </span>
      </button>

      <div className="flex flex-shrink-0 items-center gap-0.5 pr-1">
        <button
          type="button"
          onClick={handleLike}
          aria-label={liked ? `Remove ${track.title} from liked songs` : `Like ${track.title}`}
          aria-pressed={liked}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full transition-colors active:scale-90',
            liked ? 'text-primary-container' : 'text-on-surface-variant hover:text-primary',
          )}
        >
          <Icon name="favorite" filled={liked} size="sm" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            showToast('Track options are coming in Phase 2.')
          }}
          aria-label={`More options for ${track.title}`}
          className="hidden h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface sm:flex"
        >
          <Icon name="more_vert" size="sm" />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/album/${track.albumId}`)}
          aria-label={`Open album ${track.album}`}
          className="hidden h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface lg:flex"
        >
          <Icon name="album" size="sm" />
        </button>
      </div>
    </div>
  )
}
