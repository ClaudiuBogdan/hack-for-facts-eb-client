import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { formatLegalNumber, formatLegalPercent } from '../lib/legal-format'
import { useLegislationStatusCounts } from '../hooks/use-legislation'
import {
  legislationSectionClassName,
  legislationSectionFootnoteClassName,
  legislationStatLabelClassName,
  legislationStatMetaClassName,
  legislationStatValueClassName,
} from '../lib/legislation-theme'

/**
 * Four headline counts, all from ONE `legalActCounts(groupBy: STATUS)`
 * request (`useLegislationStatusCounts`) — they used to be four aliased
 * per-status `totalCount` queries riding the overview. STATUS partitions the
 * corpus exactly, so each number equals the filter it replaced (verified
 * live 2026-08-26, before and after: 224 539 / 194 924 / 6 542 / 22 887).
 *
 * The aggregate rides its own request, so its failure degrades only this
 * strip: a tile whose number is unknown renders label-only — a reserved
 * blank, NEVER 0, exactly the domain grid's contract (0 and "unknown" are
 * different claims; the adapter serves a true 0 only when the response
 * proves it) — and on failure the footnote says the numbers could not load.
 *
 * The citation-edge and gazette-issue totals deliberately do NOT appear
 * here: the server cannot answer either (`moIssues` requires a year), so
 * they live in the honesty notes with their measurement date instead.
 */
export function LegislationKpiStrip() {
  const { i18n } = useLingui()
  const { data: counts, isError: countsFailed } = useLegislationStatusCounts()
  const format = (value: number | undefined) =>
    value !== undefined ? formatLegalNumber(value, i18n.locale) : undefined

  const inForceShare =
    counts?.inVigoare !== undefined &&
    counts.total !== undefined &&
    counts.total > 0
      ? formatLegalPercent(counts.inVigoare / counts.total, i18n.locale)
      : undefined

  const tiles = [
    {
      key: 'total',
      label: <Trans>Acte normative</Trans>,
      value: format(counts?.total),
      meta: <Trans>Portal Legislativ</Trans>,
    },
    {
      key: 'in-vigoare',
      label: <Trans>În vigoare</Trans>,
      value: format(counts?.inVigoare),
      meta:
        inForceShare !== undefined ? (
          <Trans>{inForceShare} din total</Trans>
        ) : null,
    },
    {
      key: 'modificat',
      label: <Trans>Modificate</Trans>,
      value: format(counts?.modificat),
      meta: <Trans>cu statut „modificat”</Trans>,
    },
    {
      key: 'abrogat',
      label: <Trans>Abrogate</Trans>,
      value: format(counts?.abrogat),
      meta: <Trans>nu mai produc efecte</Trans>,
    },
  ]

  return (
    <section
      aria-label={t`Cifre de ansamblu`}
      className={legislationSectionClassName}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="border-b border-[var(--pnrr-subtle)] px-5 py-5 last:border-b-0 sm:px-6 lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <div className={legislationStatLabelClassName}>{tile.label}</div>
            {/* The value line is reserved even before a number exists, so
                counts arriving after hydration do not shift the bands below.
                Unknown ⇒ blank — never 0. */}
            <div className={legislationStatValueClassName}>
              {tile.value ?? '\u00A0'}
            </div>
            <div className={cn(legislationStatMetaClassName, 'min-h-4')}>
              {tile.meta}
            </div>
          </div>
        ))}
      </div>
      {countsFailed ? (
        <div className={legislationSectionFootnoteClassName}>
          <Trans>
            Cifrele nu au putut fi încărcate. Nu afișăm zerouri în locul unor
            numere necunoscute.
          </Trans>
        </div>
      ) : null}
    </section>
  )
}
