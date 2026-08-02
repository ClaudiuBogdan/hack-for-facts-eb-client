import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { LegalActCounts } from '@/schemas/legal'
import { formatLegalNumber, formatLegalPercent } from '../lib/legal-format'
import {
  legislationSectionClassName,
  legislationStatLabelClassName,
  legislationStatMetaClassName,
  legislationStatValueClassName,
} from '../lib/legislation-theme'

type Props = {
  readonly counts: LegalActCounts
}

/**
 * Four headline counts. Each is one
 * `legalActs(filter: { status }, first: 1).totalCount` — cheap, and no aggregate
 * required. The citation-edge and gazette-issue totals deliberately do NOT
 * appear here: the server cannot answer either (`moIssues` requires a year), so
 * they live in the honesty notes with their measurement date instead.
 */
export function LegislationKpiStrip({ counts }: Props) {
  const { i18n } = useLingui()
  const format = (value: number) => formatLegalNumber(value, i18n.locale)

  const inForceShare = formatLegalPercent(
    counts.total > 0 ? counts.inVigoare / counts.total : 0,
    i18n.locale,
  )

  const tiles = [
    {
      key: 'total',
      label: <Trans>Acte normative</Trans>,
      value: format(counts.total),
      meta: <Trans>Portal Legislativ</Trans>,
    },
    {
      key: 'in-vigoare',
      label: <Trans>În vigoare</Trans>,
      value: format(counts.inVigoare),
      meta: <Trans>{inForceShare} din total</Trans>,
    },
    {
      key: 'modificat',
      label: <Trans>Modificate</Trans>,
      value: format(counts.modificat),
      meta: <Trans>cu statut „modificat”</Trans>,
    },
    {
      key: 'abrogat',
      label: <Trans>Abrogate</Trans>,
      value: format(counts.abrogat),
      meta: <Trans>nu mai produc efecte</Trans>,
    },
  ]

  return (
    <section
      aria-label={t`Cifre de ansamblu`}
      className={cn(
        legislationSectionClassName,
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      )}
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="border-b-2 border-[var(--pnrr-border)] px-5 py-5 last:border-b-0 sm:px-6 lg:border-b-0 lg:border-r-2 lg:last:border-r-0"
        >
          <div className={legislationStatLabelClassName}>{tile.label}</div>
          <div className={legislationStatValueClassName}>{tile.value}</div>
          <div className={legislationStatMetaClassName}>{tile.meta}</div>
        </div>
      ))}
    </section>
  )
}
