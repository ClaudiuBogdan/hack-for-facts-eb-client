import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useRef } from 'react'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
import type { Feature, GeoJsonObject, Geometry } from 'geojson'
import type { Layer, LeafletMouseEvent, PathOptions } from 'leaflet'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  DEFAULT_MAX_BOUNDS,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
} from '@/components/maps/constants'
import type { CampaignLocale } from '../../types'
import { BugetUatNameCanvasLabelLayer } from './buget-uat-name-canvas-label-layer'

type BugetEntityMapSelectorMapProps = {
  readonly uatGeoJson: GeoJsonObject
  readonly countyGeoJson: GeoJsonObject
  readonly locale: CampaignLocale
  readonly onUatSelect: (input: { natcode: string; name: string }) => void
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

type UatFeatureProperties = {
  readonly natcode?: string | number
  readonly name?: string
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

function parseUatFeatureProperties(
  feature: Feature<Geometry, unknown>,
): { natcode: string; name: string } | null {
  const rawProperties = feature.properties as UatFeatureProperties | null | undefined
  if (!rawProperties) return null

  const natcode = String(rawProperties.natcode ?? '').trim()
  if (!natcode) return null

  return {
    natcode,
    name: String(rawProperties.name ?? '').trim(),
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
  }, [map])

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
}: BugetEntityMapSelectorMapProps) {
  const handleEachUatFeature = useCallback(
    (feature: Feature<Geometry, unknown>, layer: Layer) => {
      const featureProperties = parseUatFeatureProperties(feature)
      if (!featureProperties) return

      const featureLabel = (featureProperties.name || featureProperties.natcode).trim()
      const tooltipLabel = formatCityHallLabel(featureLabel, locale)
      const tooltipLayer = layer as TooltipLayer
      tooltipLayer.bindTooltip(tooltipLabel, {
        sticky: true,
        direction: 'top',
        className: 'campaign-uat-map-tooltip',
        opacity: 1,
        offset: [0, -14],
      })

      layer.on({
        mouseover: (event: LeafletMouseEvent) => {
          const stylableLayer = event.target as StylableLayer
          stylableLayer.setStyle(UAT_HOVER_STYLE)
        },
        mouseout: (event: LeafletMouseEvent) => {
          const stylableLayer = event.target as StylableLayer
          stylableLayer.setStyle(UAT_DEFAULT_STYLE)
        },
        click: () => {
          onUatSelect(featureProperties)
        },
      })
    },
    [locale, onUatSelect],
  )

  return (
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      minZoom={DEFAULT_MIN_ZOOM}
      maxZoom={DEFAULT_MAX_ZOOM}
      maxBounds={DEFAULT_MAX_BOUNDS}
      scrollWheelZoom
      preferCanvas
      style={{ height: '70vh', width: '100%', backgroundColor: 'transparent' }}
      className="z-0 overflow-hidden rounded-2xl border border-zinc-300 dark:border-zinc-700"
      data-testid="campaign-entity-map-selector"
    >
      {uatGeoJson.type === 'FeatureCollection' ? (
        <GeoJSON
          data={uatGeoJson}
          style={UAT_DEFAULT_STYLE}
          onEachFeature={handleEachUatFeature}
        />
      ) : null}

      {countyGeoJson.type === 'FeatureCollection' ? (
        <GeoJSON data={countyGeoJson} style={COUNTY_BORDER_STYLE} />
      ) : null}

      <BugetUatCanvasLabelsOverlay uatGeoJson={uatGeoJson} />
    </MapContainer>
  )
}
