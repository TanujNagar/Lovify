import { cn } from '@/lib/cn'

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  id?: string
}

export function Toggle({ checked, onChange, label, description, id }: ToggleProps) {
  const descriptionId = description ? `${id ?? label}-description` : undefined

  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <span id={id} className="font-title-md text-title-md text-on-surface">
          {label}
        </span>
        {description && (
          <p id={descriptionId} className="mt-0.5 font-body-md text-body-md text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={descriptionId}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 flex-shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-primary-container bg-primary-container'
            : 'border-outline-variant bg-surface-container-highest',
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-0.5 h-[22px] w-[22px] rounded-full shadow-sm transition-transform',
            checked
              ? 'translate-x-[22px] bg-on-primary-container'
              : 'translate-x-0.5 bg-on-surface-variant',
          )}
        />
      </button>
    </div>
  )
}
