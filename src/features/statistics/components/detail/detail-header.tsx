import { useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { InsDatasetDetails } from '@/schemas/ins'
import { contextDisplayName, datasetDisplayName } from '../../lib/dataset-names'
import { getDatasetDataStatus } from '../../lib/dataset-status'
import { isPeriodStale } from '../../lib/period'
import { statisticsTheme } from '../../lib/statistics-theme'
import { DataStatusBadge } from '../data-status-badge'
import { DetailSourceLine } from '../detail-source-line'
import { FreshnessBadge } from './freshness-badge'

type Props = {
  readonly dataset: InsDatasetDetails
  /** The last period the matrix publishes — what the freshness badge judges. */
  readonly latestPeriod: string | null
}

/**
 * The page's identity block: the title, one quiet line saying where the data
 * comes from, and nothing else.
 *
 * It used to open with six badges above the title — source, code, status,
 * freshness, one per cadence — in four different weights, which made the
 * heaviest thing on the page the metadata about the thing rather than the
 * thing. Identity is a line of text now (DESIGN.md §Typography: codes live in
 * provenance text, never as a record's primary label), and a badge is kept
 * only for the two facts that are exceptions worth stopping on: a dataset
 * with no loaded observations, and a series INS appears to have stopped
 * refreshing. On the common page, none of them render.
 *
 * The name and the context follow the reader's language where INS published
 * it, with the Romanian as the fallback — the same rule as the catalog row.
 */
export function DetailHeader({ dataset, latestPeriod }: Props) {
  const { i18n } = useLingui()
  const status = getDatasetDataStatus(dataset)
  const name = datasetDisplayName(
    { code: dataset.code, nameRo: dataset.name_ro ?? null, nameEn: dataset.name_en ?? null },
    i18n.locale,
  )
  const context = contextDisplayName(
    { contextNameRo: dataset.context_name_ro ?? null, contextNameEn: dataset.context_name_en ?? null },
    i18n.locale,
  )

  return (
    <header className="mt-2 border-b border-border/70 pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* `text-balance` keeps an INS name — they run to 100+ characters —
            from ending on one orphan word. */}
        <h1 className="text-balance text-2xl font-semibold tracking-tight">{name}</h1>
        {status === 'catalog-only' ? <DataStatusBadge status={status} /> : null}
        {latestPeriod && isPeriodStale({ latestPeriod }) ? (
          <FreshnessBadge period={latestPeriod} />
        ) : null}
      </div>

      {/*
        Everything the page knows ABOUT the dataset, once. Ordered identity →
        placement → provenance. „Sursă" and the way back are ONE item, because
        the source's name IS the link. The group stays intact when the line
        wraps, so a phone gets the whole provenance statement on its own row.

        Cadence and the year span are NOT here: the scope rail states both, and
        „Interval de ani" is the control you change them with. Spacing
        separates the items, never „·" — a bullet between flex items has
        nowhere good to go when the line wraps.
      */}
      <p className={cn(statisticsTheme.metaLine, 'mt-2.5')}>
        <span className={statisticsTheme.provenanceChip}>{dataset.code}</span>
        {context ? <span>{context}</span> : null}
        <DetailSourceLine
          datasetCode={dataset.code}
          sourceLastUpdate={dataset.source_last_update ?? null}
        />
      </p>
    </header>
  )
}
