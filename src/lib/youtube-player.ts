/**
 * Minimal wrapper around the official YouTube IFrame Player API.
 * Audio is never extracted: the real iframe stays mounted and visible while a
 * YouTube track is selected, as the platform requires.
 */

export type YouTubePlayerState = -1 | 0 | 1 | 2 | 3 | 5

export type YouTubePlayerLike = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  mute: () => void
  unMute: () => void
  loadVideoById: (videoId: string) => void
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

type YouTubePlayerOptions = {
  videoId: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: () => void
    onStateChange?: (event: { data: YouTubePlayerState }) => void
    onError?: (event: { data: number }) => void
  }
}

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerLike
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null
const API_SRC = 'https://www.youtube.com/iframe_api'

export function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube is only available in the browser.'))
  }
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${API_SRC}"]`)
    if (existing) {
      existing.addEventListener('error', () => reject(new Error('YouTube player failed to load.')))
      return
    }

    const script = document.createElement('script')
    script.src = API_SRC
    script.async = true
    script.addEventListener('error', () => reject(new Error('YouTube player failed to load.')))
    document.head.appendChild(script)
  })

  apiPromise.catch(() => {
    apiPromise = null
  })

  return apiPromise
}
