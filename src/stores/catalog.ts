import { create } from 'zustand'
import { getFeaturedAlbums, getTrendingTracks } from '@/lib/providers'
import type { Album, Track } from '@/types/music'

type CatalogState = {
  trending: Track[]
  albums: Album[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: (force?: boolean) => Promise<void>
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  trending: [],
  albums: [],
  loading: false,
  loaded: false,
  error: null,

  load: async (force = false) => {
    if (get().loading || (get().loaded && !force)) return
    set({ loading: true, error: null })

    const [trending, albums] = await Promise.allSettled([
      getTrendingTracks(30),
      getFeaturedAlbums(12),
    ])

    const nextTrending = trending.status === 'fulfilled' ? trending.value : []
    const nextAlbums = albums.status === 'fulfilled' ? albums.value : []

    if (!nextTrending.length && !nextAlbums.length) {
      set({
        loading: false,
        loaded: true,
        error: 'Free music is out of reach right now. Check your connection and try again.',
      })
      return
    }

    set({
      trending: nextTrending,
      albums: nextAlbums,
      loading: false,
      loaded: true,
      error: null,
    })
  },
}))
