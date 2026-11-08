import { create } from 'zustand'
import type { DownloadRow } from '@/lib/db'
import {
  downloadTrackAudio,
  getDownloadStorage,
  getDownloadedTracks,
  removeDownloadedTrack,
  type DownloadStorage,
} from '@/lib/downloads'
import type { Track } from '@/types/music'

const emptyStorage: DownloadStorage = {
  downloads: 0,
  bytes: 0,
  quota: 0,
  usage: 0,
  persisted: false,
}

type DownloadsState = {
  rows: DownloadRow[]
  tracks: Track[]
  storage: DownloadStorage
  loaded: boolean
  loading: boolean
  busy: string[]
  error: string | null
  load: () => Promise<void>
  refresh: () => Promise<void>
  download: (track: Track) => Promise<void>
  remove: (trackId: string) => Promise<void>
  isDownloaded: (trackId: string) => boolean
  isBusy: (trackId: string) => boolean
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  rows: [],
  tracks: [],
  storage: emptyStorage,
  loaded: false,
  loading: false,
  busy: [],
  error: null,

  load: async () => {
    if (get().loaded || get().loading) return
    await get().refresh()
    set({ loaded: true })
  },

  refresh: async () => {
    set({ loading: true })
    try {
      const { db } = await import('@/lib/db')
      const [rows, tracks, storage] = await Promise.all([
        db.downloads.toArray(),
        getDownloadedTracks(),
        getDownloadStorage(),
      ])
      set({ rows, tracks, storage, loading: false, error: null })
    } catch {
      set({
        loading: false,
        error: 'Offline downloads are unavailable. Private browsing may block storage.',
      })
    }
  },

  download: async (track) => {
    if (get().busy.includes(track.id)) return
    set((state) => ({ busy: [...state.busy, track.id], error: null }))
    try {
      await downloadTrackAudio(track)
      await get().refresh()
    } catch (error) {
      set({
        error:
          error instanceof Error && error.message
            ? `${track.title} could not be saved offline. ${error.message}`
            : `${track.title} could not be saved offline. Try again.`,
      })
      await get().refresh()
    } finally {
      set((state) => ({ busy: state.busy.filter((id) => id !== track.id) }))
    }
  },

  remove: async (trackId) => {
    if (get().busy.includes(trackId)) return
    set((state) => ({ busy: [...state.busy, trackId], error: null }))
    try {
      await removeDownloadedTrack(trackId)
      await get().refresh()
    } finally {
      set((state) => ({ busy: state.busy.filter((id) => id !== trackId) }))
    }
  },

  isDownloaded: (trackId) => get().tracks.some((track) => track.id === trackId),

  isBusy: (trackId) => get().busy.includes(trackId),
}))
