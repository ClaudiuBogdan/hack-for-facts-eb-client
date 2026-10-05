import { Suspense, type ReactNode } from 'react'
import { ErrorBoundary } from '@sentry/react'
import { QueryErrorResetBoundary } from '@tanstack/react-query'

import { NationalBudgetAdapterProvider } from '@/features/national-budget/page/api/adapter-provider'
import { nationalBudgetMockAdapter } from '@/features/national-budget/page/api/national-budget-page-api.mock'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { withDemo } from './page.demo'
import type { Demo } from './page.state'

/** Both pages read the feature's mock adapter, or a `?demo=` state of it. */
export function BudgetShell({ demo, children }: { readonly demo: Demo | null; readonly children: ReactNode }) {
  return <NationalBudgetAdapterProvider adapter={withDemo(nationalBudgetMockAdapter, demo)}>{children}</NationalBudgetAdapterProvider>
}

/**
 * A band's own read: its shape while pending, the hubs' error with a retry when
 * it fails; the page around it stands. `framed` puts the error in the page's
 * ruled column (a read that fills a whole band); `quiet` replaces it with the
 * given node (a line whose failure the page can say without: the sources).
 */
export function BandRead({
  fallback,
  children,
  framed = false,
  quiet,
}: {
  readonly fallback: ReactNode
  readonly children: ReactNode
  readonly framed?: boolean
  readonly quiet?: ReactNode
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={({ resetError }) => {
            if (quiet !== undefined) return <>{quiet}</>
            const error = (
              <HubLoadError
                onRetry={() => {
                  reset()
                  resetError()
                }}
              />
            )
            return framed ? <RuledFrame className="py-10">{error}</RuledFrame> : error
          }}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}
