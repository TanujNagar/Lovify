import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { decodePlaylistShare, getShareCodeFromHash } from '@/lib/share'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'

/**
 * Restores a playlist shared through the URL hash. Runs once on mount, starts
 * playback, then removes the (potentially very long) hash from the address bar.
 */
export function useSharedPlaylistRestore(): void {
  const navigate = useNavigate()
  const playQueue = usePlayerStore((state) => state.playQueue)
  const showToast = useUiStore((state) => state.showToast)

  useEffect(() => {
    const code = getShareCodeFromHash()
    if (!code) return

    const shared = decodePlaylistShare(code)
    history.replaceState(null, '', window.location.pathname + window.location.search)

    if (!shared) {
      showToast('This shared playlist link is not valid.')
      return
    }

    playQueue(shared.tracks, 0, {
      type: 'playlist',
      label: shared.title ?? 'Shared playlist',
      id: `shared-${Date.now()}`,
    })
    showToast(
      shared.title
        ? `Playing shared playlist: ${shared.title}`
        : `Playing a shared playlist of ${shared.tracks.length} tracks.`,
    )
    navigate('/player')
  }, [navigate, playQueue, showToast])
}
