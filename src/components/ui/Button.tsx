import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  ariaLabel?: string
}

const variants = {
  primary:
    'bg-primary-container text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.25)] hover:brightness-105',
  secondary:
    'bg-surface-container-high text-on-surface hover:bg-surface-variant hover:text-primary',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  danger: 'bg-error-container text-on-error-container hover:brightness-110',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className,
  type = 'button',
  disabled,
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-label-lg text-label-lg transition-all active:scale-[0.98]',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
