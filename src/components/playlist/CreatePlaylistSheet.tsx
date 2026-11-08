import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/brand/Icon'
import { Sheet } from '@/components/ui/Sheet'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'

export function CreatePlaylistSheet() {
  const navigate = useNavigate()
  const open = useUiStore((state) => state.createPlaylistOpen)
  const seedTrack = useUiStore((state) => state.seedTrack)
  const close = useUiStore((state) => state.closeCreatePlaylist)
  const showToast = useUiStore((state) => state.showToast)
  const createPlaylist = useLibraryStore((state) => state.createPlaylist)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give your playlist a name.')
      inputRef.current?.focus()
      return
    }
    if (trimmed.length > 50) {
      setError('Keep the name under 50 characters.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const playlist = await createPlaylist(trimmed, description, seedTrack ? [seedTrack.id] : [])
      close()
      showToast(`“${playlist.name}” created.`)
      navigate(`/playlist/${playlist.id}`)
    } catch {
      setError('Could not save the playlist. Check that storage is available.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="New playlist"
      description="A private space for the songs you want together."
      initialFocusRef={inputRef}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={close}
            className="flex min-h-11 flex-1 items-center justify-center rounded-full bg-surface-container px-4 font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-playlist-form"
            disabled={submitting}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary-container px-4 font-label-lg text-label-lg text-on-primary-container disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create playlist'}
          </button>
        </div>
      }
    >
      <form
        id="create-playlist-form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="block font-label-lg text-label-lg text-on-surface" htmlFor="playlist-name">
          Name
        </label>
        <div className="mt-1.5 flex h-12 items-center gap-2 rounded-xl bg-surface-container-low px-3 focus-within:ring-2 focus-within:ring-primary/60">
          <Icon name="queue_music" size="sm" className="text-on-surface-variant" />
          <input
            ref={inputRef}
            id="playlist-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            maxLength={50}
            placeholder="Late night, softly"
            className="h-full min-w-0 flex-1 bg-transparent font-body-lg text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>

        <label
          className="mt-4 block font-label-lg text-label-lg text-on-surface"
          htmlFor="playlist-description"
        >
          Description <span className="text-on-surface-variant">(optional)</span>
        </label>
        <textarea
          id="playlist-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={140}
          rows={2}
          placeholder="What does this playlist feel like?"
          className="mt-1.5 w-full resize-none rounded-xl bg-surface-container-low px-3 py-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/60"
        />

        {error && (
          <p role="alert" className="mt-3 font-body-md text-body-md text-error">
            {error}
          </p>
        )}
        <p className="mt-2 text-right font-caption text-caption text-on-surface-variant">
          {name.length}/50
        </p>
      </form>
    </Sheet>
  )
}
