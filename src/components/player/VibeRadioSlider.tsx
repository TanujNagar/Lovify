import { useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { cn } from '@/lib/cn'
import { searchFreeTracks } from '@/lib/providers'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import type { Mood } from '@/types/music'

type VibeMood = Mood & { color: string }

const MOODS: VibeMood[] = [
  {
    id: 'vibe-chill',
    name: 'Chill',
    subtitle: 'Soft beats, zero pressure',
    icon: 'spa',
    gradient: 'linear-gradient(90deg, #22d3ee, #14b8a6)',
    color: '#22d3ee',
    query: 'chill lofi',
  },
  {
    id: 'vibe-focus',
    name: 'Focus',
    subtitle: 'Instrumental flow',
    icon: 'psychology',
    gradient: 'linear-gradient(90deg, #818cf8, #a855f7)',
    color: '#818cf8',
    query: 'ambient instrumental focus',
  },
  {
    id: 'vibe-late',
    name: 'Late Night',
    subtitle: 'Slow, atmospheric',
    icon: 'bedtime',
    gradient: 'linear-gradient(90deg, #a855f7, #ec4899)',
    color: '#a855f7',
    query: 'late night ambient',
  },
  {
    id: 'vibe-energy',
    name: 'Energy',
    subtitle: 'Upbeat and driving',
    icon: 'bolt',
    gradient: 'linear-gradient(90deg, #fb923c, #ef4444)',
    color: '#fb923c',
    query: 'energetic electronic',
  },
  {
    id: 'vibe-warm',
    name: 'Warm',
    subtitle: 'Cozy, acoustic tones',
    icon: 'wb_sunny',
    gradient: 'linear-gradient(90deg, #fbbf24, #f97316)',
    color: '#fbbf24',
    query: 'acoustic warm',
  },
  {
    id: 'vibe-dark',
    name: 'Dark',
    subtitle: 'Deep, moody textures',
    icon: 'dark_mode',
    gradient: 'linear-gradient(90deg, #64748b, #374151)',
    color: '#64748b',
    query: 'dark ambient electronic',
  },
  {
    id: 'vibe-dreamy',
    name: 'Dreamy',
    subtitle: 'Ethereal soundscapes',
    icon: 'auto_awesome',
    gradient: 'linear-gradient(90deg, #f472b6, #c084fc)',
    color: '#f472b6',
    query: 'dream pop ethereal',
  },
  {
    id: 'vibe-groove',
    name: 'Groove',
    subtitle: 'Rhythmic and funky',
    icon: 'music_note',
    gradient: 'linear-gradient(90deg, #34d399, #14b8a6)',
    color: '#34d399',
    query: 'funk groove soul',
  },
]

const LAST = MOODS.length - 1

export function VibeRadioSlider({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [moodIndex, setMoodIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const activeMood = MOODS[moodIndex]

  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)

  const progress = (moodIndex / LAST) * 100

  const selectMood = (index: number) => {
    setMoodIndex(Math.min(LAST, Math.max(0, index)))
    setGenerated(false)
  }

  const generateQueue = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const tracks = await searchFreeTracks(activeMood.query, 30)
      if (!tracks.length) {
        showToast('No tracks found for this vibe. Try another mood.')
        return
      }
      const shuffled = [...tracks].sort(() => Math.random() - 0.5).slice(0, 25)
      const seed = `${activeMood.id}-${Date.now()}`
      playQueue(shuffled, 0, {
        type: 'radio',
        label: `Vibe Radio · ${activeMood.name}`,
        id: seed,
      })
      setGenerated(true)
      showToast(`Vibe Radio: ${activeMood.name} mix is playing.`)
    } catch {
      showToast('Could not generate the mix. Try again in a moment.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section
      aria-label="Vibe Radio"
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl transition-colors duration-500"
        style={{ backgroundColor: activeMood.color }}
        aria-hidden="true"
      />

      <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full transition-colors duration-300"
              style={{ backgroundColor: activeMood.color }}
            />
            <span className="font-caption text-caption font-semibold uppercase tracking-[0.16em] text-primary">
              Vibe Radio
            </span>
          </div>
          <h2 className="mt-1 font-headline-md text-headline-md text-on-surface">Your mood, your mix</h2>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            Slide to a feeling. We build the queue from free music sources.
          </p>
        </div>
        {generated && (
          <span className="flex-shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 font-caption text-caption text-on-surface-variant">
            Playing
          </span>
        )}
      </div>

      <div className="relative z-10">
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-surface-container-highest"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: `${progress}%`, background: activeMood.gradient }}
            />
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between"
            aria-hidden="true"
          >
            {MOODS.map((mood, index) => (
              <span
                key={mood.id}
                className={cn(
                  'transition-all duration-200',
                  index === moodIndex ? 'scale-110' : 'scale-90 opacity-70',
                )}
                style={{ color: index === moodIndex ? mood.color : undefined }}
              >
                <Icon name={mood.icon} size={index === moodIndex ? 'md' : 'sm'} />
              </span>
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={LAST}
            step={1}
            value={moodIndex}
            onChange={(event) => selectMood(Number(event.target.value))}
            aria-label="Select a mood for Vibe Radio"
            aria-valuetext={`${activeMood.name}: ${activeMood.subtitle}`}
            className="vibe-range relative z-10"
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="font-title-md text-title-md text-on-surface">{activeMood.name}</p>
            <p className="truncate font-caption text-caption text-on-surface-variant">
              {activeMood.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void generateQueue()}
            disabled={generating}
            className={cn(
              'flex min-h-11 flex-shrink-0 items-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container shadow-[0_4px_16px_rgba(249,87,115,0.4)] disabled:opacity-50',
              compact && 'min-h-9 px-3',
            )}
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary-container/40 border-t-on-primary-container" />
                Building…
              </>
            ) : generated ? (
              <>
                <Icon name="refresh" size="sm" />
                Regenerate
              </>
            ) : (
              <>
                <Icon name="play_arrow" filled size="sm" />
                Play Mix
              </>
            )}
          </button>
        </div>
      </div>

      <p className="relative z-10 mt-4 font-caption text-caption text-on-surface-variant">
        Tip: use the arrow keys to move between moods.
      </p>
    </section>
  )
}
