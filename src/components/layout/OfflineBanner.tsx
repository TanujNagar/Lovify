import { Icon } from '@/components/brand/Icon'
import { useOnlineStatus } from '@/lib/pwa'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-secondary-container px-4 py-2 text-on-secondary-container"
    >
      <Icon name="cloud_off" size="sm" />
      <p className="font-label-md text-label-md">
        You are offline — the app shell and your saved library still work.
      </p>
    </div>
  )
}
