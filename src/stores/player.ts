import { create } from 'zustand'
import { recommendedTracks, tracks } from '@/data/mock'
import type { PlayerContext, Track } from '@/types/music'

type PlayerState = {
  currentTrack: Track | null
  queue: Track[]
  index: number
  isPlaying: boolean
  progress: number
  volume: number
  shuffle: boolean
  repeat: boolean
  context: PlayerContext
  play: (track: Track, queue?: Track[], context?: PlayerContext) => void
  playQueue: (queue: Track[], startIndex?: number, context?: PlayerContext) => void
  toggle: () => void
  pause: () => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
}

const initialQueue = recommendedTracks
const initialTrack = tracks[0]

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: initialTrack,
  queue: initialQueue,
  index: 0,
  isPlaying: false,
  progress: 96,
  volume: 0.72,
  shuffle: false,
  repeat: false,
  context: { type: 'track', label: 'Tracks you might love' },

  play: (track, queue, context) => {
    const nextQueue = queue?.length ? queue : [track]
    const existingIndex = nextQueue.findIndex((item) => item.id === track.id)
    const index = existingIndex >= 0 ? existingIndex : 0
    const usableQueue = existingIndex >= 0 ? nextQueue : [track, ...nextQueue]

    set({
      currentTrack: track,
      queue: usableQueue,
      index,
      isPlaying: true,
      progress: 0,
      context: context ?? { type: 'track', label: 'Now playing' },
    })
  },

  playQueue: (queue, startIndex = 0, context) => {
    if (!queue.length) return
    const safeIndex = Math.min(Math.max(startIndex, 0), queue.length - 1)
    set({
      currentTrack: queue[safeIndex],
      queue,
      index: safeIndex,
      isPlaying: true,
      progress: 0,
      context: context ?? { type: 'track', label: 'Now playing' },
    })
  },

  toggle: () => {
    if (!get().currentTrack) return
    set((state) => ({ isPlaying: !state.isPlaying }))
  },

  pause: () => set({ isPlaying: false }),

  next: () => {
    const { queue, index } = get()
    if (!queue.length) return
    const nextIndex = index + 1 >= queue.length ? 0 : index + 1
    set({
      currentTrack: queue[nextIndex],
      index: nextIndex,
      progress: 0,
      isPlaying: true,
    })
  },

  previous: () => {
    const { queue, index, progress } = get()
    if (!queue.length) return
    if (progress > 5) {
      set({ progress: 0 })
      return
    }
    const previousIndex = index - 1 < 0 ? queue.length - 1 : index - 1
    set({
      currentTrack: queue[previousIndex],
      index: previousIndex,
      progress: 0,
      isPlaying: true,
    })
  },

  seek: (seconds) => {
    const duration = get().currentTrack?.duration ?? 0
    set({ progress: Math.min(Math.max(seconds, 0), duration) })
  },

  setVolume: (volume) => set({ volume: Math.min(Math.max(volume, 0), 1) }),

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  toggleRepeat: () => set((state) => ({ repeat: !state.repeat })),
}))
