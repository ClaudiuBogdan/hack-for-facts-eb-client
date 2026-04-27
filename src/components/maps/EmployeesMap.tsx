import React, { useCallback, useMemo, useRef } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import L, { Layer, PathOptions } from 'leaflet'
import { Feature, Geometry } from 'geojson'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { EnrichedEmployeeData } from '@/schemas/employeeData'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, DEFAULT_FEATURE_STYLE, HIGHLIGHT_FEATURE_STYLE } from './constants'
import { UatFeature } from './interfaces'
import { MapLegend } from './MapLegend'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { HelpCircleIcon, X } from 'lucide-react'
import { getHeatmapColor } from './utils'
import { ScrollWheelZoomControl } from './ScrollWheelZoomControl'
import { shouldUseCanvasRenderer } from './leaflet-renderer'

type EmployeesMapProps = {
  data: readonly EnrichedEmployeeData[] | null
  metric?: keyof EnrichedEmployeeData
}

export function EmployeesMap({ data, metric = 'employeesPer1000Capita' }: EmployeesMapProps) {
  const { data: geoJson } = useGeoJsonData('UAT')
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null)
  const useCanvasRenderer = useMemo(() => shouldUseCanvasRenderer(), [])

  const uatDataBySiruta = useMemo(() => {
    const map = new Map<string | number, EnrichedEmployeeData>()
    for (const row of data ?? []) {
      map.set(String(row.sirutaCode), row)
    }
    return map
  }, [data])

  const values = useMemo(() => {
    const arr = Array.from(uatDataBySiruta.values()).map(r => Number(r[metric] ?? 0)).filter(v => Number.isFinite(v))
    if (arr.length === 0) return { min: 0, max: 1 }
    const sorted = [...arr].sort((a, b) => a - b)
    const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((q / 100) * (sorted.length - 1))))]
    const min = p(5)
    const max = p(95)
    return min === max ? { min: min === 0 ? 0 : min * 0.9, max: max === 0 ? 1 : max * 1.1 } : { min, max }
  }, [uatDataBySiruta, metric])

  const getFeatureStyle = useMemo(() => {
    return (feature: UatFeature, mapRef: Map<string | number, EnrichedEmployeeData>): PathOptions => {
      const id = feature.properties?.natcode
      if (!id) return DEFAULT_FEATURE_STYLE
      const row = mapRef.get(String(id))
      if (!row) return { ...DEFAULT_FEATURE_STYLE, fillOpacity: 0.1, fillColor: '#cccccc' }
      const value = Number(row[metric] ?? 0)
      const norm = values.max === values.min ? 0.5 : Math.max(0, Math.min((value - values.min) / (values.max - values.min), 1))
      const fillColor = getHeatmapColor(norm)
      return { ...DEFAULT_FEATURE_STYLE, fillColor, fillOpacity: 0.7 }
    }
  }, [metric, values])

  const styleFn = useMemo(() => {
    return (feature?: Feature<Geometry, unknown>): PathOptions => {
      if (!feature?.properties) return DEFAULT_FEATURE_STYLE
      const f = feature as unknown as UatFeature
      return getFeatureStyle(f, uatDataBySiruta)
    }
  }, [uatDataBySiruta, getFeatureStyle])

  const createTooltipHtml = useCallback((row: EnrichedEmployeeData | undefined) => {
    if (!row) return `<div>No data</div>`
    return `
      <div style="font-family: 'Inter', sans-serif; font-size: 14px; max-width: 320px; padding: 8px; color: #333;">
        <div style="font-weight: 700; margin-bottom: 4px;">${row.uatName}</div>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;">
          <div style="font-weight:600;">Population</div><div style="text-align:right;">${(row.uatPopulation ?? 0).toLocaleString('ro-RO')}</div>
          <div style="font-weight:600;">Occupied posts</div><div style="text-align:right;">${(row.occupiedPosts ?? 0).toLocaleString('ro-RO')}</div>
          <div style="font-weight:600;">Employees / 1,000</div><div style="text-align:right;">${(row.employeesPer1000Capita ?? 0).toFixed(2)}</div>
        </div>
      </div>
    `
  }, [])

  const onEachFeature = useCallback((feature: Feature<Geometry, unknown>, layer: Layer) => {
    if (!feature.properties) return
    const natcode = (feature.properties as Record<string, unknown>)?.natcode as string | number | undefined
    const row = uatDataBySiruta.get(String(natcode))
    layer.on({
      mouseover: (e) => {
        if (e.target instanceof L.Path) {
          e.target.setStyle(HIGHLIGHT_FEATURE_STYLE)
          e.target.bringToFront()
        }
        if (!layer.getTooltip()) {
          layer.bindTooltip(createTooltipHtml(row), { sticky: true }).openTooltip()
        } else {
          layer.setTooltipContent(createTooltipHtml(row))
          layer.openTooltip()
        }
      },
      mouseout: (e) => {
        if (e.target instanceof L.Path) {
          const nextStyle = styleFn(feature)
          e.target.setStyle(nextStyle)
        }
      },
    })
  }, [uatDataBySiruta, styleFn, createTooltipHtml])

  if (!geoJson) {
    return <div className="p-4 text-center text-muted-foreground">Map geometry not available.</div>
  }

  const minVal = values.min
  const maxVal = values.max

  return (
    <div className="relative">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        scrollWheelZoom={false}
        style={{ height: '70vh', width: '100%' }}
        preferCanvas={useCanvasRenderer}
      >
        <MapCleanup />
        <ScrollWheelZoomControl />
        {geoJson.type === 'FeatureCollection' && (
          <GeoJSON
            key={`emp-geojson-${metric}-${minVal}-${maxVal}`}
            data={geoJson}
            style={styleFn}
            ref={geoJsonLayerRef}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>

      <MapLegend
        min={minVal}
        max={maxVal}
        className="absolute bottom-[-5rem] right-[1rem] z-10 hidden md:block"
        title="Employees per 1,000 residents"
      />

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 md:hidden rounded-full shadow-lg w-12 h-12 z-50"
          >
            <HelpCircleIcon className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent hideCloseButton={true} className="p-0 m-0 w-full max-w-full h-full max-h-full sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg flex flex-col">
          <DialogHeader className="p-4 border-b flex flex-row justify-between items-center shrink-0">
            <DialogTitle className="text-lg font-semibold">Legend</DialogTitle>
            <DialogDescription className="sr-only">
              Legend for employees per 1,000 residents.
            </DialogDescription>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="p-4 overflow-y-auto">
            <MapLegend
              min={minVal}
              max={maxVal}
              title="Employees per 1,000 residents"
              isInModal={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Leaflet can keep animation/state tied to DOM nodes; stop animations on unmount.
const MapCleanup: React.FC = () => {
  const map = useMap();
  React.useLayoutEffect(() => {
    return () => {
      try {
        map.stop();
      } catch {
        // Ignore cleanup errors during unmount.
      }
    };
  }, [map]);
  return null;
};
