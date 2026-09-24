import { useId } from 'react'
import { Link } from '@tanstack/react-router'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatisticsRelatedDataset } from '@/schemas/statistics'
import { DataStatusBadge } from '../data-status-badge'
import { datasetDisplayName } from '../../lib/dataset-names'
import { statisticsTheme } from '../../lib/statistics-theme'

type Props = {
  /** The domain's other matrices, this one left out. */
  readonly related: readonly StatisticsRelatedDataset[]
  /** Catalog size of the domain, this matrix included; null when unknown. */
  readonly totalCount: number | null
  readonly contextCode: string | null
}

/**
 * The other matrices of this one's INS domain (the context the catalog
 * filters by): a row each, the name and the code, under a heading that says
 * why they are here.
 *
 * No „Date disponibile" down every row: a label true of all of them says
 * nothing (§6f). Only a matrix INS lists without data is marked, because
 * opening it leads to a page with no figure. The domain's whole list is one
 * link away when there is more of it than the rows.
 */
export function DetailRelatedDatasets({ related, totalCount, contextCode }: Props) {
  const { i18n } = useLingui()
  const headingId = useId()
  if (related.length === 0) return null

  // The catalog lists the whole domain, this matrix included, so the link
  // counts it too; it is offered only when there are more than the rows.
  const seeAll =
    contextCode !== null && totalCount !== null && totalCount - 1 > related.length
      ? { contextCode, count: totalCount }
      : null

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className={statisticsTheme.sectionLabel}>
          <Trans>Seturi din același domeniu</Trans>
        </h2>
        {seeAll ? (
          <Link
            to="/ins/seturi"
            search={{ context: seeAll.contextCode }}
            // `-mx-1 px-1 py-1`: the 24px hit area WCAG 2.2 AA asks for (2.5.8).
            className="-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {plural(seeAll.count, {
              one: 'Vezi setul',
              few: 'Vezi toate cele # seturi',
              other: 'Vezi toate cele # de seturi',
            })}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <ul className={cn(statisticsTheme.band, 'divide-y divide-border/70')}>
        {related.map((entry) => {
          const name = datasetDisplayName(entry, i18n.locale)
          return (
            <li key={entry.code}>
              <Link
                to="/ins/seturi/$cod"
                params={{ cod: entry.code }}
                // INS names a domain's matrices from one template, so the
                // words that tell two apart come late: a name cut to one line
                // left six phone rows reading „POPULATIA DUPA DOMICILIU la…".
                // Two lines, and the whole name on hover.
                title={name}
                className="flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-muted/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="line-clamp-2 min-w-0">{name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {entry.dataStatus === 'catalog-only' ? (
                    <DataStatusBadge status={entry.dataStatus} />
                  ) : null}
                  <span className={statisticsTheme.provenanceChip}>{entry.code}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
