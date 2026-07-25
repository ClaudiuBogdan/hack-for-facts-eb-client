import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type {
  AuthorityProcurementSlice as AuthoritySliceData,
  MonthlyPoint,
  ProcurementGrain,
} from '@/schemas/procurement'
import type { ProcurementAuthoritySliceScope } from '../api/procurement-api'
import {
  useProcurementAuthoritySlice,
  useProcurementSearch,
} from '../hooks/use-procurement-data'
import { withProcurementSearchDefaults } from '@/schemas/procurement-search'
import { formatFlowCount, formatRon } from '../lib/formatting'
import { monthEndDate } from '../lib/institution-scopes'
import {
  procurementSectionLabelClassName,
  procurementUnderlineLinkClassName,
} from '../lib/procurement-theme'
import { ProcurementStatTile } from './procurement-stat-tile'
import { ProcurementPartyRanking } from './procurement-party-ranking'
import {
  ProcurementCategoryBars,
  type CategorySelection,
} from './procurement-category-bars'
import { ProcurementMonthlyChart } from './procurement-monthly-chart'
import { ProcurementRecordList } from './procurement-record-card'
import { ProcurementErrorState } from './procurement-error-state'
import { SupplierSliceSkeleton } from './procurement-skeletons'
import { ProcurementAnswerabilityNotice } from './procurement-answerability-notice'
import {
  ProcurementAnalysisGrainToggle,
  type FlowAnalysisGrain,
} from './procurement-analysis-grain-toggle'

type Props = {
  readonly authorityCui: string
  readonly initialSlice?: AuthoritySliceData
  readonly className?: string
  /** When true, hide the deep-link to the dedicated institution page. */
  readonly embedded?: boolean
  /**
   * The dedicated institution page renders its own populations row (six
   * record types with their own anchor money), so it suppresses these four
   * tiles rather than showing the same counts twice. Embeds keep them.
   */
  readonly showSummaryTiles?: boolean
  /**
   * Institution page year/CPV quick filters — aggregates, rankings, monthly
   * series and recent records all respect them. Omit for the all-time slice.
   */
  readonly scope?: ProcurementAuthoritySliceScope
  /**
   * Controlled analysis population. The institution page owns the selection
   * (its populations row IS the switcher), so the slice must not carry a
   * second toggle with its own state — the two disagreed on screen, and
   * nothing told the reader which population the rankings below described.
   */
  readonly analysis?: AnalysisSelection
  /**
   * Makes the CPV breakdown card the page's category filter. The institution
   * profile passes this so the card that already carries counts and values per
   * division doubles as the control, instead of a separate chip row.
   */
  readonly categoryFilter?: CategorySelection
}

type AnalysisSelection = {
  readonly grain: FlowAnalysisGrain
  /**
   * Which record type the recent-records list should show. The slice's own
   * `recentRecords` are always contracts (the server fetches them that way),
   * so a page that lets the reader pick a population has to re-ask for the
   * list — otherwise the tab says "Achiziții directe" over contract rows.
   */
  readonly recordGrain?: ProcurementGrain
  /** Human label for the population, for the list heading. */
  readonly recordLabel?: string
  /**
   * Monthly series as a period picker. The points come from the surrounding
   * period (year + CPV, WITHOUT the picked month), so selecting a month
   * leaves the neighbouring columns clickable instead of one lone bar.
   */
  readonly monthly?: {
    readonly points: readonly MonthlyPoint[]
    readonly activeMonth: string | null
    readonly onSelect: (month: string | null) => void
  }
  /**
   * Set when the caller's selected population has no breakdowns at this grain
   * (tenders, frameworks, call-offs, amendments). The section then says which
   * population it actually shows instead of quietly showing another one.
   */
  readonly unservedLabel?: string
}

/**
 * Buyer-side procurement slice — used on `/entities/$cui?view=contracts` and
 * reused by the dedicated institution page.
 */
export function ProcurementAuthoritySlice({
  authorityCui,
  initialSlice,
  className,
  embedded = false,
  showSummaryTiles = true,
  scope,
  analysis,
  categoryFilter,
}: Props) {
  const query = useProcurementAuthoritySlice(authorityCui, initialSlice, scope)
  const slice = query.data

  if (query.isPending) {
    return <SupplierSliceSkeleton />
  }
  if (query.isError && !slice) {
    return (
      <ProcurementErrorState
        compact
        error={query.error}
        onRetry={() => void query.refetch()}
        isRetrying={query.isRefetching}
        className={className}
      />
    )
  }
  if (!slice) return null

  const isEmpty =
    slice.summary.contractsCount === '0' &&
    slice.summary.directAcquisitionsCount === '0' &&
    (slice.summary.proceduresCount === null ||
      slice.summary.proceduresCount === '0')

  if (isEmpty) {
    return (
      <p className={cn('text-sm text-[var(--pnrr-muted)]', className)}>
        <Trans>
          This institution does not appear as a buyer in the procurement data.
        </Trans>
      </p>
    )
  }

  return (
    <SliceContent
      slice={slice}
      className={className}
      embedded={embedded}
      showSummaryTiles={showSummaryTiles}
      analysis={analysis}
      categoryFilter={categoryFilter}
      scope={scope}
    />
  )
}

function SliceContent({
  slice,
  className,
  embedded,
  showSummaryTiles,
  analysis,
  categoryFilter,
  scope,
}: {
  readonly slice: AuthoritySliceData
  readonly className?: string
  readonly embedded: boolean
  readonly showSummaryTiles: boolean
  readonly analysis?: AnalysisSelection
  readonly categoryFilter?: CategorySelection
  readonly scope?: ProcurementAuthoritySliceScope
}) {
  const [ownGrain, setOwnGrain] = useState<FlowAnalysisGrain>(
    'direct_acquisition',
  )
  const grain = analysis?.grain ?? ownGrain
  const analytics =
    grain === 'contract'
      ? slice.analysisByGrain.contract
      : slice.analysisByGrain.directAcquisition
  const analysisLabel =
    grain === 'contract' ? t`Contracte` : t`Achiziții directe`
  const unservedLabel = analysis?.unservedLabel?.toLocaleLowerCase('ro-RO')

  // Money is what a reader is here for, so the rankings lead with awarded
  // value. The server decides whether it CAN rank by value for this scope —
  // when it falls back to counts the card says so rather than relabelling a
  // count as a value.
  const suppliersByValue = analytics.meta.suppliersRankedBy === 'value'
  const categoriesByValue = analytics.meta.categoriesRankedBy === 'value'
  const valueSeriesServed = analytics.meta.valueSeries.answerability !== 'abstained'

  // Only re-ask when the caller wants a population the built-in list cannot
  // be: the slice already ships contracts.
  const needsOwnRecords =
    analysis?.recordGrain !== undefined && analysis.recordGrain !== 'contracts'
  const recordsQuery = useProcurementSearch(
    withProcurementSearchDefaults({
      grain: analysis?.recordGrain ?? 'contracts',
      authority_cui: slice.authorityCui,
      ...(scope?.monthFrom ? { dateFrom: `${scope.monthFrom}-01` } : {}),
      ...(scope?.monthTo ? { dateTo: monthEndDate(scope.monthTo) } : {}),
      ...(scope?.cpvDivision ? { cpv_division: scope.cpvDivision } : {}),
      sort: 'date_desc',
      page: 1,
      pageSize: 10,
    }),
    { enabled: needsOwnRecords },
  )
  // The full-table affordance is the hub's Rankings view carrying this page's
  // filters — not a side sheet that dead-ends in a second copy of the list.
  const rankingsSearch = analysis
    ? {
        authority_cui: slice.authorityCui,
        ...(scope?.monthFrom ? { dateFrom: `${scope.monthFrom}-01` } : {}),
        ...(scope?.monthTo ? { dateTo: monthEndDate(scope.monthTo) } : {}),
        ...(scope?.cpvDivision ? { cpv_division: scope.cpvDivision } : {}),
      }
    : undefined

  const records = needsOwnRecords
    ? (recordsQuery.data?.records ?? [])
    : slice.recentRecords

  return (
    <div className={cn('space-y-5', className)}>
      <section
        className={cn(
          'grid grid-cols-2 gap-3 md:grid-cols-4',
          showSummaryTiles ? '' : 'hidden',
        )}
        aria-label={t`Authority procurement indicators`}
      >
        <ProcurementStatTile
          label={t`Spend (RON)`}
          value={
            slice.summary.totalSpendRon !== null
              ? formatRon(slice.summary.totalSpendRon, 'compact')
              : '—'
          }
          hint={t`partial sum, values are not payments`}
        />
        <ProcurementStatTile
          label={t`Contracts`}
          value={
            slice.summary.contractsCount === null
              ? '—'
              : formatFlowCount(slice.summary.contractsCount)
          }
        />
        <ProcurementStatTile
          label={t`Direct acquisitions`}
          value={
            slice.summary.directAcquisitionsCount === null
              ? '—'
              : formatFlowCount(slice.summary.directAcquisitionsCount)
          }
        />
        <ProcurementStatTile
          label={t`Procedures`}
          value={
            slice.summary.proceduresCount === null
              ? '—'
              : formatFlowCount(slice.summary.proceduresCount)
          }
        />
      </section>

      {analysis === undefined ? (
        <div className="flex justify-start">
          <ProcurementAnalysisGrainToggle
            value={grain}
            onChange={setOwnGrain}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <h2 className={procurementSectionLabelClassName}>
            <Trans>Analiză detaliată · {analysisLabel}</Trans>
          </h2>
          {unservedLabel ? (
            <p className="text-sm text-[var(--pnrr-muted)]">
              <Trans>
                Furnizorii, categoriile și evoluția lunară se calculează doar
                pentru contracte și achiziții directe — nu și pentru{' '}
                {unservedLabel}.
              </Trans>
            </p>
          ) : null}
        </div>
      )}

      {/* When a page owns the analysis grain it also owns the honesty card:
          it can merge these caveats with the ones its own figures carry into
          a single card, instead of a second one saying the same thing. */}
      {analysis === undefined ? (
        <ProcurementAnswerabilityNotice metas={[analytics.stats.meta]} />
      ) : null}

      {/* No `items-start`: the two cards share a row and must share a height,
          so their footers line up when collapsed. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ProcurementPartyRanking
          title={t`Top furnizori`}
          measure="value_awarded"
          rankedBy={analytics.meta.suppliersRankedBy}
          {...(rankingsSearch
            ? { rankingsDim: 'supplier' as const, rankingsSearch }
            : {})}
          description={
            suppliersByValue
              ? t`După valoarea atribuită.`
              : // The server ranks by value only when it CAN. When it falls
                // back, it is the per-supplier value that is missing — the
                // card must not imply the order came from money.
                t`Valoarea pe furnizor nu este disponibilă pentru această selecție, așa că ordinea este dată de numărul de înregistrări.`
          }
          rows={analytics.topSuppliers}
          kind="supplier"
          pairScope={{ kind: 'authority', cui: slice.authorityCui }}
          grain={grain}
        />
        <ProcurementCategoryBars
          rows={analytics.topCategories}
          title={t`Categorii cumpărate`}
          measure="value_awarded"
          rankedBy={analytics.meta.categoriesRankedBy}
          {...(rankingsSearch
            ? { rankingsDim: 'cpv' as const, rankingsSearch }
            : {})}
          description={
            categoriesByValue
              ? t`După valoarea atribuită.`
              : t`Clasamentul pe valoare nu este disponibil aici, așa că ordinea este dată de numărul de înregistrări.`
          }
          select={categoryFilter}
        />
      </div>

      <ProcurementMonthlyChart
        points={
          analysis?.monthly?.points.length
            ? analysis.monthly.points
            : analytics.monthly
        }
        {...(analysis?.monthly
          ? {
              select: {
                activeMonth: analysis.monthly.activeMonth,
                onSelect: analysis.monthly.onSelect,
              },
            }
          : {})}
        title={t`Achiziții în timp`}
        measure={valueSeriesServed ? 'value_awarded' : 'record_count'}
        description={
          valueSeriesServed
            ? t`Valoare atribuită pe lună pentru acest cumpărător public.`
            : t`Înregistrări pe lună — seria pe valoare nu este disponibilă pentru această selecție.`
        }
      />

      {records.length > 0 ? (
        <section className="space-y-2">
          <h2 className={procurementSectionLabelClassName}>
            {analysis?.recordLabel ? (
              <Trans>Înregistrări recente · {analysis.recordLabel}</Trans>
            ) : (
              <Trans>Recent contracts</Trans>
            )}
          </h2>
          <ProcurementRecordList records={records} />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          to="/procurement"
          search={{ view: 'list', authority_cui: slice.authorityCui }}
          className={procurementUnderlineLinkClassName}
        >
          <Trans>Search all records for this institution</Trans>
        </Link>
        {embedded ? (
          <Link
            to="/procurement/institutions/$cui"
            params={{ cui: slice.authorityCui }}
            className={procurementUnderlineLinkClassName}
          >
            <Trans>Open full procurement profile</Trans>
          </Link>
        ) : null}
      </div>
    </div>
  )
}
