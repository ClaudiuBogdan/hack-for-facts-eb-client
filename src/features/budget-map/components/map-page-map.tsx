import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type * as maplibregl from 'maplibre-gl'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ATTRIBUTION, COUNTY_TARGET, GESTURE_HINT, UAT_TARGET, buildInfo, useMapInstance, useUatPointer } from '@/features/landing/components/budget-map/map-engine'
import { UatPopover, UatTooltip, type UatInfo } from '@/features/landing/components/budget-map/uat-info'
import { ZoomButton } from '@/features/landing/components/budget-map/zoom-button'
import { coverageOf, measureValues, type Measure } from '@/features/landing/lib/budget-map-measures'
import { ROMANIA_BOUNDS, SOURCE, countyLabelPoints, fillColorExpression, setMapLevel, uatLabelPoints, type MapWords } from '@/features/landing/lib/budget-map-style'
import type { NumberLocale } from '@/features/landing/lib/national-facts'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { MapPageData } from '../hooks/use-map-page-data'
import { MapPageLegend } from './map-page-legend'
import { amountFormat, type Basis, type Level } from '../lib/map-page-measures'

/**
 * The map page's map: the landing map's engine in a frame that fills what the
 * page gives it, the legend on its corner (under it on a phone). Under a mouse
 * the wheel zooms — here the map is the page, not a band of it. Under a finger
 * the landing's rule holds: on the whole country one finger scrolls the page
 * (the map takes most of a phone's screen, and would trap the scroll), two
 * move the map; zoomed in, one finger pans.
 * Never rendered on the server (MapLibre is imported with it).
 *
 * On the county level the counties are what is coloured, named and picked;
 * the primării's layers are hidden. A county has no page of its own to open.
 */
export default function MapPageMap({
  measure,
  data,
  year,
  basis,
  level,
  locale,
}: {
  readonly measure: Measure
  readonly data: MapPageData
  readonly year: string
  readonly basis: Basis
  readonly level: Level
  readonly locale: NumberLocale
}) {
  const { i18n } = useLingui()
  const { uats, counties, labels, figures, outsideMap, failed, retry } = data
  const county = level === 'county'

  // ── the measure over the label points' codes: SIRUTA per UAT, or the county's code ─────
  const codes = useMemo(() => (county ? labels?.counties.id : labels?.uats.id) ?? [], [labels, county])
  const values = useMemo(() => (figures ? measureValues(measure, codes, figures) : []), [measure, codes, figures])
  const scale = useMemo(() => measure.scale(values), [measure, values])
  const valueOf = useMemo(() => {
    const byCode = new Map(codes.map((code, i) => [code, values[i] ?? null]))
    return (code: string) => byCode.get(code) ?? null
  }, [codes, values])
  const uatProps = useMemo(() => new Map((uats?.features ?? []).map((feature) => [String(feature.properties?.natcode), feature.properties ?? {}])), [uats])

  // ── the map ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const words: MapWords = {
    windows: t`Folosește Ctrl + scroll pentru zoom pe hartă`,
    mac: t`Folosește ⌘ + scroll pentru zoom pe hartă`,
    mobile: t`Folosește două degete pentru a muta harta`,
    title: t`Harta primăriilor`,
    attributionToggle: t`Arată sursele hărții`,
    boundaries: t`Limite UAT: ANCPI, prin`,
  }
  // Read once, in the browser: this component is never rendered on the server.
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const { map, zoomed, status } = useMapInstance(containerRef, words, { cooperativeGestures: touch })

  useEffect(() => {
    if (!map || !uats || !counties) return
    ;(map.getSource(SOURCE.uats) as maplibregl.GeoJSONSource).setData(uats)
    ;(map.getSource(SOURCE.counties) as maplibregl.GeoJSONSource).setData(counties)
  }, [map, uats, counties])
  useEffect(() => {
    if (map) setMapLevel(map, level)
  }, [map, level])
  // A new map, year, count or level: new colours and new figures in the labels; the view stays.
  useEffect(() => {
    if (!map || !labels) return
    const figure = (code: string) => {
      const value = figures ? valueOf(code) : null
      return value === null ? null : measure.format(value, locale)
    }
    const countyLabels = map.getSource(SOURCE.countyLabels) as maplibregl.GeoJSONSource
    if (county) {
      countyLabels.setData(countyLabelPoints(labels, (code) => countyNameRo(code) ?? code, figure))
      if (figures) map.setPaintProperty('county-fill', 'fill-color', fillColorExpression(codes, values, scale, 'mnemonic'))
      return
    }
    countyLabels.setData(countyLabelPoints(labels, (code) => countyNameRo(code) ?? code))
    if (!figures) return
    map.setPaintProperty('uat-fill', 'fill-color', fillColorExpression(codes, values, scale))
    ;(map.getSource(SOURCE.uatLabels) as maplibregl.GeoJSONSource).setData(uatLabelPoints(labels, (code) => String(uatProps.get(code)?.name ?? ''), figure))
  }, [map, labels, figures, county, codes, values, scale, uatProps, valueOf, measure, locale])
  const ready = Boolean(map && uats && counties && labels && figures)
  const notice =
    status === 'unsupported' ? t`Harta nu poate fi afișată în acest browser.` : status === 'failed' || failed ? t`Harta nu s-a putut încărca.` : ready ? null : t`Se încarcă harta…`

  // ── the primărie or the county under a mouse or a finger ──────────────
  const { tooltip, popover, closePopover } = useUatPointer(map, frameRef, county ? COUNTY_TARGET : UAT_TARGET)
  const amount = amountFormat(basis)
  const infoOf = (code: string): UatInfo | null => {
    if (!figures) return null
    const measureTitle = i18n._(measure.title)
    if (!county) return buildInfo(code, uatProps.get(code), figures, measure, valueOf(code), measureTitle, locale)
    const capital = code === 'B'
    const countyName = countyNameRo(code) ?? code
    return {
      siruta: code,
      name: capital ? t`Municipiul București` : t`Județul ${countyName}`,
      kind: null,
      county: null,
      place: capital ? t`Sectoarele și bugetul propriu al capitalei` : t`Primăriile și consiliul județean`,
      measureTitle,
      measureValue: measure.format(valueOf(code), locale),
      income: figures.get(code)?.income ?? null,
      expenses: figures.get(code)?.expenses ?? null,
      cui: '',
    }
  }
  const tooltipInfo = tooltip ? infoOf(tooltip.siruta) : null
  const popoverInfo = popover ? infoOf(popover.siruta) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col md:relative">
      {/* A flex row, the map stretched across it: MapLibre's own stylesheet makes its container `position: relative`, so it cannot be laid over the frame. */}
      <div ref={frameRef} className="relative flex h-[62dvh] min-h-80 md:h-auto md:min-h-0 md:flex-1">
        {/* MapLibre names its own canvas region (`Map.Title`, in the page's language). While another year loads, the colours are the last ones: dimmed. */}
        <div ref={containerRef} className={cn('min-w-0 flex-1 transition-opacity', GESTURE_HINT, ATTRIBUTION, map && !figures && 'opacity-50')} />
        {tooltip && tooltipInfo ? <UatTooltip info={tooltipInfo} locale={locale} x={tooltip.x} y={tooltip.y} frame={tooltip.frame} amount={amount} /> : null}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5">
          <ZoomButton label={t`Apropie`} onClick={() => map?.zoomIn()}>
            <Plus className="size-4" />
          </ZoomButton>
          <ZoomButton label={t`Depărtează`} onClick={() => map?.zoomOut()} disabled={!zoomed}>
            <Minus className="size-4" />
          </ZoomButton>
          <ZoomButton label={t`Toată țara`} onClick={() => map?.fitBounds(ROMANIA_BOUNDS, { duration: 320 })} disabled={!zoomed}>
            <RotateCcw className="size-4" />
          </ZoomButton>
        </div>
        {notice ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-md border bg-background/90 px-3 py-1.5 text-sm text-muted-foreground">
              {notice}
              {/* Only a read that failed is worth asking again; a browser without WebGL stays without it. */}
              {failed && status !== 'unsupported' ? (
                <Button size="sm" variant="outline" onClick={retry}>
                  {t`Încearcă din nou`}
                </Button>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
      {popover && popoverInfo ? <UatPopover info={popoverInfo} locale={locale} at={popover.at} onClose={closePopover} amount={amount} /> : null}
      <MapPageLegend
        className="border-t px-4 py-4 md:absolute md:bottom-3 md:left-3 md:w-80 md:rounded-md md:border md:bg-background/95 md:p-3 md:shadow-sm"
        measure={measure}
        scale={figures ? scale : null}
        active={valueOf(tooltip?.siruta ?? popover?.siruta ?? '')}
        // „# primării fără date" counts primării: on the county level every county has a figure or the legend says nothing.
        coverage={figures && labels && !county ? coverageOf(values) : null}
        outsideMap={county ? 0 : outsideMap}
        year={year}
        basis={basis}
        level={level}
        locale={locale}
      />
    </div>
  )
}
