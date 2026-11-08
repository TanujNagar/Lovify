import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { cn } from '@/lib/cn'
import type { LocalMix } from '@/lib/recommendations'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

type MixCardProps = {
  mix: LocalMix
  className?: string
}

/** A locally generated collection. It has no detail page — it starts playing. */
export function MixCard({ mix, className }: MixCardProps) {
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)

  const play = () => {
    if (!mix.tracks.length) {
      showToast('This mix is waiting for a few more tracks.')
      return
    }
    playQueue(mix.tracks, 0, { type: 'radio', label: mix.title })
    showToast(`${mix.title} is playing.`)
  }

  return (
    <div
      className={cn(
        'group flex w-36 flex-shrink-0 snap-start flex-col text-left',
        className,
      )}
    >
      <div className="relative h-36 w-36 overflow-hidden rounded-xl shadow-md transition-all group-hover:shadow-[0_8px_24px_rgba(249,87,115,0.22)]">
        <Artwork seed={mix.id} src={mix.artwork} alt="" rounded="rounded-xl" className="h-full w-full">
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container-lowest/85 via-surface-container-lowest/10 to-primary-container/20" />
          <span className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-surface-container-lowest/45 px-2 py-1 backdrop-blur-sm">
            <Icon name="auto_awesome" filled size="sm" className="text-primary" />
            <span className="font-caption text-caption text-[9px] font-semibold uppercase tracking-wider text-on-surface">
              {mix.badge}
            </span>
          </span>
        </Artwork>

        <button
          type="button"
          onClick={play}
          aria-label={`Play ${mix.title}`}
          className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high/90 text-on-surface shadow-lg transition-all hover:bg-primary-container hover:text-on-primary-container active:scale-90"
        >
          <Icon name="play_arrow" filled size="sm" />
        </button>
      </div>

      <button type="button" onClick={play} className="mt-2.5 min-w-0 text-left">
        <span className="block truncate font-title-md text-title-md text-[14px] text-on-surface transition-colors group-hover:text-primary">
          {mix.title}
        </span>
        <span className="mt-0.5 line-clamp-2 font-body-md text-body-md text-[12px] leading-snug text-on-surface-variant">
          {mix.subtitle}
        </span>
      </button>
    </div>
  )
}
