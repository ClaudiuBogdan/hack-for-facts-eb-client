import { Trans } from '@lingui/react/macro'
import { CircleAlert, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  procurementOutlineButtonClassName,
  procurementSectionClassName,
} from '../lib/procurement-theme'

type Props = {
  readonly error?: unknown
  readonly onRetry?: () => void
  readonly isRetrying?: boolean
  readonly className?: string
  /** Compact variant for embedded slices (company page). */
  readonly compact?: boolean
}

/**
 * Bordered error panel with a retry action (PnrrDataErrorState pattern).
 * Render only when `isError && !data` — a failed background refetch must not
 * blow away good data.
 */
export function ProcurementErrorState({
  error,
  onRetry,
  isRetrying = false,
  className,
  compact = false,
}: Props) {
  const message = error instanceof Error ? error.message : null

  return (
    <div
      role="alert"
      className={cn(
        procurementSectionClassName,
        compact ? 'p-4' : 'p-6 sm:p-8',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--pnrr-border)]">
          <CircleAlert className="h-5 w-5 text-[var(--pnrr-fg)]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-base font-bold text-[var(--pnrr-fg)]">
              <Trans>The data could not be loaded</Trans>
            </p>
            <p className="mt-1 text-sm text-[var(--pnrr-muted)]">
              <Trans>
                Something went wrong while fetching procurement data. Try
                again — if the problem persists, the data source may be
                temporarily unavailable.
              </Trans>
            </p>
          </div>
          {message ? (
            <pre className="max-h-24 overflow-auto border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-2 text-xs text-[var(--pnrr-fg)]">
              {message}
            </pre>
          ) : null}
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              className={cn(procurementOutlineButtonClassName, 'h-10 gap-2 px-4')}
              onClick={onRetry}
              disabled={isRetrying}
            >
              <RotateCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
                aria-hidden
              />
              <Trans>Retry</Trans>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
