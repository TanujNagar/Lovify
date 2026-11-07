import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'
import { useThemeStore } from '@/stores/theme'

const tabs = [
  { to: '/', end: true, label: 'Home', icon: 'home' },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/explore', label: 'Explore', icon: 'explore' },
  { to: '/library', label: 'Library', icon: 'library_music' },
  { to: '/profile', label: 'Profile', icon: 'person' },
]

export function DesktopSidebar() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-outline-variant/25 bg-surface-container-low/70 px-4 pb-4 pt-6 backdrop-blur-xl lg:flex">
      <NavLink to="/" aria-label="Lovify home" className="ml-2 flex items-center gap-2">
        <Logo markOnly className="h-9 w-9" />
        <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
          Lovify
        </span>
      </NavLink>

      <nav aria-label="Desktop Navigation" className="mt-10 flex flex-col gap-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 font-title-md text-title-md transition-colors',
                isActive
                  ? 'bg-surface-container text-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={tab.icon} filled={isActive} />
                <span>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-xl bg-surface-container p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Icon name="auto_awesome" size="sm" filled />
          </span>
          <div>
            <p className="font-title-md text-title-md text-on-surface">Lovify Free</p>
            <p className="font-caption text-caption uppercase tracking-wide text-primary">
              Local demo library
            </p>
          </div>
        </div>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          Offline shell ready. Free music providers arrive in Phase 2.
        </p>
        <NavLink
          to="/settings"
          className="mt-3 flex min-h-11 items-center justify-between rounded-lg bg-surface-container-low px-3 font-label-lg text-label-lg text-primary transition-colors hover:bg-surface-container-high"
        >
          Music source settings
          <Icon name="chevron_right" size="sm" />
        </NavLink>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="mt-3 flex min-h-11 items-center justify-between rounded-xl px-3 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <span className="flex items-center gap-2">
          <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} />
          {theme === 'dark' ? 'Dark theme' : 'Light theme'}
        </span>
        <span className="rounded-full bg-surface-container-high px-2 py-1 text-[10px] uppercase tracking-wide text-on-surface-variant">
          {theme === 'dark' ? 'On' : 'Off'}
        </span>
      </button>

      <NavLink
        to="/settings"
        className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-3 font-label-lg text-label-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Icon name="settings" />
        Settings
      </NavLink>
    </aside>
  )
}
