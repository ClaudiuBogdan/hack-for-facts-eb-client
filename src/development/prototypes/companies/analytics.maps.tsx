import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { plural, t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useCompanyAnalysisBreakdown } from '@/features/private-companies/hooks/use-company-analytics'
import { compactValueText } from '@/features/private-companies/lib/company-analytics-format'
import { countyLabel, metricLabel, placeName } from '@/features/private-companies/lib/company-analytics-text'
import { withScope, type CompanyAnalyticsState } from '@/features/private-companies/lib/company-analytics-url'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { COUNTY_MAP_STEPS, STEP_BG, STEP_FILL, countyScale, projectCounties, type CountyFeature } from '@/features/statistics/lib/county-map'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import { ROMANIA_COUNTIES, countyNameRo } from '@/lib/territory-counties'
import { decimalToPlot, roundDecimal, shiftDecimal } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisBreakdown, CompanyAnalysisBucket } from '@/schemas/company-analytics'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import type { AnalyticsPageData } from './analytics.data'

/**
 * The selection on the map: the measure by county on the hub's map, or —
 * once the selection is in one county — by locality on that county's own
 * outline. A county narrows the selection to it (and shows its localities);
 * a locality opens its companies in the table. Whatever the map cannot draw
 * is said under it, counted: the companies the edition gives no single
 * place, the groups folded into „altele" past the API's 100, the places
 * with companies but no reported value, the localities without an outline.
 */

/** The one county the selection is in, if it is in one. */
export function oneCountyOf(page: AnalyticsPageData): string | null {
  const county = page.state.scope.county
  return county?.in?.length === 1 && !county.includeUnknown ? (county.in[0] ?? null) : null
}

export function MapAnswer({ page }: { readonly page: AnalyticsPageData }) {
  const county = oneCountyOf(page)
  return county ? <LocalityMap page={page} county={county} /> : <CountyMap page={page} />
}

/** „1 firmă", „12 firme", „1.234 de firme". */
function firms(count: number): string {
  return plural(count, { one: '# firmă', few: '# firme', other: '# de firme' })
}

/** What a breakdown lets the map draw, and what it says under it instead. */
interface Places {
  /** The places with a reported sum, coloured. */
  readonly placed: readonly CompanyAnalysisBucket[]
  /** The places with companies but no reported value: hatched, named. */
  readonly unreported: readonly CompanyAnalysisBucket[]
  /** The companies the edition gives no single place, among the groups the API returned. */
  readonly unplaced: number
  /** The companies folded into „altele" past the API's top groups: small places, and maybe some the edition gives no single place. */
  readonly folded: number
}

function placesOf(data: CompanyAnalysisBreakdown): Places {
  const named = data.groups.filter((bucket) => bucket.key !== null && bucket.basis === null)
  return {
    placed: named.filter((bucket) => bucket.metric?.sum != null),
    unreported: named.filter((bucket) => bucket.metric?.sum == null),
    unplaced: data.groups.filter((bucket) => bucket.basis !== null).reduce((sum, bucket) => sum + Number(bucket.companies), 0),
    folded: data.other.groups > 0 ? Number(data.other.companies) : 0,
  }
}

/** The disclosures under a map, in one paragraph: each sentence agreed with its count („O firmă … nu apare", „12 firme … nu apar"). */
function disclosures(places: Places, where: 'county' | 'locality', unshaped: number): string {
  return [
    where === 'county' ? t`Cifrele unei firme stau toate în județul sediului, oriunde ar lucra.` : t`Cifrele unei firme stau toate în localitatea sediului, oriunde ar lucra.`,
    places.unplaced > 0
      ? where === 'county'
        ? plural(places.unplaced, {
            one: 'O firmă fără un singur județ în registru nu apare pe hartă.',
            few: '# firme fără un singur județ în registru nu apar pe hartă.',
            other: '# de firme fără un singur județ în registru nu apar pe hartă.',
          })
        : plural(places.unplaced, {
            one: 'O firmă fără o singură localitate în registru nu apare pe hartă.',
            few: '# firme fără o singură localitate în registru nu apar pe hartă.',
            other: '# de firme fără o singură localitate în registru nu apar pe hartă.',
          })
      : null,
    // „Altele" folds the smallest groups past the API's 100: places, and perhaps companies without a single one — it cannot tell which.
    places.folded > 0
      ? plural(places.folded, {
          one: 'O firmă, adunată la „altele" (locuri mici sau fără o valoare unică în registru), nu apare pe hartă.',
          few: '# firme, adunate la „altele" (locuri mici sau fără o valoare unică în registru), nu apar pe hartă.',
          other: '# de firme, adunate la „altele" (locuri mici sau fără o valoare unică în registru), nu apar pe hartă.',
        })
      : null,
    // The county map names its hatched counties itself (with or without companies); the localities' hatching means only this.
    where === 'locality' && places.unreported.length > 0 ? t`Hașurat: firme fără o valoare raportată.` : null,
    unshaped > 0 ? t`Localitățile fără contur pe hartă sunt înșirate dedesubt.` : null,
  ]
    .filter(Boolean)
    .join(' ')
}

const MAP_PENDING = <div className="h-[28rem] animate-pulse bg-muted/30" aria-hidden="true" />

// ──────────────────────────────────────────────────────────── the counties ──

/** The hub band's scale, from the largest figure: billions or millions with one decimal, whole lei, people as they are. */
function bandScale(largest: number, headcount: boolean): { readonly power: number; readonly unit: string; readonly digits: number } {
  if (headcount) return { power: 0, unit: t`salariați`, digits: 0 }
  if (largest >= 1e10) return { power: 9, unit: t`mld. lei`, digits: 1 }
  if (largest >= 1e7) return { power: 6, unit: t`mil. lei`, digits: 1 }
  return { power: 0, unit: t`lei`, digits: 0 }
}

/**
 * The measure by county on the hub's map; a county narrows the selection to
 * it, still on the map. The hub's band takes numbers: each sum is shifted
 * and rounded to the band's scale as decimal text first, so the number it
 * prints is the API's sum rounded, not a double's. The exact sums are the
 * table's („Județe"). The counties without a figure are named under it.
 */
function CountyMap({ page }: { readonly page: AnalyticsPageData }) {
  const { state, question, live, linkTo } = page
  const breakdown = useCompanyAnalysisBreakdown(question, 'COUNTY', live?.limits.maxTopN ?? 100)
  const data = breakdown.data
  const map = useMemo(() => {
    if (!data || !question) return null
    const places = placesOf(data)
    const scale = bandScale(Math.max(...places.placed.map((bucket) => Math.abs(decimalToPlot(bucket.metric?.sum) ?? 0)), 0), data.totals.metric?.unit === 'HEADCOUNT')
    const scaled = (sum: string) => Number(roundDecimal(shiftDecimal(sum, scale.power) ?? '0', scale.digits) ?? '0')
    const drawn = new Set(places.placed.map((bucket) => bucket.key))
    const missing = ROMANIA_COUNTIES.map((county) => county.code).filter((code) => !drawn.has(code))
    const layer: StatisticsHubCountyLayer = {
      code: `company-analytics-${question.metric}-${question.year}`,
      period: String(question.year),
      unit: 'other',
      unitLabel: scale.unit,
      values: places.placed.map((bucket) => ({ code: bucket.key ?? '', name: countyNameRo(bucket.key ?? '') ?? bucket.key ?? '', value: scaled(bucket.metric?.sum ?? '0') })),
      // Every county without a figure is hatched, never drawn as zero.
      missingCounties: missing,
      national: null,
    }
    const definition: HubCountyBandDefinition = {
      legend: t`${metricLabel(question.metric)}, ${question.year}, după județul sediului`,
      unit: scale.unit,
      digits: scale.digits,
      ramp: 'steps',
      caveat: disclosures(places, 'county', 0),
      source: null,
      open: t`Arată localitățile județului`,
    }
    return { layer, definition, missing }
  }, [data, question])
  if (breakdown.isError) return <HubLoadError onRetry={() => void breakdown.refetch()} />
  if (!map) return MAP_PENDING
  return (
    <div className={cn('-mt-6', breakdown.isFetching && 'opacity-70 transition-opacity')}>
      <HubCountyBand
        key={map.layer.code}
        layer={map.layer}
        definition={map.definition}
        list={false}
        countyLink={(code) => linkTo(withScope(state, { ...state.scope, county: { in: [code] } }))}
      />
      {/* Named in words as well: a hatched county on the map is a shape the keyboard does not reach. */}
      {map.missing.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {t`Fără o valoare raportată în selecție:`} {map.missing.map((code) => countyLabel(code)).join(', ')}.
        </p>
      ) : null}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the localities ──

const WIDTH = 640
const NO_DATA_PATTERN = 'company-analytics-locality-no-data'

interface UatProperties {
  readonly natcode?: string | number
  readonly name?: string
  readonly countyMn?: string
}

/** A SIRUTA code to match the map's files against the API's keys: leading zeros aside. Never sent back to the API. */
function sirutaMatch(code: string | number): string {
  return String(Number(code))
}

/** A locality narrowed to: its companies in the table, by the API's own key. */
function localityState(state: CompanyAnalyticsState, key: string): CompanyAnalyticsState {
  return { ...withScope(state, { ...state.scope, uat: { in: [key] } }), panel: 'firme' }
}

/**
 * The county's localities, each coloured by the selection's sum there in
 * five equal-count steps; a locality with companies but no reported value is
 * hatched, one without companies in the selection left pale, neither drawn
 * as zero. Every printed figure is the API's own; only the colours are
 * computed from numbers. The figure under the pointer stands above the map.
 */
function LocalityMap({ page, county }: { readonly page: AnalyticsPageData; readonly county: string }) {
  const { state, question, live, locale, linkTo } = page
  const breakdown = useCompanyAnalysisBreakdown(question, 'UAT', live?.limits.maxTopN ?? 100)
  const geo = useGeoJsonData('UAT')
  const [active, setActive] = useState<string | null>(null)
  const data = breakdown.data
  const features = (geo.data as FeatureCollection<Polygon | MultiPolygon, UatProperties> | undefined)?.features
  const shapes = useMemo(() => {
    if (!features) return null
    const inCounty = features
      .filter((feature) => feature.properties?.countyMn === county && feature.properties.natcode !== undefined)
      .map((feature): CountyFeature => ({ ...feature, properties: { mnemonic: sirutaMatch(feature.properties.natcode ?? ''), name: feature.properties.name ?? '' } }))
    return inCounty.length > 0 ? projectCounties(inCounty, WIDTH) : null
  }, [features, county])
  const figures = useMemo(() => {
    if (!data || !shapes) return null
    const places = placesOf(data)
    const named = [...places.placed, ...places.unreported]
    const outlined = new Set(shapes.counties.map((shape) => shape.code))
    return {
      places,
      byMatch: new Map(named.map((bucket) => [sirutaMatch(bucket.key ?? ''), bucket])),
      unshaped: named.filter((bucket) => !outlined.has(sirutaMatch(bucket.key ?? ''))),
      steps: countyScale(
        places.placed.map((bucket) => Number(bucket.metric?.sum)),
        COUNTY_MAP_STEPS,
      ),
      // A legend's bounds are the localities' own sums: printed from the API's digits.
      sumOf: new Map(places.placed.map((bucket) => [Number(bucket.metric?.sum), bucket.metric?.sum ?? '0'])),
    }
  }, [data, shapes])
  if (breakdown.isError) return <HubLoadError onRetry={() => void breakdown.refetch()} />
  if (geo.isError) return <HubLoadError onRetry={() => void geo.refetch()} />
  if (!figures || !shapes || !question) return MAP_PENDING
  const sumText = (sum: string) => compactValueText(sum, question.unit, locale)
  const bucketText = (bucket: CompanyAnalysisBucket) =>
    bucket.metric?.sum != null ? `${sumText(bucket.metric.sum)} · ${firms(Number(bucket.companies))}` : t`${firms(Number(bucket.companies))}, fără o valoare raportată`
  const blankText = figures.places.folded > 0 ? t`nicio firmă din selecție, sau printre „altele"` : t`nicio firmă din selecție`
  const shown = active ? shapes.counties.find((shape) => shape.code === active) : null
  const shownBucket = shown ? figures.byMatch.get(shown.code) : undefined
  const countyName = county === 'B' ? t`București` : countyLabel(county)
  return (
    <figure className={cn(breakdown.isFetching && 'opacity-70 transition-opacity')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <MonoLabel className="text-muted-foreground">{t`${metricLabel(question.metric)}, ${question.year}, pe localitățile din ${countyName}`}</MonoLabel>
        <p className="min-h-5 text-sm tabular-nums" aria-live="polite">
          {shown ? (
            <>
              <span className="font-semibold text-foreground">{shown.name}</span> <span className="text-muted-foreground">· {shownBucket ? bucketText(shownBucket) : blankText}</span>
            </>
          ) : null}
        </p>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${shapes.height.toFixed(0)}`} className="mt-4 block h-auto max-h-[36rem] w-full" role="group" aria-label={t`Localitățile din ${countyName}`} onPointerLeave={() => setActive(null)}>
        <defs>
          <pattern id={NO_DATA_PATTERN} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" className="fill-muted" />
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-muted-foreground/40" strokeWidth="1.5" />
          </pattern>
        </defs>
        {shapes.counties.map((shape) => {
          const bucket = figures.byMatch.get(shape.code)
          const sum = bucket?.metric?.sum ?? null
          const label = `${shape.name}: ${bucket ? bucketText(bucket) : blankText}`
          const path = (
            <path
              d={shape.d}
              fillRule="evenodd"
              fill={bucket && sum === null ? `url(#${NO_DATA_PATTERN})` : undefined}
              vectorEffect="non-scaling-stroke"
              strokeWidth={active === shape.code ? 2 : 0.6}
              className={cn('stroke-background transition-[stroke-width]', sum !== null ? STEP_FILL[figures.steps.stepOf(Number(sum))] : !bucket && 'fill-muted', active === shape.code && 'stroke-foreground')}
            />
          )
          // A locality with companies opens them, by the API's own key; one without is a named shape.
          return bucket?.key ? (
            <Link key={shape.code} {...linkTo(localityState(state, bucket.key), 'tabel')} aria-label={label} onPointerEnter={() => setActive(shape.code)} onFocus={() => setActive(shape.code)} className="outline-none">
              {path}
              <title>{label}</title>
            </Link>
          ) : (
            <g key={shape.code} onPointerEnter={() => setActive(shape.code)}>
              {path}
              <title>{label}</title>
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-4 space-y-3 text-xs text-muted-foreground">
        {figures.places.placed.length > 0 ? (
          <ol className="flex flex-wrap gap-x-4 gap-y-2" aria-label={t`Legenda`}>
            {STEP_BG.map((step, index) => {
              const bound = figures.sumOf.get(figures.steps.thresholds[index] ?? 0) ?? '0'
              return (
                <li key={step} className="flex items-center gap-1.5 tabular-nums">
                  <span className={cn('inline-block h-2.5 w-5', step)} aria-hidden="true" />
                  {index + 1 < STEP_BG.length ? t`de la ${sumText(bound)}` : t`${sumText(bound)} sau mai mult`}
                </li>
              )
            })}
          </ol>
        ) : (
          <p>{t`Nicio localitate din selecție nu are o valoare raportată.`}</p>
        )}
        <p>{disclosures(figures.places, 'locality', figures.unshaped.length)}</p>
        {figures.unshaped.length > 0 ? (
          <ul className="space-y-1">
            {figures.unshaped.map((bucket) => (
              <li key={bucket.key}>
                <Link {...linkTo(localityState(state, bucket.key ?? ''), 'tabel')} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {bucket.label ? placeName(bucket.label) : t`SIRUTA ${bucket.key ?? ''}`}
                </Link>{' '}
                · {bucketText(bucket)}
              </li>
            ))}
          </ul>
        ) : null}
      </figcaption>
    </figure>
  )
}
