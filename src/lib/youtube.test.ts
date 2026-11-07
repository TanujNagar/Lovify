import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  YOUTUBE_KEY_SETTING,
  getYouTubeKey,
  maskKey,
  removeYouTubeKey,
  saveYouTubeKey,
  validateYouTubeKey,
} from '@/lib/youtube'
import { db } from '@/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
  vi.unstubAllGlobals()
})

describe('YouTube API key storage', () => {
  it('masks all but the last four characters', () => {
    expect(maskKey('AIzaSyExampleKey1234')).toBe('••••••••1234')
    expect(maskKey('abc')).toBe('••••••••abc')
  })

  it('saves a trimmed key in IndexedDB and removes it again', async () => {
    await saveYouTubeKey('  AIza-test-key  ')
    expect(await getYouTubeKey()).toBe('AIza-test-key')

    const row = await db.settings.get(YOUTUBE_KEY_SETTING)
    expect(row?.value).toBe('AIza-test-key')

    await removeYouTubeKey()
    expect(await getYouTubeKey()).toBeUndefined()
  })
})

describe('YouTube key validation', () => {
  it('uses one videos.list request and never sends the key anywhere else', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ id: 'dQw4w9WgXcQ' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await validateYouTubeKey('AIza-good-key')

    expect(result.ok).toBe(true)
    expect(result.status).toBe('valid')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const request = fetchMock.mock.calls[0][0] as URL
    expect(request.origin + request.pathname).toBe(
      'https://www.googleapis.com/youtube/v3/videos',
    )
    expect(request.searchParams.get('part')).toBe('id')
    expect(request.searchParams.get('key')).toBe('AIza-good-key')
  })

  it('reports an invalid key from Google without exposing the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: { errors: [{ reason: 'keyInvalid' }], message: 'API key not valid.' },
        }),
      }),
    )

    const result = await validateYouTubeKey('AIza-bad-key')

    expect(result.ok).toBe(false)
    expect(result.status).toBe('invalid')
    expect(result.message).toContain('YouTube Data API v3')
    expect(result.message).not.toContain('AIza-bad-key')
  })

  it('handles network failures as a friendly error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const result = await validateYouTubeKey('AIza-offline')

    expect(result.ok).toBe(false)
    expect(result.status).toBe('error')
    expect(result.message).toContain('Could not reach Google')
  })

  it('asks for a key when the field is empty', async () => {
    const result = await validateYouTubeKey('   ')

    expect(result.status).toBe('empty')
    expect(result.ok).toBe(false)
  })
})
