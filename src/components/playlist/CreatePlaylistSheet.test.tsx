import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { CreatePlaylistSheet } from '@/components/playlist/CreatePlaylistSheet'
import { db } from '@/lib/db'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  useUiStore.setState({ createPlaylistOpen: false, toast: null })
  useLibraryStore.setState({
    playlists: [],
    likedIds: [],
    loaded: false,
    loading: false,
    error: null,
  })
})

describe('CreatePlaylistSheet', () => {
  it('validates an empty name before writing to IndexedDB', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/library']}>
        <LocationProbe />
        <CreatePlaylistSheet />
      </MemoryRouter>,
    )

    act(() => useUiStore.getState().openCreatePlaylist())
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Create playlist' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Give your playlist a name.',
    )
    expect(await db.playlists.count()).toBe(0)
  })

  it('saves a playlist and navigates to its detail page', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/library']}>
        <LocationProbe />
        <CreatePlaylistSheet />
      </MemoryRouter>,
    )

    act(() => useUiStore.getState().openCreatePlaylist())
    await screen.findByRole('dialog')

    await user.type(screen.getByLabelText('Name'), 'Rainy Window')
    await user.type(
      screen.getByLabelText(/Description/i),
      'Soft rain and slow chords',
    )
    await user.click(screen.getByRole('button', { name: 'Create playlist' }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toMatch(/^\/playlist\/playlist-/)
    })

    const playlists = await db.playlists.toArray()
    expect(playlists).toHaveLength(1)
    expect(playlists[0]).toMatchObject({
      name: 'Rainy Window',
      description: 'Soft rain and slow chords',
    })
    expect(useUiStore.getState().createPlaylistOpen).toBe(false)
  })
})
