import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { TriangleAlert } from 'lucide-react'
import type { EntitySearchEngine } from '@/schemas/entity-search'
import { formatInteger } from '@/features/private-companies/lib/formatting'

type Props = {
  readonly shownCount: number
  readonly estimatedTotalHits: number | null
  readonly engine: EntitySearchEngine | null
  /**
   * The server could not reach the search engine and answered from its reduced
   * outage path. Previously inferred from `engine === 'postgres'`, which is a
   * proxy: it says which engine replied, not whether the answer is complete.
   */
  readonly degraded: boolean
}

export function EntityResultsHeader({
  shownCount,
  estimatedTotalHits,
  engine,
  degraded,
}: Props) {
  const shownRange =
    shownCount > 0 ? `1–${formatInteger(shownCount)}` : formatInteger(0)
  const totalLabel =
    estimatedTotalHits === null ? null : formatInteger(estimatedTotalHits)

  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        id="entity-search-results-heading"
        aria-live="polite"
        className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]"
      >
        {totalLabel === null ? (
          <Trans>Rezultate</Trans>
        ) : (
          <Trans>
            Rezultate — {shownRange} din ~{totalLabel}
          </Trans>
        )}
      </h2>

      {degraded ? (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]"
          title={t`Motorul de căutare este indisponibil. Se caută doar după cod fiscal exact, deci lista poate fi incompletă — reîncercați mai târziu.`}
        >
          <TriangleAlert aria-hidden="true" className="h-3 w-3" />
          <Trans>Căutare limitată</Trans>
        </span>
      ) : engine ? (
        <span className="hidden text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]/70 sm:inline">
          · {engine}
        </span>
      ) : null}
    </div>
  )
}
