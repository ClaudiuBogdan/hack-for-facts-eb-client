import { useEffect, useMemo, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type * as maplibregl from 'maplibre-gl'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Button } from '@/components/ui/button'
import { countyNameRo } from '@/lib/territory-counties'
import { cn, getUserLocale } from '@/lib/utils'
import { useBudgetMapData } from '../../hooks/use-budget-map-data'
import { coverageOf, measureById, measureValues, type MeasureId } from '../../lib/budget-map-measures'
import { ROMANIA_BOUNDS, SOURCE, countyLabelPoints, fillColorExpression, uatLabelPoints, type MapWords } from '../../lib/budget-map-style'
import type { NumberLocale } from '../../lib/national-facts'
import { ATTRIBUTION, GESTURE_HINT, buildInfo, useMapInstance, useUatPointer } from './map-engine'
import { MapLegend } from './map-legend'
import { UatPopover, UatTooltip, type UatInfo } from './uat-info'
import { ZoomButton } from './zoom-button'

/**
 * The landing's budget map: every primărie coloured by the picked measure,
 * county borders, names by zoom (counties, then UATs, then UATs with their
 * figure), a tooltip under a mouse and a popover under a finger, the legend.
 * Loaded and mounted by `BudgetMapSection`, never on the server.
 *
 * The UAT and county GeoJSON are coloured per measure by a `match` expression,
 * so switching maps re-colours without re-tiling. Touch: on the whole country
 * one finger scrolls the page and two move the map (cooperative gestures);
 * once zoomed in, one finger pans. Desktop: Ctrl/⌘ + wheel zooms, a drag pans,
 * a click opens the primărie. Decisions: `docs/design/landing/design.md`.
 */

/** Never taller than most of the viewport: the width follows from the height. */
const FRAME_STYLE = { maxWidth: 'calc(82vh * 1.4150)' }
/** The page's ruled column, the map inside its 1px rules (they stay visible beside it). */
const MAP_BAND = 'px-px sm:px-px'
const MAP_STYLE = { aspectRatio: '1.415' }

export default function BudgetMap({ measureId }: { readonly measureId: MeasureId }) {
  const { i18n } = useLingui()
  const locale: NumberLocale = getUserLocale() === 'en' ? 'en' : 'ro'
  const { uats, counties, labels, figures, outsideMap, failed, retry } = useBudgetMapData()
  const measure = measureById(measureId)

  // ── the measure over the label points' SIRUTA codes (one per UAT) ─────
  const siruta = useMemo(() => labels?.uats.id ?? [], [labels])
  const values = useMemo(() => (figures ? measureValues(measure, siruta, figures) : []), [measure, siruta, figures])
  const scale = useMemo(() => measure.scale(values), [measure, values])
  const valueOf = useMemo(() => {
    const bySiruta = new Map(siruta.map((code, i) => [code, values[i] ?? null]))
    return (code: string) => bySiruta.get(code) ?? null
  }, [siruta, values])
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
  const { map, zoomed, status } = useMapInstance(containerRef, words)

  useEffect(() => {
    if (!map || !uats || !counties) return
    ;(map.getSource(SOURCE.uats) as maplibregl.GeoJSONSource).setData(uats)
    ;(map.getSource(SOURCE.counties) as maplibregl.GeoJSONSource).setData(counties)
  }, [map, uats, counties])
  useEffect(() => {
    if (!map || !labels) return
    ;(map.getSource(SOURCE.countyLabels) as maplibregl.GeoJSONSource).setData(countyLabelPoints(labels, (code) => countyNameRo(code) ?? code))
  }, [map, labels])
  // A new measure: new colours and new figures in the labels; the view stays.
  useEffect(() => {
    if (!map || !labels || !figures) return
    map.setPaintProperty('uat-fill', 'fill-color', fillColorExpression(siruta, values, scale))
    ;(map.getSource(SOURCE.uatLabels) as maplibregl.GeoJSONSource).setData(
      uatLabelPoints(
        labels,
        (code) => String(uatProps.get(code)?.name ?? ''),
        (code) => {
          const value = valueOf(code)
          return value === null ? null : measure.format(value, locale)
        },
      ),
    )
  }, [map, labels, figures, siruta, values, scale, uatProps, valueOf, measure, locale])
  const ready = Boolean(map && uats && counties && labels && figures)
  const notice =
    status === 'unsupported' ? t`Harta nu poate fi afișată în acest browser.` : status === 'failed' || failed ? t`Harta nu s-a putut încărca.` : ready ? null : t`Se încarcă harta…`

  // ── the primărie under a mouse or a finger ────────────────────────────
  // An open popover follows a switch of maps: what it says is built from the map shown.
  const { tooltip, popover, closePopover } = useUatPointer(map, frameRef)
  const infoOf = (code: string): UatInfo | null => (figures ? buildInfo(code, uatProps.get(code), figures, measure, valueOf(code), i18n._(measure.title), locale) : null)
  const tooltipInfo = tooltip ? infoOf(tooltip.siruta) : null
  const popoverInfo = popover ? infoOf(popover.siruta) : null

  return (
    <>
      <RuledFrame className={MAP_BAND}>
        <div ref={frameRef} className="relative mx-auto w-full" style={FRAME_STYLE}>
          {/* MapLibre names its own canvas region (`Map.Title`, in the page's language). */}
          <div ref={containerRef} className={cn('w-full', GESTURE_HINT, ATTRIBUTION)} style={MAP_STYLE} />
          {tooltip && tooltipInfo ? <UatTooltip info={tooltipInfo} locale={locale} x={tooltip.x} y={tooltip.y} frame={tooltip.frame} /> : null}
          {/* On the map's own corner, inside the page's rules at any width. */}
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
      </RuledFrame>
      {popover && popoverInfo ? <UatPopover info={popoverInfo} locale={locale} at={popover.at} onClose={closePopover} /> : null}
      <RuledFrame className="pt-4 pb-14">
        <MapLegend
          measure={measure}
          scale={figures ? scale : null}
          active={valueOf(tooltip?.siruta ?? popover?.siruta ?? '')}
          coverage={figures && labels ? coverageOf(values) : null}
          // The capital's sentence holds its line until the figures say whether it applies.
          outsideMap={figures ? outsideMap : 1}
          locale={locale}
        />
      </RuledFrame>
    </>
  )
}
