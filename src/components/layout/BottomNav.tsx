import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/', end: true, label: 'Home', icon: 'home' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/explore', label: 'Explore', icon: 'explore' },
  { to: '/library', label: 'Library', icon: 'library_music' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]

type BottomNavProps = {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  return (
    <nav
      aria-label="Main Navigation"
      className={cn(
        'pointer-events-auto flex h-16 items-center justify-around bg-surface-container-low px-margin shadow-[0_-2px_12px_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'flex h-12 min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-lg transition-colors',
              isActive
                ? 'font-semibold text-primary-container'
                : 'text-on-surface-variant hover:text-on-surface',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={tab.icon} filled={isActive} size="lg" className="text-[22px]" />
              <span className="font-label-md text-label-md text-[10px]">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
