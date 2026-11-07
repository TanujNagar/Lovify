import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { cn } from '@/lib/cn'

type SectionHeaderProps = {
  title: string
  subtitle?: string
  actionLabel?: string
  actionTo?: string
  actionIcon?: string
  onAction?: () => void
  className?: string
  children?: ReactNode
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionTo,
  actionIcon = 'chevron_right',
  onAction,
  className,
  children,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-3.5 flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {children}
      {actionLabel &&
        (actionTo ? (
          <Link
            to={actionTo}
            className="flex min-h-11 flex-shrink-0 items-center gap-0.5 whitespace-nowrap font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-primary"
          >
            {actionLabel}
            <Icon name={actionIcon} size="sm" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="flex min-h-11 flex-shrink-0 items-center gap-0.5 whitespace-nowrap font-label-lg text-label-lg text-on-surface-variant transition-colors hover:text-primary"
          >
            {actionLabel}
            <Icon name={actionIcon} size="sm" />
          </button>
        ))}
    </div>
  )
}
