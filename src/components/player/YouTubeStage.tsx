import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { loadYouTubeApi, type YouTubePlayerLike } from '@/lib/youtube-player'

type YouTubeStageProps = {
  videoId: string
  isPlaying: boolean
  volume: number
  muted: boolean
  seekVersion: number
  seekTo: number | null
  onPlaying: () => void
  onPaused: () => void
  onEnded: () => void
  onError: (message: string) => void
  onProgress: (seconds: number) => void
  onDuration: (seconds: number) => void
}

/**
 * The official YouTube iframe, docked visibly above the mini player.
 * It intentionally has a fixed visible size so playback is never hidden.
 */
export function YouTubeStage({
  videoId,
  isPlaying,
  volume,
  muted,
  seekVersion,
  seekTo,
  onPlaying,
  onPaused,
  onEnded,
  onError,
  onProgress,
  onDuration,
}: YouTubeStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayerLike | null>(null)
  const videoRef = useRef(videoId)
  const loadedVideoRef = useRef(videoId)
  const playingRef = useRef(isPlaying)
  const callbacksRef = useRef({
    onPlaying,
    onPaused,
    onEnded,
    onError,
    onProgress,
    onDuration,
  })
  const [ready, setReady] = useState(false)

  videoRef.current = videoId
  playingRef.current = isPlaying
  callbacksRef.current = { onPlaying, onPaused, onEnded, onError, onProgress, onDuration }

  useEffect(() => {
    let cancelled = false

    void loadYouTubeApi()
      .then(() => {
        if (cancelled || !containerRef.current || !window.YT?.Player) return
        const player = new window.YT.Player(containerRef.current, {
          videoId: videoRef.current,
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return
              player.setVolume(Math.round(volume * 100))
              if (muted) player.mute()
              setReady(true)
              if (playingRef.current) player.playVideo()
            },
            onStateChange: (event) => {
              if (event.data === 1) callbacksRef.current.onPlaying()
              if (event.data === 0) callbacksRef.current.onEnded()
              if (event.data === 2) callbacksRef.current.onPaused()
            },
            onError: () => {
              callbacksRef.current.onError(
                'This YouTube video cannot play here. Try another result.',
              )
            },
          },
        })
        playerRef.current = player
      })
      .catch(() => {
        if (!cancelled) {
          callbacksRef.current.onError(
            'The YouTube player could not start. Check your connection and try again.',
          )
        }
      })

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      setReady(false)
    }
    // The player is created once; prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || !playerRef.current) return
    if (isPlaying) playerRef.current.playVideo()
    else playerRef.current.pauseVideo()
  }, [isPlaying, ready])

  useEffect(() => {
    if (!ready || !playerRef.current) return
    playerRef.current.setVolume(Math.round(volume * 100))
    if (muted) playerRef.current.mute()
    else playerRef.current.unMute()
  }, [volume, muted, ready])

  useEffect(() => {
    if (!ready || !playerRef.current || seekTo === null) return
    playerRef.current.seekTo(seekTo, true)
  }, [seekVersion, seekTo, ready])

  useEffect(() => {
    if (!ready || !playerRef.current) return
    if (loadedVideoRef.current === videoId) return
    loadedVideoRef.current = videoId
    playerRef.current.loadVideoById(videoId)
    if (playingRef.current) playerRef.current.playVideo()
  }, [videoId, ready])

  useEffect(() => {
    if (!ready || !isPlaying) return
    const timer = window.setInterval(() => {
      const player = playerRef.current
      if (!player) return
      callbacksRef.current.onProgress(player.getCurrentTime())
      callbacksRef.current.onDuration(player.getDuration())
    }, 500)
    return () => window.clearInterval(timer)
  }, [isPlaying, ready])

  return (
    <section
      aria-label="YouTube video player"
      className="pointer-events-auto fixed bottom-[9.25rem] right-3 z-[60] w-[200px] overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-[0_16px_48px_rgba(0,0,0,0.55)] lg:bottom-28 lg:left-auto"
    >
      <div className="flex items-center justify-between gap-2 bg-surface-container px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 font-caption text-caption font-semibold uppercase tracking-wider text-primary">
          <Icon name="smart_display" size="sm" />
          YouTube
        </span>
        <span className="font-caption text-caption text-on-surface-variant">Visible player</span>
      </div>
      <div ref={containerRef} className="h-[200px] w-[200px] bg-black" />
    </section>
  )
}
