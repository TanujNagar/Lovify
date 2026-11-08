import {
  playerSnapshot,
  usePlayerStore,
  type PlayerHydration,
} from '@/stores/player'
import type { PlayerContext, RepeatMode, Track } from '@/types/music'

const loadDb = () => import('@/lib/db')

const PLAYER_SETTING = 'playerState'
const SAVE_DELAY = 450

let saveTimer: number | undefined
let unsubscribe: (() => void) | null = null
let lastSignature = ''

/**
 * Progress ticks several times a second while audio plays. Persisting on every
 * tick would keep resetting the debounce timer, so only queue/playback-shape
 * changes schedule a write. Progress still gets saved with the snapshot because
 * it is read when the timer finally fires.
 */
function persistenceSignature(state: ReturnType<typeof usePlayerStore.getState>): string {
  return JSON.stringify([
    state.currentTrack?.id ?? '',
    state.queue.map((track) => track.id),
    state.index,
    state.isPlaying,
    state.status,
    state.volume,
    state.muted,
    state.shuffle,
    state.repeat,
    state.context.type,
    state.context.label,
    state.seekVersion,
  ])
}

export function schedulePlayerSave(): void {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    const state = usePlayerStore.getState()
    if (!state.currentTrack) return
    lastSignature = persistenceSignature(state)
    void loadDb().then(({ setSetting }) => setSetting(PLAYER_SETTING, playerSnapshot(state)))
  }, SAVE_DELAY)
}

export function startPlayerPersistence(): () => void {
  if (unsubscribe) return unsubscribe
  const initial = usePlayerStore.getState()
  if (initial.currentTrack) lastSignature = persistenceSignature(initial)
  unsubscribe = usePlayerStore.subscribe((state) => {
    const signature = persistenceSignature(state)
    if (signature === lastSignature) return
    lastSignature = signature
    schedulePlayerSave()
  })
  return () => {
    unsubscribe?.()
    unsubscribe = null
    lastSignature = ''
    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = undefined
  }
}

function isTrack(value: unknown): value is Track {
  if (!value || typeof value !== 'object') return false
  const track = value as Partial<Track>
  return (
    typeof track.id === 'string' &&
    typeof track.title === 'string' &&
    (track.provider === 'youtube' || track.provider === 'jamendo' || track.provider === 'audius')
  )
}

function isRepeat(value: unknown): value is RepeatMode {
  return value === 'off' || value === 'all' || value === 'one'
}

function validHydration(value: PlayerHydration | undefined): PlayerHydration | null {
  if (!value) return null
  const currentTrack = value.currentTrack
  if (!isTrack(currentTrack)) return null
  const queue = Array.isArray(value.queue) ? value.queue.filter(isTrack) : []
  if (!queue.length) return null
  return {
    currentTrack,
    queue,
    index: Number.isFinite(value.index) ? Math.max(0, Math.round(value.index)) : 0,
    progress: Number.isFinite(value.progress) ? Math.max(0, value.progress) : 0,
    duration: Number.isFinite(value.duration) ? Math.max(0, value.duration) : currentTrack.duration,
    volume: Number.isFinite(value.volume) ? Math.min(1, Math.max(0, value.volume)) : 0.72,
    muted: Boolean(value.muted),
    shuffle: Boolean(value.shuffle),
    repeat: isRepeat(value.repeat) ? value.repeat : 'off',
    context: (value.context ?? { type: 'track', label: 'Now playing' }) as PlayerContext,
  }
}

/**
 * Restores the queue, index and position after a reload. Playback stays paused
 * until the listener gestures, which browsers require anyway.
 */
export async function restorePlayer(): Promise<void> {
  try {
    const { cacheTracks, getSetting } = await loadDb()
    const saved = validHydration(await getSetting<PlayerHydration>(PLAYER_SETTING))
    if (!saved?.currentTrack) return
    await cacheTracks([saved.currentTrack, ...saved.queue])
    usePlayerStore.getState().hydrate(saved)
  } catch {
    // A corrupt or unavailable local database should never block the app.
  }
}

export async function clearSavedPlayer(): Promise<void> {
  const { setSetting } = await loadDb()
  await setSetting(PLAYER_SETTING, null)
}
