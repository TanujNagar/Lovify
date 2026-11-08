import type { Track } from '@/types/music'

/**
 * Playlist links travel in the URL hash so they never hit a server and keep
 * working on a static host. The payload carries enough track metadata to play
 * the mix on another device without relying on that device's local cache.
 *
 * Format: `v1:<base64url(JSON.stringify({ n, d, t: SharedTrack[] }))>`
 */
type SharedTrack = {
  i: string
  p: Track['provider']
  pid: string
  t: string
  a: string
  aid: string
  al: string
  alid: string
  du: number
  ar?: string
  s?: string
  g?: string
  y?: number
}

const MAX_SHARED_TRACKS = 60

function toBase64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return decodeURIComponent(escape(atob(padded)))
}

function packTrack(track: Track): SharedTrack {
  return {
    i: track.id,
    p: track.provider,
    pid: track.providerId,
    t: track.title,
    a: track.artist,
    aid: track.artistId,
    al: track.album,
    alid: track.albumId,
    du: track.duration,
    ar: track.artwork,
    s: track.streamUrl,
    g: track.genre,
    y: track.year,
  }
}

function unpackTrack(track: SharedTrack): Track {
  return {
    id: track.i,
    provider: track.p,
    providerId: track.pid,
    title: track.t,
    artist: track.a,
    artistId: track.aid,
    album: track.al,
    albumId: track.alid,
    duration: track.du,
    artwork: track.ar,
    streamUrl: track.s,
    genre: track.g,
    year: track.y,
  }
}

export function encodePlaylistShare(tracks: Track[], title?: string, description?: string): string {
  const payload = JSON.stringify({
    n: title,
    d: description,
    t: tracks.slice(0, MAX_SHARED_TRACKS).map(packTrack),
  })
  return `v1:${toBase64Url(payload)}`
}

export function decodePlaylistShare(
  code: string,
): { tracks: Track[]; title?: string; description?: string } | null {
  if (!code.startsWith('v1:')) return null
  try {
    const payload = JSON.parse(fromBase64Url(code.slice(3)))
    if (!Array.isArray(payload.t)) return null
    const tracks = payload.t
      .filter(
        (track: Partial<SharedTrack>) =>
          typeof track?.i === 'string' &&
          typeof track?.t === 'string' &&
          (track.p === 'youtube' || track.p === 'jamendo' || track.p === 'audius'),
      )
      .map(unpackTrack)
    if (!tracks.length) return null
    return {
      tracks,
      title: typeof payload.n === 'string' ? payload.n : undefined,
      description: typeof payload.d === 'string' ? payload.d : undefined,
    }
  } catch {
    return null
  }
}

/** Builds the shareable URL for a playlist, including the encoded payload. */
export function createShareUrl(tracks: Track[], title?: string, description?: string): string {
  const shareCode = encodePlaylistShare(tracks, title, description)
  return `${window.location.origin}${window.location.pathname}#share=${shareCode}`
}

/** Reads the share code from the current URL hash, if any. */
export function getShareCodeFromHash(): string | null {
  const hash = window.location.hash.slice(1)
  if (!hash.startsWith('share=')) return null
  return hash.slice('share='.length)
}
