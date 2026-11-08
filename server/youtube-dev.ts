import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'
import {
  errorBody,
  fetchVideo,
  httpStatusFor,
  readServerKey,
  searchVideos,
} from './youtube'

type Next = (error?: unknown) => void

const SUCCESS_CACHE = 'public, s-maxage=86400, stale-while-revalidate=3600'

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  cacheControl = 'no-store',
): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheControl)
  res.end(JSON.stringify(body))
}

/**
 * Mirrors the Vercel edge routes during `vite` and `vite preview`, so the app
 * behaves the same locally with or without a shared YouTube key.
 */
export function youtubeApiPlugin(): Plugin {
  let apiKey: string | undefined

  const handle = async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const raw = req.url ?? '/'
    if (!raw.startsWith('/api/youtube/')) {
      next()
      return
    }

    const url = new URL(raw, 'http://localhost')
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'method_not_allowed' })
      return
    }

    if (url.pathname === '/api/youtube/status') {
      sendJson(res, 200, { configured: Boolean(apiKey) })
      return
    }

    if (url.pathname === '/api/youtube/search') {
      const query = url.searchParams.get('q')?.trim() ?? ''
      if (query.length < 3) {
        sendJson(res, 400, { error: 'invalid_query', message: 'Type at least 3 characters.' })
        return
      }
      if (!apiKey) {
        sendJson(res, 503, {
          error: 'not_configured',
          message: 'The shared YouTube key is not configured.',
        })
        return
      }
      try {
        sendJson(res, 200, await searchVideos(query, apiKey), SUCCESS_CACHE)
      } catch (error) {
        sendJson(res, httpStatusFor(error), errorBody(error))
      }
      return
    }

    if (url.pathname === '/api/youtube/video') {
      const id = url.searchParams.get('id')?.trim() ?? ''
      if (!id || id.includes('/')) {
        sendJson(res, 400, { error: 'invalid_query', message: 'A video id is required.' })
        return
      }
      if (!apiKey) {
        sendJson(res, 503, {
          error: 'not_configured',
          message: 'The shared YouTube key is not configured.',
        })
        return
      }
      try {
        sendJson(res, 200, { item: await fetchVideo(id, apiKey) }, SUCCESS_CACHE)
      } catch (error) {
        sendJson(res, httpStatusFor(error), errorBody(error))
      }
      return
    }

    sendJson(res, 404, { error: 'not_found' })
  }

  const middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => {
    void handle(req, res, next).catch((error: unknown) => {
      if (res.headersSent) {
        res.end()
        return
      }
      sendJson(res, 500, errorBody(error))
    })
  }

  return {
    name: 'lovify-youtube-api',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      apiKey = readServerKey({ ...env, ...process.env })
    },
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
