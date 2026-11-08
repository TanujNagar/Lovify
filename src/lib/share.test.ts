import { describe, expect, it } from 'vitest'
import { decodePlaylistShare, encodePlaylistShare } from '@/lib/share'
import type { Track } from '@/types/music'

const track: Track = {
  id: 'audius:track:1',
  provider: 'audius',
  providerId: '1',
  title: 'Night Bus',
  artist: 'Lumen',
  artistId: 'audius:artist:2',
  album: 'After Hours',
  albumId: 'audius:album:3',
  duration: 214,
  artwork: 'https://example.com/art.jpg',
  streamUrl: 'https://example.com/stream.mp3',
  genre: 'Electronic',
}

describe('playlist sharing', () => {
  it('round-trips track metadata through the URL-safe payload', () => {
    const code = encodePlaylistShare([track], 'Night mix', 'Slow and warm')
    expect(code.startsWith('v1:')).toBe(true)
    expect(code).not.toContain('+')
    expect(code).not.toContain('/')
    expect(code).not.toContain('=')

    const decoded = decodePlaylistShare(code)
    expect(decoded?.title).toBe('Night mix')
    expect(decoded?.description).toBe('Slow and warm')
    expect(decoded?.tracks).toEqual([track])
  })

  it('keeps unicode titles intact', () => {
    const unicode = { ...track, title: 'Nuit étoilée 🌙' }
    const decoded = decodePlaylistShare(encodePlaylistShare([unicode], 'Nuit'))
    expect(decoded?.tracks[0]?.title).toBe('Nuit étoilée 🌙')
  })

  it('rejects invalid or unsupported payloads', () => {
    expect(decodePlaylistShare('nope')).toBeNull()
    expect(decodePlaylistShare('v1:not-base64')).toBeNull()
    expect(decodePlaylistShare(encodePlaylistShare([]))).toBeNull()
  })

  it('caps very long playlists so the URL stays usable', () => {
    const many = Array.from({ length: 100 }, (_, index) => ({
      ...track,
      id: `audius:track:${index}`,
    }))
    const decoded = decodePlaylistShare(encodePlaylistShare(many))
    expect(decoded?.tracks).toHaveLength(60)
  })
})
