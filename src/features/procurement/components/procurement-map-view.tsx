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
  buildProcurementMapHeatmap,
  findRegionForCountyCode,
  regionBucketsFromBreakdown,
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
 * Buyer geography choropleth on the procurement Overview.
 * Shared hub filters (period, measure, buyer geo…) apply globally.
 * `mapGrain` is map-only chrome (URL + toolbar), not a global filter chip.
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
  const measure = hubState.measure
  const mapViewType = mapGrain === 'uat' ? 'UAT' : 'County'

  const analysisQuery = useProcurementAnalysis({
    scope: {
      grain: analysisGrain,
      ...(monthScope.monthFrom ? { from: monthScope.monthFrom } : {}),
      ...(monthScope.monthTo ? { to: monthScope.monthTo } : {}),
      // Buyer geography scope is served at every level (ClickHouse dev backend).
      ...(hubState.buyerRegion ? { buyerRegion: hubState.buyerRegion } : {}),
      ...(hubState.buyerCounty ? { buyerCounty: hubState.buyerCounty } : {}),
      ...(hubState.buyerSiruta ? { buyerSiruta: hubState.buyerSiruta } : {}),
    },
    dimension:
      mapGrain === 'county' || mapGrain === 'uat'
        ? mapGrain === 'uat'
          ? 'buyerSiruta'
          : 'buyerCounty'
        : 'buyerRegion',
    bucket: 'year',
    measure: measure === 'value_awarded' ? 'valueAwardedSum' : 'recordCount',
    topN: 20,
    basis: measure === 'value_awarded' ? 'value' : 'count',
  })

  const mapDimension =
    mapGrain === 'uat' ? 'buyerSiruta' : mapGrain === 'county' ? 'buyerCounty' : 'buyerRegion'
  const facetBlock = analysisQuery.data?.facets.blocks.find(
    (block) => block.grain === analysisGrain && block.dimension === mapDimension,
  )
  const regionBuckets = useMemo(
    () => regionBucketsFromBreakdown(facetBlock?.buckets),
    [facetBlock?.buckets],
  )

  const heatmapData = useMemo(
    () =>
      buildProcurementMapHeatmap(
        mapGrain,
        geographyQuery.data,
        regionBuckets,
        measure,
      ),
    [geographyQuery.data, mapGrain, measure, regionBuckets],
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
      if (mapGrain === 'county') {
        if (!countyCode) return
        setSelection({ id: countyCode, label: name })
        return
      }

      if (mapGrain === 'uat') {
        const siruta =
          typeof properties.natcode === 'string' && properties.natcode
            ? properties.natcode
            : undefined
        if (!siruta) return
        setSelection({ id: siruta, label: name })
        return
      }

      const region = findRegionForCountyCode(geographyQuery.data, countyCode)
      if (!region) return
      setSelection({ id: region, label: region })
    },
    [geographyQuery.data, mapGrain],
  )

  const getTooltipContent = useCallback(
    ({ properties }: { properties: UatProperties }) => {
      const countyCode =
        (typeof properties.mnemonic === 'string' && properties.mnemonic) ||
        (typeof properties.countyCode === 'string' && properties.countyCode) ||
        undefined
      const name = String(properties.name ?? countyCode ?? '—')

      if (mapGrain !== 'region') {
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
        currency: 'RON',
        account_category: 'ch',
      }) as AnalyticsFilterType,
    [],
  )

  const unknownHint = facetBlock?.meta?.caveats?.join(' ')
  const drawerOpen = Boolean(selection)

  return (
    <div className="space-y-4">
      <MapToolbar
        analysisGrain={analysisGrain}
        mapGrain={mapGrain}
        showAnalysisGrainToggle={showAnalysisGrainToggle}
        onGrainChange={(grain) =>
          updateFilters({ grain: analysisGrainToHubGrain(grain) })
        }
        onMapGrainChange={(next) => {
          setSelection(undefined)
          updateFilters({ mapGrain: next })
        }}
      />

      {mapGrain !== 'region' ? (
        <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          {/* TODO(Wave-2 buyer_county / buyer_siruta): replace empty map with live choropleth. */}
          <Trans>
            County and UAT colours are not published yet. Click a territory to
            open details; use the panel buttons to apply a buyer location filter.
          </Trans>
        </p>
      ) : facetBlock?.meta ? (
        <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          <strong>{facetBlock.meta.answerability}</strong>
          {facetBlock.meta.reason ? ` · ${facetBlock.meta.reason}` : null}
          {unknownHint ? ` · ${unknownHint}` : null}
        </p>
      ) : (
        <p className="border-l-4 border-[var(--pnrr-border)] pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
          <Trans>
            Counties are coloured by their development region total. Records
            without known buyer geography are excluded from the map — never shown
            as zero.
          </Trans>
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
        ) : analysisQuery.isError && !analysisQuery.data && mapGrain === 'region' ? (
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
              <Trans>Region record totals (Preview)</Trans>
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
                <span>
                  {formatFlowCount(String(Math.round(colorDomain.min)))}
                </span>
                <span>
                  {formatFlowCount(String(Math.round(colorDomain.max)))}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ProcurementTerritoryDrawer
        open={drawerOpen}
        mapGrain={mapGrain}
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
  showAnalysisGrainToggle,
  onGrainChange,
  onMapGrainChange,
}: {
  readonly analysisGrain: FlowAnalysisGrain
  readonly mapGrain: ProcurementHubMapGrain
  readonly showAnalysisGrainToggle: boolean
  readonly onGrainChange: (grain: FlowAnalysisGrain) => void
  readonly onMapGrainChange: (grain: ProcurementHubMapGrain) => void
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        showAnalysisGrainToggle ? 'sm:justify-between' : 'sm:justify-end',
      )}
    >
      {showAnalysisGrainToggle ? (
        <ProcurementAnalysisGrainToggle
          value={analysisGrain}
          onChange={onGrainChange}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
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
