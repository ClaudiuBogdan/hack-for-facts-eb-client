import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import {
  createHeatmapStyleFunction,
  getPercentileValues,
} from '@/components/maps/utils'
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants'
import type { UatProperties } from '@/components/maps/interfaces'
import type { InteractiveMapFeatureEvent } from '@/components/maps/InteractiveMap'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  analysisGrainToHubGrain,
  buildProcurementOverviewMonthScope,
  hubStateToLandingFilters,
  rankingRecordKindFromHubState,
  resolveProcurementValueBasisPlan,
  scrubScopeForAnalysisGrain,
  type ProcurementHubMapGrain,
  type ProcurementHubState,
} from '@/schemas/procurement-hub'
import { buildScopeFilter } from '../api/graphql/procurement-filters'
import { getPnrrBlueHeatmapColor } from '@/features/pnrr/lib/map-colors'
import {
  useProcurementAnalysis,
  useProcurementGeographyOptions,
} from '../hooks/use-procurement-data'
import type { ProcurementHubFilterPatch } from '../hooks/use-procurement-hub-state'
import { formatFlowCount, formatRon } from '../lib/formatting'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type {
  HeatmapCountyDataPoint,
  HeatmapUATDataPoint,
} from '@/schemas/heatmap'
import {
  buildProcurementMapHeatmapForPaintMode,
  findRegionForCountyCode,
  isProcurementMapCountyPainted,
  regionBucketsFromBreakdown,
  resolveProcurementMapAnalysisPlan,
  selectionGrainFromPaintMode,
  type ProcurementRegionMapBucket,
} from '../lib/procurement-map-series'
import { ProcurementMapReconciliationPanel } from './procurement-map-reconciliation-panel'
import { ProcurementPreviewBadge } from './procurement-preview-badge'
import { ProcurementTerritoryDrawer } from './procurement-territory-drawer'
import { ProcurementErrorState } from './procurement-error-state'
import {
  ProcurementAnalysisGrainToggle,
  type FlowAnalysisGrain,
} from './procurement-analysis-grain-toggle'
import {
  procurementSectionClassName,
} from '../lib/procurement-theme'

const InteractiveMap = lazy(() =>
  import('@/components/maps/InteractiveMap').then((module) => ({
    default: module.InteractiveMap,
  })),
)

const MAP_COLOR_MIN_PERCENTILE = 5
const MAP_COLOR_MAX_PERCENTILE = 95
const DEFAULT_CENTER: [number, number] = [45.9432, 24.9668]
const DEFAULT_ZOOM = 6.4

type MapSelection = {
  readonly id: string
  readonly label: string
  /** Territory grain for drawer metrics / Apply — follows paint mode. */
  readonly grain: ProcurementHubMapGrain
}

type Props = {
  readonly hubState: ProcurementHubState
  readonly updateFilters: (patch: ProcurementHubFilterPatch) => void
  /**
   * When false (Overview embed), hide the contracts/DA toggle — Overview already
   * owns the shared grain control. Map detail (`mapGrain`) stays map-only.
   */
  readonly showAnalysisGrainToggle?: boolean
}

/**
 * Geography choropleth on the procurement Overview.
 * Shared hub filters (period, measure, buyer/supplier geo…) apply globally.
 * `mapGrain` / `mapParty` are map-only chrome (URL + toolbar), not filter chips.
 */
export function ProcurementMapView({
  hubState,
  updateFilters,
  showAnalysisGrainToggle = true,
}: Props) {
  const [selection, setSelection] = useState<MapSelection | undefined>()

  const geographyQuery = useProcurementGeographyOptions()
  const landingFilters = hubStateToLandingFilters(hubState)
  const monthScope = buildProcurementOverviewMonthScope(landingFilters)
  // Value-basis plan: the map paints the ACTIVE population (call-offs,
  // modifications, estimated procedures…), not silently the awarded one.
  const basisPlan = resolveProcurementValueBasisPlan(hubState)
  const analysisGrain = basisPlan.analysisGrain
  const isCoreGrain =
    analysisGrain === 'contract' || analysisGrain === 'direct_acquisition'
  const countsOnly = basisPlan.valueMeasure === null
  const mapGrain = hubState.mapGrain
  // Supplier geography exists only on contracts/DA; other populations force
  // buyer paint (the toolbar discloses the disabled option).
  const mapParty = isCoreGrain ? hubState.mapParty : 'buyer'
  const measure =
    countsOnly || basisPlan.vbasis === 'estimated'
      ? // No servable money paint: estimated has no per-territory sums
        // (breakdowns carry ANCHOR money, which would mislabel the legend).
        ('record_count' as const)
      : hubState.measure
  const mapAnalysisPlan = resolveProcurementMapAnalysisPlan(mapGrain, {
    party: mapParty,
    buyerRegion: hubState.buyerRegion,
    buyerCounty: hubState.buyerCounty,
    buyerSiruta: hubState.buyerSiruta,
    supplierRegion: hubState.supplierRegion,
    supplierCounty: hubState.supplierCounty,
    supplierSiruta: hubState.supplierSiruta,
  })
  const selectionGrain = selectionGrainFromPaintMode(mapAnalysisPlan.paintMode)
  // Geometry follows the PAINT mode, not the toolbar: a scoped UAT under a
  // region/county toolbar paints its single locality on the UAT layer.
  const paintIsUat = selectionGrain === 'uat'
  const mapViewType = paintIsUat ? 'UAT' : 'County'

  // buildScopeFilter carries the shared normalization: row filters
  // (q / value bounds) + recordKind on the contract grain (2026-07-24).
  // Non-core populations first scrub the fields they cannot honor (the
  // value-basis notice on the overview discloses exactly this drop).
  const { scope: mapScopeInput } = scrubScopeForAnalysisGrain(
    {
      monthFrom: monthScope.monthFrom,
      monthTo: monthScope.monthTo,
      buyerRegion: hubState.buyerRegion,
      buyerCounty: hubState.buyerCounty,
      buyerSiruta: hubState.buyerSiruta,
      supplierRegion: hubState.supplierRegion,
      supplierCounty: hubState.supplierCounty,
      supplierSiruta: hubState.supplierSiruta,
      q: hubState.q,
      valueMin: hubState.valueMin,
      valueMax: hubState.valueMax,
      recordKind: rankingRecordKindFromHubState(hubState),
      // Party/CPV scopes paint too (C1): map dimensions are geography-only,
      // so these never fix the requested facet dimension.
      authorityCui: hubState.authority_cui,
      supplierCui: hubState.supplier_cui,
      cpvDivision: hubState.cpv_division,
      cpvGroup: hubState.cpv_group,
      cpvClass: hubState.cpv_class,
      cpvCategory: hubState.cpv_category,
      cpvCode: hubState.cpv,
    },
    analysisGrain,
  )
  const analysisQuery = useProcurementAnalysis({
    scope: buildScopeFilter({ ...mapScopeInput, grain: analysisGrain }),
    dimension: mapAnalysisPlan.dimension,
    bucket: 'year',
    // Series/concentration stay on count — value basis can abstain/error under
    // filtered scopes and would fail the whole map query. Facets carry both
    // counts and anchor sums; rankBy selects the choropleth sort/priority.
    measure: 'recordCount',
    basis: 'count',
    rankBy: measure === 'value_awarded' ? 'value' : 'count',
    topN: mapAnalysisPlan.topN,
    // Populations without supplier money cannot answer concentration, and a
    // supplier-scoped concentration is a tautology the server rejects.
    includeConcentration:
      basisPlan.concentration && !mapScopeInput.supplierCui,
  })

  const facetBlock = analysisQuery.data?.facets.blocks.find(
    (block) =>
      block.grain === analysisGrain &&
      block.dimension === mapAnalysisPlan.dimension,
  )
  const statsBlock = analysisQuery.data?.stats.blocks.find(
    (block) => block.grain === analysisGrain,
  )

  const regionBuckets = useMemo((): readonly ProcurementRegionMapBucket[] => {
    const singleId = mapAnalysisPlan.singleTerritoryId
    if (
      singleId &&
      (mapAnalysisPlan.paintMode === 'single-region' ||
        mapAnalysisPlan.paintMode === 'single-county' ||
        mapAnalysisPlan.paintMode === 'single-uat')
    ) {
      if (!statsBlock) return []
      // Null stays null: Number(null) is 0, which would paint unobserved
      // money as a real zero-RON territory.
      const recordCount =
        statsBlock.recordCount !== null ? Number(statsBlock.recordCount) : null
      const valueAwardedSum =
        statsBlock.valueAwardedSum !== null
          ? Number(statsBlock.valueAwardedSum)
          : null
      return [
        {
          region: singleId,
          recordCount:
            recordCount !== null && Number.isFinite(recordCount)
              ? recordCount
              : null,
          valueAwardedSum:
            valueAwardedSum !== null && Number.isFinite(valueAwardedSum)
              ? valueAwardedSum
              : null,
          kind: 'top',
        },
      ]
    }
    return regionBucketsFromBreakdown(facetBlock?.buckets)
  }, [
    facetBlock?.buckets,
    mapAnalysisPlan.paintMode,
    mapAnalysisPlan.singleTerritoryId,
    statsBlock,
  ])

  const heatmapData = useMemo(
    () =>
      buildProcurementMapHeatmapForPaintMode(
        mapAnalysisPlan.paintMode,
        geographyQuery.data,
        regionBuckets,
        measure,
      ),
    [
      geographyQuery.data,
      mapAnalysisPlan.paintMode,
      measure,
      regionBuckets,
    ],
  )

  const paintedCountyCodes = useMemo(
    () => new Set(heatmapData.map((point) => point.county_code)),
    [heatmapData],
  )
  const paintedSirutaCodes = useMemo(
    () =>
      new Set(
        heatmapData.flatMap((point) =>
          'siruta_code' in point && point.siruta_code ? [point.siruta_code] : [],
        ),
      ),
    [heatmapData],
  )

  const { data: countyGeoJson, isPending: countyGeoPending } =
    useGeoJsonData('County')
  const { data: uatGeoJson, isPending: uatGeoPending } = useGeoJsonData('UAT')
  const geoJsonData = paintIsUat ? uatGeoJson : countyGeoJson
  const geoPending = paintIsUat ? uatGeoPending : countyGeoPending

  const colorDomain = useMemo(
    () =>
      getPercentileValues(
        heatmapData,
        MAP_COLOR_MIN_PERCENTILE,
        MAP_COLOR_MAX_PERCENTILE,
        'amount',
      ),
    [heatmapData],
  )

  const getFeatureStyle = useMemo(() => {
    if (!heatmapData.length) {
      return () => ({
        ...DEFAULT_FEATURE_STYLE,
        fillColor: 'var(--pnrr-map-empty)',
        fillOpacity: 0.35,
      })
    }
    const baseFn = createHeatmapStyleFunction(
      heatmapData,
      colorDomain.min,
      colorDomain.max,
      mapViewType,
      'amount',
      getPnrrBlueHeatmapColor,
    )
    return (feature: import('@/components/maps/interfaces').UatFeature) => {
      const style = baseFn(feature)
      if (style.fillColor === DEFAULT_FEATURE_STYLE.fillColor) {
        return {
          ...style,
          fillColor: 'var(--pnrr-map-empty)',
          fillOpacity: 0.35,
          weight: 1,
          color: 'var(--pnrr-map-stroke)',
          opacity: 0.6,
        }
      }
      return {
        ...style,
        weight: 1.2,
        color: 'var(--pnrr-map-stroke)',
        opacity: 0.7,
      }
    }
  }, [heatmapData, colorDomain.min, colorDomain.max, mapViewType])

  const handleFeatureClick = useCallback(
    (properties: UatProperties, _event: InteractiveMapFeatureEvent) => {
      // The territory drawer serves the awarded contract/DA bundle — for
      // other populations (call-offs, modifications, procedures) it would
      // silently answer with a DIFFERENT population, so it stays closed.
      if (!isCoreGrain) return
      const countyCode =
        (typeof properties.mnemonic === 'string' && properties.mnemonic) ||
        (typeof properties.countyCode === 'string' && properties.countyCode) ||
        undefined
      const name = String(properties.name ?? countyCode ?? '—')

      // Open drawer only — do not write global buyer geo filters until CTA.
      // Use paint-mode grain so county/UAT paint under mapGrain=region does not
      // broaden selection (and Apply) to the parent region.
      if (selectionGrain === 'county') {
        const isSingleCounty = mapAnalysisPlan.paintMode === 'single-county'
        const id = isSingleCounty
          ? mapAnalysisPlan.singleTerritoryId
          : countyCode
        if (!id || (!isSingleCounty && !isProcurementMapCountyPainted(id, paintedCountyCodes))) return
        const label =
          countyCode && countyCode === id
            ? name
            : (geographyQuery.data?.counties.find((c) => c.countyCode === id)
                ?.countyName ?? id)
        setSelection({ id, label, grain: 'county' })
        return
      }

      if (selectionGrain === 'uat') {
        const sirutaFromFeature =
          typeof properties.natcode === 'string' && properties.natcode
            ? properties.natcode
            : undefined
        const isSingleUat = mapAnalysisPlan.paintMode === 'single-uat'
        const id = isSingleUat
          ? mapAnalysisPlan.singleTerritoryId
          : sirutaFromFeature
        // Painted-territory gate (county-paint parity): an unpainted locality
        // has no SIRUTA bucket in scope — nothing to open or apply.
        if (!id || (!isSingleUat && !paintedSirutaCodes.has(id))) return
        setSelection({
          id,
          label: sirutaFromFeature ? name : id,
          grain: 'uat',
        })
        return
      }

      const isSingleRegion = mapAnalysisPlan.paintMode === 'single-region'
      if (
        !isSingleRegion &&
        !isProcurementMapCountyPainted(countyCode, paintedCountyCodes)
      ) {
        return
      }
      const region = isSingleRegion
        ? mapAnalysisPlan.singleTerritoryId
        : findRegionForCountyCode(geographyQuery.data, countyCode)
      if (!region) return
      setSelection({ id: region, label: region, grain: 'region' })
    },
    [
      geographyQuery.data,
      isCoreGrain,
      mapAnalysisPlan,
      paintedCountyCodes,
      paintedSirutaCodes,
      selectionGrain,
    ],
  )

  const getTooltipContent = useCallback(
    ({ properties }: { properties: UatProperties }) => {
      const countyCode =
        (typeof properties.mnemonic === 'string' && properties.mnemonic) ||
        (typeof properties.countyCode === 'string' && properties.countyCode) ||
        undefined
      const name = String(properties.name ?? countyCode ?? '—')

      if (paintIsUat) {
        const natcode =
          typeof properties.natcode === 'string' ? properties.natcode : undefined
        const uatPoint = natcode
          ? heatmapData.find(
              (row) => 'siruta_code' in row && row.siruta_code === natcode,
            )
          : undefined
        const county =
          typeof properties.county === 'string' ? properties.county : '—'
        const uatValue =
          uatPoint === undefined
            ? t`No records in scope`
            : measure === 'value_awarded'
              ? formatRon(String(uatPoint.amount), 'compact')
              : formatFlowCount(uatPoint.amount)
        return `<div style="font-weight:700">${name}</div><div style="opacity:.8">${county}</div><div style="margin-top:4px">${uatValue}</div>`
      }

      const point = countyCode
        ? heatmapData.find((row) => row.county_code === countyCode)
        : undefined
      const region =
        findRegionForCountyCode(geographyQuery.data, countyCode) ??
        (point && 'county_entity' in point ? point.county_entity.name : undefined) ??
        '—'
      const value =
        point === undefined
          ? '—'
          : measure === 'value_awarded'
            ? formatRon(String(point.amount), 'compact')
            : formatFlowCount(point.amount)
      return `<div style="font-weight:700">${name}</div><div style="opacity:.8">${region}</div><div style="margin-top:4px">${value}</div>`
    },
    [geographyQuery.data, heatmapData, measure, paintIsUat],
  )

  const mapFilters = useMemo(
    () =>
      ({
        normalization: 'total',
        // Labels use active-series formatting; currency here is unused for
        // choropleth text but kept for InteractiveMap's legacy filter shape.
        currency: 'RON',
        account_category: 'ch',
      }) as AnalyticsFilterType,
    [],
  )

  /**
   * Feature key → value map so polygon labels follow the hub measure.
   * County features key on the mnemonic; UAT features key on natcode (the
   * heatmap point's siruta_code).
   */
  const activeSeriesValuesByCountyCode = useMemo(() => {
    const values = new Map<string, number | undefined>()
    for (const point of heatmapData) {
      const key = 'siruta_code' in point ? point.siruta_code : point.county_code
      values.set(key, point.amount)
    }
    return values
  }, [heatmapData])

  const activeSeriesUnit = measure === 'value_awarded' ? 'RON' : ''

  const formatLegendValue = (value: number) =>
    measure === 'value_awarded'
      ? formatRon(String(Math.round(value)), 'compact')
      : formatFlowCount(String(Math.round(value)))

  const unknownHint = facetBlock?.meta?.caveats?.join(' ')
  const drawerOpen = Boolean(selection)
  const paintPartyRegion =
    mapParty === 'supplier' ? hubState.supplierRegion : hubState.buyerRegion
  const paintPartyCounty =
    mapParty === 'supplier' ? hubState.supplierCounty : hubState.buyerCounty
  const paintPartySiruta =
    mapParty === 'supplier' ? hubState.supplierSiruta : hubState.buyerSiruta
  const paintUsesCountyDrill =
    Boolean(paintPartyRegion) &&
    !paintPartyCounty &&
    !paintPartySiruta &&
    mapAnalysisPlan.paintMode === 'county'

  return (
    <div className="space-y-4">
      <MapToolbar
        analysisGrain={isCoreGrain ? analysisGrain : 'contract'}
        mapGrain={mapGrain}
        mapParty={mapParty}
        showAnalysisGrainToggle={showAnalysisGrainToggle && isCoreGrain}
        supplierPartyDisabled={!isCoreGrain}
        onGrainChange={(grain) =>
          updateFilters({ grain: analysisGrainToHubGrain(grain) })
        }
        onMapGrainChange={(next) => {
          setSelection(undefined)
          updateFilters({ mapGrain: next })
        }}
        onMapPartyChange={(next) => {
          setSelection(undefined)
          updateFilters({ mapParty: next })
        }}
      />

      {mapGrain === 'uat' &&
      facetBlock?.meta &&
      facetBlock.meta.answerability !== 'served' ? (
        // Same disclosure counties get: a degraded/abstained gate (e.g. the
        // contract-grain spend abstention) is why value paint is missing.
        <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          <strong>{facetBlock.meta.answerability}</strong>
          {facetBlock.meta.reason ? ` · ${facetBlock.meta.reason}` : null}
          {unknownHint ? ` · ${unknownHint}` : null}
        </p>
      ) : mapGrain === 'uat' ? (
        <p className="border-l-4 border-[var(--pnrr-border)] pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          {mapParty === 'supplier' ? (
            <Trans>
              Localities (UATs) are coloured by supplier registered-office
              totals under the current filters. Records without known supplier
              geography are excluded from the map — never shown as zero.
            </Trans>
          ) : (
            <Trans>
              Localities (UATs) are coloured by their own totals under the
              current filters. Records without known buyer geography are
              excluded from the map — never shown as zero.
            </Trans>
          )}
        </p>
      ) : paintUsesCountyDrill ? (
        <p className="border-l-4 border-[var(--pnrr-border)] pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          {mapParty === 'supplier' ? (
            <Trans>
              A supplier region filter is active, so the map shows county totals
              for suppliers inside that region. Records without known supplier
              geography are excluded — never shown as zero.
            </Trans>
          ) : (
            <Trans>
              A buyer region filter is active, so the map shows county totals
              inside that region. Records without known buyer geography are
              excluded — never shown as zero.
            </Trans>
          )}
        </p>
      ) : facetBlock?.meta &&
        !mapAnalysisPlan.paintMode.startsWith('single-') ? (
        <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          <strong>{facetBlock.meta.answerability}</strong>
          {facetBlock.meta.reason ? ` · ${facetBlock.meta.reason}` : null}
          {unknownHint ? ` · ${unknownHint}` : null}
        </p>
      ) : (
        <p className="border-l-4 border-[var(--pnrr-border)] pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          {mapParty === 'supplier' ? (
            mapGrain === 'county' ||
            mapAnalysisPlan.paintMode === 'single-county' ? (
              <Trans>
                Counties are coloured by supplier registered-office totals under
                the current filters. Records without known supplier geography
                are excluded from the map — never shown as zero.
              </Trans>
            ) : (
              <Trans>
                Counties are coloured by supplier development-region totals.
                Records without known supplier geography are excluded from the
                map — never shown as zero.
              </Trans>
            )
          ) : mapGrain === 'county' ||
            mapAnalysisPlan.paintMode === 'single-county' ? (
            <Trans>
              Counties are coloured by their own totals under the current
              filters. Records without known buyer geography are excluded from
              the map — never shown as zero.
            </Trans>
          ) : (
            <Trans>
              Counties are coloured by their development region total. Records
              without known buyer geography are excluded from the map — never
              shown as zero.
            </Trans>
          )}
        </p>
      )}

      <div
        className={cn(
          procurementSectionClassName,
          'relative h-[min(70vh,640px)] overflow-hidden',
        )}
      >
        {analysisQuery.isPending || geoPending || geographyQuery.isPending ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : analysisQuery.isError && !analysisQuery.data ? (
          <div className="p-6">
            <ProcurementErrorState
              error={analysisQuery.error}
              onRetry={() => void analysisQuery.refetch()}
              isRetrying={analysisQuery.isRefetching}
            />
          </div>
        ) : (
          <ClientOnly fallback={<LoadingSpinner />}>
            <Suspense fallback={<LoadingSpinner />}>
              <InteractiveMap
                geoJsonData={geoJsonData ?? null}
                countyBoundaryGeoJsonData={
                  paintIsUat ? (countyGeoJson ?? null) : null
                }
                mapViewType={mapViewType}
                // Homogeneous per paint mode (county-shaped or UAT-shaped).
                heatmapData={
                  heatmapData as HeatmapCountyDataPoint[] | HeatmapUATDataPoint[]
                }
                filters={mapFilters}
                labelMode="active-series"
                activeSeriesValuesBySirutaCode={activeSeriesValuesByCountyCode}
                activeSeriesUnit={activeSeriesUnit}
                getFeatureStyle={getFeatureStyle}
                getTooltipContent={getTooltipContent}
                onFeatureClick={handleFeatureClick}
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                minZoom={5}
                mapHeight="100%"
                scrollWheelZoom
              />
            </Suspense>
          </ClientOnly>
        )}

        {heatmapData.length > 0 ? (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-between gap-2 sm:right-auto">
            <div className="pointer-events-auto border-2 border-[var(--pnrr-border)] bg-background/95 px-3 py-2 text-xs font-semibold text-[var(--pnrr-fg)]">
              {selectionGrain === 'county' ? (
                <Trans>County totals</Trans>
              ) : selectionGrain === 'uat' ? (
                <Trans>Locality (UAT) totals</Trans>
              ) : (
                <Trans>Region totals</Trans>
              )}
              <div className="mt-1 flex h-2 w-40 overflow-hidden">
                {Array.from({ length: 8 }, (_, index) => (
                  <span
                    key={index}
                    className="h-full flex-1"
                    style={{
                      backgroundColor: getPnrrBlueHeatmapColor(index / 7),
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between tabular-nums text-[10px] text-[var(--pnrr-muted)]">
                <span>{formatLegendValue(colorDomain.min)}</span>
                <span>{formatLegendValue(colorDomain.max)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {facetBlock &&
      !mapAnalysisPlan.paintMode.startsWith('single-') &&
      facetBlock.meta.answerability !== 'abstained' ? (
        // The maps must reconcile in front of the reader (geo/disclosure
        // wave): named + no-geography (+ withheld consortium mass on the
        // supplier side) = the scope total. Same facet block the map paints
        // from — no extra fetch.
        <ProcurementMapReconciliationPanel
          buckets={facetBlock.buckets ?? []}
          withheldRon={facetBlock.valueWithheldAssociationSum ?? null}
          mapParty={mapParty}
          measure={measure}
        />
      ) : null}

      <ProcurementTerritoryDrawer
        open={drawerOpen}
        territoryGrain={selection?.grain ?? selectionGrain}
        territoryId={selection?.id}
        territoryLabel={selection?.label}
        regionBuckets={regionBuckets}
        hubState={hubState}
        onOpenChange={(open) => {
          if (!open) setSelection(undefined)
        }}
      />
    </div>
  )
}

function MapToolbar({
  analysisGrain,
  mapGrain,
  mapParty,
  showAnalysisGrainToggle,
  supplierPartyDisabled = false,
  onGrainChange,
  onMapGrainChange,
  onMapPartyChange,
}: {
  readonly analysisGrain: FlowAnalysisGrain
  readonly mapGrain: ProcurementHubMapGrain
  readonly mapParty: ProcurementHubState['mapParty']
  readonly showAnalysisGrainToggle: boolean
  /** True for populations without supplier geography (paint forced to buyer). */
  readonly supplierPartyDisabled?: boolean
  readonly onGrainChange: (grain: FlowAnalysisGrain) => void
  readonly onMapGrainChange: (grain: ProcurementHubMapGrain) => void
  readonly onMapPartyChange: (party: ProcurementHubState['mapParty']) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {showAnalysisGrainToggle ? (
          <ProcurementAnalysisGrainToggle
            value={analysisGrain}
            onChange={onGrainChange}
          />
        ) : null}

        <div
          className="inline-flex border-2 border-[var(--pnrr-border)]"
          role="group"
          aria-label={t`Paint by`}
        >
          {(
            [
              {
                id: 'buyer' as const,
                label: t`Public institutions`,
              },
              {
                id: 'supplier' as const,
                label: t`Suppliers`,
              },
            ] as const
          ).map((option, index) => {
            const selected = mapParty === option.id
            const disabled = option.id === 'supplier' && supplierPartyDisabled
            return (
              <Button
                key={option.id}
                type="button"
                variant={selected ? 'default' : 'ghost'}
                aria-pressed={selected}
                disabled={disabled}
                title={
                  disabled
                    ? t`This population has no supplier geography — the map paints buyer territories.`
                    : undefined
                }
                className={cn(
                  'rounded-none',
                  index > 0 && 'border-l-2 border-[var(--pnrr-border)]',
                )}
                onClick={() => onMapPartyChange(option.id)}
              >
                {option.label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
          <Trans>Map detail</Trans>
        </span>
        <div
          className="inline-flex border-2 border-[var(--pnrr-border)]"
          role="group"
          aria-label={t`Map detail`}
        >
          {(
            [
              { id: 'region' as const, label: t`Region`, live: true },
              { id: 'county' as const, label: t`County`, live: true },
              { id: 'uat' as const, label: t`UAT`, live: false },
            ] as const
          ).map((option, index) => {
            const selected = mapGrain === option.id
            return (
              <Button
                key={option.id}
                type="button"
                variant={selected ? 'default' : 'ghost'}
                aria-pressed={selected}
                className={cn(
                  'rounded-none',
                  index > 0 && 'border-l-2 border-[var(--pnrr-border)]',
                )}
                onClick={() => onMapGrainChange(option.id)}
              >
                {option.label}
                {!option.live ? (
                  <ProcurementPreviewBadge
                    className={cn(
                      'ml-2',
                      selected &&
                        'border-white/40 bg-white/15 text-white',
                    )}
                  />
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
