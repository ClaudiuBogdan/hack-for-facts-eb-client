import { Trans } from '@lingui/react/macro'
import { DataStatusBadge } from '@/components/shared/procurement-data/data-status-badge'
import { procurementDataStatus, type ProcurementAnswerMeta } from '@/schemas/procurement'
import { cn } from '@/lib/utils'

export function ProcurementAnswerabilityNotice({
  meta,
  className,
}: {
  readonly meta: ProcurementAnswerMeta
  readonly className?: string
}) {
  const status = procurementDataStatus(meta)
  return (
    <aside
      className={cn(
        'flex flex-col gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)] p-3 text-sm sm:flex-row sm:items-start',
        className,
      )}
    >
      <DataStatusBadge
        status={status}
        tooltip={meta.caveats[0]}
        label={
          meta.answerability === 'served'
            ? 'Live'
            : meta.answerability === 'degraded'
              ? 'Parțial'
              : 'Indisponibil'
        }
      />
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
        ) : (
          <p><Trans>Served from canonical procurement records.</Trans></p>
        )}
      </div>
    </aside>
  )
}
