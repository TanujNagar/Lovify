import type { CSSProperties } from 'react'
import { formatDuration } from '@/lib/format'

type SeekSliderProps = {
  value: number
  max: number
  onChange: (value: number) => void
  label: string
  showTimes?: boolean
  className?: string
}

export function SeekSlider({
  value,
  max,
  onChange,
  label,
  showTimes = true,
  className,
}: SeekSliderProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const style = { '--range-progress': `${percent}%` } as CSSProperties

  return (
    <div className={className}>
      <input
        type="range"
        min={0}
        max={Math.max(1, Math.round(max))}
        step={1}
        value={Math.min(value, max)}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        aria-valuetext={`${formatDuration(value)} of ${formatDuration(max)}`}
        className="range"
        style={style}
      />
      {showTimes && (
        <div className="mt-1 flex justify-between font-caption text-caption tabular-nums text-on-surface-variant">
          <span>{formatDuration(value)}</span>
          <span>{formatDuration(max)}</span>
        </div>
      )}
    </div>
  )
}
