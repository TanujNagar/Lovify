import { useId } from 'react'
import { cn } from '@/lib/cn'

type LogoProps = {
  className?: string
  markOnly?: boolean
  title?: string
}

/**
 * The Lovify logo from design/Logo.svg, inlined so it can adapt to the
 * active theme (the wordmark is white in dark mode and ink in light mode).
 */
export function Logo({ className, markOnly = false, title = 'Lovify' }: LogoProps) {
  const gradientId = useId().replace(/:/g, '')

  return (
    <svg
      viewBox={markOnly ? '0 0 48 48' : '0 0 160 48'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-auto', className)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient
          id={`lovify-grad-${gradientId}`}
          gradientUnits="userSpaceOnUse"
          x1="12"
          y1="12"
          x2="32"
          y2="31"
        >
          <stop offset="0%" stopColor="#F27691" />
          <stop offset="100%" stopColor="#E94B68" />
        </linearGradient>
      </defs>
      <g transform="translate(6, 6)">
        <rect
          width="36"
          height="36"
          rx="10"
          style={{ fill: 'var(--logo-bg)' }}
          stroke="var(--logo-border)"
          strokeWidth="1.2"
        />
        <path
          d="M12 24V18"
          stroke={`url(#lovify-grad-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M16 27V15"
          stroke={`url(#lovify-grad-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M20 29V13" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M24 27V15"
          stroke={`url(#lovify-grad-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M28 24V18"
          stroke={`url(#lovify-grad-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="10" r="1.5" fill="#F27691" />
      </g>
      {!markOnly && (
        <text
          x="50"
          y="29"
          style={{ fill: 'var(--logo-wordmark)' }}
          fontFamily="Plus Jakarta Sans, sans-serif"
          fontSize="20"
          fontWeight="700"
          letterSpacing="-0.5"
        >
          Lovi
          <tspan fill="#E94B68">fy</tspan>
        </text>
      )}
    </svg>
  )
}
