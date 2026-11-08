/**
 * Shared YouTube Data API helpers for the serverless routes and the local Vite
 * middleware. The API key is only ever read on the server, never bundled into
 * the client application.
 */

export const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

export type YouTubeThumbnails = {
  default?: { url?: string }
  medium?: { url?: string }
  high?: { url?: string }
  maxres?: { url?: string }
}

export type YouTubeSnippet = {
  title?: string
  channelTitle?: string
  channelId?: string
  publishedAt?: string
  thumbnails?: YouTubeThumbnails
}

export type YouTubeSearchItem = {
  id?: { videoId?: string }
  snippet?: YouTubeSnippet
}

export type YouTubeVideoItem = {
  id?: string
  snippet?: YouTubeSnippet
  contentDetails?: { duration?: string }
}

export type YouTubeSearchPayload = {
  items?: YouTubeSearchItem[]
  details?: YouTubeVideoItem[]
}

type YouTubeErrorPayload = {
  error?: {
    code?: number
    message?: string
    errors?: Array<{ reason?: string }>
  }
}

export type YouTubeErrorCode =
  | 'not_configured'
  | 'quota'
  | 'unauthorized'
  | 'network'
  | 'upstream'
  | 'invalid_query'

export class YouTubeRequestError extends Error {
  readonly code: YouTubeErrorCode

  constructor(code: YouTubeErrorCode, message: string) {
    super(message)
    this.name = 'YouTubeRequestError'
    this.code = code
  }
}

async function requestJson<T>(
  url: URL,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; payload: T | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    const payload = (await response.json().catch(() => null)) as T | null
    return { ok: response.ok, status: response.status, payload }
  } catch {
    throw new YouTubeRequestError('network', 'YouTube did not answer in time.')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

function upstreamError(status: number, payload: YouTubeErrorPayload | null): YouTubeRequestError {
  const reason = payload?.error?.errors?.[0]?.reason
  if (
    status === 403 ||
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    reason === 'rateLimitExceeded'
  ) {
    return new YouTubeRequestError(
      'quota',
      'YouTube quota is used up for today. Lovify switched to free sources.',
    )
  }
  if (
    status === 400 ||
    status === 401 ||
    reason === 'keyInvalid' ||
    reason === 'badRequest' ||
    reason === 'ipRefererBlocked' ||
    reason === 'forbidden'
  ) {
    return new YouTubeRequestError(
      'unauthorized',
      'The shared YouTube key was rejected. Check the server configuration.',
    )
  }
  return new YouTubeRequestError('upstream', 'YouTube is unavailable right now.')
}

export function readServerKey(env: Record<string, string | undefined>): string | undefined {
  return env.YOUTUBE_API_KEY?.trim() || undefined
}

export async function searchVideos(
  query: string,
  key: string,
  signal?: AbortSignal,
): Promise<YouTubeSearchPayload> {
  const searchUrl = new URL(`${YOUTUBE_API}/search`)
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '20')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set(
    'fields',
    'items(id/videoId,snippet(title,channelTitle,channelId,publishedAt,thumbnails))',
  )
  searchUrl.searchParams.set('key', key)

  const search = await requestJson<YouTubeSearchPayload & YouTubeErrorPayload>(searchUrl, signal)
  if (!search.ok || !search.payload) throw upstreamError(search.status, search.payload)

  const items = search.payload.items ?? []
  const ids = items
    .map((item) => item.id?.videoId)
    .filter((id): id is string => Boolean(id))

  if (!ids.length) return { items: [], details: [] }

  const detailUrl = new URL(`${YOUTUBE_API}/videos`)
  detailUrl.searchParams.set('part', 'snippet,contentDetails')
  detailUrl.searchParams.set('id', ids.join(','))
  detailUrl.searchParams.set('fields', 'items(id,snippet,contentDetails/duration)')
  detailUrl.searchParams.set('key', key)

  let details: YouTubeVideoItem[] = []
  try {
    const detailResponse = await requestJson<{ items?: YouTubeVideoItem[] } & YouTubeErrorPayload>(
      detailUrl,
      signal,
    )
    if (detailResponse.ok) details = detailResponse.payload?.items ?? []
  } catch {
    // Search results are still useful without exact durations.
  }

  return { items, details }
}

export async function fetchVideo(
  id: string,
  key: string,
  signal?: AbortSignal,
): Promise<YouTubeVideoItem | null> {
  const url = new URL(`${YOUTUBE_API}/videos`)
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('id', id)
  url.searchParams.set('fields', 'items(id,snippet,contentDetails/duration)')
  url.searchParams.set('key', key)

  const response = await requestJson<{ items?: YouTubeVideoItem[] } & YouTubeErrorPayload>(
    url,
    signal,
  )
  if (!response.ok || !response.payload) throw upstreamError(response.status, response.payload)
  return response.payload.items?.[0] ?? null
}

export function httpStatusFor(error: unknown): number {
  if (error instanceof YouTubeRequestError) {
    switch (error.code) {
      case 'not_configured':
        return 503
      case 'quota':
        return 403
      case 'unauthorized':
        return 502
      case 'network':
        return 504
      case 'invalid_query':
        return 400
      default:
        return 502
    }
  }
  return 500
}

export function errorBody(error: unknown): { error: string; message: string } {
  if (error instanceof YouTubeRequestError) {
    return { error: error.code, message: error.message }
  }
  return { error: 'unknown', message: 'YouTube is unavailable right now.' }
}
