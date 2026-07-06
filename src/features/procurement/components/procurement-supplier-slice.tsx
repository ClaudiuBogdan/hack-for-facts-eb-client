import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  CoverageRibbonFromGate,
  DataStatusBadge,
  EvidenceLink,
  MockDataStatusBadge,
} from '@/components/shared/procurement-data'
import { CpvLabel } from './cpv-label'
import { MetricCard, MetricCardSkeleton } from './metric-card'
import { PartyRankingChart } from './party-ranking-chart'
import { CategoryBreakdown } from './category-breakdown'
import { ProcurementRecordCard } from './procurement-record-card'
import { SpendOverTime } from './spend-over-time'
import { ValueWithCurrency } from './value-with-currency'
import { formatFlowCount, ronAmountSlice } from '../lib/formatting'
import { useProcurementSupplierSlice } from '../hooks/use-procurement-data'
import { useCapabilityGate } from '@/components/shared/procurement-data'
import type { SupplierProcurementSlice } from '@/schemas/procurement'

type Props = {
  readonly supplierCui: string
  readonly className?: string
}

export function ProcurementSupplierSlice({ supplierCui, className }: Props) {
  const { data, isLoading, error } = useProcurementSupplierSlice(supplierCui)

  if (isLoading) {
    return <SupplierSliceSkeleton />
  }
  if (error || !data) {
    return (
      <EmptyState
        icon={<CircleAlert className="h-6 w-6" />}
        title={t`Nu am putut încărca achizițiile publice pentru această companie.`}
        description={t`Reîncearcă mai târziu.`}
      />
    )
  }

  return <SupplierSliceContent data={data} className={className} />
}

function SupplierSliceContent({
  data,
  className,
}: {
  readonly data: SupplierProcurementSlice
  readonly className?: string
}) {
  const capability = useCapabilityGate(data.gate)
  const canSpend = capability.canShowSpendRanked()

  return (
    <div className={className}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <MockDataStatusBadge />
        </div>

        <CoverageRibbonFromGate gate={data.gate} status="mock" />

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            label={t`Venituri din achiziții`}
            value={<ValueWithCurrency value={ronAmountSlice(data.summary.totalPublicRevenueRon)} notation="compact" />}
            hint={t`Procurement-sourced, nu cifra de afaceri`}
            status={canSpend ? 'mock' : 'partial'}
          />
          <MetricCard label={t`Cumpărători`} value={formatFlowCount(data.summary.buyersCount)} status="mock" />
          <MetricCard label={t`Contracte`} value={formatFlowCount(data.summary.contractsCount)} status="mock" />
          <MetricCard label={t`Achiziții directe`} value={formatFlowCount(data.summary.directAcquisitionsCount)} status="mock" />
        </section>

        <p className="text-xs text-muted-foreground">
          <Trans>
            Prima apariție: {data.summary.firstSeen ?? t`indisponibil`} ·
            ultima apariție: {data.summary.lastSeen ?? t`indisponibil`}
          </Trans>
        </p>

        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              <Trans>Cumpărători principali</Trans>
            </h2>
            <DataStatusBadge
              status={canSpend ? 'mock' : 'partial'}
              tooltip={canSpend ? undefined : t`Cota este sub prag; afișat pe număr.`}
            />
          </div>
          <PartyRankingChart
            rows={data.topBuyers}
            partyKind="authority"
            metric={canSpend ? 'value' : 'count'}
          />
          <Link
            to="/procurement/search"
            search={{
              supplier_cui: data.supplierCui,
              grain: 'contracts',
              sort: canSpend ? 'value_desc' : 'date_desc',
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            <Trans>Vezi toate achizițiile furnizorului</Trans>
          </Link>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            <Trans>Pe categorii (CPV)</Trans>
          </h2>
          <CategoryBreakdown rows={data.categoryBreakdown} />
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            <Trans>Venituri în timp</Trans>
          </h2>
          <SpendOverTime points={data.revenueOverTime} metric={canSpend ? 'amount' : 'count'} />
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            <Trans>Achiziții recente</Trans>
          </h2>
          {data.recentRecords.length > 0 ? (
            <ul className="space-y-2">
              {data.recentRecords.map((record) => (
                <li key={record.id}>
                  <ProcurementRecordCard record={record} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t`Nicio achiziție recentă`}
              description={t`Această companie nu apare ca furnizor în achizițiile publice acoperite.`}
            />
          )}
        </section>

        <CrossDomainChips slice={data} />

        <ConcentrationTeaser slice={data} />
      </div>
    </div>
  )
}

function CrossDomainChips({ slice }: { readonly slice: SupplierProcurementSlice }) {
  const crossDomain = slice.crossDomain
  // Null = unknown (live API has no backing) — hide the chips, never fabricate.
  if (crossDomain === null) return null
  const chips: ReadonlyArray<{ readonly label: string; readonly available: boolean; readonly to?: string; readonly cui?: string | null }> = [
    { label: t`PNRR`, available: crossDomain.pnrr, to: '/pnrr', cui: slice.supplierCui },
    { label: t`Investiții publice`, available: crossDomain.publicInvestments },
    { label: t`Litigii`, available: crossDomain.litigation },
    { label: t`Fluxuri de bani`, available: crossDomain.moneyFlows },
  ]
  const available = chips.filter((c) => c.available)
  if (available.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>Legături cross-domain</Trans>
      </h2>
      <ul className="flex flex-wrap gap-2 text-sm">
        {available.map((chip) => (
          <li
            key={chip.label}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
          >
            {chip.to && chip.cui ? (
              <Link
                to={chip.to as '/pnrr'}
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
              >
                {chip.label}
              </Link>
            ) : (
              <span className="font-medium">{chip.label}</span>
            )}
            <span className="text-muted-foreground">· CUI {slice.supplierCui}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        <Trans>
          Legăturile se bazează pe CUI; afișăm doar chipurile care rezolvă o
          sursă.
        </Trans>
      </p>
    </section>
  )
}

function ConcentrationTeaser({ slice }: { readonly slice: SupplierProcurementSlice }) {
  const singleBuyer =
    slice.topBuyers.length > 0 &&
    Number(slice.topBuyers[0]?.flowCount ?? '0') >=
      slice.summary.contractsCount * 0.9
  const isYoung =
    slice.summary.firstSeen !== null &&
    new Date(slice.summary.firstSeen).getFullYear() >= new Date().getFullYear() - 1

  if (!singleBuyer && !isYoung) return null

  return (
    <section className="space-y-1 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/10">
      <div className="flex items-center gap-1 text-amber-800 dark:text-amber-200">
        <TriangleAlert className="h-4 w-4" aria-hidden />
        <span className="font-medium">
          <Trans>Semnal de verificare</Trans>
        </span>
      </div>
      <p className="text-amber-700 dark:text-amber-300">
        {singleBuyer ? (
          <Trans>
            Concentrare a veniturilor dintr-un singur cumpărător — semnal de
            verificare, nu o concluzie.
          </Trans>
        ) : (
          <Trans>
            Furnizor nou (prima apariție recentă) — semnal de verificare, nu o
            concluzie.
          </Trans>
        )}
      </p>
      <EvidenceLink href={`https://www.e-licitatie.ro`} label={t`Vezi surse pe e-licitatie.ro`} />
    </section>
  )
}

function SupplierSliceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-6 w-24 animate-pulse rounded bg-primary/10" aria-hidden />
      <div className="h-16 w-full animate-pulse rounded-lg bg-primary/10" aria-hidden />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-40 w-full" aria-hidden />
      <span className="sr-only">
        <Trans>Se încarcă achizițiile publice ale furnizorului…</Trans>
      </span>
    </div>
  )
}

export { CpvLabel }
