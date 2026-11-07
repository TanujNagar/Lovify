import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { tracksForCollection } from '@/data/mock'
import { cn } from '@/lib/cn'
import { usePlayerStore } from '@/stores/player'
import type { CollectionItem } from '@/types/music'

type QuickTileProps = {
  item: CollectionItem
  className?: string
}

export function QuickTile({ item, className }: QuickTileProps) {
  const playQueue = usePlayerStore((state) => state.playQueue)

  return (
    <button
      type="button"
      onClick={() => {
        const queue = tracksForCollection(item)
        playQueue(queue, 0, {
          type: item.kind === 'track' ? 'track' : item.kind,
          label: item.title,
        })
      }}
      className={cn(
        'group relative flex h-14 min-w-0 items-center overflow-hidden rounded-lg bg-surface-container text-left shadow-sm transition-all active:scale-[0.98]',
        className,
      )}
    >
      <Artwork seed={item.id} alt="" rounded="rounded-none" className="h-14 w-14 flex-shrink-0">
        <span className="absolute inset-0 flex items-center justify-center bg-surface-container-lowest/25">
          <Icon name="music_note" size="sm" className="text-white/80" />
        </span>
      </Artwork>
      <span className="flex min-w-0 flex-1 items-center px-2.5">
        <span className="truncate text-[13px] font-semibold leading-tight text-on-surface">
          {item.title}
        </span>
      </span>
      <span className="pointer-events-none absolute right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-on-primary-container opacity-0 shadow-[0_2px_8px_rgba(249,87,115,0.4)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <Icon name="play_arrow" filled size="sm" />
      </span>
    </button>
  )
}
