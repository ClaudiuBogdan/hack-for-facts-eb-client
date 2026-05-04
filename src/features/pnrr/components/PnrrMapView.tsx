import {
  useState,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  useRef,
  useEffect,
} from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import {
  usePnrrMapSeries,
  type PnrrMapSeriesId,
} from '../hooks/usePnrrMapSeries'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import {
  createHeatmapStyleFunction,
  getPercentileValues,
} from '@/components/maps/utils'
import { UatProperties, UatFeature } from '@/components/maps/interfaces'
import { DEFAULT_FEATURE_STYLE } from '@/components/maps/constants'
import type { LeafletMouseEvent } from 'leaflet'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ClientOnly } from '@/components/ssr/ClientOnly'
import { PnrrCountyDetailsPanel } from './PnrrCountyDetailsPanel'
import { PnrrUatDetailsPanel } from './PnrrUatDetailsPanel'
import { PnrrProjectDrawer } from './table/PnrrProjectDrawer'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import { getPnrrBlueHeatmapColor } from '../lib/map-colors'
import { buildPnrrMapTooltipHtml } from '../lib/map-tooltip'
import { MNEMONIC_TO_COUNTY_NAME } from '../lib/county-mnemonics'
import { getPnrrUatLabelsBySiruta } from '../lib/pnrr-uat-labels'
import { formatNumber, cn } from '@/lib/utils'
import { Info } from 'lucide-react'
import bbox from '@turf/bbox'
import center from '@turf/center'
import type { FeatureCollection, Feature, Geometry } from 'geojson'

const InteractiveMap = lazy(() =>
  import('@/components/maps/InteractiveMap').then((m) => ({
    default: m.InteractiveMap,
  })),
)

const SERIES_OPTIONS = [
  { id: 'total-value' as PnrrMapSeriesId, label: t`Total value` },
  { id: 'project-count' as PnrrMapSeriesId, label: t`Project count` },
  { id: 'per-capita' as PnrrMapSeriesId, label: t`Per capita` },
  { id: 'grant-share' as PnrrMapSeriesId, label: t`Grant %` },
  { id: 'implementation-rate' as PnrrMapSeriesId, label: t`Implemented %` },
]

const MIN_FEATURE_BBOX_DELTA = 1e-6
const MAX_AUTO_ZOOM = 11
const DEFAULT_MAP_CENTER: [number, number] = [45.9432, 24.9668]
const DEFAULT_MAP_ZOOM = 6.7
const PNRR_MAP_COLOR_MIN_PERCENTILE = 5
const PNRR_MAP_COLOR_MAX_PERCENTILE = 95

interface PnrrMapViewProps {
  readonly projects: readonly PnrrProject[]
  readonly filterState: ReturnType<typeof usePnrrFilterState>
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
  const fittedZoom = Math.min(zoomLat, zoomLng, MAX_AUTO_ZOOM)

  return {
    center: [centerLat, centerLng],
    zoom: Number.isFinite(fittedZoom)
      ? Math.max(DEFAULT_MAP_ZOOM, fittedZoom + 1.0)
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

export function PnrrMapView({ projects, filterState }: PnrrMapViewProps) {
  const [activeSeriesId, setActiveSeriesId] =
    useState<PnrrMapSeriesId>('total-value')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currency = usePnrrCurrency()

  const { search, setView, setSearch, setMapView } = filterState
  const granularity = search.granularity ?? 'county'
  const selectedCounty =
    search.panel === 'map-county' && search.panelCountyCode
      ? (MNEMONIC_TO_COUNTY_NAME[search.panelCountyCode] ?? null)
      : null
  const selectedUat = useMemo(() => {
    if (search.panel !== 'map-uat' || !search.panelUatSiruta) return null

    const matchingProject = projects.find(
      (project) => project.sirutaCode === search.panelUatSiruta,
    )
    const sourceLabel = getPnrrUatLabelsBySiruta().get(search.panelUatSiruta)

    return {
      name:
        sourceLabel?.name ??
        matchingProject?.locality ??
        search.panelUatSiruta,
      county: sourceLabel?.county ?? matchingProject?.county ?? '',
      natcode: search.panelUatSiruta,
    }
  }, [projects, search.panel, search.panelUatSiruta])
  const selectedProject = useMemo(() => {
    if (search.panel !== 'project' || !search.panelProjectId) return null
    return (
      projects.find((project) => project.id === search.panelProjectId) ?? null
    )
  }, [projects, search.panel, search.panelProjectId])

  const activeSeries = usePnrrMapSeries(
    projects,
    activeSeriesId,
    granularity === 'uat' ? 'uat' : 'county',
  )
  const { data: geoJsonData, isPending: isGeoJsonLoading } = useGeoJsonData(
    granularity === 'uat' ? 'UAT' : 'County',
  )
  const { data: countyGeoJsonData } = useGeoJsonData('County')

  const nationalCount = useMemo(
    () => projects.filter((p) => p.county === 'Național').length,
    [projects],
  )
  const unmappedCount = useMemo(
    () =>
      granularity === 'uat'
        ? projects.filter(
            (p) => p.sirutaCode === null && p.county !== 'Național',
          ).length
        : 0,
    [projects, granularity],
  )

  const heatmapData = useMemo(
    () =>
      [...activeSeries.data] as
        | import('@/schemas/heatmap').HeatmapCountyDataPoint[]
        | import('@/schemas/heatmap').HeatmapUATDataPoint[],
    [activeSeries.data],
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
      granularity === 'uat'
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
        const id = granularity === 'uat' ? props['natcode'] : props['mnemonic']
        return id != null && dataIds.has(String(id))
      },
    ) as Feature<Geometry, Record<string, unknown>>[]

    return computeViewportFromFeatures(matchedFeatures)
  }, [geoJsonData, heatmapData, granularity])

  // Use URL position if present, otherwise auto-computed viewport, otherwise default
  const mapCenter: [number, number] =
    search.mapLat != null && search.mapLng != null
      ? [search.mapLat, search.mapLng]
      : (autoViewport?.center ?? DEFAULT_MAP_CENTER)

  const mapZoom = search.mapZoom ?? autoViewport?.zoom ?? DEFAULT_MAP_ZOOM

  const filters = useMemo(
    () => ({
      normalization: (activeSeriesId === 'per-capita'
        ? 'per_capita'
        : 'total') as 'per_capita' | 'total',
      currency: currency as 'RON' | 'EUR' | 'USD',
      account_category: 'ch' as const,
    }),
    [activeSeriesId, currency],
  )

  const getFeatureStyle = useMemo(() => {
    if (!heatmapData.length) return () => DEFAULT_FEATURE_STYLE
    const baseFn = createHeatmapStyleFunction(
      heatmapData,
      colorDomain.min,
      colorDomain.max,
      granularity === 'uat' ? 'UAT' : 'County',
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
  }, [heatmapData, colorDomain.min, colorDomain.max, granularity])

  const getTooltipContent = useCallback(
    ({ properties }: { properties: UatProperties }) => {
      if (granularity === 'uat') {
        const data = (
          activeSeries.data as import('@/schemas/heatmap').HeatmapUATDataPoint[]
        ).find((d) => d.siruta_code === properties.natcode)
        return buildPnrrMapTooltipHtml({
          title: properties.name,
          meta: properties.county,
          value: data
            ? formatTooltipValue(data.amount, activeSeriesId, currency)
            : t`No data`,
        })
      }
      const data = (
        activeSeries.data as import('@/schemas/heatmap').HeatmapCountyDataPoint[]
      ).find((d) => d.county_code === properties.mnemonic)
      return buildPnrrMapTooltipHtml({
        title: data?.county_name ?? properties.name,
        value: data
          ? formatTooltipValue(data.amount, activeSeriesId, currency)
          : t`No data`,
      })
    },
    [activeSeries.data, activeSeriesId, granularity, currency],
  )

  const handleFeatureClick = useCallback(
    (properties: UatProperties, _event: LeafletMouseEvent) => {
      if (granularity === 'county') {
        const countyCode = properties.mnemonic
        if (typeof countyCode === 'string' || typeof countyCode === 'number') {
          filterState.openMapCountyPanel(String(countyCode))
        }
      } else if (granularity === 'uat') {
        filterState.openMapUatPanel({
          siruta: properties.natcode,
        })
      }
    },
    [filterState, granularity],
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

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleMapViewChange = useCallback(
    (center: [number, number], zoom: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        setMapView(center[0], center[1], zoom)
      }, 300)
    },
    [setMapView],
  )

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <MapToolbar
        granularity={granularity}
        activeSeriesId={activeSeriesId}
        filterState={filterState}
        onSeriesChange={setActiveSeriesId}
      />

      {/* Map */}
      <div className="relative border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-2">
        <div className="pnrr-map-surface relative isolate h-[55vh] min-h-[420px] w-full overflow-hidden border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-map-bg)] sm:h-[65vh] sm:min-h-[560px]">
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
                    granularity === 'uat' ? countyGeoJsonData : null
                  }
                  mapViewType={granularity === 'uat' ? 'UAT' : 'County'}
                  heatmapData={heatmapData}
                  filters={filters}
                  getFeatureStyle={getFeatureStyle}
                  getTooltipContent={getTooltipContent}
                  onFeatureClick={handleFeatureClick}
                  center={mapCenter}
                  zoom={mapZoom}
                  mapHeight="100%"
                  showLabels
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
                seriesId={activeSeriesId}
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
        {unmappedCount > 0 && granularity === 'uat' && (
          <span className="inline-flex min-h-9 items-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
            <Info className="h-4 w-4 text-[var(--pnrr-fg)]" />
            {unmappedCount.toLocaleString('ro-RO')}{' '}
            <Trans>projects without UAT mapping</Trans>
          </span>
        )}
      </div>

      {/* Detail panels */}
      {granularity === 'county' && (
        <PnrrCountyDetailsPanel
          county={selectedCounty}
          projects={projects}
          onClose={filterState.closePanel}
          selectedProjectId={search.panelProjectId}
          onProjectClick={filterState.openProjectPanel}
          onProjectClose={filterState.closeProjectPanel}
          onBeneficiaryClick={handleBeneficiaryClick}
        />
      )}
      {granularity === 'uat' && (
        <PnrrUatDetailsPanel
          uatName={selectedUat?.name ?? null}
          countyName={selectedUat?.county ?? null}
          natcode={selectedUat?.natcode ?? null}
          projects={projects}
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
