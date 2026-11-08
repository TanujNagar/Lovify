import { Suspense, lazy, useEffect, useLayoutEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/layout/Toaster'
import { PlaybackHost } from '@/components/player/PlaybackHost'
import { restorePlayer, startPlayerPersistence } from '@/lib/player-persistence'
import { runIdleSteps } from '@/lib/idle'
import { HomeScreen } from '@/screens/Home'
import { useDownloadsStore } from '@/stores/downloads'
import { useLibraryStore } from '@/stores/library'
import { useSourcesStore } from '@/stores/sources'
import { useSharedPlaylistRestore } from '@/hooks/useSharedPlaylistRestore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useUiStore } from '@/stores/ui'

const CollectionDetailScreen = lazy(() =>
  import('@/screens/CollectionDetail').then((module) => ({
    default: module.CollectionDetailScreen,
  })),
)
const CreatePlaylistSheet = lazy(() =>
  import('@/components/playlist/CreatePlaylistSheet').then((module) => ({
    default: module.CreatePlaylistSheet,
  })),
)
const TrackActionsSheet = lazy(() =>
  import('@/components/media/TrackActionsSheet').then((module) => ({
    default: module.TrackActionsSheet,
  })),
)
const ExploreScreen = lazy(() =>
  import('@/screens/Explore').then((module) => ({ default: module.ExploreScreen })),
)
const LibraryScreen = lazy(() =>
  import('@/screens/Library').then((module) => ({ default: module.LibraryScreen })),
)
const LyricsScreen = lazy(() =>
  import('@/screens/Lyrics').then((module) => ({ default: module.LyricsScreen })),
)
const NotFoundScreen = lazy(() =>
  import('@/screens/NotFound').then((module) => ({ default: module.NotFoundScreen })),
)
const OfflineScreen = lazy(() =>
  import('@/screens/Offline').then((module) => ({ default: module.OfflineScreen })),
)
const PlayerScreen = lazy(() =>
  import('@/screens/Player').then((module) => ({ default: module.PlayerScreen })),
)
const ProfileScreen = lazy(() =>
  import('@/screens/Profile').then((module) => ({ default: module.ProfileScreen })),
)
const QueueScreen = lazy(() =>
  import('@/screens/Queue').then((module) => ({ default: module.QueueScreen })),
)
const SearchScreen = lazy(() =>
  import('@/screens/Search').then((module) => ({ default: module.SearchScreen })),
)
const SettingsScreen = lazy(() =>
  import('@/screens/Settings').then((module) => ({ default: module.SettingsScreen })),
)

const titles: Array<[RegExp, string]> = [
  [/^\/$/, 'Lovify'],
  [/^\/search/, 'Search · Lovify'],
  [/^\/explore/, 'Explore · Lovify'],
  [/^\/library/, 'Your Library · Lovify'],
  [/^\/profile/, 'Profile · Lovify'],
  [/^\/settings/, 'Settings · Lovify'],
  [/^\/queue/, 'Queue · Lovify'],
  [/^\/player/, 'Now Playing · Lovify'],
  [/^\/lyrics/, 'Lyrics · Lovify'],
  [/^\/offline/, 'Offline · Lovify'],
  [/^\/playlist\//, 'Playlist · Lovify'],
  [/^\/album\//, 'Album · Lovify'],
  [/^\/artist\//, 'Artist · Lovify'],
]

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
      <span className="sr-only">Loading</span>
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-surface-container-highest border-t-primary-container" />
    </div>
  )
}

function GlobalSheets() {
  const createPlaylistOpen = useUiStore((state) => state.createPlaylistOpen)
  const trackMenuOpen = useUiStore((state) => state.trackMenuTrack !== null)
  const [createLoaded, setCreateLoaded] = useState(createPlaylistOpen)
  const [trackMenuLoaded, setTrackMenuLoaded] = useState(trackMenuOpen)

  useEffect(() => {
    if (createPlaylistOpen) setCreateLoaded(true)
  }, [createPlaylistOpen])

  useEffect(() => {
    if (trackMenuOpen) setTrackMenuLoaded(true)
  }, [trackMenuOpen])

  return (
    <Suspense fallback={null}>
      {createLoaded && <CreatePlaylistSheet />}
      {trackMenuLoaded && <TrackActionsSheet />}
    </Suspense>
  )
}

function AppEffects() {
  const location = useLocation()
  useSharedPlaylistRestore()

  useEffect(() => {
    let active = true
    let stopPersistence: (() => void) | undefined

    // Everything below only needs local storage, so keep it off the critical
    // path. Each step runs in its own task so IndexedDB work never becomes one
    // long blocking task while the user is already interacting.
    const idle = runIdleSteps(
      [
        () =>
          void restorePlayer().then(() => {
            if (active) stopPersistence = startPlayerPersistence()
          }),
        () => void useLibraryStore.getState().load(),
        () => void useDownloadsStore.getState().load(),
        () => void useSourcesStore.getState().refresh(),
      ],
      800,
    )

    return () => {
      active = false
      stopPersistence?.()
      idle.cancel()
    }
  }, [])

  useEffect(() => {
    const match = titles.find(([pattern]) => pattern.test(location.pathname))
    document.title = match?.[1] ?? 'Lovify'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useLayoutEffect(() => {
    // The static boot shell in index.html paints instantly so the first
    // contentful paint does not wait for React. Drop it in a layout effect so
    // it is gone before the browser paints the real app (no double paint).
    document.getElementById('boot')?.remove()
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppEffects />
      <PlaybackHost />
      <GlobalSheets />
      <Toaster />
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/player" element={<PlayerScreen />} />
            <Route path="/lyrics" element={<LyricsScreen />} />
            <Route element={<AppShell />}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/search" element={<SearchScreen />} />
              <Route path="/explore" element={<ExploreScreen />} />
              <Route path="/library" element={<LibraryScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/queue" element={<QueueScreen />} />
              <Route path="/playlist/:id" element={<CollectionDetailScreen />} />
              <Route path="/album/:id" element={<CollectionDetailScreen />} />
              <Route path="/artist/:id" element={<CollectionDetailScreen />} />
              <Route path="/offline" element={<OfflineScreen />} />
              <Route path="*" element={<NotFoundScreen />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
