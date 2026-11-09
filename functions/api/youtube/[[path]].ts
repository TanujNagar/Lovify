import {
  errorBody,
  fetchVideo,
  httpStatusFor,
  readServerKey,
  searchVideos,
} from '../../../server/youtube'

/**
 * Cloudflare Pages Function that mirrors the Vercel edge routes in `api/`.
 *
 * Cloudflare does not expose `process.env`; bindings arrive on `context.env`,
 * so the shared key is read from there and never reaches the browser bundle.
 * Deploy: set `YOUTUBE_API_KEY` under Pages → Settings → Environment variables.
 */

type Env = {
  YOUTUBE_API_KEY?: string
}

type PagesContext = {
  request: Request
  env: Env
  params: Record<string, string | string[]>
}

const SUCCESS_CACHE = 'public, s-maxage=86400, stale-while-revalidate=3600'

function json(body: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  })
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url)
  const key = readServerKey(context.env)

  if (url.pathname === '/api/youtube/status') {
    return json({ configured: Boolean(key) })
  }

  if (url.pathname === '/api/youtube/search') {
    const query = url.searchParams.get('q')?.trim() ?? ''
    if (query.length < 3) {
      return json({ error: 'invalid_query', message: 'Type at least 3 characters.' }, 400)
    }
    if (!key) {
      return json(
        { error: 'not_configured', message: 'The shared YouTube key is not configured.' },
        503,
      )
    }
    try {
      return json(await searchVideos(query, key), 200, SUCCESS_CACHE)
    } catch (error) {
      return json(errorBody(error), httpStatusFor(error))
    }
  }

  if (url.pathname === '/api/youtube/video') {
    const id = url.searchParams.get('id')?.trim() ?? ''
    if (!id || id.includes('/')) {
      return json({ error: 'invalid_query', message: 'A video id is required.' }, 400)
    }
    if (!key) {
      return json(
        { error: 'not_configured', message: 'The shared YouTube key is not configured.' },
        503,
      )
    }
    try {
      return json({ item: await fetchVideo(id, key) }, 200, SUCCESS_CACHE)
    } catch (error) {
      return json(errorBody(error), httpStatusFor(error))
    }
  }

  return json({ error: 'not_found' }, 404)
}
