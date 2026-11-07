import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { HomeScreen } from '@/screens/Home'
import { useLibraryStore } from '@/stores/library'

const CollectionDetailScreen = lazy(() =>
  import('@/screens/CollectionDetail').then((module) => ({
    default: module.CollectionDetailScreen,
  })),
)
const ExploreScreen = lazy(() =>
  import('@/screens/Explore').then((module) => ({ default: module.ExploreScreen })),
)
const LibraryScreen = lazy(() =>
  import('@/screens/Library').then((module) => ({ default: module.LibraryScreen })),
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

function AppEffects() {
  const location = useLocation()

  useEffect(() => {
    // Local library hydration is not needed for the first paint. Let the
    // browser settle before opening IndexedDB so it never delays interaction.
    const load = () => void useLibraryStore.getState().load()
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }
    const timer = window.setTimeout(load, 200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const match = titles.find(([pattern]) => pattern.test(location.pathname))
    document.title = match?.[1] ?? 'Lovify'
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    // The static boot shell in index.html only exists to make the first paint
    // immediate. Once React has painted, drop it from the DOM.
    document.getElementById('boot')?.remove()
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppEffects />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/player" element={<PlayerScreen />} />
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
    </BrowserRouter>
  )
}
