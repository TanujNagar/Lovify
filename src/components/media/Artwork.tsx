import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { artworkStyle } from '@/lib/artwork'
import { cn } from '@/lib/cn'

type ArtworkProps = {
  seed: string
  src?: string
  alt?: string
  className?: string
  rounded?: string
  children?: ReactNode
  style?: CSSProperties
}

export function Artwork({
  seed,
  src,
  alt,
  className,
  rounded = 'rounded-lg',
  children,
  style,
}: ArtworkProps) {
  const [failed, setFailed] = useState(false)
  const generated = artworkStyle(seed, `grain-${seed.replace(/[^a-z0-9]/gi, '')}`)
  const showImage = Boolean(src) && !failed

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-surface-container-high',
        rounded,
        className,
      )}
      style={{ ...generated, ...style }}
      role={alt ? 'img' : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container-lowest/55 via-transparent to-white/10" />
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_38%)]" />
        </>
      )}
      {children}
    </div>
  )
}
