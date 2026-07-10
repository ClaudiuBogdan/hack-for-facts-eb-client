import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { StatisticsDatasetSummary } from '@/schemas/statistics'
import { DataStatusBadge } from './data-status-badge'
import { RequestDatasetAction } from './request-dataset-action'
import {
  explorerPeriodicityLabel,
  type ExplorerPeriodicity,
} from '../lib/explorer-chips'

type Props = {
  readonly dataset: StatisticsDatasetSummary
}

/**
 * One catalog row. The dataset name is the link; the matrix code is provenance,
 * shown as muted secondary text rather than as the row's identity.
 */
export function DatasetExplorerRow({ dataset }: Props) {
  const name = dataset.nameRo || dataset.nameEn || dataset.code
  const years = formatYearRange(dataset.yearRange)
  const periodicity = dataset.periodicity
    .map((value) => explorerPeriodicityLabel(value as ExplorerPeriodicity))
    .join(', ')

  return (
    <li className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/statistici/seturi/$cod"
            params={{ cod: dataset.code }}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {name}
          </Link>
          <DataStatusBadge status={dataset.dataStatus} />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{dataset.code}</span>
          {dataset.contextNameRo ? ` · ${dataset.contextNameRo}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground md:justify-end">
        {periodicity ? <span>{periodicity}</span> : null}
        <span>
          {years ?? <Trans>Interval necunoscut</Trans>}
        </span>
        {dataset.dataStatus === 'catalog-only' ? (
          <RequestDatasetAction
            datasetCode={dataset.code}
            datasetName={dataset.nameRo || dataset.nameEn}
          />
        ) : null}
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
