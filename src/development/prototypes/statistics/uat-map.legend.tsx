import { useId } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { UatMapFigures } from '@/features/statistics/lib/uat-map-snapshot'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { ALPHA_STEPS, CIRCLE_SWATCH, MIN_CIRCLE_COUNT, type CircleScale, type ClassInterval, type MapScale } from './uat-map.scales'
import { formatCount, type SeriesMeta } from './uat-map.series'

/**
 * The legends: what the colours are (the figure and the year in words, every
 * class's bounds, how the classes were cut), what the circles are (three
 * sizes drawn at their size on screen), and where the figures come from.
 */

/** What the legend's footer counts, each only when there is any. */
export interface LegendKeys {
  readonly noData: number
  readonly noNetwork: number
  readonly small: number
  readonly unusual: number
  /** Changes left out as too few to compare. */
  readonly unsteady: number
}

function intervalLabel(format: (value: number) => string, interval: ClassInterval): string {
  if (interval.zero) return '0'
  if (interval.from === null) return t`sub ${format(interval.to!)}`
  if (interval.to === null) return t`peste ${format(interval.from)}`
  return `${format(interval.from)} … ${format(interval.to)}`
}

function methodLine(scale: MapScale, format: (value: number) => string, unit: string): string {
  if (scale.kind === 'diverging') {
    const band = scale.intervals[2]!
    return t`Clase în jurul lui zero; gri: între ${format(band.from!)} și ${format(band.to!)} ${unit}, aproape de zero, nu neschimbat.`
  }
  if (scale.kind === 'quantile-zero') return t`Zero e o clasă aparte; celelalte patru au același număr de localități.`
  return t`Cinci clase cu același număr de localități, nu cu pași egali.`
}

function Keys({ keys }: { readonly keys: LegendKeys }) {
  return (
    <>
      {keys.noData > 0 ? <LegendKey kind="hatch">{t`${keys.noData} fără date`}</LegendKey> : null}
      {keys.unsteady > 0 ? <LegendKey kind="hatch">{t`${keys.unsteady} prea mici pentru o comparație (sub 20 într-unul din ani)`}</LegendKey> : null}
      {keys.noNetwork > 0 ? <LegendKey kind="muted">{t`${keys.noNetwork} fără rețea publică`}</LegendKey> : null}
      {keys.small > 0 ? <LegendKey kind="dots">{t`${keys.small} din sub 20 de evenimente`}</LegendKey> : null}
      {keys.unusual > 0 ? <LegendKey kind="flag">{t`${keys.unusual} neobișnuit de mari, de verificat la INS`}</LegendKey> : null}
    </>
  )
}

/** Five classes of a ratio — a rate or a change in percent — with Romania, the county and the UAT read marked on them. */
export function ColourLegend({
  title,
  unit,
  format,
  scale,
  figures,
  active,
  county,
  keys,
  faded = false,
}: {
  readonly title: string
  /** After a figure: „‰", „%", „l/zi". */
  readonly unit: string
  /** A figure without its unit. */
  readonly format: (value: number) => string
  readonly scale: MapScale
  readonly figures: UatMapFigures
  readonly active: number | null
  readonly county: string | null
  readonly keys: LegendKeys
  /** The opacity map: a small place's colour is drawn faint — say how. */
  readonly faded?: boolean
}) {
  const national = figures.national === null ? null : scale.positionOf(figures.national)
  const countyValue = county ? (figures.counties[county] ?? null) : null
  const countyAt = countyValue === null ? null : scale.positionOf(countyValue)
  // Two marks this close would print their codes over each other: the footer names the county.
  const countyLabelled = countyAt !== null && (national === null || Math.abs(countyAt - national) > 0.07)
  const activeClass = active === null ? null : scale.classAt(active)
  const activeAt = activeClass === null || active === null ? null : scale.positionOf(figures.values[active]!)
  const at = (position: number) => ({ left: `${(position * 100).toFixed(2)}%` })
  const withUnit = (value: number) => `${format(value)} ${unit}`

  return (
    <div className="space-y-3" data-legend="colour">
      <MonoLabel className="block leading-relaxed text-muted-foreground">
        {title} · {unit}
      </MonoLabel>
      <div className="max-w-lg">
        <div className="relative mb-1.5 h-2.5" aria-hidden="true">
          {national !== null ? (
            <MonoLabel className="absolute top-0 -translate-x-1/2 text-foreground" style={at(national)}>
              RO
            </MonoLabel>
          ) : null}
          {countyLabelled && county ? (
            <MonoLabel className="absolute top-0 -translate-x-1/2 text-foreground" style={at(countyAt)}>
              {county}
            </MonoLabel>
          ) : null}
        </div>
        <div className="relative" aria-hidden="true">
          <div className="flex h-2.5 gap-px">
            {scale.swatch.map((swatch) => (
              <span key={swatch} className={cn('flex-1', swatch)} />
            ))}
          </div>
          {national !== null ? <span className="absolute -inset-y-1 border-l border-dashed border-foreground" style={at(national)} /> : null}
          {countyAt !== null ? <span className="absolute -inset-y-1 border-l border-dotted border-foreground" style={at(countyAt)} /> : null}
          {activeAt !== null ? <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-foreground" style={at(activeAt)} /> : null}
        </div>
        {/* Every class named whole, the open ends included: the bounds between them alone leave the ends unread. */}
        <ol className="mt-1.5 grid grid-cols-5 gap-px">
          {scale.intervals.map((interval, index) => (
            <li key={index} className="text-center font-mono text-[10px] leading-tight tabular-nums text-muted-foreground">
              {intervalLabel(format, interval)}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-muted-foreground">{methodLine(scale, format, unit)}</p>
      {faded ? <FadeKey /> : null}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {figures.national !== null ? (
          <LegendKey kind="national">
            {t`România`} <span className="text-foreground">{withUnit(figures.national)}</span>
          </LegendKey>
        ) : null}
        {county && countyValue !== null ? (
          <LegendKey kind="county">
            {t`Județul ${countyNameRo(county) ?? county}`} <span className="text-foreground">{withUnit(countyValue)}</span>
          </LegendKey>
        ) : null}
        <Keys keys={keys} />
      </div>
    </div>
  )
}

/** A count's circles: three sizes, nested as they are drawn, what their colours mean, and Romania's and the county's count. */
export function CircleLegend({
  title,
  format,
  signed,
  scale,
  figures,
  county,
  keys,
}: {
  readonly title: string
  /** A count with its unit: „−627.089 persoane". */
  readonly format: (value: number) => string
  readonly signed: boolean
  readonly scale: CircleScale
  readonly figures: UatMapFigures
  readonly county: string | null
  readonly keys: LegendKeys
}) {
  const radii = scale.legend.map((value) => scale.radius(value))
  const size = Math.ceil(radii[0]! * 2) + 2
  // Each label at its circle's top, pushed down where two small circles' tops are closer than a line.
  const tops = radii.map((radius) => size - 2 * radius - 1)
  const labelY = tops.reduce<number[]>((ys, top) => [...ys, ys.length === 0 ? top : Math.max(top, ys[ys.length - 1]! + 11)], [])
  const height = Math.max(size, labelY[labelY.length - 1]! + 6)
  const countyValue = county ? (figures.counties[county] ?? null) : null
  return (
    <div className="space-y-3" data-legend="circles">
      <MonoLabel className="block leading-relaxed text-muted-foreground">{title}</MonoLabel>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <svg width={size + 90} height={height} className="block shrink-0 overflow-visible" aria-hidden="true">
          {radii.map((radius, index) => (
            <g key={index}>
              <circle cx={size / 2} cy={size - radius - 1} r={radius} className="fill-none stroke-foreground/60" strokeWidth={1} />
              <polyline
                points={`${size / 2},${tops[index]} ${size + 4},${tops[index]} ${size + 8},${labelY[index]}`}
                fill="none"
                className="stroke-foreground/40"
                strokeDasharray="2 2"
              />
              <text x={size + 11} y={labelY[index]} dominantBaseline="central" className="fill-muted-foreground font-mono text-[10px] tabular-nums">
                {formatCount(scale.legend[index]!)}
              </text>
            </g>
          ))}
        </svg>
        <div className="space-y-1.5">
          {signed ? (
            <>
              <CircleKey swatch={CIRCLE_SWATCH.negative}>{t`scădere`}</CircleKey>
              <CircleKey swatch={CIRCLE_SWATCH.positive}>{t`creștere`}</CircleKey>
            </>
          ) : null}
          <p className="text-xs text-muted-foreground">{t`Aria cercului e proporțională cu numărul; fără cerc: zero sau sub ${MIN_CIRCLE_COUNT}.`}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {figures.national !== null ? (
          <LegendKey kind="none">
            {t`România`} <span className="text-foreground">{format(figures.national)}</span>
          </LegendKey>
        ) : null}
        {county && countyValue !== null ? (
          <LegendKey kind="none">
            {t`Județul ${countyNameRo(county) ?? county}`} <span className="text-foreground">{format(countyValue)}</span>
          </LegendKey>
        ) : null}
        <Keys keys={keys} />
      </div>
    </div>
  )
}

/** How faint a colour is drawn, by the UAT's population. */
function FadeKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" data-legend="fade">
      <MonoLabel className="text-muted-foreground">{t`Culoare mai slabă, localitate mai mică:`}</MonoLabel>
      {ALPHA_STEPS.map((step, index) => {
        // Each step starts where the one before ends; the first from nothing, the last to no end.
        const from = index > 0 ? (ALPHA_STEPS[index - 1]!.below ?? 0) : null
        return (
          <span key={step.opacity} className="flex items-center gap-1.5">
            <span className="size-3 bg-choropleth-4" style={{ opacity: step.opacity }} aria-hidden="true" />
            <MonoLabel className="tabular-nums text-muted-foreground">
              {step.below === null
                ? t`peste ${formatCount(from ?? 0)}`
                : from === null
                  ? t`sub ${formatCount(step.below)}`
                  : `${formatCount(from)}–${formatCount(step.below)}`}
            </MonoLabel>
          </span>
        )
      })}
      <MonoLabel className="text-muted-foreground">{t`locuitori`}</MonoLabel>
    </div>
  )
}

function CircleKey({ swatch, children }: { readonly swatch: string; readonly children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('size-3 rounded-full border', swatch)} aria-hidden="true" />
      <MonoLabel className="text-muted-foreground">{children}</MonoLabel>
    </span>
  )
}

/** Where the figures come from and the one misreading to avoid — under every map. */
export function SourceLine({ meta, generatedAt }: { readonly meta: SeriesMeta; readonly generatedAt: string }) {
  const day = generatedAt.split('-').reverse().join('.')
  return (
    <p className="text-xs leading-relaxed text-muted-foreground" data-source-line>
      {meta.caveat}{' '}
      {t`Sursa: INS Tempo, ${meta.sources}; calculat de Transparenta.eu, instantaneu din ${day}.`}
    </p>
  )
}

/** A swatch drawn as the map draws it, at the map's on-screen size. */
function LegendKey({
  kind,
  children,
}: {
  readonly kind: 'national' | 'county' | 'hatch' | 'muted' | 'dots' | 'flag' | 'none'
  readonly children: ReactNode
}) {
  const id = useId()
  return (
    <span className="flex items-center gap-2">
      {kind === 'none' ? null : (
        <svg width="16" height="10" className="block shrink-0" aria-hidden="true">
          <defs>
            <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="fill-muted" />
              <line x1="0" y1="0" x2="0" y2="5" className="stroke-muted-foreground/45" strokeWidth="1.5" />
            </pattern>
            <pattern id={`${id}-dots`} width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.7" className="fill-foreground/70" />
            </pattern>
          </defs>
          {kind === 'national' || kind === 'county' ? (
            // The mark as the bar draws it: dashed for Romania, dotted for the county.
            <line x1="8" y1="0" x2="8" y2="10" className="stroke-foreground" strokeWidth="1" strokeDasharray={kind === 'national' ? '3 2' : '1 1.5'} />
          ) : kind === 'muted' ? (
            <rect width="16" height="10" className="fill-muted" />
          ) : kind === 'hatch' ? (
            <rect width="16" height="10" fill={`url(#${id}-hatch)`} />
          ) : kind === 'flag' ? (
            <text x="8" y="5" textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-[10px] font-bold">
              !
            </text>
          ) : (
            <>
              <rect width="16" height="10" className="fill-choropleth-3" />
              <rect width="16" height="10" fill={`url(#${id}-dots)`} />
            </>
          )}
        </svg>
      )}
      <MonoLabel className="leading-relaxed text-muted-foreground">{children}</MonoLabel>
    </span>
  )
}
