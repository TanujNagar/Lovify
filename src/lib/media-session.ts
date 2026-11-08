import type { Track } from '@/types/music'

type MediaActions = {
  play: () => void
  pause: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  seekBy: (delta: number) => void
}

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export function bindMediaSession(actions: MediaActions): () => void {
  if (!supported()) return () => {}

  const session = navigator.mediaSession
  const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
    ['play', () => actions.play()],
    ['pause', () => actions.pause()],
    ['previoustrack', () => actions.previous()],
    ['nexttrack', () => actions.next()],
    ['seekbackward', (details) => actions.seekBy(-(details.seekOffset ?? 10))],
    ['seekforward', (details) => actions.seekBy(details.seekOffset ?? 10)],
    [
      'seekto',
      (details) => {
        if (typeof details.seekTime === 'number') actions.seek(details.seekTime)
      },
    ],
    ['stop', () => actions.pause()],
  ]

  for (const [action, handler] of handlers) {
    try {
      session.setActionHandler(action, handler)
    } catch {
      // Older browsers do not implement every action.
    }
  }

  return () => {
    for (const [action] of handlers) {
      try {
        session.setActionHandler(action, null)
      } catch {
        // Ignore unsupported actions.
      }
    }
  }
}

export function updateMediaMetadata(track: Track | null): void {
  if (!supported() || typeof MediaMetadata === 'undefined') return
  if (!track) {
    navigator.mediaSession.metadata = null
    return
  }

  const artwork = track.artwork
    ? [{ src: track.artwork, sizes: '480x480', type: 'image/jpeg' }]
    : [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ]

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork,
  })
}

export function updateMediaPlaybackState(isPlaying: boolean): void {
  if (!supported()) return
  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
}

export function updateMediaPosition(progress: number, duration: number): void {
  if (!supported() || typeof navigator.mediaSession.setPositionState !== 'function') return
  if (!Number.isFinite(duration) || duration <= 0) return
  const position = Math.min(Math.max(0, progress), duration)
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position,
      playbackRate: 1,
    })
  } catch {
    // Ignore invalid position state on older implementations.
  }
}
