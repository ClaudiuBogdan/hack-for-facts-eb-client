import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import type { Feature, GeoJsonObject, Geometry } from 'geojson'
import type { GeoJSON as LeafletGeoJSON, Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import { CampaignSubscriptionMapLegend } from './campaign-subscription-map-legend'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_MAX_BOUNDS,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
} from '@/components/maps/constants'
import {
  getSubscriptionFillColor,
  type SubscriptionLegendBin,
} from '../../utils/subscription-scale'
import { normalizeSirutaCode } from '../../utils/normalize-siruta-code'
import type { CampaignLocale } from '../../types'
import { BugetUatNameCanvasLabelLayer } from './buget-uat-name-canvas-label-layer'

type BugetEntityMapSelectorMapProps = {
  readonly uatGeoJson: GeoJsonObject
  readonly countyGeoJson: GeoJsonObject
  readonly locale: CampaignLocale
  readonly onUatSelect: (input: { natcode: string; name: string }) => void
  readonly highlightSubscriptions?: boolean
  readonly totalParticipants?: number
  readonly subscriptionCountsByNatcode?: ReadonlyMap<string, number>
  readonly subscriptionLegendBins?: readonly SubscriptionLegendBin[]
}

type StylableLayer = {
  setStyle: (style: PathOptions) => void
}

type TooltipLayer = {
  bindTooltip: (
    content: string,
    options?: {
      sticky?: boolean
      direction?: string
      className?: string
      opacity?: number
      offset?: [number, number]
    },
  ) => void
}

type TooltipUpdater = {
  getTooltip?: () => { setContent: (content: string) => void } | null
  setTooltipContent?: (content: string) => void
}

type FeatureLayer = Layer &
  Partial<StylableLayer> &
  Partial<TooltipLayer> &
  TooltipUpdater & {
    feature?: Feature<Geometry, unknown>
  }

type UatFeatureProperties = {
  readonly natcode?: string | number
  readonly name?: string
  readonly cui?: string | number
}

function buildSubscriptionDataRevision(
  locale: CampaignLocale,
  highlightSubscriptions: boolean,
  subscriptionCountsByNatcode: ReadonlyMap<string, number> | undefined,
): string {
  if (!highlightSubscriptions || !subscriptionCountsByNatcode || subscriptionCountsByNatcode.size === 0) {
    return `${locale}:off`
  }

  let hash = 0

  for (const [sirutaCode, count] of subscriptionCountsByNatcode.entries()) {
    const entry = `${normalizeSirutaCode(sirutaCode)}:${count};`
    for (let index = 0; index < entry.length; index += 1) {
      hash = (hash * 31 + entry.charCodeAt(index)) >>> 0
    }
  }

  return `${locale}:on:${subscriptionCountsByNatcode.size}:${hash.toString(16)}`
}

const UAT_DEFAULT_STYLE: PathOptions = {
  color: '#8a8f98',
  weight: 1.6,
  fillColor: '#fde7e7',
  fillOpacity: 0.88,
}

const UAT_HOVER_STYLE: PathOptions = {
  color: '#5b6069',
  weight: 2.8,
  fillColor: '#f9cfcf',
  fillOpacity: 1,
}

const COUNTY_BORDER_STYLE: PathOptions = {
  color: '#6b7280',
  weight: 1.9,
  fillOpacity: 0,
  interactive: false,
}

const UAT_LABEL_MIN_ZOOM = 10
const UAT_LABEL_MAX_VISIBLE = 520
const UAT_LABEL_FONT_SIZE = 15
const UAT_TOOLTIP_OPTIONS = {
  sticky: true,
  direction: 'top' as const,
  className: 'campaign-uat-map-tooltip',
  opacity: 1,
  offset: [0, -14] as [number, number],
}

function parseUatFeatureProperties(
  feature: Feature<Geometry, unknown>,
): { natcode: string; name: string; cui: string } | null {
  const rawProperties = feature.properties as UatFeatureProperties | null | undefined
  if (!rawProperties) return null

  const natcode = String(rawProperties.natcode ?? '').trim()
  const cui = String(rawProperties.cui ?? '').trim()
  if (!natcode) return null

  return {
    natcode: normalizeSirutaCode(natcode),
    name: String(rawProperties.name ?? '').trim(),
    cui,
  }
}

function formatCityHallLabel(label: string, locale: CampaignLocale): string {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) {
    return locale === 'en' ? 'City Hall' : 'Primăria'
  }

  const lowerLabel = trimmedLabel.toLowerCase()
  const hasRomanianPrefix = lowerLabel.startsWith('primăria ') || lowerLabel.startsWith('primaria ')
  const hasEnglishPrefix = lowerLabel.startsWith('city hall ')

  if (locale === 'en') {
    if (hasEnglishPrefix) return trimmedLabel
    if (hasRomanianPrefix) {
      const strippedLabel = lowerLabel.startsWith('primăria ')
        ? trimmedLabel.slice('primăria '.length)
        : trimmedLabel.slice('primaria '.length)
      return `City Hall ${strippedLabel}`
    }
    return `City Hall ${trimmedLabel}`
  }

  if (lowerLabel.startsWith('primăria ')) return trimmedLabel
  if (lowerLabel.startsWith('primaria ')) {
    return `Primăria ${trimmedLabel.slice('primaria '.length)}`
  }
  if (hasEnglishPrefix) {
    return `Primăria ${trimmedLabel.slice('city hall '.length)}`
  }
  return `Primăria ${trimmedLabel}`
}

function getSubscriptionCount(
  featureNatcode: string,
  subscriptionCountsByNatcode: ReadonlyMap<string, number> | undefined,
): number {
  if (subscriptionCountsByNatcode == null) {
    return 0
  }

  return subscriptionCountsByNatcode.get(normalizeSirutaCode(featureNatcode)) ?? 0
}

function buildTooltipContent(
  featureProperties: { natcode: string; name: string },
  locale: CampaignLocale,
  highlightSubscriptions: boolean,
  subscriptionCountsByNatcode: ReadonlyMap<string, number> | undefined,
): string {
  const featureLabel = (featureProperties.name || featureProperties.natcode).trim()
  const tooltipLabel = formatCityHallLabel(featureLabel, locale)

  if (!highlightSubscriptions) {
    return tooltipLabel
  }

  const subscriptionCount = getSubscriptionCount(
    featureProperties.natcode,
    subscriptionCountsByNatcode,
  )
  const subscriptionText =
    locale === 'en'
      ? `${subscriptionCount.toLocaleString('en-US')} participant${subscriptionCount === 1 ? '' : 's'}`
      : `${subscriptionCount.toLocaleString('ro-RO')} participanți`

  return `<div class="space-y-1"><div>${tooltipLabel}</div><div>${subscriptionText}</div></div>`
}

function BugetUatCanvasLabelsOverlay({
  uatGeoJson,
}: {
  readonly uatGeoJson: GeoJsonObject
}) {
  const map = useMap()
  const labelLayerRef = useRef<BugetUatNameCanvasLabelLayer | null>(null)

  useEffect(() => {
    const layer = new BugetUatNameCanvasLabelLayer({
      geoJsonData: uatGeoJson,
      minZoom: UAT_LABEL_MIN_ZOOM,
      maxLabels: UAT_LABEL_MAX_VISIBLE,
      fontSize: UAT_LABEL_FONT_SIZE,
    })

    layer.addTo(map)
    labelLayerRef.current = layer

    return () => {
      if (labelLayerRef.current) {
        map.removeLayer(labelLayerRef.current)
        labelLayerRef.current = null
      }
    }
  }, [map, uatGeoJson])

  useEffect(() => {
    labelLayerRef.current?.updateOptions({
      geoJsonData: uatGeoJson,
      minZoom: UAT_LABEL_MIN_ZOOM,
      maxLabels: UAT_LABEL_MAX_VISIBLE,
      fontSize: UAT_LABEL_FONT_SIZE,
    })
  }, [uatGeoJson])

  return null
}

export function BugetEntityMapSelectorMap({
  uatGeoJson,
  countyGeoJson,
  locale,
  onUatSelect,
  highlightSubscriptions = false,
  totalParticipants,
  subscriptionCountsByNatcode,
  subscriptionLegendBins = [],
}: BugetEntityMapSelectorMapProps) {
  const normalizedSubscriptionCountsByNatcode = useMemo(() => {
    if (subscriptionCountsByNatcode == null) {
      return undefined
    }

    const normalizedCounts = new Map<string, number>()
    for (const [sirutaCode, count] of subscriptionCountsByNatcode.entries()) {
      normalizedCounts.set(normalizeSirutaCode(sirutaCode), count)
    }

    return normalizedCounts
  }, [subscriptionCountsByNatcode])

  const uatLayerRef = useRef<LeafletGeoJSON | null>(null)
  const choroplethRevision = useMemo(
    () =>
      buildSubscriptionDataRevision(
        locale,
        highlightSubscriptions,
        normalizedSubscriptionCountsByNatcode,
      ),
    [highlightSubscriptions, locale, normalizedSubscriptionCountsByNatcode],
  )

  const getFeatureStyle = useCallback(
    (featureProperties: { natcode: string }): PathOptions => {
      if (!highlightSubscriptions || !normalizedSubscriptionCountsByNatcode) {
        return UAT_DEFAULT_STYLE
      }

      const count = getSubscriptionCount(
        featureProperties.natcode,
        normalizedSubscriptionCountsByNatcode,
      )

      return {
        ...UAT_DEFAULT_STYLE,
        fillColor: getSubscriptionFillColor(count, subscriptionLegendBins),
        fillOpacity: count > 0 ? 0.92 : 0.84,
      }
    },
    [highlightSubscriptions, normalizedSubscriptionCountsByNatcode, subscriptionLegendBins],
  )

  const handleEachUatFeature = useCallback(
    (feature: Feature<Geometry, unknown>, layer: Layer) => {
      const featureProperties = parseUatFeatureProperties(feature)
      if (!featureProperties) return

      const tooltipLayer = layer as TooltipLayer
      tooltipLayer.bindTooltip(
        buildTooltipContent(
          featureProperties,
          locale,
          highlightSubscriptions,
          normalizedSubscriptionCountsByNatcode,
        ),
        UAT_TOOLTIP_OPTIONS,
      )

      layer.on({
        mouseover: (event: LeafletMouseEvent) => {
          const stylableLayer = event.target as StylableLayer
          const baseStyle = getFeatureStyle(featureProperties)
          stylableLayer.setStyle({
            ...baseStyle,
            ...UAT_HOVER_STYLE,
            fillColor: baseStyle.fillColor ?? UAT_HOVER_STYLE.fillColor,
          })
        },
        mouseout: (event: LeafletMouseEvent) => {
          const stylableLayer = event.target as StylableLayer
          stylableLayer.setStyle(getFeatureStyle(featureProperties))
        },
        click: () => {
          onUatSelect(featureProperties)
        },
      })
    },
    [
      getFeatureStyle,
      highlightSubscriptions,
      locale,
      normalizedSubscriptionCountsByNatcode,
      onUatSelect,
    ],
  )

  useEffect(() => {
    const layerGroup = uatLayerRef.current
    if (layerGroup == null) {
      return
    }

    layerGroup.eachLayer((layer) => {
      const featureLayer = layer as FeatureLayer
      const featureProperties = featureLayer.feature
        ? parseUatFeatureProperties(featureLayer.feature)
        : null

      if (!featureProperties) {
        return
      }

      featureLayer.setStyle?.(getFeatureStyle(featureProperties))

      const tooltipContent = buildTooltipContent(
        featureProperties,
        locale,
        highlightSubscriptions,
        normalizedSubscriptionCountsByNatcode,
      )
      const existingTooltip = featureLayer.getTooltip?.()

      if (existingTooltip != null) {
        existingTooltip.setContent(tooltipContent)
        return
      }

      if (typeof featureLayer.setTooltipContent === 'function') {
        featureLayer.setTooltipContent(tooltipContent)
        return
      }

      featureLayer.bindTooltip?.(tooltipContent, UAT_TOOLTIP_OPTIONS)
    })
  }, [getFeatureStyle, highlightSubscriptions, locale, normalizedSubscriptionCountsByNatcode])

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        minZoom={DEFAULT_MIN_ZOOM}
        maxZoom={DEFAULT_MAX_ZOOM}
        maxBounds={DEFAULT_MAX_BOUNDS}
        scrollWheelZoom
        preferCanvas
        style={{ height: 'calc(100svh - 10rem)', width: '100%', backgroundColor: 'transparent' }}
        className="z-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 sm:rounded-2xl"
        data-testid="campaign-entity-map-selector"
      >
        {uatGeoJson.type === 'FeatureCollection' ? (
          <GeoJSON
            key={`campaign-uat-layer-${choroplethRevision}`}
            ref={uatLayerRef}
            data={uatGeoJson}
            style={(feature) => {
              const featureProperties = feature ? parseUatFeatureProperties(feature) : null
              return featureProperties ? getFeatureStyle(featureProperties) : UAT_DEFAULT_STYLE
            }}
            onEachFeature={handleEachUatFeature}
          />
        ) : null}

        {countyGeoJson.type === 'FeatureCollection' ? (
          <GeoJSON data={countyGeoJson} style={COUNTY_BORDER_STYLE} />
        ) : null}

        <BugetUatCanvasLabelsOverlay uatGeoJson={uatGeoJson} />
      </MapContainer>

      {highlightSubscriptions && (subscriptionLegendBins.length > 0 || totalParticipants != null) ? (
        <CampaignSubscriptionMapLegend
          bins={subscriptionLegendBins}
          totalParticipants={totalParticipants}
          className="absolute bottom-4 left-4 z-[500] max-w-[13rem]"
        />
      ) : null}
    </div>
  )
}
