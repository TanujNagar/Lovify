import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Icon } from '@/components/brand/Icon'
import { cn } from '@/lib/cn'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  initialFocusRef?: RefObject<HTMLElement | null>
}

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  initialFocusRef,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2)}`).current
  const descId = useRef(`sheet-desc-${Math.random().toString(36).slice(2)}`).current
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector<HTMLElement>(focusableSelector) ??
        panelRef.current
      target?.focus()
    }, 30)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.offsetParent !== null)
      if (!focusables.length) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [open, onClose, initialFocusRef])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-surface-container-lowest/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduceMotion ? undefined : { y: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-10 w-full max-w-md rounded-t-2xl bg-surface-container-high px-5 pb-safe pt-3 shadow-[0_-12px_48px_rgba(0,0,0,0.45)] sm:rounded-2xl',
              className,
            )}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline-variant sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="font-headline-md text-headline-md text-on-surface">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 font-body-md text-body-md text-on-surface-variant">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="mt-4">{children}</div>
            {footer && <div className="mt-5 pb-5 sm:pb-1">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
