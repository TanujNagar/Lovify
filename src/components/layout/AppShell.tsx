import { Suspense, lazy } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '@/components/layout/BottomNav'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { InstallPrompt } from '@/components/layout/InstallPrompt'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { Toaster } from '@/components/layout/Toaster'
import { TopBar } from '@/components/layout/TopBar'
import { MiniPlayer } from '@/components/player/MiniPlayer'

const CreatePlaylistSheet = lazy(() =>
  import('@/components/playlist/CreatePlaylistSheet').then((module) => ({
    default: module.CreatePlaylistSheet,
  })),
)

export function AppShell() {
  const location = useLocation()
  const hideChrome = location.pathname === '/queue'

  return (
    <div className="min-h-[100dvh] bg-surface">
      <DesktopSidebar />

      <div className="flex min-h-[100dvh] flex-col lg:pl-60">
        <TopBar />
        <OfflineBanner />
        <main
          id="main-content"
          className={
            hideChrome
              ? 'flex-1 pb-16 lg:pb-16'
              : 'flex-1 pb-44 lg:pb-28'
          }
        >
          <Outlet />
        </main>
      </div>

      {!hideChrome && (
        <>
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 pb-safe lg:hidden">
            <MiniPlayer />
            <BottomNav />
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 hidden lg:block lg:left-64">
            <div className="pointer-events-auto mx-auto max-w-3xl px-4">
              <MiniPlayer className="mx-0 mb-0" />
            </div>
          </div>
        </>
      )}

      <InstallPrompt />
      <Toaster />
      <Suspense fallback={null}>
        <CreatePlaylistSheet />
      </Suspense>
    </div>
  )
}
