import { Link } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { useOnlineStatus } from '@/lib/pwa'

export function OfflineScreen() {
  const online = useOnlineStatus()

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container shadow-[0_0_32px_rgba(249,87,115,0.2)]">
        <Icon name={online ? 'cloud_off' : 'cloud_off'} size="lg" className="text-primary" />
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Icon name="refresh" size="sm" />
        </div>
      </div>
      <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
        {online ? 'You are back online' : "You're offline"}
      </h1>
      <p className="mt-2 max-w-sm font-body-md text-body-md leading-relaxed text-on-surface-variant">
        {online
          ? 'The connection is back. Your library is ready and the app shell kept everything in place.'
          : 'The app shell and your saved library still work. Tracks that need the network will wait until you reconnect.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
        >
          <Icon name="refresh" size="sm" />
          Try again
        </button>
        <Link
          to="/library"
          className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container-high px-5 font-label-lg text-label-lg text-on-surface"
        >
          Open library
        </Link>
      </div>
      <p className="mt-6 rounded-full bg-surface-container-low px-3 py-1.5 font-caption text-caption uppercase tracking-wider text-on-surface-variant">
        {online ? 'Online' : 'Offline mode'} · Lovify shell
      </p>
    </div>
  )
}
