import { lazy, Suspense } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { parseCurrencyParam } from '@/lib/globalSettings/params'
import type { Currency } from '@/schemas/charts'

import totals from '@/features/budget-2026/data/totals.json'
import entities from '@/features/budget-2026/data/entities-ranking.json'
import functional from '@/features/budget-2026/data/functional-breakdown.json'
import fundingSources from '@/features/budget-2026/data/funding-sources.json'
import yoyChanges from '@/features/budget-2026/data/yoy-changes.json'
import sankeyLinks from '@/features/budget-2026/data/sankey-links.json'
import entityFunctional from '@/features/budget-2026/data/entity-functional-matrix.json'
import entityEconomic from '@/features/budget-2026/data/entity-economic-matrix.json'

import type {
  BudgetTotals,
  EntitySummary,
  FunctionalItem,
  FundingSourceItem,
  YoyChange,
  SankeyLink,
  EntityFunctionalItem,
  EntityEconomicItem,
} from '@/features/budget-2026/types'

import { HeroSection } from './hero-section'
import { DataContextSection } from './data-context-section'
import { EntityRankingSection } from './entity-ranking-section'
import { MethodologySection } from './methodology-section'

const FunctionalTreemapSection = lazy(() =>
  import('./functional-treemap-section').then((m) => ({ default: m.FunctionalTreemapSection }))
)
const EconomicSankeySection = lazy(() =>
  import('./economic-sankey-section').then((m) => ({ default: m.EconomicSankeySection }))
)
const YoyChangesSection = lazy(() =>
  import('./yoy-changes-section').then((m) => ({ default: m.YoyChangesSection }))
)
const TrendsSection = lazy(() =>
  import('./trends-section').then((m) => ({ default: m.TrendsSection }))
)
const FundingSourcesSection = lazy(() =>
  import('./funding-sources-section').then((m) => ({ default: m.FundingSourcesSection }))
)

const typedTotals = totals as BudgetTotals
const typedEntities = entities as unknown as readonly EntitySummary[]
const typedFunctional = functional as unknown as readonly FunctionalItem[]
const typedFundingSources = fundingSources as unknown as readonly FundingSourceItem[]
const typedYoyChanges = yoyChanges as unknown as {
  readonly increases: readonly YoyChange[]
  readonly decreases: readonly YoyChange[]
}
const typedSankeyLinks = sankeyLinks as unknown as readonly SankeyLink[]
const typedEntityFunctional = entityFunctional as unknown as readonly EntityFunctionalItem[]
const typedEntityEconomic = entityEconomic as unknown as readonly EntityEconomicItem[]

function ChartSkeleton() {
  return (
    <div className="rounded-3xl border border-border/30 bg-card/50 p-8">
      <Skeleton className="mb-4 h-6 w-40" />
      <Skeleton className="mb-2 h-4 w-64" />
      <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
    </div>
  )
}

const SECTIONS = [
  { id: 'hero', label: 'Start' },
  { id: 'functional-treemap', label: 'Categorii' },
  { id: 'economic-sankey', label: 'Flux' },
  { id: 'entity-ranking', label: 'Institutii' },
  { id: 'yoy-changes', label: 'Schimbari' },
  { id: 'trends', label: 'Tendinte' },
  { id: 'funding-sources', label: 'Surse' },
  { id: 'methodology', label: 'Metodologie' },
] as const

export function shouldShowFundingSourcesSection(
  data: readonly FundingSourceItem[],
): boolean {
  return data.filter((item) => item.propuneri_2026 > 0).length >= 2
}

export function Budget2026Page() {
  const rawSearch = useSearch({ strict: false }) as { currency?: unknown }
  const [userCurrency] = useUserCurrency()
  const currency: Currency = parseCurrencyParam(rawSearch.currency) ?? userCurrency
  const hasFundingSourcesSection = shouldShowFundingSourcesSection(typedFundingSources)
  const sections = hasFundingSourcesSection
    ? SECTIONS
    : SECTIONS.filter((section) => section.id !== 'funding-sources')

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Floating section nav (desktop only) */}
      <nav
        className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 xl:flex xl:flex-col xl:items-end xl:gap-1"
        aria-label="Navigare sectiuni"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="group flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <span className="hidden group-hover:inline">{section.label}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 transition-colors group-hover:bg-blue-500 dark:bg-zinc-600" />
          </a>
        ))}
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="space-y-12 lg:space-y-16">
          <HeroSection totals={typedTotals} currency={currency} />

          <DataContextSection currency={currency} />

          <Suspense fallback={<ChartSkeleton />}>
            <FunctionalTreemapSection
              data={typedFunctional}
              entityFunctionalMatrix={typedEntityFunctional}
              currency={currency}
            />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <EconomicSankeySection
              functionalEconomicLinks={typedSankeyLinks}
              entityEconomicData={typedEntityEconomic}
              currency={currency}
            />
          </Suspense>

          <EntityRankingSection data={typedEntities} currency={currency} />

          <Suspense fallback={<ChartSkeleton />}>
            <YoyChangesSection
              increases={typedYoyChanges.increases}
              decreases={typedYoyChanges.decreases}
              totalBudget2026={typedTotals.credite_bugetare.propuneri_2026}
              currency={currency}
            />
          </Suspense>

          <Suspense fallback={<ChartSkeleton />}>
            <TrendsSection totals={typedTotals} currency={currency} />
          </Suspense>

          {hasFundingSourcesSection && (
            <Suspense fallback={<ChartSkeleton />}>
              <FundingSourcesSection data={typedFundingSources} currency={currency} />
            </Suspense>
          )}

          <MethodologySection currency={currency} />
        </div>
      </main>
    </div>
  )
}
