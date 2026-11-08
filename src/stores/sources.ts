import { create } from 'zustand'
import { blockYouTubeForToday, getYouTubeUsage, type YouTubeUsage } from '@/lib/cache'
import { getSourceSnapshot } from '@/lib/providers'
import { resetYouTubeProbe, type YouTubeSourceStatus } from '@/lib/providers/youtube'
import { invalidateJamendoClientId } from '@/lib/providers/jamendo'

type SourcesState = {
  youtube: YouTubeSourceStatus
  jamendo: boolean
  usage: YouTubeUsage
  loading: boolean
  loaded: boolean
  refresh: () => Promise<void>
  refreshUsage: () => Promise<void>
  markYouTubeQuota: () => Promise<void>
  refreshAfterKeyChange: () => Promise<void>
  refreshAfterJamendoChange: () => Promise<void>
}

const initialUsage: YouTubeUsage = {
  units: 0,
  limit: 10_000,
  percent: 0,
  warning: false,
  blocked: false,
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  youtube: { available: false, mode: 'none', blocked: false },
  jamendo: false,
  usage: initialUsage,
  loading: false,
  loaded: false,

  refresh: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const snapshot = await getSourceSnapshot()
      set({
        youtube: snapshot.youtube,
        jamendo: snapshot.jamendo,
        usage: snapshot.usage,
        loading: false,
        loaded: true,
      })
    } catch {
      set({ loading: false, loaded: true })
    }
  },

  refreshUsage: async () => {
    set({ usage: await getYouTubeUsage() })
  },

  markYouTubeQuota: async () => {
    await blockYouTubeForToday()
    resetYouTubeProbe()
    await get().refresh()
  },

  refreshAfterKeyChange: async () => {
    resetYouTubeProbe()
    await get().refresh()
  },

  refreshAfterJamendoChange: async () => {
    invalidateJamendoClientId()
    await get().refresh()
  },
}))
