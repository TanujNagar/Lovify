import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TrackRow } from '@/components/media/TrackRow'
import { tracks } from '@/data/mock'
import { usePlayerStore } from '@/stores/player'
import { useLibraryStore } from '@/stores/library'

const resetPlayer = () => {
  usePlayerStore.setState({
    currentTrack: tracks[0],
    queue: tracks.slice(0, 4),
    index: 0,
    isPlaying: false,
    progress: 0,
    volume: 0.72,
    shuffle: false,
    repeat: false,
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
        <TrackRow track={tracks[1]} queue={tracks.slice(0, 4)} />
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

    expect(
      screen.getByRole('button', { name: /Play Midnight Echoes/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Play Midnight Echoes/i }))

    expect(
      screen.getByRole('button', { name: /Pause Midnight Echoes/i }),
    ).toBeInTheDocument()
  })
})
