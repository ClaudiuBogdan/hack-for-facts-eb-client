import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { TriangleAlert } from 'lucide-react'
import type { EntitySearchEngine } from '@/schemas/entity-search'
import { formatInteger } from '@/features/private-companies/lib/formatting'

type Props = {
  readonly shownCount: number
  readonly estimatedTotalHits: number | null
  readonly engine: EntitySearchEngine | null
}

export function EntityResultsHeader({
  shownCount,
  estimatedTotalHits,
  engine,
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

      {engine === 'postgres' ? (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]"
          title={t`Motorul de căutare full-text este indisponibil; se folosește căutarea simplă.`}
        >
          <TriangleAlert aria-hidden="true" className="h-3 w-3" />
          <Trans>Căutare simplă</Trans>
        </span>
      ) : engine ? (
        <span className="hidden text-[10px] font-bold uppercase tracking-widest text-[var(--pnrr-muted)]/70 sm:inline">
          · {engine}
        </span>
      ) : null}
    </div>
  )
}
