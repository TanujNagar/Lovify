import { useEffect, useRef, useState } from 'react'
import { YouTubeStage } from '@/components/player/YouTubeStage'
import { getDownloadedAudioUrl } from '@/lib/downloads'
import {
  bindMediaSession,
  updateMediaMetadata,
  updateMediaPlaybackState,
  updateMediaPosition,
} from '@/lib/media-session'
import { getPlaybackSource } from '@/lib/providers'
import { ProviderError } from '@/lib/providers/types'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import type { PlaybackSource } from '@/types/music'

const MEDIA_ERROR = 'This track could not be played. Try another result.'

/**
 * Global playback host. It keeps the HTML audio element and the YouTube iframe
 * alive across route changes and mirrors the player store to the browser.
 */
export function PlaybackHost() {
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const status = usePlayerStore((state) => state.status)
  const progress = usePlayerStore((state) => state.progress)
  const duration = usePlayerStore((state) => state.duration)
  const volume = usePlayerStore((state) => state.volume)
  const muted = usePlayerStore((state) => state.muted)
  const seekTo = usePlayerStore((state) => state.seekTo)
  const seekVersion = usePlayerStore((state) => state.seekVersion)
  const showToast = useUiStore((state) => state.showToast)

  const audioRef = useRef<HTMLAudioElement>(null)
  const [source, setSource] = useState<PlaybackSource | null>(null)
  const recordedRef = useRef<string | null>(null)
  const errorTrackRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    if (!currentTrack) {
      setSource(null)
      return
    }

    setSource(null)

    const resolve = async () => {
      // An offline copy wins over the network: it is instant and keeps working
      // while the browser is disconnected.
      const offline = await getDownloadedAudioUrl(currentTrack.id).catch(() => null)
      if (cancelled) {
        if (offline) URL.revokeObjectURL(offline)
        return
      }
      if (offline) {
        objectUrl = offline
        setSource({ kind: 'audio', url: offline })
        return
      }

      const next = await getPlaybackSource(currentTrack)
      if (!cancelled) setSource(next)
    }

    void resolve().catch((error: unknown) => {
      if (cancelled) return
      const message =
        error instanceof ProviderError
          ? error.message
          : 'This track is not available right now.'
      usePlayerStore.getState().setError(message)
      showToast(message)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [currentTrack, showToast])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!source || source.kind !== 'audio') {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      return
    }

    if (audio.getAttribute('src') !== source.url) {
      audio.src = source.url
      audio.load()
    }

    if (isPlaying) {
      void audio.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          usePlayerStore.getState().pause()
        }
      })
    } else {
      audio.pause()
    }
  }, [source, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = Math.min(1, Math.max(0, volume))
    audio.muted = muted
  }, [volume, muted])

  useEffect(() => {
    if (seekTo === null || source?.kind !== 'audio') return
    const audio = audioRef.current
    if (!audio) return
    try {
      audio.currentTime = seekTo
    } catch {
      // The media may not have metadata yet; the next seek will work.
    }
  }, [seekVersion, seekTo, source])

  // History is written once per track, when real playback begins.
  useEffect(() => {
    if (!currentTrack || status !== 'playing') return
    if (recordedRef.current === currentTrack.id) return
    recordedRef.current = currentTrack.id
    void useLibraryStore.getState().recordPlayed(currentTrack)
  }, [currentTrack, status])

  useEffect(() => {
    updateMediaMetadata(currentTrack)
    updateMediaPlaybackState(isPlaying)
  }, [currentTrack, isPlaying])

  useEffect(() => {
    updateMediaPosition(progress, duration)
  }, [progress, duration])

  useEffect(() => {
    const cleanup = bindMediaSession({
      play: () => {
        const player = usePlayerStore.getState()
        if (!player.isPlaying) player.toggle()
      },
      pause: () => usePlayerStore.getState().pause(),
      next: () => usePlayerStore.getState().next(),
      previous: () => usePlayerStore.getState().previous(),
      seek: (seconds) => usePlayerStore.getState().seek(seconds),
      seekBy: (delta) =>
        usePlayerStore.getState().seek(usePlayerStore.getState().progress + delta),
    })
    return cleanup
  }, [])

  const failMedia = () => {
    if (!currentTrack) return
    if (errorTrackRef.current === currentTrack.id) return
    errorTrackRef.current = currentTrack.id
    usePlayerStore.getState().setError(MEDIA_ERROR)
    showToast(MEDIA_ERROR)
  }

  return (
    <>
      {/* Captions do not apply to a music player; the YouTube stage handles video. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
        onPlaying={() => usePlayerStore.getState().setStatus('playing')}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget
          if (Number.isFinite(audio.currentTime)) {
            usePlayerStore.getState().setProgress(audio.currentTime)
          }
        }}
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget
          if (Number.isFinite(audio.duration)) {
            usePlayerStore.getState().setDuration(audio.duration)
          }
        }}
        onEnded={() => usePlayerStore.getState().next(true)}
        onError={failMedia}
      />

      {source?.kind === 'youtube' && currentTrack && (
        <YouTubeStage
          videoId={source.videoId}
          isPlaying={isPlaying}
          volume={volume}
          muted={muted}
          seekVersion={seekVersion}
          seekTo={seekTo}
          onPlaying={() => usePlayerStore.getState().setStatus('playing')}
          onPaused={() => {
            const player = usePlayerStore.getState()
            if (player.isPlaying) player.pause()
          }}
          onEnded={() => usePlayerStore.getState().next(true)}
          onError={(message) => {
            usePlayerStore.getState().setError(message)
            showToast(message)
          }}
          onProgress={(seconds) => usePlayerStore.getState().setProgress(seconds)}
          onDuration={(seconds) => usePlayerStore.getState().setDuration(seconds)}
        />
      )}
    </>
  )
}
