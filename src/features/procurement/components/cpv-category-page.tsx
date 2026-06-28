import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useState } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  CoverageRibbonFromGate,
  DataStatusBadge,
  MockDataStatusBadge,
} from '@/components/shared/procurement-data'
import { CpvLabel } from './cpv-label'
import { MetricCard, MetricCardSkeleton } from './metric-card'
import { PartyRankingChart } from './party-ranking-chart'
import { SpendOverTime } from './spend-over-time'
import { ValueWithCurrency } from './value-with-currency'
import { formatFlowCount, ronAmountSlice } from '../lib/formatting'
import { useProcurementCpvCategory } from '../hooks/use-procurement-data'
import { useCapabilityGate } from '@/components/shared/procurement-data'
import type { CpvCategoryPage as CpvCategoryPageData } from '@/schemas/procurement'

type Props = {
  readonly code: string
  readonly initialPage?: CpvCategoryPageData
  readonly className?: string
}

export function CpvCategoryPage({ code, initialPage, className }: Props) {
  const { data, isLoading, error } = useProcurementCpvCategory(code, initialPage)

  if (isLoading) {
    return <CpvSkeleton />
  }
  if (error || !data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={<TriangleAlert className="h-6 w-6" />}
          title={t`Categoria CPV ${code} nu a putut fi încărcată.`}
          description={t`Verifică codul sau încearcă altă categorie.`}
        />
      </div>
    )
  }

  return <CpvContent data={data} className={className} />
}

function CpvContent({ data, className }: { readonly data: CpvCategoryPageData; readonly className?: string }) {
  const capability = useCapabilityGate(data.gate)
  const canSpend = capability.canShowSpendRanked()
  const [metric, setMetric] = useState<'count' | 'value'>(canSpend ? 'value' : 'count')

  return (
    <div className={className}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MockDataStatusBadge />
          </div>
          <nav aria-label={t`Breadcrumb`} className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/procurement" className="underline underline-offset-2 hover:text-foreground">
              <Trans>Achiziții publice</Trans>
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <Link to="/procurement/search" className="underline underline-offset-2 hover:text-foreground">
              <Trans>Caută</Trans>
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="font-medium text-foreground">{data.code}</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <CpvLabel
              code={data.code}
              fallback={{ labelRo: data.labelRo, labelEn: data.labelEn }}
            />
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            <Trans>
              Categorie CPV (Vocabularul comun privind achizițiile). Agregatele
              sunt la nivel de diviziune.
            </Trans>
          </p>
        </header>

        <CoverageRibbonFromGate gate={data.gate} status="mock" />

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label={t`Cheltuieli totale`}
            value={<ValueWithCurrency value={ronAmountSlice(data.summary.totalValueRon)} notation="compact" />}
            status={canSpend ? 'mock' : 'partial'}
            statusTooltip={canSpend ? undefined : t`Acoperire valoare sub prag.`}
          />
          <MetricCard label={t`Contracte`} value={formatFlowCount(data.summary.recordCounts.contracts)} status="mock" />
          <MetricCard label={t`Achiziții directe`} value={formatFlowCount(data.summary.recordCounts.directAcquisitions)} status="mock" />
          <MetricCard label={t`Proceduri`} value={formatFlowCount(data.summary.recordCounts.procedures)} status="mock" />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              <Trans>Volum în timp</Trans>
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant={metric === 'count' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetric('count')}
                aria-pressed={metric === 'count'}
              >
                <Trans>Pe număr</Trans>
              </Button>
              <Button
                variant={metric === 'value' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetric('value')}
                disabled={!canSpend}
                aria-pressed={metric === 'value'}
              >
                <Trans>Pe valoare</Trans>
              </Button>
              {!canSpend ? (
                <DataStatusBadge status="partial" tooltip={t`Acoperire valoare sub prag.`} />
              ) : null}
            </div>
          </div>
          <SpendOverTime points={data.spendOverTime} metric={metric === 'value' ? 'amount' : 'count'} />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">
              <Trans>Autorități principale</Trans>
            </h2>
            <PartyRankingChart
              rows={data.topAuthorities}
              partyKind="authority"
              metric={canSpend ? 'value' : 'count'}
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-base font-semibold">
              <Trans>Furnizori principali</Trans>
            </h2>
            <PartyRankingChart
              rows={data.topSuppliers}
              partyKind="supplier"
              metric={canSpend ? 'value' : 'count'}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            <Trans>Categorii înrudite</Trans>
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {data.relatedCategories.map((cat) => (
              <li key={cat.code}>
                <Link
                  to="/procurement/categories/$code"
                  params={{ code: cat.code }}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground underline underline-offset-2 hover:text-primary"
                >
                  <CpvLabel code={cat.code} variant="compact" fallback={{ labelRo: cat.labelRo, labelEn: cat.labelEn }} />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Button asChild variant="outline" size="sm">
          <Link
            to="/procurement/search"
            search={{ cpv_division: data.divisionCode }}
          >
            <Trans>Vezi toate înregistrările din această categorie</Trans>
          </Link>
        </Button>
      </div>
    </div>
  )
}

function CpvSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="h-8 w-1/2 animate-pulse rounded bg-primary/10" aria-hidden />
        <div className="h-4 w-1/3 animate-pulse rounded bg-primary/10" aria-hidden />
      </div>
      <div className="h-16 w-full animate-pulse rounded-lg bg-primary/10" aria-hidden />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-40 w-full" aria-hidden />
      <span className="sr-only">
        <Trans>Se încarcă categoria CPV…</Trans>
      </span>
    </div>
  )
}
