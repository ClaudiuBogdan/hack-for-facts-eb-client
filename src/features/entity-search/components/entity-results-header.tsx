import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { TriangleAlert } from 'lucide-react'
import type { EntitySearchEngine } from '@/schemas/entity-search'
import { formatInteger } from '@/features/private-companies/lib/formatting'

type Props = {
  /** The hits on screen; null while no answer has arrived yet. */
  readonly shownCount: number | null
  /**
   * The index generation's candidate estimate, or null when it must not be
   * shown (a non-current answer). Never a count of the hits shown: hidden
   * candidates make those fewer.
   */
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
  const shownLabel = shownCount === null ? null : formatInteger(shownCount)
  const totalLabel =
    estimatedTotalHits === null ? null : formatInteger(estimatedTotalHits)

  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        id="entity-search-results-heading"
        aria-live="polite"
        className="text-xs font-bold uppercase tracking-widest text-[var(--pnrr-muted)]"
      >
        {shownLabel === null ? (
          <Trans>Rezultate</Trans>
        ) : totalLabel === null ? (
          <Trans>Rezultate — {shownLabel} afișate</Trans>
        ) : (
          <Trans>
            Rezultate — {shownLabel} afișate · ~{totalLabel} candidați estimați
            în index
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
