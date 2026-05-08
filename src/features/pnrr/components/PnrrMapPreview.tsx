import {
  useMemo,
  useCallback,
  useEffect,
  useState,
  lazy,
  Suspense,
} from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
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
import { PnrrUatDetailsPanel } from './PnrrUatDetailsPanel'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency } from '../lib/formatting'
import { getPnrrBlueHeatmapColor } from '../lib/map-colors'
import { buildPnrrMapTooltipHtml } from '../lib/map-tooltip'
import { ArrowRight } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import bbox from '@turf/bbox'
import center from '@turf/center'
import type { FeatureCollection, Feature, Geometry } from 'geojson'
import type { PnrrWorkerMapModel } from '../workers/pnrr-worker-types'

const InteractiveMap = lazy(() =>
  import('@/components/maps/InteractiveMap').then((m) => ({
    default: m.InteractiveMap,
  })),
)

const MIN_FEATURE_BBOX_DELTA = 1e-6
const PNRR_PREVIEW_MIN_ZOOM = 5
const MAX_PREVIEW_ZOOM = 11
const ROMANIA_MAP_CENTER: [number, number] = [45.9432, 24.9668]
const DESKTOP_PREVIEW_ZOOM = 6.4
const DEFAULT_PREVIEW_ZOOM = 6.5
const AUTO_FIT_ZOOM_ADJUSTMENT = 0.25
const PNRR_MAP_COLOR_MIN_PERCENTILE = 5
const PNRR_MAP_COLOR_MAX_PERCENTILE = 95

type MapViewport = {
  readonly center: [number, number]
  readonly zoom: number
}

interface PnrrMapPreviewProps {
  readonly model: PnrrWorkerMapModel
  readonly filterState: ReturnType<typeof usePnrrFilterState>
}

function computeViewportFromFeatures(
  features: Feature<Geometry, UatProperties>[],
): { center: [number, number]; zoom: number } | null {
  if (features.length === 0) return null

  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features,
  }

  const featureBounds = bbox(collection)
  const featureCenter = center(collection)
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = featureBounds

  // Add 12% padding so features don't touch the viewport edge
  const latPad = Math.max((maxLatitude - minLatitude) * 0.12, 0.02)
  const lngPad = Math.max((maxLongitude - minLongitude) * 0.12, 0.02)
  const paddedMinLat = Math.max(minLatitude - latPad, -90)
  const paddedMaxLat = Math.min(maxLatitude + latPad, 90)
  const paddedMinLng = minLongitude - lngPad
  const paddedMaxLng = maxLongitude + lngPad

  const longitudeDelta = Math.max(
    paddedMaxLng - paddedMinLng,
    MIN_FEATURE_BBOX_DELTA,
  )
  const latitudeDelta = Math.max(
    paddedMaxLat - paddedMinLat,
    MIN_FEATURE_BBOX_DELTA,
  )

  const zoomLatitude = Math.log(360 / latitudeDelta) / Math.LN2
  const zoomLongitude = Math.log(360 / longitudeDelta) / Math.LN2
  const [centerLongitude, centerLatitude] = featureCenter.geometry.coordinates
  const fittedZoom = Math.min(zoomLatitude, zoomLongitude)

  return {
    center: [centerLatitude, centerLongitude],
    zoom: Number.isFinite(fittedZoom)
      ? Math.min(
          Math.max(
            fittedZoom + AUTO_FIT_ZOOM_ADJUSTMENT,
            PNRR_PREVIEW_MIN_ZOOM,
          ),
          MAX_PREVIEW_ZOOM,
        )
      : DEFAULT_PREVIEW_ZOOM,
  }
}

function PreviewLegend({
  min,
  max,
}: {
  readonly min: number
  readonly max: number
}) {
  const currency = usePnrrCurrency()
  if (typeof min !== 'number' || typeof max !== 'number' || min > max)
    return null

  if (min === max) {
    const color = getPnrrBlueHeatmapColor(0.5)
    return (
      <div className="absolute bottom-3 right-3 z-20 rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]/95 p-2.5 text-[var(--pnrr-fg)] shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 shrink-0 border border-[var(--pnrr-border)]"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium">
            {formatPnrrCurrency(min, currency)}
          </span>
        </div>
      </div>
    )
  }

  const gradientStops = Array.from({ length: 100 }, (_, i) =>
    getPnrrBlueHeatmapColor(i / 99),
  )
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`

  return (
    <div className="absolute bottom-3 right-3 z-20 min-w-[160px] rounded-sm border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]/95 p-2.5 text-[var(--pnrr-fg)] shadow-lg backdrop-blur-sm">
      <div className="flex flex-col gap-1.5">
        <div
          className="h-3 w-full overflow-hidden rounded-sm border border-[var(--pnrr-border)]"
          style={{ background: gradient }}
        />
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-medium whitespace-nowrap">
            {formatPnrrCurrency(min, currency)}
          </span>
          <span className="text-[var(--pnrr-muted)]">—</span>
          <span className="font-medium whitespace-nowrap">
            {formatPnrrCurrency(max, currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function PnrrMapPreview({ model, filterState }: PnrrMapPreviewProps) {
  const [userViewport, setUserViewport] = useState<MapViewport | null>(null)
  const currency = usePnrrCurrency()
  const isMobile = useIsMobile()
  const selectedUat = model.selectedUat
  const { data: geoJsonData, isPending: isGeoJsonLoading } =
    useGeoJsonData('UAT')
  const { data: countyGeoJsonData } = useGeoJsonData('County')

  const heatmapData = useMemo(
    () =>
      [
        ...model.series.data,
      ] as import('@/schemas/heatmap').HeatmapUATDataPoint[],
    [model.series.data],
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

  const activeSirutaCodes = useMemo(
    () => new Set(heatmapData.map((d) => String(d.siruta_code))),
    [heatmapData],
  )
  const activeSirutaSignature = useMemo(
    () => Array.from(activeSirutaCodes).sort().join('|'),
    [activeSirutaCodes],
  )

  useEffect(() => {
    setUserViewport(null)
  }, [activeSirutaSignature])

  // Compute center/zoom from UAT features that have project data
  const mapViewport = useMemo(() => {
    if (
      !geoJsonData ||
      geoJsonData.type !== 'FeatureCollection' ||
      activeSirutaCodes.size === 0
    ) {
      return null
    }

    const matchedFeatures = (geoJsonData as FeatureCollection).features.filter(
      (f) => {
        const props = f.properties as UatProperties | undefined
        return (
          props?.natcode != null && activeSirutaCodes.has(String(props.natcode))
        )
      },
    ) as Feature<Geometry, UatProperties>[]

    return computeViewportFromFeatures(matchedFeatures)
  }, [geoJsonData, activeSirutaCodes])

  const defaultMapViewport = useMemo<MapViewport>(
    () =>
      mapViewport ?? {
        center: ROMANIA_MAP_CENTER,
        zoom: isMobile ? DEFAULT_PREVIEW_ZOOM : DESKTOP_PREVIEW_ZOOM,
      },
    [isMobile, mapViewport],
  )

  const activeMapViewport = userViewport ?? defaultMapViewport

  const handleMapViewChange = useCallback(
    (center: [number, number], zoom: number) => {
      setUserViewport({ center, zoom })
    },
    [],
  )

  const getFeatureStyle = useMemo(() => {
    if (!heatmapData.length) return () => DEFAULT_FEATURE_STYLE
    const baseFn = createHeatmapStyleFunction(
      heatmapData,
      colorDomain.min,
      colorDomain.max,
      'UAT',
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
  }, [heatmapData, colorDomain.min, colorDomain.max])

  const getTooltipContent = useCallback(
    (context: {
      properties: UatProperties
      heatmapData:
        | import('@/schemas/heatmap').HeatmapUATDataPoint[]
        | import('@/schemas/heatmap').HeatmapCountyDataPoint[]
    }) => {
      const data = (
        context.heatmapData as import('@/schemas/heatmap').HeatmapUATDataPoint[]
      ).find((d) => d.siruta_code === context.properties.natcode)
      return buildPnrrMapTooltipHtml({
        title: context.properties.name,
        meta: context.properties.county,
        value: data ? formatPnrrCurrency(data.amount, currency) : t`No data`,
      })
    },
    [currency],
  )

  const handleFeatureClick = useCallback(
    (properties: UatProperties, _event: InteractiveMapFeatureEvent) => {
      filterState.openMapUatPanel({
        siruta: properties.natcode,
      })
    },
    [filterState],
  )

  const handleBeneficiaryClick = useCallback(
    (beneficiary: { readonly name: string; readonly cui: string | null }) => {
      if (beneficiary.cui) {
        filterState.showBeneficiaryProjects(beneficiary)
      } else {
        filterState.setSearch(beneficiary.name)
        filterState.setView('projects')
      }
    },
    [filterState],
  )

  const filters = useMemo(
    () => ({
      normalization: 'total' as const,
      currency: currency as 'RON' | 'EUR' | 'USD',
      account_category: 'ch' as const,
    }),
    [currency],
  )

  const activeSeriesValuesBySirutaCode = useMemo(() => {
    const map = new Map<string, number | undefined>()
    for (const d of heatmapData) {
      map.set(d.siruta_code, d.amount)
    }
    return map
  }, [heatmapData])

  const uatProjectCount = model.uatProjectCount

  if (uatProjectCount === 0) return null

  const hasData = model.series.data.length > 0

  return (
    <section className="flex min-w-0 flex-col h-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-emerald-500 to-blue-500" />
          <h2 className="text-lg font-bold tracking-tight">
            <Trans>UAT map</Trans>
          </h2>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {uatProjectCount} <Trans>projects with location</Trans>
          </span>
        </div>
        <button
          onClick={() => {
            filterState.setGranularity('uat')
            filterState.setView('map')
          }}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          <Trans>View full map</Trans>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>

      <div className="pnrr-map-surface relative isolate min-h-[480px] flex-1 w-full overflow-hidden rounded-xl border border-border/60">
        {isGeoJsonLoading && (
          <div className="flex h-full w-full items-center justify-center">
            <LoadingSpinner size="md" text={t`Loading map...`} />
          </div>
        )}

        {!isGeoJsonLoading && geoJsonData && (
          <ClientOnly
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                <LoadingSpinner size="md" text={t`Loading map...`} />
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <LoadingSpinner size="md" text={t`Loading map...`} />
                </div>
              }
            >
              <InteractiveMap
                geoJsonData={geoJsonData}
                countyBoundaryGeoJsonData={countyGeoJsonData}
                mapViewType="UAT"
                heatmapData={heatmapData}
                filters={filters}
                getFeatureStyle={getFeatureStyle}
                getTooltipContent={getTooltipContent}
                onFeatureClick={handleFeatureClick}
                center={activeMapViewport.center}
                zoom={activeMapViewport.zoom}
                minZoom={PNRR_PREVIEW_MIN_ZOOM}
                showLabels
                mapHeight="100%"
                activeSeriesValuesBySirutaCode={activeSeriesValuesBySirutaCode}
                activeSeriesUnit={currency}
                onViewChange={handleMapViewChange}
                mobilePanMode="pinch-zoom-until-unlocked"
              />
            </Suspense>
          </ClientOnly>
        )}

        {!isGeoJsonLoading && !geoJsonData && (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Trans>Map geometry not available.</Trans>
          </div>
        )}

        {hasData && (
          <PreviewLegend min={colorDomain.min} max={colorDomain.max} />
        )}
      </div>

      <PnrrUatDetailsPanel
        uatName={selectedUat?.name ?? null}
        countyName={selectedUat?.county ?? null}
        natcode={selectedUat?.natcode ?? null}
        summary={model.selectedUatSummary}
        projects={model.selectedUatProjects}
        onClose={filterState.closePanel}
        selectedProjectId={filterState.search.panelProjectId}
        onProjectClick={filterState.openProjectPanel}
        onProjectClose={filterState.closeProjectPanel}
        onBeneficiaryClick={handleBeneficiaryClick}
        onViewProjects={(uat) => filterState.showUatView('projects', uat)}
        onViewBeneficiaries={(uat) =>
          filterState.showUatView('beneficiaries', uat)
        }
      />
    </section>
  )
}
