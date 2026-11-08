import {
  errorBody,
  httpStatusFor,
  readServerKey,
  searchVideos,
} from '../../server/youtube'

export const config = { runtime: 'edge' }

function json(body: unknown, status = 200, cacheControl = 'no-store'): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  })
}

export default async function handler(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 3) {
    return json({ error: 'invalid_query', message: 'Type at least 3 characters.' }, 400)
  }

  const key = readServerKey(process.env)
  if (!key) {
    return json(
      {
        error: 'not_configured',
        message: 'The shared YouTube key is not configured.',
      },
      503,
    )
  }

  try {
    const payload = await searchVideos(query, key)
    return json(payload, 200, 'public, s-maxage=86400, stale-while-revalidate=3600')
  } catch (error) {
    return json(errorBody(error), httpStatusFor(error))
  }
}
