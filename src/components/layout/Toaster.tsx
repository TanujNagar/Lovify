import { useUiStore } from '@/stores/ui'
import { Icon } from '@/components/brand/Icon'

export function Toaster() {
  const toast = useUiStore((state) => state.toast)
  const dismiss = useUiStore((state) => state.dismissToast)

  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[8.5rem] z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 shadow-xl"
    >
      <Icon name="auto_awesome" size="sm" className="text-primary" />
      <p className="flex-1 font-body-md text-body-md text-on-surface">{toast}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss message"
        className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant"
      >
        <Icon name="close" size="sm" />
      </button>
    </div>
  )
}
