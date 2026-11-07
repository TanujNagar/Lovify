import { create } from 'zustand'
import type { Playlist } from '@/types/music'

// Dexie is only needed once the local library is hydrated. Loading it on demand
// keeps IndexedDB out of the critical path for the first paint.
const loadDb = () => import('@/lib/db')

type LibraryState = {
  playlists: Playlist[]
  likedIds: string[]
  loaded: boolean
  loading: boolean
  error: string | null
  load: () => Promise<void>
  refresh: () => Promise<void>
  createPlaylist: (name: string, description: string) => Promise<Playlist>
  toggleLike: (trackId: string) => Promise<boolean>
  isLiked: (trackId: string) => boolean
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  playlists: [],
  likedIds: [],
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true, error: null })
    try {
      const db = await loadDb()
      await db.seedDatabase()
      const [playlists, likedIds] = await Promise.all([
        db.getPlaylists(),
        db.getLikedTrackIds(),
      ])
      set({ playlists, likedIds, loaded: true, loading: false })
    } catch {
      set({
        loading: false,
        error: 'Your local library could not be opened. Private browsing may block storage.',
      })
    }
  },

  refresh: async () => {
    const db = await loadDb()
    const [playlists, likedIds] = await Promise.all([
      db.getPlaylists(),
      db.getLikedTrackIds(),
    ])
    set({ playlists, likedIds, loaded: true })
  },

  createPlaylist: async (name, description) => {
    const db = await loadDb()
    const playlist = await db.createPlaylist(name, description)
    await get().refresh()
    return playlist
  },

  toggleLike: async (trackId) => {
    const db = await loadDb()
    const liked = await db.toggleLike(trackId)
    await get().refresh()
    return liked
  },

  isLiked: (trackId) => get().likedIds.includes(trackId),
}))
