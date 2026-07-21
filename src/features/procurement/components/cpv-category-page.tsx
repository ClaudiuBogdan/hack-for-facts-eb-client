import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CpvCategoryPage as CpvCategoryPageData,
} from '@/schemas/procurement'
import { useProcurementCpvCategory } from '../hooks/use-procurement-data'
import { formatFlowCount, formatRon } from '../lib/formatting'
import {
  procurementChipClassName,
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { CpvLabel } from './cpv-label'
import { ProcurementStatTile } from './procurement-stat-tile'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementDetailSkeleton } from './procurement-skeletons'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import {
  ProcurementAnalysisGrainToggle,
  type FlowAnalysisGrain,
} from './procurement-analysis-grain-toggle'

type Props = {
  readonly code: string
  readonly initialPage?: CpvCategoryPageData
  readonly className?: string
}

/** CPV category page — overview building blocks scoped to one division/code. */
export function CpvCategoryPage({ code, initialPage, className }: Props) {
  const query = useProcurementCpvCategory(code, initialPage)
  const page = query.data
  const [grain, setGrain] = useState<FlowAnalysisGrain>('direct_acquisition')
  const analytics = page
    ? grain === 'contract'
      ? page.analysisByGrain.contract
      : page.analysisByGrain.directAcquisition
    : undefined

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8',
        className,
      )}
    >
      <nav
        aria-label={t`Breadcrumb`}
        className="flex flex-wrap items-center gap-1 text-sm text-[var(--pnrr-muted)]"
      >
        <Link
          to="/procurement"
          className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
        >
          <Trans>Public procurement</Trans>
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[var(--pnrr-fg)]">
          <Trans>CPV category {code}</Trans>
        </span>
      </nav>

      {query.isPending ? (
        <ProcurementDetailSkeleton />
      ) : query.isError && !page ? (
        <ProcurementErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isRefetching}
        />
      ) : page ? (
        <>
          <header>
            <div className={procurementSectionLabelClassName}>
              {page.level === 'division' ? (
                <Trans>CPV division</Trans>
              ) : (
                <Trans>CPV code</Trans>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--pnrr-fg)] sm:text-4xl">
              {page.labelRo ?? page.labelEn}
            </h1>
            <div className="mt-2">
              <CpvLabel
                code={page.code}
                fallback={{ labelRo: page.labelRo, labelEn: page.labelEn }}
              />
            </div>
          </header>

          <section
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
            aria-label={t`Category indicators`}
          >
            <ProcurementStatTile
              label={t`Direct acquisitions`}
              value={page.summary.recordCounts.directAcquisitions === null ? '—' : formatFlowCount(page.summary.recordCounts.directAcquisitions)}
            />
            <ProcurementStatTile
              label={t`Contracts`}
              value={page.summary.recordCounts.contracts === null ? '—' : formatFlowCount(page.summary.recordCounts.contracts)}
            />
            <ProcurementStatTile
              label={t`Procedures`}
              value={page.summary.recordCounts.procedures === null ? '—' : formatFlowCount(page.summary.recordCounts.procedures)}
            />
            <ProcurementStatTile
              label={t`RON total (partial)`}
              value={
                page.summary.totalValueRon !== null
                  ? formatRon(page.summary.totalValueRon, 'compact')
                  : '—'
              }
              hint={
                page.summary.totalValueRon === null
                  ? t`unavailable under the current answerability policy`
                  : undefined
              }
            />
          </section>

          <div className="flex justify-end">
            <ProcurementAnalysisGrainToggle value={grain} onChange={setGrain} />
          </div>

          {analytics ? <ProcurementAnswerabilityNotice meta={analytics.stats.meta} /> : null}

          <ProcurementMonthlyChart
            points={analytics?.monthly ?? []}
            title={t`Monthly volume in this category`}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ProcurementPartyRanking
              title={t`Top public buyers`}
              description={t`By number of records.`}
              rows={analytics?.topAuthorities ?? []}
              kind="authority"
            />
            <ProcurementPartyRanking
              title={t`Top suppliers`}
              description={t`By number of records.`}
              rows={analytics?.topSuppliers ?? []}
              kind="supplier"
            />
          </div>

          {page.relatedCategories.length > 0 ? (
            <section className="space-y-2">
              <h2 className={procurementSectionLabelClassName}>
                <Trans>Related categories</Trans>
              </h2>
              <div className="flex flex-wrap gap-2">
                {page.relatedCategories.map((related) => (
                  <Link
                    key={related.code}
                    to="/procurement/categories/$code"
                    params={{ code: related.code }}
                    className={cn(
                      procurementChipClassName,
                      'hover:bg-white dark:hover:bg-[var(--pnrr-hover)]',
                    )}
                  >
                    {related.code} · {related.labelRo ?? related.labelEn}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div>
            <Link
              to="/procurement"
              search={
                page.level === 'division'
                  ? { view: 'list' as const, cpv_division: page.code }
                  : { view: 'list' as const, cpv: page.code }
              }
              className={procurementUnderlineLinkClassName}
            >
              <Trans>Search all records in this category</Trans>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  )
}
import { useState } from 'react'
