import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'

type Props = {
  readonly className?: string
  /** Optional short reason shown to screen readers / tooltip consumers. */
  readonly reason?: string
}

/**
 * Badge for UI that is intentionally ahead of the serving API.
 *
 * Convention (decision C1, 2026-07):
 * - Use only when the surface shows mock / placeholder behaviour.
 * - Pair with a `TODO(...)` comment naming the required API/scraper contract
 *   (ClickHouse, OpenSearch, MiniSearch, GraphQL matrix, etc.).
 * - Never badge live GraphQL answers as Preview.
 */
export function ProcurementPreviewBadge({ className, reason }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-[var(--pnrr-muted)]',
        className,
      )}
      title={reason}
    >
      <Trans>Preview</Trans>
    </span>
  )
}
