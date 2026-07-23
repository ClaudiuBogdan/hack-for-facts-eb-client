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
  hubGrainToAnalysisGrain,
  hubStateToLandingFilters,
  type ProcurementHubMapGrain,
  type ProcurementHubState,
} from '@/schemas/procurement-hub'
import { getPnrrBlueHeatmapColor } from '@/features/pnrr/lib/map-colors'
import {
  useProcurementAnalysis,
  useProcurementGeographyOptions,
} from '../hooks/use-procurement-data'
import type { ProcurementHubFilterPatch } from '../hooks/use-procurement-hub-state'
import { formatFlowCount, formatRon } from '../lib/formatting'
import type { AnalyticsFilterType } from '@/schemas/charts'
import {
  buildProcurementMapHeatmapForPaintMode,
  findRegionForCountyCode,
  isProcurementMapCountyPainted,
  regionBucketsFromBreakdown,
  resolveProcurementMapAnalysisPlan,
  selectionGrainFromPaintMode,
  type ProcurementRegionMapBucket,
} from '../lib/procurement-map-series'
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
  const analysisGrain = hubGrainToAnalysisGrain(hubState.grain)
  const mapGrain = hubState.mapGrain
  const mapParty = hubState.mapParty
  const measure = hubState.measure
  const mapViewType = mapGrain === 'uat' ? 'UAT' : 'County'
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

  const analysisQuery = useProcurementAnalysis({
    scope: {
      grain: analysisGrain,
      ...(monthScope.monthFrom ? { from: monthScope.monthFrom } : {}),
      ...(monthScope.monthTo ? { to: monthScope.monthTo } : {}),
      ...(hubState.buyerRegion ? { buyerRegion: hubState.buyerRegion } : {}),
      ...(hubState.buyerCounty ? { buyerCounty: hubState.buyerCounty } : {}),
      ...(hubState.buyerSiruta ? { buyerSiruta: hubState.buyerSiruta } : {}),
      ...(hubState.supplierRegion
        ? { supplierRegion: hubState.supplierRegion }
        : {}),
      ...(hubState.supplierCounty
        ? { supplierCounty: hubState.supplierCounty }
        : {}),
      ...(hubState.supplierSiruta
        ? { supplierSiruta: hubState.supplierSiruta }
        : {}),
    },
    dimension: mapAnalysisPlan.dimension,
    bucket: 'year',
    // Series/concentration stay on count — value basis can abstain/error under
    // filtered scopes and would fail the whole map query. Facets carry both
    // counts and awarded sums; rankBy selects the choropleth sort/priority.
    measure: 'recordCount',
    basis: 'count',
    rankBy: measure === 'value_awarded' ? 'value' : 'count',
    topN: mapAnalysisPlan.topN,
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
      const recordCount = Number(statsBlock.recordCount)
      const valueAwardedSum = Number(statsBlock.valueAwardedSum)
      return [
        {
          region: singleId,
          recordCount: Number.isFinite(recordCount) ? recordCount : null,
          valueAwardedSum: Number.isFinite(valueAwardedSum)
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

  const { data: countyGeoJson, isPending: countyGeoPending } =
    useGeoJsonData('County')
  const { data: uatGeoJson, isPending: uatGeoPending } = useGeoJsonData('UAT')
  const geoJsonData = mapGrain === 'uat' ? uatGeoJson : countyGeoJson
  const geoPending = mapGrain === 'uat' ? uatGeoPending : countyGeoPending

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
        if (!id) return
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
    [geographyQuery.data, mapAnalysisPlan, paintedCountyCodes, selectionGrain],
  )

  const getTooltipContent = useCallback(
    ({ properties }: { properties: UatProperties }) => {
      const countyCode =
        (typeof properties.mnemonic === 'string' && properties.mnemonic) ||
        (typeof properties.countyCode === 'string' && properties.countyCode) ||
        undefined
      const name = String(properties.name ?? countyCode ?? '—')

      if (mapGrain === 'uat') {
        return `<div style="font-weight:700">${name}</div><div style="opacity:.8">${t`Choropleth Preview — click for details`}</div>`
      }

      const point = countyCode
        ? heatmapData.find((row) => row.county_code === countyCode)
        : undefined
      const region =
        findRegionForCountyCode(geographyQuery.data, countyCode) ??
        point?.county_entity.name ??
        '—'
      const value =
        point === undefined
          ? '—'
          : measure === 'value_awarded'
            ? formatRon(String(point.amount), 'compact')
            : formatFlowCount(point.amount)
      return `<div style="font-weight:700">${name}</div><div style="opacity:.8">${region}</div><div style="margin-top:4px">${value}</div>`
    },
    [geographyQuery.data, heatmapData, mapGrain, measure],
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

  /** County mnemonic → value map so polygon labels follow the hub measure. */
  const activeSeriesValuesByCountyCode = useMemo(() => {
    const values = new Map<string, number | undefined>()
    for (const point of heatmapData) {
      values.set(point.county_code, point.amount)
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
        analysisGrain={analysisGrain}
        mapGrain={mapGrain}
        mapParty={mapParty}
        showAnalysisGrainToggle={showAnalysisGrainToggle}
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

      {mapGrain === 'uat' ? (
        <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          {/* TODO(UAT geometry layer): UAT-level data is served; paint needs UAT polygons. */}
          {mapParty === 'supplier' ? (
            <Trans>
              UAT colours are not published yet. Click a territory to open
              details; the side panel still applies a public-institution
              location filter.
            </Trans>
          ) : (
            <Trans>
              UAT colours are not published yet. Click a territory to open
              details; use the panel buttons to apply a buyer location filter.
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
        mapAnalysisPlan.dimension !== 'cpvDivision' ? (
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
        ) : analysisQuery.isError && !analysisQuery.data && mapGrain !== 'uat' ? (
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
                  mapGrain === 'uat' ? (countyGeoJson ?? null) : null
                }
                mapViewType={mapViewType}
                heatmapData={heatmapData}
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
                <Trans>Region record totals (Preview)</Trans>
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
  onGrainChange,
  onMapGrainChange,
  onMapPartyChange,
}: {
  readonly analysisGrain: FlowAnalysisGrain
  readonly mapGrain: ProcurementHubMapGrain
  readonly mapParty: ProcurementHubState['mapParty']
  readonly showAnalysisGrainToggle: boolean
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
