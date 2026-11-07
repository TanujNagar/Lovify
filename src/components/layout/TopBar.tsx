import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/ui'

const tabMeta: Record<string, { label: string; root?: boolean }> = {
  '/': { label: 'Home', root: true },
  '/search': { label: 'Search' },
  '/explore': { label: 'Explore' },
  '/library': { label: 'Library' },
  '/profile': { label: 'Profile' },
}

const detailTitles: Array<[RegExp, string]> = [
  [/^\/settings/, 'Settings'],
  [/^\/playlist\//, 'Playlist'],
  [/^\/album\//, 'Album'],
  [/^\/artist\//, 'Artist'],
  [/^\/queue/, 'Queue'],
  [/^\/offline/, 'Offline'],
]

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const showToast = useUiStore((state) => state.showToast)
  const meta = tabMeta[location.pathname]
  const detail = detailTitles.find(([pattern]) => pattern.test(location.pathname))
  const isTab = Boolean(meta)

  return (
    <header className="sticky top-0 z-40 bg-surface/95 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.24)]">
      <div className="flex h-16 items-center justify-between px-margin">
        {isTab ? (
          <>
            <div className="flex min-w-0 items-center gap-space-sm">
              <Link
                to="/"
                aria-label="Lovify home"
                className="flex min-w-0 items-center gap-2"
              >
                <Logo markOnly className="h-8 w-8 flex-shrink-0" />
                <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
                  Lovify
                </span>
              </Link>
              <span className="sr-only">{meta?.label}</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                type="button"
                onClick={() => showToast('You are all caught up.')}
                aria-label="Notifications"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <Icon name="notifications" />
              </button>
              <Link
                to="/profile"
                aria-label="Open profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary"
              >
                <Icon name="person" size="sm" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              aria-label="Go back"
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
            >
              <Icon name="arrow_back" />
            </button>
            <h1 className="truncate px-2 font-title-lg text-title-lg text-on-surface">
              {detail?.[1] ?? 'Lovify'}
            </h1>
            <div className="h-11 w-11" aria-hidden="true" />
          </>
        )}
      </div>
    </header>
  )
}

export function NavMark({ active }: { active: boolean }) {
  return <span className={cn('h-1 w-1 rounded-full', active ? 'bg-primary-container' : 'bg-transparent')} />
}
