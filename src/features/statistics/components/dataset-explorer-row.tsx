import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { StatisticsDatasetSummary } from '@/schemas/statistics'
import { DataStatusBadge } from './data-status-badge'
import { RequestDatasetAction } from './request-dataset-action'
import { explorerPeriodicityLabel, type ExplorerPeriodicity } from '../lib/explorer-chips'
import { formatHubPeriod } from '../lib/hub-format'

type Props = {
  readonly dataset: StatisticsDatasetSummary
}

/**
 * One catalog row. The name is the link; the matrix code and the context are
 * provenance, one quiet line under it. The right column says what the reader
 * can expect to open: the cadence and the latest period with observations.
 *
 * A status badge appears only when the dataset is catalog-only — an
 * „available" badge on every row of an all-available catalog is noise, and
 * the honesty it stood for lives in the status control and the row count.
 */
export function DatasetExplorerRow({ dataset }: Props) {
  const name = dataset.nameRo || dataset.nameEn || dataset.code
  const periodicity = dataset.periodicity
    .map((value) => explorerPeriodicityLabel(value as ExplorerPeriodicity))
    .join(', ')
  const catalogOnly = dataset.dataStatus === 'catalog-only'
  const years = formatYearRange(dataset.yearRange)

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to="/ins/seturi/$cod"
            params={{ cod: dataset.code }}
            className="text-sm font-medium leading-snug text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {name}
          </Link>
          {catalogOnly ? <DataStatusBadge status={dataset.dataStatus} /> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{dataset.code}</span>
          {dataset.contextNameRo ? <span> · {dataset.contextNameRo}</span> : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-y-0.5 sm:text-right">
        {periodicity ? <span>{periodicity}</span> : null}
        {catalogOnly ? (
          <RequestDatasetAction datasetCode={dataset.code} datasetName={dataset.nameRo || dataset.nameEn} />
        ) : dataset.latestPeriod ? (
          <span className="tabular-nums">
            <Trans>până în {formatHubPeriod(dataset.latestPeriod)}</Trans>
          </span>
        ) : years ? (
          // The catalog's declared span — what INS Tempo publishes, which can
          // run wider than what is loaded here. The detail page says exactly.
          <span className="tabular-nums">{years}</span>
        ) : (
          <span>
            <Trans>Interval necunoscut</Trans>
          </span>
        )}
      </div>
    </li>
  )
}

/** `[1992, 2024]` → `1992–2024`; a single-year range renders as that year. */
function formatYearRange(range: readonly number[] | null): string | null {
  if (!range || range.length === 0) return null
  const first = range[0]
  const last = range[range.length - 1]
  return first === last ? String(first) : `${first}–${last}`
}
