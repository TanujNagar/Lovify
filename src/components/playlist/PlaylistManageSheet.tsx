import { useEffect, useState } from 'react'
import { Icon } from '@/components/brand/Icon'
import { Sheet } from '@/components/ui/Sheet'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import type { Playlist } from '@/types/music'

type PlaylistManageSheetProps = {
  playlist: Playlist | null
  onClose: () => void
  onDeleted?: () => void
  onRenamed?: (name: string) => void
}

export function PlaylistManageSheet({
  playlist,
  onClose,
  onDeleted,
  onRenamed,
}: PlaylistManageSheetProps) {
  const renamePlaylist = useLibraryStore((state) => state.renamePlaylist)
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist)
  const showToast = useUiStore((state) => state.showToast)

  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setName(playlist?.name ?? '')
    setConfirmDelete(false)
    setBusy(false)
  }, [playlist])

  const open = Boolean(playlist) && !playlist?.system

  const save = async () => {
    if (!playlist) return
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('Give your playlist a name first.')
      return
    }
    setBusy(true)
    try {
      await renamePlaylist(playlist.id, trimmed, playlist.description)
      showToast('Playlist renamed.')
      onRenamed?.(trimmed)
      onClose()
    } catch {
      showToast('Could not rename the playlist. Check that storage is available.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!playlist) return
    setBusy(true)
    try {
      await deletePlaylist(playlist.id)
      showToast('Playlist deleted.')
      onDeleted?.()
      onClose()
    } catch {
      showToast('Could not delete the playlist. Check that storage is available.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Playlist options"
      description={playlist ? playlist.name : undefined}
    >
      {playlist && (
        <div>
          <label htmlFor="manage-playlist-name" className="block font-label-lg text-label-lg text-on-surface">
            Playlist name
          </label>
          <div className="mt-1.5 flex h-12 items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-2 focus-within:ring-primary/60">
            <Icon name="queue_music" size="sm" className="text-on-surface-variant" />
            <input
              id="manage-playlist-name"
              value={name}
              maxLength={50}
              onChange={(event) => setName(event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="flex min-h-11 items-center gap-2 rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container disabled:opacity-60"
            >
              <Icon name="check" size="sm" />
              {busy ? 'Saving…' : 'Save name'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete((value) => !value)}
              className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-error"
            >
              <Icon name="delete" size="sm" />
              Delete playlist
            </button>
          </div>

          {confirmDelete && (
            <div className="mt-3 rounded-xl bg-error-container/20 p-3">
              <p className="font-body-md text-body-md text-on-surface">
                Delete “{playlist.name}”? Tracks stay saved in your library, but this playlist
                disappears.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={busy}
                  className="flex min-h-11 items-center gap-2 rounded-full bg-error px-4 font-label-lg text-label-lg text-on-error disabled:opacity-60"
                >
                  <Icon name="delete" size="sm" />
                  {busy ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex min-h-11 items-center rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
