import { Link } from 'react-router-dom'
import { Artwork } from '@/components/media/Artwork'
import { initials } from '@/lib/artwork'
import { cn } from '@/lib/cn'
import type { Artist } from '@/types/music'

type ArtistCircleProps = {
  artist: Artist
  size?: 'md' | 'sm'
  subtitle?: string
  className?: string
}

export function ArtistCircle({ artist, size = 'md', subtitle = 'Artist', className }: ArtistCircleProps) {
  const large = size === 'md'

  return (
    <Link
      to={`/artist/${artist.id}`}
      className={cn(
        'group flex flex-shrink-0 snap-start flex-col items-center text-center',
        large ? 'w-28' : 'w-20',
        className,
      )}
    >
      <div
        className={cn(
          'overflow-hidden rounded-full shadow-md ring-2 ring-surface-container-highest transition-transform group-hover:scale-105',
          large ? 'h-24 w-24' : 'h-16 w-16',
        )}
      >
        <Artwork
          seed={artist.id}
          src={artist.artwork}
          alt={`${artist.name} artwork`}
          rounded="rounded-full"
          className="h-full w-full"
        >
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center font-bold tracking-tight text-white/90',
              large ? 'text-2xl' : 'text-lg',
            )}
          >
            {initials(artist.name)}
          </span>
        </Artwork>
      </div>
      <span
        className={cn(
          'mt-2 w-full truncate font-title-md text-title-md text-on-surface group-hover:text-primary',
          large ? 'text-[13px]' : 'text-[13px]',
        )}
      >
        {artist.name}
      </span>
      <span className="w-full truncate font-body-md text-body-md text-[11px] text-on-surface-variant">
        {subtitle}
      </span>
    </Link>
  )
}
