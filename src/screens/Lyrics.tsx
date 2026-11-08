import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { usePlayerStore } from '@/stores/player'
import { activeLyricIndex, getLyrics, type LyricsResult } from '@/lib/lyrics'
import { PROVIDER_LABELS } from '@/lib/providers/types'

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    setReduced(query.matches)
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])
  return reduced
}

export function LyricsScreen() {
  const navigate = useNavigate()
  const track = usePlayerStore((state) => state.currentTrack)
  const progress = usePlayerStore((state) => state.progress)
  const seek = usePlayerStore((state) => state.seek)

  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([])
  const reducedMotion = useReducedMotion()
  const trackId = track?.id

  useEffect(() => {
    if (!trackId || !track) {
      setLyrics(null)
      setLoading(false)
      setFailed(false)
      return
    }

    const controller = new AbortController()
    setLyrics(null)
    setLoading(true)
    setFailed(false)
    lineRefs.current = []

    void getLyrics(track, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setLyrics(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [track, trackId])

  const activeIndex = lyrics?.kind === 'synced' ? activeLyricIndex(lyrics.lines, progress) : -1

  useEffect(() => {
    if (activeIndex < 0) return
    const container = scrollRef.current
    const line = lineRefs.current[activeIndex]
    if (!container || !line) return
    const target = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2
    container.scrollTo({
      top: Math.max(0, target),
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [activeIndex, reducedMotion])

  if (!track) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <Icon name="lyrics" size="lg" className="text-primary" />
        <p className="font-title-lg text-title-lg text-on-surface">No track is playing</p>
        <Link
          to="/"
          className="flex min-h-11 items-center rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary-container"
        >
          Find something to play
        </Link>
      </div>
    )
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-surface">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full ambient-a" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full ambient-b" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-safe">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/player'))}
          aria-label="Close lyrics"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="min-w-0 px-2 text-center">
          <h1 className="font-caption text-caption uppercase tracking-[0.16em] text-on-surface-variant">
            Lyrics
          </h1>
          <p className="truncate font-label-lg text-label-lg text-on-surface">{track.title}</p>
        </div>
        <Link
          to="/player"
          aria-label="Open full player"
          className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container"
        >
          <Icon name="graphic_eq" />
        </Link>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-2xl items-center gap-3 px-5 pb-4 pt-2">
        <Artwork
          seed={track.id}
          src={track.artwork}
          alt=""
          rounded="rounded-xl"
          className="h-14 w-14 flex-shrink-0 shadow-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-title-md text-title-md text-on-surface">{track.title}</p>
          <p className="truncate font-body-md text-body-md text-on-surface-variant">
            {track.artist} · {PROVIDER_LABELS[track.provider]}
          </p>
        </div>
      </div>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        {loading && (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
            aria-busy="true"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-surface-container-highest border-t-primary-container" />
            <p className="font-body-md text-body-md text-on-surface-variant">Looking for lyrics…</p>
          </div>
        )}

        {!loading && failed && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <Icon name="cloud_off" size="lg" className="text-primary" />
            <p className="font-title-md text-title-md text-on-surface">Lyrics are out of reach</p>
            <p className="max-w-xs font-body-md text-body-md text-on-surface-variant">
              Check your connection and open this screen again.
            </p>
          </div>
        )}

        {!loading && !failed && lyrics?.kind === 'instrumental' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <Icon name="graphic_eq" size="lg" className="text-primary" />
            <p className="font-title-md text-title-md text-on-surface">This one is instrumental</p>
            <p className="max-w-xs font-body-md text-body-md text-on-surface-variant">
              No words here — just let the music carry it.
            </p>
          </div>
        )}

        {!loading && !failed && lyrics?.kind === 'none' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <Icon name="music_off" size="lg" className="text-primary" />
            <p className="font-title-md text-title-md text-on-surface">No lyrics for this track</p>
            <p className="max-w-xs font-body-md text-body-md text-on-surface-variant">
              Lyrics come from LRCLIB when the community has shared them. Try another track.
            </p>
            <Link
              to="/search"
              className="mt-3 flex min-h-11 items-center rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface"
            >
              Search for another song
            </Link>
          </div>
        )}

        {!loading && !failed && lyrics?.kind === 'plain' && (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-6 pb-10"
            aria-label="Lyrics"
          >
            <p className="whitespace-pre-line text-center font-body-lg text-body-lg leading-8 text-on-surface">
              {lyrics.plain ?? lyrics.lines.map((line) => line.text).join('\n')}
            </p>
            <p className="mt-8 text-center font-caption text-caption text-on-surface-variant">
              Plain lyrics — no timestamps available
            </p>
          </div>
        )}

        {!loading && !failed && lyrics?.kind === 'synced' && (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-4 pb-[30vh] pt-[30vh] no-scrollbar"
            aria-label="Synced lyrics"
          >
            {lyrics.lines.map((line, index) => {
              const active = index === activeIndex
              return (
                <button
                  key={`${line.time}-${index}`}
                  ref={(node) => {
                    lineRefs.current[index] = node
                  }}
                  type="button"
                  onClick={() => seek(line.time)}
                  aria-label={`Jump to ${line.text} at ${Math.floor(line.time / 60)}:${String(
                    Math.floor(line.time % 60),
                  ).padStart(2, '0')}`}
                  aria-current={active ? 'true' : undefined}
                  className={
                    active
                      ? 'block w-full scroll-mt-24 rounded-xl px-3 py-2 text-center font-title-lg text-title-lg leading-snug text-primary transition-all duration-300'
                      : 'block w-full rounded-xl px-3 py-2 text-center font-title-md text-title-md leading-snug text-on-surface-variant/70 transition-all duration-300 hover:text-on-surface'
                  }
                >
                  {line.text}
                </button>
              )
            })}
            <p className="mt-6 text-center font-caption text-caption text-on-surface-variant">
              Synced with LRCLIB · tap a line to jump
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
