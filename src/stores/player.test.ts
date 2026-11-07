import { beforeEach, describe, expect, it } from 'vitest'
import { tracks } from '@/data/mock'
import { usePlayerStore } from '@/stores/player'

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

describe('player store', () => {
  beforeEach(resetPlayer)

  it('plays a track and starts its queue at the matching index', () => {
    const queue = tracks.slice(0, 3)
    usePlayerStore.getState().play(tracks[2], queue)

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.queue.map((track) => track.id)).toEqual(queue.map((track) => track.id))
    expect(state.index).toBe(2)
    expect(state.isPlaying).toBe(true)
    expect(state.progress).toBe(0)
  })

  it('clamps a requested queue start index and plays the track', () => {
    usePlayerStore.getState().playQueue(tracks.slice(0, 3), 99)

    const state = usePlayerStore.getState()
    expect(state.index).toBe(2)
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.isPlaying).toBe(true)
  })

  it('wraps to the first track when skipping past the end', () => {
    usePlayerStore.setState({ index: 3, queue: tracks.slice(0, 4) })

    usePlayerStore.getState().next()

    expect(usePlayerStore.getState().index).toBe(0)
    expect(usePlayerStore.getState().currentTrack?.id).toBe(tracks[0].id)
  })

  it('restarts the current track from the beginning before going back', () => {
    usePlayerStore.setState({ index: 2, progress: 24 })

    usePlayerStore.getState().previous()
    expect(usePlayerStore.getState().index).toBe(2)
    expect(usePlayerStore.getState().progress).toBe(0)

    usePlayerStore.getState().previous()
    expect(usePlayerStore.getState().index).toBe(1)
  })

  it('clamps seeking and volume to safe ranges', () => {
    usePlayerStore.getState().seek(10_000)
    expect(usePlayerStore.getState().progress).toBe(tracks[0].duration)

    usePlayerStore.getState().seek(-4)
    expect(usePlayerStore.getState().progress).toBe(0)

    usePlayerStore.getState().setVolume(2)
    expect(usePlayerStore.getState().volume).toBe(1)

    usePlayerStore.getState().setVolume(-1)
    expect(usePlayerStore.getState().volume).toBe(0)
  })

  it('toggles playback, shuffle and repeat', () => {
    usePlayerStore.getState().toggle()
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    usePlayerStore.getState().toggleShuffle()
    expect(usePlayerStore.getState().shuffle).toBe(true)

    usePlayerStore.getState().toggleRepeat()
    expect(usePlayerStore.getState().repeat).toBe(true)
  })
})
