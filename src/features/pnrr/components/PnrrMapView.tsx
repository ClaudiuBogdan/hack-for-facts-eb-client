import {
  useState,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  useRef,
} from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PnrrMapSeriesId } from '../hooks/usePnrrMapSeries'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import {
  createHeatmapStyleFunction,
  getPercentileValues,
} from '@/components/maps/utils'
import { UatProperties, UatFeature } from '@/components/maps/interfaces'
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants'
import type { InteractiveMapFeatureEvent } from '@/components/maps/InteractiveMap'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { PnrrCountyDetailsPanel } from './PnrrCountyDetailsPanel'
import { PnrrUatDetailsPanel } from './PnrrUatDetailsPanel'
import { PnrrProjectDrawer } from './table/PnrrProjectDrawer'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { usePnrrMapModel, usePnrrProjectDetail } from '../hooks/usePnrrData'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { convertPnrrValue, formatPnrrCurrency } from '../lib/formatting'
import { getPnrrBlueHeatmapColor } from '../lib/map-colors'
import { buildPnrrMapTooltipHtml } from '../lib/map-tooltip'
import { MNEMONIC_TO_COUNTY_NAME } from '../lib/county-mnemonics'
import { formatNumber, cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import bbox from '@turf/bbox'
import center from '@turf/center'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { PnrrWorkerMapModel } from '../workers/pnrr-worker-types'

const InteractiveMap = lazy(() =>
  import('@/components/maps/InteractiveMap').then((m) => ({
    default: m.InteractiveMap,
  })),
)

const SERIES_OPTIONS = [
  { id: 'total-value' as PnrrMapSeriesId, label: t`Listed project value` },
  { id: 'project-count' as PnrrMapSeriesId, label: t`Project count` },
  { id: 'per-capita' as PnrrMapSeriesId, label: t`Per capita` },
  { id: 'grant-share' as PnrrMapSeriesId, label: t`Grant %` },
  { id: 'implementation-rate' as PnrrMapSeriesId, label: t`Implemented %` },
]

const MIN_FEATURE_BBOX_DELTA = 1e-6
const PNRR_MAP_MIN_ZOOM = 3.5
const MAX_AUTO_ZOOM = 11
const DEFAULT_MAP_CENTER: [number, number] = [45.9432, 24.9668]
const DEFAULT_MAP_ZOOM = 6.7
const AUTO_FIT_ZOOM_ADJUSTMENT = 0.25
const PNRR_MAP_COLOR_MIN_PERCENTILE = 5
const PNRR_MAP_COLOR_MAX_PERCENTILE = 95

interface PnrrMapViewProps {
  readonly model: PnrrWorkerMapModel
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}

type MapViewport = {
  readonly center: [number, number]
  readonly zoom: number
}

function getUrlViewport(search: ReturnType<typeof usePnrrFilterState>['search']): MapViewport | null {
  return search.mapLat != null && search.mapLng != null && search.mapZoom != null
    ? {
        center: [search.mapLat, search.mapLng],
        zoom: search.mapZoom,
      }
    : null
}

function isRequestedMapModel(
  model: PnrrWorkerMapModel | undefined,
  granularity: 'county' | 'uat',
  seriesId: PnrrMapSeriesId,
): model is PnrrWorkerMapModel {
  return model?.granularity === granularity && model.seriesId === seriesId
}

function computeViewportFromFeatures(
  features: Feature<Geometry, Record<string, unknown>>[],
): { center: [number, number]; zoom: number } | null {
  if (features.length === 0) return null

  const collection: FeatureCollection = { type: 'FeatureCollection', features }
  const featureBounds = bbox(collection)
  const featureCenter = center(collection)
  const [minLng, minLat, maxLng, maxLat] = featureBounds

  const latPad = Math.max((maxLat - minLat) * 0.12, 0.02)
  const lngPad = Math.max((maxLng - minLng) * 0.12, 0.02)
  const paddedMinLat = Math.max(minLat - latPad, -90)
  const paddedMaxLat = Math.min(maxLat + latPad, 90)
  const paddedMinLng = minLng - lngPad
  const paddedMaxLng = maxLng + lngPad

  const lngDelta = Math.max(paddedMaxLng - paddedMinLng, MIN_FEATURE_BBOX_DELTA)
  const latDelta = Math.max(paddedMaxLat - paddedMinLat, MIN_FEATURE_BBOX_DELTA)

  const zoomLat = Math.log(360 / latDelta) / Math.LN2
  const zoomLng = Math.log(360 / lngDelta) / Math.LN2
  const [centerLng, centerLat] = featureCenter.geometry.coordinates
  const fittedZoom = Math.min(zoomLat, zoomLng)

  return {
    center: [centerLat, centerLng],
    zoom: Number.isFinite(fittedZoom)
      ? Math.min(
          Math.max(fittedZoom + AUTO_FIT_ZOOM_ADJUSTMENT, PNRR_MAP_MIN_ZOOM),
          MAX_AUTO_ZOOM,
        )
      : DEFAULT_MAP_ZOOM,
  }
}

function formatLegendValue(
  value: number,
  seriesId: PnrrMapSeriesId,
  currency: 'RON' | 'EUR' | 'USD',
): string {
  if (seriesId === 'grant-share' || seriesId === 'implementation-rate')
    return `${formatNumber(value, 'compact')}%`
  if (seriesId === 'project-count') return formatNumber(value, 'compact')
  return formatPnrrCurrency(value, currency)
}

function getActiveSeriesLabelValue(
  value: number,
  seriesId: PnrrMapSeriesId,
  currency: 'RON' | 'EUR' | 'USD',
): number {
  if (seriesId === 'total-value' || seriesId === 'per-capita') {
    return convertPnrrValue(value, currency)
  }

  return value
}

function getActiveSeriesLabelUnit(
  seriesId: PnrrMapSeriesId,
  currency: 'RON' | 'EUR' | 'USD',
): string {
  switch (seriesId) {
    case 'total-value':
      return currency
    case 'project-count':
      return t`projects`
    case 'per-capita':
      return `${currency}/capita`
    case 'grant-share':
    case 'implementation-rate':
      return '%'
  }
}

function MapLegend({
  min,
  max,
  seriesId,
}: {
  readonly min: number
  readonly max: number
  readonly seriesId: PnrrMapSeriesId
}) {
  const currency = usePnrrCurrency()
  if (typeof min !== 'number' || typeof max !== 'number' || min > max)
    return null

  if (min === max) {
    const color = getPnrrBlueHeatmapColor(0.5)
    return (
      <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-3">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-10 border border-[var(--pnrr-border)]"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-black tabular-nums text-[var(--pnrr-fg)]">
            {formatLegendValue(min, seriesId, currency)}
          </span>
        </div>
      </div>
    )
  }

  const gradientStops = Array.from({ length: 60 }, (_, i) =>
    getPnrrBlueHeatmapColor(i / 59),
  )
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`

  return (
    <div className="border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-3">
      <div className="flex flex-col gap-2">
        <div
          className="h-3 w-40 border border-[var(--pnrr-border)]"
          style={{ background: gradient }}
        />
        <div className="flex items-center justify-between gap-3 text-xs font-black tabular-nums text-[var(--pnrr-fg)]">
          <span>{formatLegendValue(min, seriesId, currency)}</span>
          <span>{formatLegendValue(max, seriesId, currency)}</span>
        </div>
      </div>
    </div>
  )
}

export function PnrrMapView({
  model,
  filterState,
}: PnrrMapViewProps) {
  const [activeSeriesId, setActiveSeriesId] =
    useState<PnrrMapSeriesId>('total-value')
  const { data: activeMapData } = usePnrrMapModel(filterState.search, activeSeriesId)
  const runtimeViewportRef = useRef<MapViewport | null>(null)
  const currency = usePnrrCurrency()

  const { search, setView, setSearch } = filterState
  const requestedGranularity = search.granularity === 'uat' ? 'uat' : 'county'
  const selectedCounty =
    search.panel === 'map-county' && search.panelCountyCode
      ? (MNEMONIC_TO_COUNTY_NAME[search.panelCountyCode] ?? null)
      : null
  const activeMapModel = activeMapData?.mapModel
  const activeModel = isRequestedMapModel(
    activeMapModel,
    requestedGranularity,
    activeSeriesId,
  )
    ? activeMapModel
    : isRequestedMapModel(model, requestedGranularity, activeSeriesId)
      ? model
      : (activeMapModel ?? model)
  const mapGranularity = activeModel.granularity === 'uat' ? 'uat' : 'county'
  const renderedSeriesId = activeModel.seriesId
  const selectedUat = activeModel.selectedUat
  const selectedProjectId =
    search.panel === 'project' ? search.panelProjectId : null
  const { data: selectedProjectResult } = usePnrrProjectDetail(selectedProjectId)
  const selectedProject = selectedProjectResult?.project ?? null

  const activeSeries = activeModel.series
  const { data: geoJsonData, isPending: isGeoJsonLoading } = useGeoJsonData(
    mapGranularity === 'uat' ? 'UAT' : 'County',
  )
  const { data: countyGeoJsonData } = useGeoJsonData('County')

  const nationalCount = activeModel.nationalCount
  const unmappedCount = activeModel.unmappedCount

  const heatmapData = useMemo(
    () =>
      [...activeSeries.data] as
        | import('@/schemas/heatmap').HeatmapCountyDataPoint[]
        | import('@/schemas/heatmap').HeatmapUATDataPoint[],
    [activeSeries.data],
  )
  const activeSeriesValuesByFeatureId = useMemo(() => {
    const values = new Map<string, number | undefined>()

    for (const dataPoint of heatmapData) {
      const key =
        mapGranularity === 'uat'
          ? (dataPoint as import('@/schemas/heatmap').HeatmapUATDataPoint)
              .siruta_code
          : (dataPoint as import('@/schemas/heatmap').HeatmapCountyDataPoint)
              .county_code

      values.set(
        key,
        getActiveSeriesLabelValue(dataPoint.amount, renderedSeriesId, currency),
      )
    }

    return values
  }, [currency, mapGranularity, heatmapData, renderedSeriesId])
  const activeSeriesUnit = useMemo(
    () => getActiveSeriesLabelUnit(renderedSeriesId, currency),
    [renderedSeriesId, currency],
  )

  const colorDomain = useMemo(
    () =>
      getPercentileValues(
        heatmapData,
        PNRR_MAP_COLOR_MIN_PERCENTILE,
        PNRR_MAP_COLOR_MAX_PERCENTILE,
        'amount',
      ),
    [heatmapData],
  )

  // Compute dynamic viewport from features with active data
  const autoViewport = useMemo(() => {
    if (
      !geoJsonData ||
      geoJsonData.type !== 'FeatureCollection' ||
      heatmapData.length === 0
    ) {
      return null
    }

    const dataIds = new Set(
      mapGranularity === 'uat'
        ? (
            heatmapData as import('@/schemas/heatmap').HeatmapUATDataPoint[]
          ).map((d) => String(d.siruta_code))
        : (
            heatmapData as import('@/schemas/heatmap').HeatmapCountyDataPoint[]
          ).map((d) => String(d.county_code)),
    )

    const matchedFeatures = (geoJsonData as FeatureCollection).features.filter(
      (f) => {
        const props = f.properties as Record<string, unknown> | undefined
        if (!props) return false
        const id = mapGranularity === 'uat' ? props['natcode'] : props['mnemonic']
        return id != null && dataIds.has(String(id))
      },
    ) as Feature<Geometry, Record<string, unknown>>[]

    return computeViewportFromFeatures(matchedFeatures)
  }, [geoJsonData, heatmapData, mapGranularity])

  const urlViewport = getUrlViewport(search)
  const fallbackViewport = autoViewport ?? {
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
  }
  const mapViewport = runtimeViewportRef.current ?? urlViewport ?? fallbackViewport
  if (!runtimeViewportRef.current && geoJsonData) {
    runtimeViewportRef.current = mapViewport
  }

  const filters = useMemo(
    () => ({
      normalization: (renderedSeriesId === 'per-capita'
        ? 'per_capita'
        : 'total') as 'per_capita' | 'total',
      currency: currency as 'RON' | 'EUR' | 'USD',
      account_category: 'ch' as const,
    }),
    [renderedSeriesId, currency],
  )

  const getFeatureStyle = useMemo(() => {
    if (!heatmapData.length) return () => DEFAULT_FEATURE_STYLE
    const baseFn = createHeatmapStyleFunction(
      heatmapData,
      colorDomain.min,
      colorDomain.max,
      mapGranularity === 'uat' ? 'UAT' : 'County',
      'amount',
      getPnrrBlueHeatmapColor,
    )
    return (feature?: UatFeature) => {
      if (!feature) return DEFAULT_FEATURE_STYLE
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
      return { ...style, weight: 1.2, color: 'var(--pnrr-map-stroke)', opacity: 0.7 }
    }
  }, [heatmapData, colorDomain.min, colorDomain.max, mapGranularity])

  const getTooltipContent = useCallback(
    ({ properties }: { properties: UatProperties }) => {
      if (mapGranularity === 'uat') {
        const data = (
          activeSeries.data as import('@/schemas/heatmap').HeatmapUATDataPoint[]
        ).find((d) => d.siruta_code === properties.natcode)
        return buildPnrrMapTooltipHtml({
          title: properties.name,
          meta: properties.county,
          value: data
            ? formatTooltipValue(data.amount, renderedSeriesId, currency)
            : t`No data`,
        })
      }
      const data = (
        activeSeries.data as import('@/schemas/heatmap').HeatmapCountyDataPoint[]
      ).find((d) => d.county_code === properties.mnemonic)
      return buildPnrrMapTooltipHtml({
        title: data?.county_name ?? properties.name,
        value: data
          ? formatTooltipValue(data.amount, renderedSeriesId, currency)
          : t`No data`,
      })
    },
    [activeSeries.data, renderedSeriesId, mapGranularity, currency],
  )

  const handleFeatureClick = useCallback(
    (properties: UatProperties, _event: InteractiveMapFeatureEvent) => {
      if (mapGranularity === 'county') {
        const countyCode = properties.mnemonic
        if (typeof countyCode === 'string' || typeof countyCode === 'number') {
          filterState.openMapCountyPanel(String(countyCode))
        }
      } else if (mapGranularity === 'uat') {
        filterState.openMapUatPanel({
          siruta: properties.natcode,
        })
      }
    },
    [filterState, mapGranularity],
  )

  const handleBeneficiaryClick = useCallback(
    (beneficiary: { readonly name: string; readonly cui: string | null }) => {
      if (beneficiary.cui) {
        filterState.showBeneficiaryProjects(beneficiary)
      } else {
        setSearch(beneficiary.name)
        setView('projects')
      }
    },
    [filterState, setSearch, setView],
  )

  const handleMapViewChange = useCallback(
    (center: [number, number], zoom: number) => {
      runtimeViewportRef.current = { center, zoom }
    },
    [],
  )

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <MapToolbar
        granularity={requestedGranularity}
        activeSeriesId={activeSeriesId}
        filterState={filterState}
        onSeriesChange={setActiveSeriesId}
      />

      {/* Map */}
      <div className="relative border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-2">
        <div className="pnrr-map-surface relative isolate h-[68vh] min-h-[520px] w-full overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-map-bg)] sm:h-[75vh] sm:min-h-[680px]">
          {isGeoJsonLoading && (
            <div className="flex h-full w-full items-center justify-center bg-[var(--pnrr-bg)]">
              <LoadingSpinner size="lg" text={t`Loading map...`} />
            </div>
          )}

          {!isGeoJsonLoading && geoJsonData && (
            <ClientOnly
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[var(--pnrr-bg)]">
                  <LoadingSpinner size="lg" text={t`Loading map...`} />
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-[var(--pnrr-bg)]">
                    <LoadingSpinner size="lg" text={t`Loading map...`} />
                  </div>
                }
              >
                <InteractiveMap
                  geoJsonData={geoJsonData}
                  countyBoundaryGeoJsonData={
                    mapGranularity === 'uat' ? countyGeoJsonData : null
                  }
                  mapViewType={mapGranularity === 'uat' ? 'UAT' : 'County'}
                  heatmapData={heatmapData}
                  filters={filters}
                  getFeatureStyle={getFeatureStyle}
                  getTooltipContent={getTooltipContent}
                  onFeatureClick={handleFeatureClick}
                  center={mapViewport.center}
                  zoom={mapViewport.zoom}
                  minZoom={PNRR_MAP_MIN_ZOOM}
                  mapHeight="100%"
                  showLabels
                  labelMode="active-series"
                  activeSeriesValuesBySirutaCode={activeSeriesValuesByFeatureId}
                  activeSeriesUnit={activeSeriesUnit}
                  onViewChange={handleMapViewChange}
                />
              </Suspense>
            </ClientOnly>
          )}

          {!isGeoJsonLoading && !geoJsonData && (
            <div className="flex h-full w-full items-center justify-center bg-[var(--pnrr-bg)] text-sm font-bold text-[var(--pnrr-muted)]">
              <Trans>Map geometry not available.</Trans>
            </div>
          )}

          {/* Floating legend */}
          {activeSeries.data.length > 0 && (
            <div className="absolute bottom-4 right-4 z-20 max-w-[calc(100%-2rem)]">
              <MapLegend
                min={colorDomain.min}
                max={colorDomain.max}
                seriesId={renderedSeriesId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2">
        {nationalCount > 0 && (
          <span className="inline-flex min-h-9 items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
            <Info className="h-4 w-4 text-[var(--pnrr-fg)]" />
            {nationalCount.toLocaleString('ro-RO')}{' '}
            <Trans>national projects outside the map</Trans>
          </span>
        )}
        {unmappedCount > 0 && mapGranularity === 'uat' && (
          <span className="inline-flex min-h-9 items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
            <Info className="h-4 w-4 text-[var(--pnrr-fg)]" />
            {unmappedCount.toLocaleString('ro-RO')}{' '}
            <Trans>projects without UAT mapping</Trans>
          </span>
        )}
      </div>

      {/* Detail panels */}
      {mapGranularity === 'county' && (
        <PnrrCountyDetailsPanel
          county={selectedCounty}
          summary={activeModel.selectedCountySummary}
          projects={activeModel.selectedCountyProjects}
          onClose={filterState.closePanel}
          selectedProjectId={search.panelProjectId}
          onProjectClick={filterState.openProjectPanel}
          onProjectClose={filterState.closeProjectPanel}
          onBeneficiaryClick={handleBeneficiaryClick}
        />
      )}
      {mapGranularity === 'uat' && (
        <PnrrUatDetailsPanel
          uatName={selectedUat?.name ?? null}
          countyName={selectedUat?.county ?? null}
          natcode={selectedUat?.natcode ?? null}
          summary={activeModel.selectedUatSummary}
          projects={activeModel.selectedUatProjects}
          onClose={filterState.closePanel}
          selectedProjectId={search.panelProjectId}
          onProjectClick={filterState.openProjectPanel}
          onProjectClose={filterState.closeProjectPanel}
          onBeneficiaryClick={handleBeneficiaryClick}
          onViewProjects={(uat) => filterState.showUatView('projects', uat)}
          onViewBeneficiaries={(uat) =>
            filterState.showUatView('beneficiaries', uat)
          }
        />
      )}
      <PnrrProjectDrawer
        project={selectedProject}
        onClose={filterState.closePanel}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  Toolbar – PNRR tab controls                                     */
/* ──────────────────────────────────────────────────────────────── */

function MapToolbar({
  granularity,
  activeSeriesId,
  filterState,
  onSeriesChange,
}: {
  readonly granularity: string
  readonly activeSeriesId: PnrrMapSeriesId
  readonly filterState: ReturnType<typeof usePnrrFilterState>
  readonly onSeriesChange: (id: PnrrMapSeriesId) => void
}) {
  const activeGranularity = granularity === 'uat' ? 'uat' : 'county'

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Granularity toggle */}
      <div
        className="inline-flex w-fit border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-1"
        role="group"
        aria-label={t`Map level`}
      >
        {[
          { id: 'county', label: <Trans>County</Trans> },
          { id: 'uat', label: <Trans>UAT</Trans> },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() =>
              filterState.setGranularity(option.id as 'county' | 'uat')
            }
            className={cn(
              'h-10 px-5 text-sm font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
              activeGranularity === option.id
                ? 'bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
                : 'bg-transparent text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-bg)]',
            )}
            aria-pressed={activeGranularity === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Series */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="group"
        aria-label={t`Map indicator`}
      >
        {SERIES_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSeriesChange(opt.id)}
            className={cn(
              'h-11 shrink-0 border-2 px-4 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
              activeSeriesId === opt.id
                ? 'border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] text-[var(--pnrr-bg)]'
                : 'border-[var(--pnrr-border)] bg-[var(--pnrr-card)] text-[var(--pnrr-muted)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]',
            )}
            aria-pressed={activeSeriesId === opt.id}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatTooltipValue(
  amount: number,
  seriesId: PnrrMapSeriesId,
  currency: 'RON' | 'EUR' | 'USD',
): string {
  switch (seriesId) {
    case 'total-value':
      return formatPnrrCurrency(amount, currency)
    case 'project-count':
      return t`${formatNumber(amount, 'compact')} projects`
    case 'per-capita':
      return t`${formatPnrrCurrency(amount, currency)} / inhabitant`
    case 'grant-share':
      return t`${formatNumber(amount, 'compact')}% grant`
    case 'implementation-rate':
      return t`${formatNumber(amount, 'compact')}% technically implemented`
  }
}
