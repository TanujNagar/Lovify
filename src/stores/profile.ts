import { create } from 'zustand'
import {
  getStoredAvatar,
  prepareAvatarFile,
  removeStoredAvatar,
  saveStoredAvatar,
} from '@/lib/profile'

type ProfileState = {
  avatar: string | null
  loaded: boolean
  loading: boolean
  saving: boolean
  error: string | null
  load: () => Promise<void>
  upload: (file: File) => Promise<boolean>
  remove: () => Promise<void>
  clearError: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  avatar: null,
  loaded: false,
  loading: false,
  saving: false,
  error: null,

  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const avatar = await getStoredAvatar()
      set({ avatar, loaded: true, loading: false, error: null })
    } catch {
      set({
        loaded: true,
        loading: false,
        error: 'Your profile photo could not be opened from this browser.',
      })
    }
  },

  upload: async (file) => {
    set({ saving: true, error: null })
    try {
      const avatar = await prepareAvatarFile(file)
      await saveStoredAvatar(avatar)
      set({ avatar, saving: false, loaded: true })
      return true
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'That photo could not be saved.',
      })
      return false
    }
  },

  remove: async () => {
    set({ saving: true, error: null })
    try {
      await removeStoredAvatar()
      set({ avatar: null, saving: false })
    } catch {
      set({
        saving: false,
        error: 'The photo could not be removed. Check that storage is available.',
      })
    }
  },

  clearError: () => set({ error: null }),
}))
