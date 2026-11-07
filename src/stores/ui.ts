import { create } from 'zustand'

type UiState = {
  createPlaylistOpen: boolean
  toast: string | null
  openCreatePlaylist: () => void
  closeCreatePlaylist: () => void
  showToast: (message: string) => void
  dismissToast: () => void
}

let toastTimer: number | undefined

export const useUiStore = create<UiState>((set) => ({
  createPlaylistOpen: false,
  toast: null,
  openCreatePlaylist: () => set({ createPlaylistOpen: true }),
  closeCreatePlaylist: () => set({ createPlaylistOpen: false }),
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
