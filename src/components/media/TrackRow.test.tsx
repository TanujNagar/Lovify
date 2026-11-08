import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TrackRow } from '@/components/media/TrackRow'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'
import type { Track } from '@/types/music'

function makeTrack(index: number, title: string, artist: string, duration: number): Track {
  return {
    id: `audius:${index}`,
    provider: 'audius',
    providerId: String(index),
    title,
    artist,
    artistId: `audius:user:${index}`,
    album: `Album ${index}`,
    albumId: `audius:playlist:${index}`,
    duration,
  }
}

const tracks = [
  makeTrack(0, 'Midnight Echoes', 'Aura Nova', 214),
  makeTrack(1, 'Starlight Mirage', 'Lumen Bay', 198),
  makeTrack(2, 'Shadow Rhythm', 'Kaelen Vance', 251),
  makeTrack(3, 'Quiet Storm', 'Aura Nova', 232),
]

function resetPlayer() {
  usePlayerStore.getState().reset()
  usePlayerStore.setState({
    currentTrack: tracks[0],
    queue: tracks,
    index: 0,
    status: 'paused',
    duration: tracks[0].duration,
    context: { type: 'track', label: 'Test queue' },
  })
}

describe('TrackRow', () => {
  beforeEach(() => {
    resetPlayer()
    useLibraryStore.setState({ likedIds: [] })
  })

  it('shows the track metadata and duration', () => {
    render(
      <MemoryRouter>
        <TrackRow track={tracks[2]} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Shadow Rhythm')).toBeInTheDocument()
    expect(screen.getByText('Kaelen Vance')).toBeInTheDocument()
    expect(screen.getByText('4:11')).toBeInTheDocument()
  })

  it('starts playback for the clicked track', () => {
    render(
      <MemoryRouter>
        <TrackRow track={tracks[1]} queue={tracks} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Play Starlight Mirage/i }))

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.id).toBe(tracks[1].id)
    expect(state.isPlaying).toBe(true)
    expect(state.index).toBe(1)
  })

  it('switches the play label to pause for the active playing track', () => {
    render(
      <MemoryRouter>
        <TrackRow track={tracks[0]} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: /Play Midnight Echoes/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Play Midnight Echoes/i }))

    expect(screen.getByRole('button', { name: /Pause Midnight Echoes/i })).toBeInTheDocument()
  })
})
