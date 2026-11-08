import { useEffect, useRef, useState, type ReactNode } from 'react'

type LazySectionProps = {
  children: ReactNode
  /** Reserves space before the section renders so the page keeps its scroll height. */
  minHeight?: number
  /** How far outside the viewport the section starts rendering. */
  rootMargin?: string
  className?: string
}

/**
 * Renders its children only when the section approaches the viewport. Home
 * stacks several rich rows; mounting all of them at once creates one long
 * blocking task on slower phones. This keeps the first render small and lets
 * each row mount separately as the listener scrolls.
 */
export function LazySection({
  children,
  minHeight = 260,
  rootMargin = '240px 0px',
  className,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  )
}
