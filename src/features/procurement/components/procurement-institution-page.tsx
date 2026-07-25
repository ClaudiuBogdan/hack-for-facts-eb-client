import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  AuthorityProcurementSlice,
  ProcurementAnalysisGrain,
  ProcurementGrain,
  ProcurementInstitutionOverview,
  ProcurementInstitutionPopulation,
  ProcurementInstitutionSignals as InstitutionSignals,
} from '@/schemas/procurement'
import {
  buildInstitutionScopes,
  definedScope,
} from '../lib/institution-scopes'
import type { ProcurementAuthoritySliceScope } from '../api/procurement-api'
import {
  useProcurementAuthoritySlice,
  useProcurementInstitutionOverview,
} from '../hooks/use-procurement-data'
import { formatRon } from '../lib/formatting'
import { procurementCompactActionClassName } from '../lib/procurement-theme'
import {
  populationLabel,
  populationMoneyBasisLabel,
} from '../lib/grain-labels'
import { ProcurementAuthoritySlice } from './procurement-authority-slice'
import type { FlowAnalysisGrain } from './procurement-analysis-grain-toggle'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import { ProcurementErrorState } from './procurement-error-state'
import { ProcurementInfoSheet } from './procurement-info-sheet'
import { ProcurementEntityHeader } from './procurement-entity-header'
import {
  ProcurementPartyPopulations,
  type PartyPopulation,
} from './procurement-party-populations'
import { ProcurementInstitutionSignals } from './procurement-institution-signals'
import {
  ProcurementPartyQuickFilters,
  type PartyQuickFilterState,
} from './procurement-party-quick-filters'
import { ProcurementDetailSkeleton } from './procurement-skeletons'

type Props = {
  readonly cui: string
  readonly initialSlice?: AuthorityProcurementSlice
  readonly initialOverview?: ProcurementInstitutionOverview
  /** Page quick filters from the URL (`year`, `cpv`) — defaults are all-time. */
  readonly filters?: PartyQuickFilterState
  readonly className?: string
}

function hasInstitutionSignals(signals: InstitutionSignals): boolean {
  return (
    signals.concentration !== null ||
    signals.procedureMix.length > 0 ||
    signals.amendment !== null ||
    signals.frameworkExposure !== null
  )
}

/** Display order: how a buyer's process actually runs, not alphabetical. */
const POPULATION_ORDER: readonly ProcurementAnalysisGrain[] = [
  'procedure',
  'contract',
  'direct_acquisition',
  'framework',
  'calloff',
  'modification',
]

/**
 * Which analysis grain a selected population maps to. The slice serves
 * supplier/category/monthly breakdowns for two grains only; the other four
 * populations say so rather than borrowing another population's numbers.
 */
const ANALYSIS_GRAIN: Partial<
  Record<ProcurementAnalysisGrain, FlowAnalysisGrain>
> = {
  contract: 'contract',
  direct_acquisition: 'direct_acquisition',
}

/**
 * Which searchable record type backs each population's list. Frameworks and
 * call-offs have no search grain of their own — they are contract rows — so
 * the list shows contracts and the heading says so.
 */
const RECORD_GRAIN: Record<ProcurementAnalysisGrain, ProcurementGrain> = {
  procedure: 'procedures',
  contract: 'contracts',
  direct_acquisition: 'direct_acquisitions',
  modification: 'modifications',
  framework: 'contracts',
  calloff: 'contracts',
}

/** Dedicated buyer profile under `/procurement/institutions/$cui`. */
export function ProcurementInstitutionPage({
  cui,
  initialSlice,
  initialOverview,
  filters = {},
  className,
}: Props) {
  const navigate = useNavigate()
  const [infoOpen, setInfoOpen] = useState(false)
  const [activeGrain, setActiveGrain] =
    useState<ProcurementAnalysisGrain>('contract')
  const hasFilters =
    filters.year !== undefined ||
    filters.cpv !== undefined ||
    filters.month !== undefined
  // The period the monthly picker spans: year + CPV, never the picked month.
  const periodScope: ProcurementAuthoritySliceScope | undefined = useMemo(
    () =>
      definedScope({
        ...(filters.year
          ? {
              monthFrom: `${filters.year}-01`,
              monthTo: `${filters.year}-12`,
            }
          : {}),
        ...(filters.cpv ? { cpvDivision: filters.cpv } : {}),
      }),
    [filters.year, filters.cpv],
  )
  const scopeInput: ProcurementAuthoritySliceScope | undefined = useMemo(
    () =>
      filters.month
        ? {
            ...periodScope,
            monthFrom: filters.month,
            monthTo: filters.month,
          }
        : periodScope,
    [periodScope, filters.month],
  )
  const scopes = useMemo(
    () => buildInstitutionScopes(scopeInput ?? {}),
    [scopeInput],
  )
  const nameQuery = useProcurementAuthoritySlice(cui, initialSlice)
  // Same query key the slice below uses, so this shares its cache rather than
  // refetching — the page needs the analysis envelope to fold its caveats into
  // the single honesty card.
  const scopedSlice = useProcurementAuthoritySlice(
    cui,
    hasFilters ? undefined : nameQuery.data,
    scopeInput,
  )
  // Same query key as above whenever no month is picked, so this costs a
  // request only in the drilled-down state that needs it.
  const periodSlice = useProcurementAuthoritySlice(
    cui,
    filters.year === undefined && filters.cpv === undefined
      ? nameQuery.data
      : undefined,
    periodScope,
  )
  const overviewQuery = useProcurementInstitutionOverview(
    cui,
    scopes,
    initialOverview,
  )

  const overview = overviewQuery.data
  const title =
    overview?.authorityName?.trim() ||
    nameQuery.data?.authorityName?.trim() ||
    t`Institution CUI ${cui}`

  const populations = overview?.populations ?? []
  const active: ProcurementInstitutionPopulation | undefined =
    populations.find((entry) => entry.grain === activeGrain) ?? populations[0]
  // `active` falls back to the first population when the selection is absent,
  // so the analysis below must follow the population actually on screen.
  const selectedGrain = active?.grain ?? activeGrain
  const contractAwarded =
    populations.find((entry) => entry.grain === 'contract')?.stats
      .valueAwardedSum ?? null

  // The envelope carries a caveat for EVERY money basis the grain declares,
  // but this block shows exactly one. Rendering the rest told readers that
  // "estimated value abstains" under a figure that was never estimated.
  // Subtract the other measures' own caveats rather than pattern-matching text.
  const headlineMeta = useMemo(() => {
    if (active === undefined) return null
    const foreign = new Set(
      active.stats.moneyVerdicts
        .filter((verdict) => verdict.measure !== active.anchorMeasure)
        .flatMap((verdict) => verdict.caveats),
    )
    return {
      ...active.stats.meta,
      caveats: active.stats.meta.caveats.filter(
        (caveat) => !foreign.has(caveat),
      ),
    }
  }, [active])

  // The header carries the selected population's money — one figure, with the
  // basis it means. Populations that are counts-only or simply empty carry no
  // chip at all rather than a misleading "indisponibil".
  const valueStat = (() => {
    if (active === undefined) return null
    const basis = populationMoneyBasisLabel(active.grain)
    if (basis === null || active.recordCount === '0') return null
    return { value: formatRon(active.anchorValueRon, 'compact'), label: basis }
  })()

  // The switcher belongs to the header band, flush with its bottom rule, so
  // the population it selects reads as the page's subject rather than as one
  // more control stacked in the body.
  const populationTabs: readonly PartyPopulation<ProcurementAnalysisGrain>[] =
    POPULATION_ORDER.map((grain) =>
      populations.find((entry) => entry.grain === grain),
    )
      .filter(
        (entry): entry is ProcurementInstitutionPopulation =>
          entry !== undefined,
      )
      .map((entry) => ({
        grain: entry.grain,
        label: populationLabel(entry.grain),
        recordCount: entry.recordCount,
      }))

  // One card for the whole page: the selected population's envelope plus the
  // analysis envelope below it.
  const analysisMeta =
    (ANALYSIS_GRAIN[selectedGrain] ?? 'contract') === 'contract'
      ? scopedSlice.data?.analysisByGrain.contract.stats.meta
      : scopedSlice.data?.analysisByGrain.directAcquisition.stats.meta
  const answerMetas = [headlineMeta, analysisMeta].filter(
    (meta): meta is NonNullable<typeof meta> => meta != null,
  )

  const quickFilters = initialSlice ? (
    <ProcurementPartyQuickFilters
      filters={filters}
      firstSeen={initialSlice.summary.firstSeen}
      lastSeen={initialSlice.summary.lastSeen}
      categories={initialSlice.analysisByGrain.contract.topCategories}
      advancedSearch={{
        view: 'list',
        authority_cui: cui,
        ...(filters.year
          ? {
              dateFrom: `${filters.year}-01-01`,
              dateTo: `${filters.year}-12-31`,
            }
          : {}),
        ...(filters.cpv ? { cpv_division: filters.cpv } : {}),
      }}
    />
  ) : null

  return (
    <div className={cn('min-h-screen min-w-0 bg-background', className)}>
      <ProcurementEntityHeader
        cui={cui}
        title={title}
        eyebrow={<Trans>Cumpărător public</Trans>}
        breadcrumb={
          <>
            <Link
              to="/procurement"
              className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
            >
              <Trans>Achiziții publice</Trans>
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link
              to="/procurement"
              search={{ view: 'rankings', rank_dim: 'buyer' }}
              className="underline underline-offset-2 hover:text-[var(--pnrr-fg)]"
            >
              <Trans>Instituții</Trans>
            </Link>
          </>
        }
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              asChild
              className={procurementCompactActionClassName}
            >
              <Link to="/entities/$cui" params={{ cui }}>
                <Trans>Profil</Trans>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              className={procurementCompactActionClassName}
            >
              <Link
                to="/procurement"
                search={{ view: 'list', authority_cui: cui }}
              >
                <Trans>Înregistrări</Trans>
              </Link>
            </Button>
          </>
        }
        firstSeen={initialSlice?.summary.firstSeen ?? null}
        lastSeen={initialSlice?.summary.lastSeen ?? null}
        valueStat={valueStat}
        filters={quickFilters}
        tabs={
          populationTabs.length > 0 ? (
            <ProcurementPartyPopulations
              populations={populationTabs}
              active={selectedGrain}
              onSelect={setActiveGrain}
            />
          ) : null
        }
        compactTabs={
          populationTabs.length > 0 ? (
            <ProcurementPartyPopulations
              compact
              populations={populationTabs}
              active={selectedGrain}
              onSelect={setActiveGrain}
            />
          ) : null
        }
        onOpenMethodology={() => setInfoOpen(true)}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {overviewQuery.isPending ? (
          <ProcurementDetailSkeleton />
        ) : overviewQuery.isError ? (
          <ProcurementErrorState
            error={overviewQuery.error}
            onRetry={() => void overviewQuery.refetch()}
            isRetrying={overviewQuery.isRefetching}
          />
        ) : overview === undefined || populations.length === 0 ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>
              This institution does not appear as a buyer in the procurement
              data.
            </Trans>
          </p>
        ) : (
          <>
            {headlineMeta ? (
              <ProcurementAnswerabilityNotice metas={answerMetas} />
            ) : null}

            {selectedGrain === 'modification' ? (
              // The table says "doar număr"; this says why, once, and only
              // where it applies.
              <p className="text-sm text-[var(--pnrr-muted)]">
                <Trans>
                  Actele adiționale se raportează ca număr — sumele brute din
                  sursă nu sunt suficient de fiabile pentru a fi însumate.
                </Trans>
              </p>
            ) : null}

            {hasInstitutionSignals(overview.signals) ? (
              <ProcurementInstitutionSignals
                signals={overview.signals}
                contractAwardedRon={contractAwarded}
              />
            ) : null}
          </>
        )}

        <ProcurementAuthoritySlice
          authorityCui={cui}
          initialSlice={hasFilters ? undefined : nameQuery.data}
          showSummaryTiles={false}
          scope={scopeInput}
          analysis={{
            grain: ANALYSIS_GRAIN[selectedGrain] ?? 'contract',
            ...(ANALYSIS_GRAIN[selectedGrain] === undefined
              ? { unservedLabel: populationLabel(selectedGrain) }
              : {}),
            recordGrain: RECORD_GRAIN[selectedGrain],
            recordLabel: populationLabel(selectedGrain),
            monthly: {
              points:
                (ANALYSIS_GRAIN[selectedGrain] ?? 'contract') === 'contract'
                  ? (periodSlice.data?.analysisByGrain.contract.monthly ?? [])
                  : (periodSlice.data?.analysisByGrain.directAcquisition
                      .monthly ?? []),
              activeMonth: filters.month ?? null,
              onSelect: (month) =>
                void navigate({
                  to: '.',
                  search: (prev: PartyQuickFilterState) => ({
                    ...prev,
                    month: month ?? undefined,
                  }),
                }),
            },
          }}
          categoryFilter={{
            activeCode: filters.cpv ?? null,
            onSelect: (code) =>
              void navigate({
                to: '.',
                search: (prev: PartyQuickFilterState) => ({
                  ...prev,
                  cpv: code ?? undefined,
                }),
              }),
          }}
        />
      </main>

      <ProcurementInfoSheet open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  )
}
