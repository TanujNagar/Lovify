import {
  errorBody,
  fetchVideo,
  httpStatusFor,
  readServerKey,
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
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? ''
  if (!id || id.includes('/')) {
    return json({ error: 'invalid_query', message: 'A video id is required.' }, 400)
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
    const item = await fetchVideo(id, key)
    return json({ item }, 200, 'public, s-maxage=86400, stale-while-revalidate=3600')
  } catch (error) {
    return json(errorBody(error), httpStatusFor(error))
  }
}
