import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Artwork } from '@/components/media/Artwork'
import { Sheet } from '@/components/ui/Sheet'
import { canDownloadTrack, downloadUnavailableReason } from '@/lib/downloads'
import { useDownloadsStore } from '@/stores/downloads'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import type { Track } from '@/types/music'

type ActionRowProps = {
  icon: string
  label: string
  detail?: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}

function ActionRow({ icon, label, detail, onClick, disabled, active }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-surface-container disabled:opacity-45"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} filled={active} size="sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-title-md text-title-md text-on-surface">{label}</span>
        {detail && (
          <span className="mt-0.5 block truncate font-body-md text-body-md text-on-surface-variant">
            {detail}
          </span>
        )}
      </span>
      {active && <Icon name="check" size="sm" className="text-primary" />}
    </button>
  )
}

export function TrackActionsSheet() {
  const navigate = useNavigate()
  const track = useUiStore((state) => state.trackMenuTrack)
  const playlistId = useUiStore((state) => state.trackMenuPlaylistId)
  const close = useUiStore((state) => state.closeTrackMenu)
  const openCreatePlaylist = useUiStore((state) => state.openCreatePlaylist)
  const showToast = useUiStore((state) => state.showToast)

  const playlists = useLibraryStore((state) => state.playlists)
  const likedIds = useLibraryStore((state) => state.likedIds)
  const toggleLike = useLibraryStore((state) => state.toggleLike)
  const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist)
  const removeTrackFromPlaylist = useLibraryStore((state) => state.removeTrackFromPlaylist)

  const play = usePlayerStore((state) => state.play)
  const playNext = usePlayerStore((state) => state.playNext)
  const addToQueue = usePlayerStore((state) => state.addToQueue)
  const currentTrackId = usePlayerStore((state) => state.currentTrack?.id)

  const downloadTrack = useDownloadsStore((state) => state.download)
  const removeDownload = useDownloadsStore((state) => state.remove)
  const downloaded = useDownloadsStore((state) =>
    Boolean(track && state.tracks.some((item) => item.id === track.id)),
  )
  const downloading = useDownloadsStore((state) =>
    Boolean(track && state.busy.includes(track.id)),
  )

  const open = Boolean(track)
  if (!track) return null

  const canDownload = canDownloadTrack(track)
  const downloadNote = downloadUnavailableReason(track)

  const liked = likedIds.includes(track.id)
  const contextPlaylist = playlistId
    ? playlists.find((playlist) => playlist.id === playlistId)
    : undefined

  const act = (message: string, run: () => void | Promise<unknown>) => {
    void Promise.resolve(run()).then(() => {
      showToast(message)
      close()
    })
  }

  const handleAdd = (target: Track | null, targetPlaylistId: string) => {
    if (!target) return
    if (targetPlaylistId === 'playlist-liked') {
      act(liked ? 'Already in Liked Songs.' : 'Added to Liked Songs.', async () => {
        if (!liked) await toggleLike(track.id)
      })
      return
    }
    act('Added to playlist.', () => addTrackToPlaylist(targetPlaylistId, track.id))
  }

  const handleDownload = async () => {
    if (downloaded) {
      await removeDownload(track.id)
      showToast('Removed from offline downloads.')
      close()
      return
    }
    await downloadTrack(track)
    const latest = useDownloadsStore.getState()
    showToast(latest.error ?? 'Saved for offline listening.')
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={track.title}
      description={`${track.artist} · ${track.album}`}
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
        <Artwork
          seed={track.id}
          src={track.artwork}
          alt=""
          rounded="rounded-lg"
          className="h-14 w-14 flex-shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate font-title-md text-title-md text-on-surface">{track.title}</p>
          <p className="truncate font-body-md text-body-md text-on-surface-variant">
            {track.artist}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <ActionRow
          icon="play_arrow"
          label="Play now"
          onClick={() =>
            act('Playing now.', () => play(track, undefined, { type: 'track', label: 'Now playing' }))
          }
        />
        <ActionRow
          icon="playlist_add"
          label="Play next"
          onClick={() => act('Playing next.', () => playNext(track))}
        />
        <ActionRow
          icon="queue_music"
          label="Add to queue"
          onClick={() => act('Added to the queue.', () => addToQueue(track))}
        />
        <ActionRow
          icon={downloaded ? 'download_done' : 'download'}
          label={
            downloaded
              ? 'Remove offline download'
              : downloading
                ? 'Saving for offline…'
                : 'Download for offline'
          }
          detail={
            downloaded
              ? 'Available without a connection'
              : (downloadNote ?? 'Free-source tracks only')
          }
          disabled={!canDownload || downloading}
          active={downloaded}
          onClick={() => void handleDownload()}
        />
        <ActionRow
          icon="favorite"
          label={liked ? 'Remove from Liked Songs' : 'Like this track'}
          active={liked}
          onClick={() =>
            act(liked ? 'Removed from Liked Songs.' : 'Added to Liked Songs.', () =>
              toggleLike(track.id),
            )
          }
        />
        {currentTrackId === track.id && (
          <ActionRow
            icon="lyrics"
            label="Open lyrics"
            onClick={() => {
              close()
              navigate('/lyrics')
            }}
          />
        )}
      </div>

      {playlists.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 px-2 font-label-lg text-label-lg uppercase tracking-wider text-on-surface-variant">
            Add to playlist
          </p>
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            {playlists.map((playlist) => {
              const contains =
                playlist.system === 'liked'
                  ? liked
                  : playlist.trackIds.includes(track.id)
              return (
                <ActionRow
                  key={playlist.id}
                  icon={playlist.system === 'liked' ? 'favorite' : 'queue_music'}
                  label={playlist.name}
                  detail={`${playlist.trackIds.length} tracks`}
                  active={contains}
                  disabled={contains}
                  onClick={() => handleAdd(track, playlist.id)}
                />
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/20 pt-3">
        <button
          type="button"
          onClick={() => {
            close()
            openCreatePlaylist(track)
          }}
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container px-4 font-label-md text-label-md text-on-surface-variant hover:text-on-surface"
        >
          <Icon name="add" size="sm" />
          New playlist
        </button>
        {contextPlaylist && contextPlaylist.system !== 'liked' && (
          <button
            type="button"
            onClick={() =>
              act('Removed from this playlist.', () =>
                removeTrackFromPlaylist(contextPlaylist.id, track.id),
              )
            }
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-container px-4 font-label-md text-label-md text-error hover:bg-error-container/20"
          >
            <Icon name="delete" size="sm" />
            Remove from {contextPlaylist.name}
          </button>
        )}
      </div>
    </Sheet>
  )
}
