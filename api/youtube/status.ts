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

export default function handler(): Response {
  return json({ configured: Boolean(process.env.YOUTUBE_API_KEY?.trim()) })
}
