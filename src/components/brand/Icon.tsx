import { cn } from '@/lib/cn'

type IconProps = {
  name: string
  className?: string
  filled?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const sizes = {
  sm: 'text-[16px]',
  md: 'text-[20px]',
  lg: 'text-[24px]',
}

export function Icon({ name, className, filled, size = 'md', label }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', sizes[size], filled && 'is-filled', className)}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {name}
    </span>
  )
}
