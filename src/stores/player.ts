import { create } from 'zustand'
import type {
  PlaybackStatus,
  PlayerContext,
  RepeatMode,
  Track,
} from '@/types/music'

type PlayerState = {
  currentTrack: Track | null
  queue: Track[]
  index: number
  isPlaying: boolean
  status: PlaybackStatus
  progress: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  context: PlayerContext
  seekVersion: number
  seekTo: number | null
  error: string | null
  play: (track: Track, queue?: Track[], context?: PlayerContext) => void
  playQueue: (queue: Track[], startIndex?: number, context?: PlayerContext) => void
  toggle: () => void
  pause: () => void
  next: (auto?: boolean) => void
  previous: () => void
  seek: (seconds: number) => void
  setProgress: (seconds: number) => void
  setDuration: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  moveInQueue: (from: number, to: number) => void
  clearQueue: () => void
  jumpTo: (index: number) => void
  setStatus: (status: PlaybackStatus) => void
  setError: (message: string) => void
  clearError: () => void
  hydrate: (saved: PlayerHydration) => void
  reset: () => void
}

export type PlayerHydration = {
  currentTrack: Track | null
  queue: Track[]
  index: number
  progress: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  context: PlayerContext
}

const defaultContext: PlayerContext = { type: 'track', label: 'Now playing' }

const initialState = {
  currentTrack: null as Track | null,
  queue: [] as Track[],
  index: 0,
  isPlaying: false,
  status: 'idle' as PlaybackStatus,
  progress: 0,
  duration: 0,
  volume: 0.72,
  muted: false,
  shuffle: false,
  repeat: 'off' as RepeatMode,
  context: defaultContext,
  seekVersion: 0,
  seekTo: null as number | null,
  error: null as string | null,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function begin(
  track: Track,
  queue: Track[],
  index: number,
  context: PlayerContext,
  seekVersion: number,
) {
  return {
    currentTrack: track,
    queue,
    index,
    isPlaying: true,
    status: 'loading' as PlaybackStatus,
    progress: 0,
    duration: track.duration,
    context,
    seekTo: 0,
    seekVersion: seekVersion + 1,
    error: null,
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  ...initialState,

  play: (track, queue, context) => {
    const provided = queue?.filter(Boolean) ?? []
    const existingIndex = provided.findIndex((item) => item.id === track.id)
    const nextQueue = provided.length
      ? existingIndex >= 0
        ? provided
        : [track, ...provided]
      : [track]
    const index = existingIndex >= 0 ? existingIndex : 0

    set((state) =>
      begin(
        track,
        nextQueue,
        index,
        context ?? { type: 'track', label: 'Now playing' },
        state.seekVersion,
      ),
    )
  },

  playQueue: (queue, startIndex = 0, context) => {
    const usable = queue.filter(Boolean)
    if (!usable.length) return
    const index = clamp(Math.round(startIndex), 0, usable.length - 1)
    const track = usable[index]
    set((state) =>
      begin(
        track,
        usable,
        index,
        context ?? { type: 'track', label: 'Now playing' },
        state.seekVersion,
      ),
    )
  },

  toggle: () => {
    const { currentTrack, isPlaying, status } = get()
    if (!currentTrack) return
    if (isPlaying) {
      set({ isPlaying: false, status: 'paused' })
      return
    }
    set({ isPlaying: true, status: status === 'error' ? 'loading' : 'playing', error: null })
  },

  pause: () => set({ isPlaying: false, status: 'paused' }),

  next: (auto = false) => {
    const state = get()
    const { queue, index, repeat, shuffle } = state
    if (!queue.length) return

    if (repeat === 'one' && auto) {
      state.seek(0)
      set({ isPlaying: true, status: 'loading', error: null })
      return
    }

    let nextIndex: number | null = null
    if (shuffle && queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * queue.length)
      } while (nextIndex === index)
    } else if (index + 1 < queue.length) {
      nextIndex = index + 1
    } else if (repeat === 'all' || !auto) {
      nextIndex = 0
    }

    if (nextIndex === null) {
      set({ isPlaying: false, status: 'paused', progress: state.duration })
      return
    }

    const track = queue[nextIndex]
    set((current) =>
      begin(
        track,
        queue,
        nextIndex!,
        current.context,
        current.seekVersion,
      ),
    )
  },

  previous: () => {
    const { queue, index, progress, shuffle } = get()
    if (!queue.length) return

    if (progress > 5) {
      get().seek(0)
      return
    }

    let previousIndex = 0
    if (shuffle && queue.length > 1) {
      do {
        previousIndex = Math.floor(Math.random() * queue.length)
      } while (previousIndex === index)
    } else {
      previousIndex = index - 1 < 0 ? queue.length - 1 : index - 1
    }

    const track = queue[previousIndex]
    set((state) => begin(track, queue, previousIndex, state.context, state.seekVersion))
  },

  seek: (seconds) => {
    const { duration, currentTrack } = get()
    const max = duration || currentTrack?.duration || 0
    const value = clamp(seconds, 0, max)
    set((state) => ({
      progress: value,
      seekTo: value,
      seekVersion: state.seekVersion + 1,
    }))
  },

  setProgress: (seconds) => {
    const { duration, currentTrack } = get()
    const max = duration || currentTrack?.duration || 0
    set({ progress: clamp(seconds, 0, max) })
  },

  setDuration: (seconds) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    set({ duration: Math.round(seconds) })
  },

  setVolume: (volume) => set({ volume: clamp(volume, 0, 1), muted: false }),

  toggleMute: () => set((state) => ({ muted: !state.muted })),

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),

  cycleRepeat: () =>
    set((state) => ({
      repeat: state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off',
    })),

  addToQueue: (track) => {
    const state = get()
    if (!state.currentTrack) {
      state.play(track)
      return
    }
    set((current) => ({ queue: [...current.queue, track] }))
  },

  playNext: (track) => {
    const state = get()
    if (!state.currentTrack) {
      state.play(track)
      return
    }
    set((current) => {
      const queue = [...current.queue]
      queue.splice(current.index + 1, 0, track)
      return { queue }
    })
  },

  removeFromQueue: (targetIndex) => {
    set((state) => {
      if (targetIndex < 0 || targetIndex >= state.queue.length) return state
      const queue = [...state.queue]
      queue.splice(targetIndex, 1)

      if (!queue.length) {
        return {
          ...state,
          currentTrack: null,
          queue: [],
          index: 0,
          isPlaying: false,
          status: 'idle',
          progress: 0,
          duration: 0,
          seekTo: null,
        }
      }

      if (targetIndex === state.index) {
        const index = Math.min(targetIndex, queue.length - 1)
        const track = queue[index]
        return {
          ...state,
          queue,
          index,
          currentTrack: track,
          progress: 0,
          duration: track.duration,
          seekTo: 0,
          seekVersion: state.seekVersion + 1,
          status: state.isPlaying ? 'loading' : state.status,
        }
      }

      return {
        ...state,
        queue,
        index: targetIndex < state.index ? state.index - 1 : state.index,
      }
    })
  },

  moveInQueue: (from, to) => {
    set((state) => {
      if (
        from < 0 ||
        from >= state.queue.length ||
        to < 0 ||
        to >= state.queue.length ||
        from === to
      ) {
        return state
      }
      const queue = [...state.queue]
      const [moved] = queue.splice(from, 1)
      queue.splice(to, 0, moved)
      const currentId = state.currentTrack?.id
      const index = currentId ? queue.findIndex((track) => track.id === currentId) : state.index
      return {
        ...state,
        queue,
        index: index >= 0 ? index : state.index,
        currentTrack: index >= 0 ? queue[index] : state.currentTrack,
      }
    })
  },

  clearQueue: () => {
    const state = get()
    if (!state.currentTrack) {
      set({ ...initialState })
      return
    }
    set({ queue: [state.currentTrack], index: 0 })
  },

  jumpTo: (targetIndex) => {
    const state = get()
    if (targetIndex < 0 || targetIndex >= state.queue.length) return
    const track = state.queue[targetIndex]
    set((current) => begin(track, current.queue, targetIndex, current.context, current.seekVersion))
  },

  setStatus: (status) =>
    set((state) => ({
      status,
      isPlaying:
        status === 'playing' ? true : status === 'paused' || status === 'error' ? false : state.isPlaying,
      error: status === 'error' ? state.error : status === 'playing' ? null : state.error,
    })),

  setError: (message) => set({ status: 'error', isPlaying: false, error: message }),

  clearError: () => set({ error: null }),

  hydrate: (saved) => {
    if (!saved.currentTrack) return
    const queue = saved.queue.length ? saved.queue : [saved.currentTrack]
    const index = clamp(
      queue.findIndex((track) => track.id === saved.currentTrack?.id),
      0,
      queue.length - 1,
    )
    set({
      currentTrack: queue[index] ?? saved.currentTrack,
      queue,
      index: index >= 0 ? index : 0,
      isPlaying: false,
      status: 'paused',
      progress: clamp(saved.progress, 0, saved.duration || saved.currentTrack.duration),
      duration: saved.duration || saved.currentTrack.duration,
      volume: clamp(saved.volume, 0, 1),
      muted: Boolean(saved.muted),
      shuffle: Boolean(saved.shuffle),
      repeat: saved.repeat,
      context: saved.context ?? defaultContext,
      seekTo: null,
      error: null,
    })
  },

  reset: () => set({ ...initialState }),
}))

export type PlayerSnapshot = PlayerHydration

export function playerSnapshot(state: PlayerState): PlayerHydration {
  return {
    currentTrack: state.currentTrack,
    queue: state.queue,
    index: state.index,
    progress: state.progress,
    duration: state.duration,
    volume: state.volume,
    muted: state.muted,
    shuffle: state.shuffle,
    repeat: state.repeat,
    context: state.context,
  }
}
