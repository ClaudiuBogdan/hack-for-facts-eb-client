import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  isProcurementHubDevPanelEnabled,
  PROCUREMENT_HUB_CAPABILITY_MATRIX,
  type HubCapabilityStatus,
} from '@/schemas/procurement-hub'

function statusLabel(status: HubCapabilityStatus): string {
  if (status === 'live') return t`Live`
  if (status === 'preview') return t`Preview`
  return t`TODO`
}

/**
 * Collapsed developer matrix for hub filter capabilities (F3).
 * TODO(shared hub): remove or shrink when the capability matrix is fully live.
 */
export function ProcurementHubDevPanel({
  className,
}: {
  readonly className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!isProcurementHubDevPanelEnabled()) return null

  return (
    <section
      className={cn(
        'border-2 border-dashed border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)]',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        )}
        <Trans>Dev: hub filter capabilities</Trans>
      </button>
      {open ? (
        <div className="overflow-x-auto border-t-2 border-dashed border-[var(--pnrr-border)] px-4 py-3">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[var(--pnrr-muted)]">
                <th className="py-1 pr-3 font-bold">
                  <Trans>Capability</Trans>
                </th>
                <th className="py-1 pr-3 font-bold">
                  <Trans>Overview</Trans>
                </th>
                <th className="py-1 pr-3 font-bold">
                  <Trans>List</Trans>
                </th>
                <th className="py-1 font-bold">
                  <Trans>Note</Trans>
                </th>
              </tr>
            </thead>
            <tbody>
              {PROCUREMENT_HUB_CAPABILITY_MATRIX.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-[var(--pnrr-border)]/40 text-[var(--pnrr-fg)]"
                >
                  <td className="py-1.5 pr-3 font-semibold">{row.label}</td>
                  <td className="py-1.5 pr-3">{statusLabel(row.overview)}</td>
                  <td className="py-1.5 pr-3">{statusLabel(row.list)}</td>
                  <td className="py-1.5 text-[var(--pnrr-muted)]">
                    {row.note ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
