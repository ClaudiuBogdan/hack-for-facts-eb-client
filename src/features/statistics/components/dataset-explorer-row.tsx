import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { StatisticsDatasetSummary } from '@/schemas/statistics'
import { DataStatusBadge } from './data-status-badge'
import { RequestDatasetAction } from './request-dataset-action'
import { cn } from '@/lib/utils'
import { contextDisplayName, datasetDisplayName } from '../lib/dataset-names'
import { isInsPeriodicity, periodicityTitle } from '../lib/periodicity-labels'
import { statisticsTheme } from '../lib/statistics-theme'

type Props = {
  readonly dataset: StatisticsDatasetSummary
  /**
   * The context the list is filtered by. A row whose context is that one says
   * nothing new by repeating it, so it stays quiet about it.
   */
  readonly filteredContextCode?: string
}

/**
 * One catalog row. The name is the link; the matrix code and the context are
 * provenance, one quiet line under it. The right column says what the reader
 * can expect to open: the cadence and the span INS Tempo declares for the
 * matrix — the catalog carries no loaded range, so the span is named as the
 * publisher's, and the dataset page says exactly.
 *
 * A status badge appears only when the dataset is catalog-only — an
 * „available" badge on every row of an all-available catalog is noise, and
 * the honesty it stood for lives in the badge and the row count.
 *
 * The whole row is the link's target (`after:inset-0`), so the pointer does
 * not have to find the title. Two things sit above that overlay on purpose:
 * the request action, which is its own control, and the matrix code, because
 * it is the string a reader copies out of this page into INS Tempo and an
 * overlay would make it unselectable.
 */
export function DatasetExplorerRow({ dataset, filteredContextCode }: Props) {
  const { i18n } = useLingui()
  const name = datasetDisplayName(dataset, i18n.locale)
  // A cadence this module has no word for is left out, not printed as a comma.
  const periodicity = dataset.periodicity.filter(isInsPeriodicity).map(periodicityTitle).join(', ')
  const catalogOnly = dataset.dataStatus === 'catalog-only'
  const years = formatYearRange(dataset.yearRange)
  const context =
    dataset.contextCode && dataset.contextCode === filteredContextCode
      ? null
      : contextDisplayName(dataset, i18n.locale)

  return (
    <li className="group relative flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/70 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to="/ins/seturi/$cod"
            params={{ cod: dataset.code }}
            // The row is the target and the ring draws around the row, the same
            // overlay the hub's figure tiles use.
            className="text-sm font-medium leading-snug text-foreground underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"
          >
            {name}
          </Link>
          {catalogOnly ? <DataStatusBadge status={dataset.dataStatus} /> : null}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className={cn(statisticsTheme.provenanceChip, 'relative z-10 select-text')}>
            {dataset.code}
          </span>
          {context ? <span className="min-w-0 truncate">{context}</span> : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-y-0.5 sm:text-right">
        {periodicity ? <span className="whitespace-nowrap">{periodicity}</span> : null}
        {catalogOnly ? (
          <span className="relative z-10">
            <RequestDatasetAction datasetCode={dataset.code} datasetName={name} />
          </span>
        ) : years ? (
          // The catalog's declared span — what INS Tempo publishes, which can
          // run wider than what is loaded here. The detail page says exactly.
          <span className="whitespace-nowrap tabular-nums" title={t`Intervalul publicat de INS Tempo`}>
            <span className="sr-only">{t`interval publicat de INS:`} </span>
            {years}
          </span>
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
