import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/brand/Icon'

type ChipProps = {
  children: ReactNode
  active?: boolean
  icon?: string
  count?: number
  onClick?: () => void
  className?: string
  ariaLabel?: string
}

export function Chip({ children, active, icon, count, onClick, className, ariaLabel }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ?? false}
      aria-label={ariaLabel}
      className={cn(
        'tap-target relative flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-full px-4 font-label-lg text-label-lg transition-all active:scale-95',
        active
          ? 'bg-primary-container text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.28)]'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        className,
      )}
    >
      {icon && (
        <Icon
          name={icon}
          size="sm"
          className={active ? 'text-on-primary-container' : 'text-tertiary'}
        />
      )}
      <span>{children}</span>
      {typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'ml-0.5 rounded-full px-1.5 py-0.5 font-caption text-caption leading-none',
            active ? 'bg-on-primary-container/15 text-on-primary-container' : 'bg-surface-container-high text-on-surface-variant',
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
