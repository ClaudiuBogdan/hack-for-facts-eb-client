import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { ProcurementSearchFacet } from '@/schemas/procurement'
import type { ProcurementStatus } from '@/schemas/procurement'
import { procurementStatusSchema } from '@/schemas/procurement'
import { useProcurementGeographyOptions } from '../hooks/use-procurement-data'
import { formatFlowCount } from '../lib/formatting'
import { formatProcurementCountyName } from '../lib/procurement-geography'
import { statusLabel } from '../lib/status-meta'
import { valueCategoryLabel } from '../lib/enum-labels'
import {
  valueCategoryForState,
  type ProcurementValueCategory,
} from '../lib/value-category'

type Props = {
  readonly facets?: readonly ProcurementSearchFacet[]
  /** Hidden while a page is loading, so counts never lag the list they describe. */
  readonly loading?: boolean
}

const TOP_BUCKETS = 6

/** County code → name, from the shared territory options (code until loaded). */
function useCountyNames(): (code: string) => string {
  const geography = useProcurementGeographyOptions()
  const names = new Map(
    (geography.data?.counties ?? []).map((county) => [
      county.countyCode,
      formatProcurementCountyName(county.countyName),
    ]),
  )
  return (code) => names.get(code) ?? code
}

type Row = {
  readonly key: string
  readonly label: string
  readonly count: number
}

/** Roll raw `value_state` buckets up into the categories the filter sheet uses. */
function valueQualityRows(facet: ProcurementSearchFacet): Row[] {
  const byCategory = new Map<string, number>()
  for (const bucket of facet.buckets) {
    const category = valueCategoryForState(bucket.key)
    if (category === null) continue
    byCategory.set(category, (byCategory.get(category) ?? 0) + bucket.count)
  }
  return [...byCategory.entries()]
    .map(([key, count]) => ({ key, label: valueCategoryLabel(key as ProcurementValueCategory), count }))
    .sort((a, b) => b.count - a.count)
}

function statusRows(facet: ProcurementSearchFacet): Row[] {
  return facet.buckets.map((bucket) => {
    const parsed = procurementStatusSchema.safeParse(bucket.key)
    return {
      key: bucket.key,
      label: parsed.success ? statusLabel(parsed.data as ProcurementStatus) : bucket.key,
      count: bucket.count,
    }
  })
}

/**
 * How the CURRENT result set splits by territory, status and value quality.
 *
 * These are RESULT-SET counts from the search engine, not analytics: they
 * describe the records this filter returned, and they are not the platform's
 * authoritative totals (those come from the analysis views, over the whole
 * scope). `otherCount` is shown rather than dropped — a truncated distribution
 * that reads as complete is a lie.
 */
export function ProcurementListFacets({ facets, loading = false }: Props) {
  const countyName = useCountyNames()
  if (loading || facets === undefined || facets.length === 0) return null

  const byDimension = new Map(facets.map((facet) => [facet.dimension, facet]))
  const sections: { title: string; facet?: ProcurementSearchFacet; rows: Row[] }[] = []

  const push = (dimension: string, title: string, rows: (f: ProcurementSearchFacet) => Row[]) => {
    const facet = byDimension.get(dimension)
    if (facet === undefined || facet.buckets.length === 0) return
    sections.push({ title, facet, rows: rows(facet) })
  }

  push('buyerCounty', t`Buyer county`, (facet) =>
    facet.buckets.map((bucket) => ({
      key: bucket.key,
      label: countyName(bucket.key),
      count: bucket.count,
    })),
  )
  push('supplierCounty', t`Supplier county`, (facet) =>
    facet.buckets.map((bucket) => ({
      key: bucket.key,
      label: countyName(bucket.key),
      count: bucket.count,
    })),
  )
  push('status', t`Status`, statusRows)
  push('valueState', t`Value quality`, valueQualityRows)

  if (sections.length === 0) return null

  return (
    <details className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-subtle)]">
      <summary className="cursor-pointer px-4 py-2 text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
        <Trans>Breakdown of these results</Trans>
      </summary>
      <div className="space-y-3 border-t-2 border-[var(--pnrr-border)] px-4 py-3">
        {sections.map((section) => {
          const shown = section.rows.slice(0, TOP_BUCKETS)
          const hidden =
            section.rows.length - shown.length + (section.facet?.otherCount ?? 0)
          return (
            <div key={section.title} className="space-y-1">
              <p className="text-xs font-bold text-[var(--pnrr-fg)]">{section.title}</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--pnrr-muted)]">
                {shown.map((row) => (
                  <li key={row.key}>
                    <span className="text-[var(--pnrr-fg)]">{row.label}</span>{' '}
                    {formatFlowCount(row.count)}
                  </li>
                ))}
                {hidden > 0 ? (
                  <li>
                    <Trans>+ {formatFlowCount(hidden)} in other values</Trans>
                  </li>
                ) : null}
              </ul>
            </div>
          )
        })}
        <p className="text-xs leading-5 text-[var(--pnrr-muted)]">
          <Trans>
            Counts describe the records matching these filters, not the
            platform's totals.
          </Trans>
        </p>
      </div>
    </details>
  )
}
