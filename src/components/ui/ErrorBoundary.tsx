import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Icon } from '@/components/brand/Icon'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className={cn(
            'flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center',
            'bg-surface-container-low rounded-2xl m-4 p-6',
          )}
          role="alert"
        >
          <Icon name="error" size="lg" className="text-error" />
          <h2 className="font-title-lg text-title-lg text-on-surface">Something went wrong</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={this.reset}>
              <Icon name="refresh" size="sm" />
              Try again
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <Icon name="restart_alt" size="sm" />
              Reload app
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 w-full max-w-md text-left">
              <summary className="font-caption text-caption text-on-surface-variant cursor-pointer">
                Error details (development)
              </summary>
              <pre className="mt-2 p-3 text-xs overflow-auto bg-surface-container-highest rounded-lg text-on-surface-variant">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * A specialized error boundary for media playback errors.
 */
export class PlaybackErrorBoundary extends Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 px-4 text-center bg-error-container/20 rounded-xl">
          <Icon name="volume_off" size="lg" className="text-error" />
          <p className="font-title-md text-title-md text-on-surface">Playback error</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            This track could not be played.
          </p>
          <Button variant="primary" onClick={this.reset}>
            <Icon name="skip_next" size="sm" />
            Skip track
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}