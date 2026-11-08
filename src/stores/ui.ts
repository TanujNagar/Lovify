import { create } from 'zustand'
import type { Track } from '@/types/music'

type UiState = {
  createPlaylistOpen: boolean
  seedTrack: Track | null
  trackMenuTrack: Track | null
  trackMenuPlaylistId: string | null
  toast: string | null
  openCreatePlaylist: (track?: Track | null) => void
  closeCreatePlaylist: () => void
  openTrackMenu: (track: Track, playlistId?: string | null) => void
  closeTrackMenu: () => void
  showToast: (message: string) => void
  dismissToast: () => void
}

let toastTimer: number | undefined

export const useUiStore = create<UiState>((set) => ({
  createPlaylistOpen: false,
  seedTrack: null,
  trackMenuTrack: null,
  trackMenuPlaylistId: null,
  toast: null,

  openCreatePlaylist: (track) => set({ createPlaylistOpen: true, seedTrack: track ?? null }),
  closeCreatePlaylist: () => set({ createPlaylistOpen: false, seedTrack: null }),
  openTrackMenu: (track, playlistId) =>
    set({ trackMenuTrack: track, trackMenuPlaylistId: playlistId ?? null }),
  closeTrackMenu: () => set({ trackMenuTrack: null, trackMenuPlaylistId: null }),

  showToast: (message) => {
    if (toastTimer) window.clearTimeout(toastTimer)
    set({ toast: message })
    toastTimer = window.setTimeout(() => set({ toast: null }), 3600)
  },
  dismissToast: () => {
    if (toastTimer) window.clearTimeout(toastTimer)
    set({ toast: null })
  },
}))
