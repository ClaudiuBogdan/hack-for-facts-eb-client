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
  /** Compact padding for smaller surfaces. */
  readonly compact?: boolean
  /**
   * Nest inside an already-bordered parent (e.g. territory drawer card).
   * Drops the outer section border and heavy nested chrome.
   */
  readonly embedded?: boolean
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
  embedded = false,
}: Props) {
  const message = error instanceof Error ? error.message : null

  return (
    <div
      role="alert"
      className={cn(
        !embedded && procurementSectionClassName,
        !embedded && (compact ? 'p-4' : 'p-6 sm:p-8'),
        className,
      )}
    >
      <div className={cn('flex items-start', embedded ? 'gap-3' : 'gap-4')}>
        <CircleAlert
          className={cn(
            'shrink-0 text-[var(--pnrr-muted)]',
            embedded ? 'mt-0.5 h-5 w-5' : 'mt-1 h-5 w-5',
          )}
          aria-hidden
        />
        <div
          className={cn(
            'min-w-0 flex-1',
            embedded ? 'space-y-2.5' : 'space-y-3',
          )}
        >
          <div>
            <p
              className={cn(
                'font-bold text-[var(--pnrr-fg)]',
                embedded ? 'text-sm' : 'text-base',
              )}
            >
              <Trans>The data could not be loaded</Trans>
            </p>
            <p
              className={cn(
                'text-[var(--pnrr-muted)]',
                embedded ? 'mt-1 text-sm leading-6' : 'mt-1 text-sm',
              )}
            >
              <Trans>
                Something went wrong while fetching procurement data. Try
                again — if the problem persists, the data source may be
                temporarily unavailable.
              </Trans>
            </p>
          </div>
          {message ? (
            <pre
              className={cn(
                'max-h-24 overflow-auto font-mono text-xs leading-5 text-[var(--pnrr-muted)]',
                embedded
                  ? 'py-0.5'
                  : 'border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-2 text-[var(--pnrr-fg)]',
              )}
            >
              {message}
            </pre>
          ) : null}
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              className={cn(
                procurementOutlineButtonClassName,
                embedded ? 'h-9 gap-2 px-3 text-xs' : 'h-10 gap-2 px-4',
              )}
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
