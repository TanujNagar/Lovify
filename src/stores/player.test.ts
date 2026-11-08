import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '@/stores/player'
import type { Track } from '@/types/music'

function makeTrack(index: number, duration = 180 + index * 10): Track {
  return {
    id: `audius:${index}`,
    provider: 'audius',
    providerId: String(index),
    title: `Track ${index}`,
    artist: `Artist ${index}`,
    artistId: `audius:user:${index}`,
    album: `Album ${index}`,
    albumId: `audius:playlist:${index}`,
    duration,
  }
}

const tracks = Array.from({ length: 5 }, (_, index) => makeTrack(index))

function resetPlayer() {
  usePlayerStore.getState().reset()
  usePlayerStore.setState({
    currentTrack: tracks[0],
    queue: tracks.slice(0, 4),
    index: 0,
    status: 'paused',
    duration: tracks[0].duration,
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
    expect(state.seekVersion).toBeGreaterThan(0)
  })

  it('clamps a requested queue start index and plays the track', () => {
    usePlayerStore.getState().playQueue(tracks.slice(0, 3), 99)

    const state = usePlayerStore.getState()
    expect(state.index).toBe(2)
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.isPlaying).toBe(true)
  })

  it('wraps to the first track when skipping past the end manually', () => {
    usePlayerStore.setState({ index: 3, queue: tracks.slice(0, 4) })

    usePlayerStore.getState().next()

    expect(usePlayerStore.getState().index).toBe(0)
    expect(usePlayerStore.getState().currentTrack?.id).toBe(tracks[0].id)
  })

  it('stops at the end after an automatic advance unless repeat is all', () => {
    usePlayerStore.setState({ index: 3, queue: tracks.slice(0, 4) })

    usePlayerStore.getState().next(true)
    expect(usePlayerStore.getState().isPlaying).toBe(false)
    expect(usePlayerStore.getState().status).toBe('paused')

    resetPlayer()
    usePlayerStore.setState({ index: 3, repeat: 'all' })
    usePlayerStore.getState().next(true)
    expect(usePlayerStore.getState().index).toBe(0)
    expect(usePlayerStore.getState().isPlaying).toBe(true)
  })

  it('repeats the current track when repeat is one and playback advances', () => {
    usePlayerStore.setState({
      index: 2,
      currentTrack: tracks[2],
      duration: tracks[2].duration,
      repeat: 'one',
      progress: 140,
    })

    usePlayerStore.getState().next(true)

    const state = usePlayerStore.getState()
    expect(state.index).toBe(2)
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.progress).toBe(0)
    expect(state.isPlaying).toBe(true)
  })

  it('cycles repeat through off, all, one and back', () => {
    expect(usePlayerStore.getState().repeat).toBe('off')
    usePlayerStore.getState().cycleRepeat()
    expect(usePlayerStore.getState().repeat).toBe('all')
    usePlayerStore.getState().cycleRepeat()
    expect(usePlayerStore.getState().repeat).toBe('one')
    usePlayerStore.getState().cycleRepeat()
    expect(usePlayerStore.getState().repeat).toBe('off')
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

  it('toggles playback, shuffle and mute', () => {
    usePlayerStore.getState().toggle()
    expect(usePlayerStore.getState().isPlaying).toBe(true)

    usePlayerStore.getState().toggleShuffle()
    expect(usePlayerStore.getState().shuffle).toBe(true)

    usePlayerStore.getState().toggleMute()
    expect(usePlayerStore.getState().muted).toBe(true)
  })

  it('adds tracks to the queue and inserts the next track after the current one', () => {
    usePlayerStore.getState().addToQueue(tracks[4])
    expect(usePlayerStore.getState().queue.map((track) => track.id)).toContain(tracks[4].id)

    usePlayerStore.getState().playNext(tracks[3])
    const state = usePlayerStore.getState()
    expect(state.queue[1].id).toBe(tracks[3].id)
  })

  it('starts playback when adding to an empty queue', () => {
    usePlayerStore.getState().reset()

    usePlayerStore.getState().addToQueue(tracks[2])

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.queue).toHaveLength(1)
    expect(state.isPlaying).toBe(true)
  })

  it('removes the active track and promotes the next one', () => {
    usePlayerStore.setState({ index: 1, currentTrack: tracks[1] })

    usePlayerStore.getState().removeFromQueue(1)

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.index).toBe(1)
    expect(state.queue).toHaveLength(3)
  })

  it('moves queued tracks and keeps the current track in sync', () => {
    usePlayerStore.getState().moveInQueue(0, 3)

    const state = usePlayerStore.getState()
    expect(state.queue[3].id).toBe(tracks[0].id)
    expect(state.index).toBe(3)
    expect(state.currentTrack?.id).toBe(tracks[0].id)
  })

  it('clears upcoming tracks but keeps the current track playing', () => {
    usePlayerStore.getState().clearQueue()

    const state = usePlayerStore.getState()
    expect(state.queue).toHaveLength(1)
    expect(state.currentTrack?.id).toBe(tracks[0].id)
    expect(state.index).toBe(0)
  })

  it('jumps to a queue position without changing the queue', () => {
    usePlayerStore.getState().jumpTo(2)

    const state = usePlayerStore.getState()
    expect(state.index).toBe(2)
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.queue).toHaveLength(4)
  })

  it('hydrates a saved queue paused at the saved position', () => {
    usePlayerStore.getState().reset()

    usePlayerStore.getState().hydrate({
      currentTrack: tracks[2],
      queue: tracks.slice(0, 4),
      index: 2,
      progress: 42,
      duration: 260,
      volume: 0.4,
      muted: true,
      shuffle: true,
      repeat: 'all',
      context: { type: 'playlist', label: 'Night drive' },
    })

    const state = usePlayerStore.getState()
    expect(state.currentTrack?.id).toBe(tracks[2].id)
    expect(state.queue).toHaveLength(4)
    expect(state.index).toBe(2)
    expect(state.progress).toBe(42)
    expect(state.duration).toBe(260)
    expect(state.volume).toBe(0.4)
    expect(state.muted).toBe(true)
    expect(state.shuffle).toBe(true)
    expect(state.repeat).toBe('all')
    expect(state.isPlaying).toBe(false)
    expect(state.status).toBe('paused')
  })
})
