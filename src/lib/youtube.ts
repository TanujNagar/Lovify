export const YOUTUBE_KEY_SETTING = 'youtubeApiKey'
export const YOUTUBE_KEY_HELP_URL =
  'https://developers.google.com/youtube/v3/getting-started'

// Keep Dexie out of the first-paint bundle. Settings loads it on demand.
const loadDb = () => import('@/lib/db')

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'
const TEST_VIDEO_ID = 'dQw4w9WgXcQ'

export type KeyStatus = 'empty' | 'testing' | 'valid' | 'invalid' | 'error'

export type KeyValidation = {
  ok: boolean
  status: KeyStatus
  message: string
}

export function maskKey(key: string): string {
  const trailing = key.slice(-4)
  return `••••••••${trailing}`
}

export async function getYouTubeKey(): Promise<string | undefined> {
  const { getSetting } = await loadDb()
  return getSetting<string>(YOUTUBE_KEY_SETTING)
}

export async function saveYouTubeKey(key: string): Promise<void> {
  const { setSetting } = await loadDb()
  await setSetting(YOUTUBE_KEY_SETTING, key.trim())
}

export async function removeYouTubeKey(): Promise<void> {
  const { removeSetting } = await loadDb()
  await removeSetting(YOUTUBE_KEY_SETTING)
}

/**
 * Uses a one-unit videos.list call. The key is sent only to Google,
 * never to our own infrastructure, and is never logged.
 */
export async function validateYouTubeKey(key: string): Promise<KeyValidation> {
  const trimmed = key.trim()
  if (!trimmed) {
    return {
      ok: false,
      status: 'empty',
      message: 'Paste a YouTube API key first.',
    }
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)

  try {
    const url = new URL(`${YOUTUBE_API}/videos`)
    url.searchParams.set('part', 'id')
    url.searchParams.set('id', TEST_VIDEO_ID)
    url.searchParams.set('key', trimmed)

    const response = await fetch(url, { signal: controller.signal })
    const payload = (await response.json().catch(() => null)) as {
      error?: { errors?: Array<{ reason?: string }>; message?: string }
    } | null

    if (response.ok) {
      return {
        ok: true,
        status: 'valid',
        message: 'Key works. Searches will now use your own quota.',
      }
    }

    const reason = payload?.error?.errors?.[0]?.reason
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      return {
        ok: false,
        status: 'invalid',
        message: 'This key has no quota left today. Try again tomorrow or use another key.',
      }
    }

    if (reason === 'keyInvalid' || reason === 'badRequest' || response.status === 400) {
      return {
        ok: false,
        status: 'invalid',
        message: 'Google rejected this key. Check that the YouTube Data API v3 is enabled.',
      }
    }

    if (response.status === 403) {
      return {
        ok: false,
        status: 'invalid',
        message: 'This key is restricted or out of quota. Check its API restrictions.',
      }
    }

    return {
      ok: false,
      status: 'error',
      message: 'Google could not verify the key right now. Please try again.',
    }
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      message:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'The check timed out. Check your connection and try again.'
          : 'Could not reach Google. Check your connection and try again.',
    }
  } finally {
    window.clearTimeout(timeout)
  }
}
