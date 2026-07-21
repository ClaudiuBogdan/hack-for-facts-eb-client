import { Trans } from '@lingui/react/macro'
import { DataStatusBadge } from '@/components/shared/procurement-data/data-status-badge'
import {
  procurementDataStatus,
  type ProcurementAnswerMeta,
} from '@/schemas/procurement'
import { cn } from '@/lib/utils'

/**
 * Coverage honesty notice — only when the answer is degraded or abstained.
 * Fully served answers need no status card (all data is production).
 */
export function ProcurementAnswerabilityNotice({
  meta,
  className,
}: {
  readonly meta: ProcurementAnswerMeta
  readonly className?: string
}) {
  if (meta.answerability === 'served' && meta.caveats.length === 0) {
    return null
  }

  const status = procurementDataStatus(meta)

  return (
    <aside
      className={cn(
        'flex flex-col gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-3 text-sm sm:flex-row sm:items-start',
        className,
      )}
    >
      {meta.answerability !== 'served' ? (
        <DataStatusBadge
          status={status}
          tooltip={meta.caveats[0]}
          label={
            meta.answerability === 'degraded' ? 'Parțial' : 'Indisponibil'
          }
        />
      ) : null}
      <div className="min-w-0 text-[var(--pnrr-muted)]">
        {meta.answerability === 'abstained' ? (
          <p className="font-semibold text-[var(--pnrr-fg)]">
            <Trans>This answer is unavailable; no value was substituted.</Trans>
          </p>
        ) : null}
        {meta.caveats.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {meta.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  )
}
