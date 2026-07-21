import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  procurementAnalysisBucketSchema,
  procurementAnalysisDimensionSchema,
  procurementAnalysisMeasureSchema,
  type ProcurementAnalysisBucket,
  type ProcurementAnalysisDimension,
  type ProcurementAnalysisMeasure,
} from '../api/procurement-analysis-api'
import { useProcurementAnalysis } from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementAnalysisGrainToggle, type FlowAnalysisGrain } from './procurement-analysis-grain-toggle'
import {
  procurementSectionClassName,
  procurementSectionDescriptionClassName,
  procurementSectionHeaderClassName,
  procurementSectionTitleClassName,
} from '../lib/procurement-theme'
import type { ProcurementScopeFilterInput } from '../api/graphql/procurement-filters'

const selectClassName =
  'h-10 rounded-none border-2 border-[var(--pnrr-border)] bg-background px-2 text-sm font-semibold'

function bucketLabel(key: string | null, kind: string): string {
  if (kind === 'other') return t`Other values`
  if (kind === 'unknown' || key === null) return t`Unknown value`
  return key
}

/** Direct matrix-v2 explorer for facets, series, stats and concentration. */
export function ProcurementAnalysisWorkspace({
  scope = {},
}: {
  readonly scope?: Pick<ProcurementScopeFilterInput, 'from' | 'to'>
}) {
  const [grain, setGrain] = useState<FlowAnalysisGrain>('direct_acquisition')
  const [dimension, setDimension] = useState<ProcurementAnalysisDimension>('authority')
  const [bucket, setBucket] = useState<ProcurementAnalysisBucket>('year')
  const [measure, setMeasure] = useState<ProcurementAnalysisMeasure>('recordCount')
  const query = useProcurementAnalysis({
    scope: { ...scope, grain },
    dimension,
    bucket,
    measure,
    basis: 'count',
  })
  const data = query.data
  const stats = data?.stats.blocks.find((block) => block.grain === grain)
  const facets = data?.facets.blocks.find((block) => block.grain === grain)
  const series = data?.series.find((block) => block.grain === grain)
  const concentration = data?.concentration.find((block) => block.grain === grain)

  return (
    <section className={procurementSectionClassName}>
      <div className={procurementSectionHeaderClassName}>
        <h2 className={procurementSectionTitleClassName}>
          <Trans>Analysis workspace</Trans>
        </h2>
        <p className={procurementSectionDescriptionClassName}>
          <Trans>
            Explore by grain, dimension, time bucket and measure. Unsupported
            combinations are reported clearly.
          </Trans>
        </p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <ProcurementAnalysisGrainToggle value={grain} onChange={setGrain} />
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide">
            <Trans>Dimension</Trans>
            <select
              className={selectClassName}
              value={dimension}
              onChange={(event) => setDimension(procurementAnalysisDimensionSchema.parse(event.target.value))}
            >
              {procurementAnalysisDimensionSchema.options.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide">
            <Trans>Time bucket</Trans>
            <select
              className={selectClassName}
              value={bucket}
              onChange={(event) => setBucket(procurementAnalysisBucketSchema.parse(event.target.value))}
            >
              {procurementAnalysisBucketSchema.options.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-wide">
            <Trans>Measure</Trans>
            <select
              className={selectClassName}
              value={measure}
              onChange={(event) => setMeasure(procurementAnalysisMeasureSchema.parse(event.target.value))}
            >
              {procurementAnalysisMeasureSchema.options.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        {query.isPending ? (
          <p className="text-sm text-[var(--pnrr-muted)]"><Trans>Loading analysis…</Trans></p>
        ) : query.isError && !data ? (
          <ProcurementErrorState error={query.error} onRetry={() => void query.refetch()} isRetrying={query.isRefetching} />
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={t`Records`} value={stats?.recordCount ?? null} />
              <Metric label={t`With awarded value`} value={stats?.withValueCount ?? null} />
              <Metric label={t`Known suppliers`} value={concentration?.supplierCount?.toString() ?? null} />
            </div>
            {stats ? (
              <p className="border-l-4 border-amber-400 pl-3 text-sm text-[var(--pnrr-muted)]">
                <strong>{stats.meta.answerability}</strong>
                {stats.meta.reason ? ` · ${stats.meta.reason}` : null}
                {stats.meta.caveats?.length ? ` · ${stats.meta.caveats.join(' ')}` : null}
              </p>
            ) : null}
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 font-bold"><Trans>Facet ranking</Trans></h3>
                {facets?.buckets?.length ? (
                  <ol className="space-y-2 text-sm">
                    {facets.buckets.map((entry, index) => (
                      <li key={`${entry.kind}-${entry.key ?? index}`} className="flex justify-between gap-3 border-b border-[var(--pnrr-border)] py-1">
                        <span>{bucketLabel(entry.key, entry.kind)}</span>
                        <span className="tabular-nums">{entry.recordCount ?? '—'}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-[var(--pnrr-muted)]"><Trans>No facet data available.</Trans></p>}
              </div>
              <div>
                <h3 className="mb-2 font-bold"><Trans>Time series</Trans></h3>
                {series?.points?.length ? (
                  <ol className="max-h-72 space-y-2 overflow-auto text-sm">
                    {series.points.map((point) => (
                      <li key={point.bucket} className="flex justify-between gap-3 border-b border-[var(--pnrr-border)] py-1">
                        <span>{point.bucket}</span>
                        <span className="tabular-nums">{point.value ?? '—'}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-[var(--pnrr-muted)]"><Trans>No series data available.</Trans></p>}
              </div>
            </div>
            {concentration ? (
              <p className="text-sm text-[var(--pnrr-muted)]">
                <Trans>Supplier concentration (count basis): top 1</Trans>{' '}
                {concentration.top1Share ?? '—'} · HHI {concentration.hhi ?? '—'}
                {concentration.totalRon !== null ? ` · ${formatRon(concentration.totalRon, 'compact')}` : null}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}

function Metric({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="border-2 border-[var(--pnrr-border)] p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value === null ? '—' : formatFlowCount(value)}</p>
    </div>
  )
}
