import * as React from "react"
import * as Sentry from "@sentry/react"
import { Trans } from "@lingui/react/macro"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)

    try {
      Sentry.withScope((scope) => {
        scope.setLevel("error")
        scope.setTag("source", "error-boundary")
        scope.setTag("error_name", error.name)
        scope.setContext("component_stack", {
          componentStack: errorInfo.componentStack,
        })
        Sentry.captureException(error)
      })
    } catch {
      // Keep rendering unaffected if Sentry is unavailable.
    }

    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <Trans>Something went wrong.</Trans>
            </p>
            <button
              onClick={this.resetError}
              className="mt-2 text-sm text-primary hover:underline"
              type="button"
            >
              <Trans>Try again</Trans>
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
