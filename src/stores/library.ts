import { create } from 'zustand'
import type { HistoryEntry, Playlist, Track } from '@/types/music'

// Dexie is only needed once the local library is hydrated. Loading it on demand
// keeps IndexedDB out of the critical path for the first paint.
const loadDb = () => import('@/lib/db')

type LibraryState = {
  playlists: Playlist[]
  likedIds: string[]
  history: HistoryEntry[]
  loaded: boolean
  loading: boolean
  error: string | null
  load: () => Promise<void>
  refresh: () => Promise<void>
  createPlaylist: (name: string, description: string, trackIds?: string[]) => Promise<Playlist>
  toggleLike: (trackId: string) => Promise<boolean>
  isLiked: (trackId: string) => boolean
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  movePlaylistTrack: (playlistId: string, from: number, to: number) => Promise<void>
  renamePlaylist: (playlistId: string, name: string, description?: string) => Promise<void>
  deletePlaylist: (playlistId: string) => Promise<void>
  recordPlayed: (track: Track) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  playlists: [],
  likedIds: [],
  history: [],
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true, error: null })
    try {
      const db = await loadDb()
      await db.seedDatabase()
      const [playlists, likedIds, history] = await Promise.all([
        db.getPlaylists(),
        db.getLikedTrackIds(),
        db.getHistory(60),
      ])
      set({ playlists, likedIds, history, loaded: true, loading: false })
    } catch {
      set({
        loading: false,
        error: 'Your local library could not be opened. Private browsing may block storage.',
      })
    }
  },

  refresh: async () => {
    const db = await loadDb()
    const [playlists, likedIds, history] = await Promise.all([
      db.getPlaylists(),
      db.getLikedTrackIds(),
      db.getHistory(60),
    ])
    set({ playlists, likedIds, history, loaded: true })
  },

  createPlaylist: async (name, description, trackIds = []) => {
    const db = await loadDb()
    const playlist = await db.createPlaylist(name, description, trackIds)
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

  addTrackToPlaylist: async (playlistId, trackId) => {
    const db = await loadDb()
    await db.addTracksToPlaylist(playlistId, [trackId])
    await get().refresh()
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    const db = await loadDb()
    await db.removeTrackFromPlaylist(playlistId, trackId)
    await get().refresh()
  },

  movePlaylistTrack: async (playlistId, from, to) => {
    const db = await loadDb()
    await db.movePlaylistTrack(playlistId, from, to)
    await get().refresh()
  },

  renamePlaylist: async (playlistId, name, description) => {
    const db = await loadDb()
    await db.renamePlaylist(playlistId, name, description)
    await get().refresh()
  },

  deletePlaylist: async (playlistId) => {
    const db = await loadDb()
    await db.deletePlaylist(playlistId)
    await get().refresh()
  },

  recordPlayed: async (track) => {
    const db = await loadDb()
    await db.recordPlay(track)
    set((state) => ({
      history: [
        { track, playedAt: Date.now() },
        ...state.history.filter((entry) => entry.track.id !== track.id),
      ].slice(0, 60),
    }))
  },

  clearHistory: async () => {
    const db = await loadDb()
    await db.clearHistory()
    set({ history: [] })
  },
}))
