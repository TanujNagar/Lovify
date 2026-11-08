import { ProviderError, type ProviderErrorCode } from '@/lib/providers/types'
import type { ProviderId } from '@/types/music'

type FetchJsonOptions = {
  provider: ProviderId
  signal?: AbortSignal
  timeoutMs?: number
  headers?: Record<string, string>
  errorCode?: ProviderErrorCode
}

/**
 * Small JSON fetcher with a timeout and calm error messages.
 * It never logs URLs, headers or response bodies, because API keys can be
 * present in provider request URLs.
 */
export async function fetchJson<T>(url: URL | string, options: FetchJsonOptions): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 12_000,
  )

  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: options.headers,
      cache: 'no-store',
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ProviderError(
          options.errorCode ?? 'unauthorized',
          options.provider,
          'This music source refused the request. Add a key in Settings or try again later.',
        )
      }
      throw new ProviderError(
        options.errorCode ?? 'network',
        options.provider,
        'This music source is unavailable right now.',
      )
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ProviderError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ProviderError('aborted', options.provider, 'Search was cancelled.')
    }
    throw new ProviderError(
      options.errorCode ?? 'network',
      options.provider,
      'Could not reach this music source. Check your connection and try again.',
    )
  } finally {
    window.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof ProviderError && error.code === 'aborted'
}
