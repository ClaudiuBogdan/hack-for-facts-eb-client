import { sourceRowSelection } from '@/lib/ins/source-series'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { StatisticsLatestValue } from '@/schemas/statistics'
import { formatObservationValue } from '../../lib/format'
import { statisticsTheme } from '../../lib/statistics-theme'

type StatTileBodyProps = {
  readonly shortLabel: string
  readonly latest: StatisticsLatestValue
  readonly comparison?: ReactNode
}

/**
 * Three-tier stat tile body: muted label → strong value → quiet metadata.
 * The matrix code is a mono provenance chip, never the label.
 */
function StatTileBody({ shortLabel, latest, comparison }: StatTileBodyProps) {
  const unitLabel = latest.unitSymbol ?? latest.unitNameRo
  const ambiguous = latest.matchStrategy === 'AMBIGUOUS_GEOGRAPHY'
  const formatted =
    latest.hasData && !ambiguous
      ? latest.source
        ? latest.value
        : formatObservationValue(latest.value)
      : null

  return (
    <>
      <span className={statisticsTheme.statTileLabel}>{shortLabel}</span>
      {formatted !== null ? (
        <span className={`${statisticsTheme.statTileValue} min-w-0 break-all`}>
          {formatted}
          {unitLabel ? (
            <span className={statisticsTheme.statTileUnit}> {unitLabel}</span>
          ) : null}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          {ambiguous ? (
            <Trans>
              Mai multe serii INS corespund selecției. Alege o serie din sursă.
            </Trans>
          ) : (
            <Trans>Fără date pentru această perioadă</Trans>
          )}
        </span>
      )}
      <span className={statisticsTheme.statTileMeta}>
        {latest.period ?? '—'}
        {latest.matchStrategy === 'REPRESENTATIVE_FALLBACK' ? (
          <>
            {' · '}
            <span className="text-amber-700 dark:text-amber-400">
              <Trans>selecție reprezentativă</Trans>
            </span>
          </>
        ) : null}
      </span>
      {latest.valueStatus !== null ? (
        <span className="text-xs text-amber-700 dark:text-amber-400">
          <Trans>Marcaj INS:</Trans> {latest.valueStatus || '∅'}
        </span>
      ) : null}
      {latest.source?.observation?.dimensions.geography?.qualified ? (
        <span className="text-xs text-amber-700 dark:text-amber-400">
          <Trans>Geografie cu limitări de acoperire</Trans>
        </span>
      ) : null}
      {latest.hasData && !ambiguous ? comparison : null}
      <span
        className={statisticsTheme.provenanceChip}
        aria-label={t`Matrice INS`}
      >
        {latest.datasetCode}
      </span>
    </>
  )
}

/** National tile → dataset detail (țara has no territory hub). */
export function NationalStatTile({
  shortLabel,
  latest,
}: {
  readonly shortLabel: string
  readonly latest: StatisticsLatestValue
}) {
  return (
    <Link
      to="/statistici/seturi/$cod"
      params={{ cod: latest.datasetCode }}
      search={{
        teritoriu: 'cod:RO',
        ...(sourceRowSelection(
          latest.source?.descriptor,
          latest.source?.observation,
        ) ?? {}),
        ...(latest.resolvedPeriodicity &&
        ['ANNUAL', 'QUARTERLY', 'MONTHLY'].includes(latest.resolvedPeriodicity)
          ? {
              frecventa: latest.resolvedPeriodicity as
                'ANNUAL' | 'QUARTERLY' | 'MONTHLY',
            }
          : {}),
      }}
      className={`${statisticsTheme.statTile} min-w-0`}
      title={latest.datasetNameRo ?? undefined}
    >
      <StatTileBody shortLabel={shortLabel} latest={latest} />
    </Link>
  )
}

/** „Locul tău" tile → the territory hub for the picked SIRUTA. */
export function UatStatTile({
  shortLabel,
  latest,
  siruta,
  comparison,
}: {
  readonly shortLabel: string
  readonly latest: StatisticsLatestValue
  readonly siruta: string
  readonly comparison?: ReactNode
}) {
  return (
    <Link
      to="/statistici/teritorii/$siruta"
      params={{ siruta }}
      className={`${statisticsTheme.statTile} min-w-0`}
      title={latest.datasetNameRo ?? undefined}
    >
      <StatTileBody
        shortLabel={shortLabel}
        latest={latest}
        comparison={comparison}
      />
    </Link>
  )
}
