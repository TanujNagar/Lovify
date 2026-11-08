import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { cn } from '@/lib/cn'
import { playCollection } from '@/lib/providers'
import { useUiStore } from '@/stores/ui'
import type { CollectionItem } from '@/types/music'

type AlbumCardProps = {
  item: CollectionItem
  size?: 'lg' | 'sm'
  label?: string
  dotClass?: string
  className?: string
  onPlay?: () => void
  showPlay?: boolean
}

export function AlbumCard({
  item,
  size = 'lg',
  label,
  dotClass = 'bg-primary-container',
  className,
  onPlay,
  showPlay = true,
}: AlbumCardProps) {
  const showToast = useUiStore((state) => state.showToast)
  const large = size === 'lg'

  const handlePlay = () => {
    if (onPlay) {
      onPlay()
      return
    }
    void playCollection(item).then((count) => {
      if (!count) showToast('This collection has no playable tracks yet.')
    })
  }

  return (
    <div
      className={cn(
        'group flex flex-shrink-0 snap-start flex-col',
        large ? 'w-36' : 'w-28',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden shadow-md transition-all group-hover:shadow-[0_8px_24px_rgba(249,87,115,0.22)]',
          large ? 'h-36 w-36 rounded-xl' : 'h-28 w-28 rounded-lg',
        )}
      >
        <Link
          to={item.href}
          aria-label={`Open ${item.title}`}
          className="absolute inset-0 z-10 rounded-[inherit]"
        >
          <Artwork
            seed={item.id}
            src={item.artwork}
            alt=""
            rounded={large ? 'rounded-xl' : 'rounded-lg'}
            className="h-full w-full"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent opacity-90" />
          </Artwork>
        </Link>

        {label && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-20 flex items-center gap-1">
            <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
            <span className="font-caption text-caption text-[9px] font-semibold uppercase tracking-wider text-on-surface">
              {label}
            </span>
          </span>
        )}

        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${item.title}`}
          className={cn(
            'absolute bottom-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high/90 text-on-surface shadow-lg transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-90',
            !showPlay && 'hidden',
          )}
        >
          <Icon name="play_arrow" filled size="sm" />
        </button>
      </div>

      <Link to={item.href} className="mt-2.5 min-w-0">
        <span
          className={cn(
            'block truncate font-title-md text-title-md text-on-surface transition-colors group-hover:text-primary',
            large ? 'text-[14px]' : 'text-[13px]',
          )}
        >
          {item.title}
        </span>
        <span className="mt-0.5 line-clamp-2 font-body-md text-body-md text-[12px] leading-snug text-on-surface-variant">
          {item.subtitle}
        </span>
      </Link>
    </div>
  )
}
