import { memo, useId } from 'react'
import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { UatMapFigures } from '../../lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { formatSourceDate } from '../../lib/format'
import type { LegendKeys } from './uat-map-reading'
import type { ClassInterval, MapScale } from './uat-map-scales'
import { countyLabel, type SeriesMeta } from './uat-map-series'

/**
 * The legend: what the colours are — the figure and its period in words, with
 * Romania's (and the county's) beside the title, sums of many UATs, never
 * marks on a scale of one; or, on a map coloured against a reference, that
 * reference marked on the bar with its sides named — every class's bounds,
 * the UAT or county read marked on them, what the hatching means; and where
 * the figures come from.
 */

function intervalLabel(format: (value: number) => string, interval: ClassInterval): string {
  if (interval.zero) return '0'
  if (interval.from === null) return t`sub ${format(interval.to!)}`
  if (interval.to === null) return t`peste ${format(interval.from)}`
  // A band around a reference reads as its half-width.
  if (interval.from === -interval.to && interval.to > 0) return `±${format(interval.to).replace(/^\+/, '')}`
  return `${format(interval.from)} … ${format(interval.to)}`
}

function Keys({ keys }: { readonly keys: LegendKeys }) {
  return (
    <>
      {keys.noData > 0 ? (
        <LegendKey kind="hatch">{keys.noDataNames?.length ? t`${keys.noData} fără date: ${keys.noDataNames.join(', ')}` : t`${keys.noData} fără date`}</LegendKey>
      ) : null}
      {keys.noNetwork > 0 ? <LegendKey kind="muted">{t`${keys.noNetwork} fără rețea publică`}</LegendKey> : null}
    </>
  )
}

/** Five classes of a total, with the UAT read marked on them. */
export function ColourLegend({
  title,
  unit,
  format,
  scale,
  figures,
  active,
  county,
  keys,
  reference,
}: {
  readonly title: string
  /** After a figure: „locuitori", „persoane". */
  readonly unit: string
  /** A figure without its unit. */
  readonly format: (value: number) => string
  readonly scale: MapScale
  readonly figures: UatMapFigures
  readonly active: number | null
  readonly county: string | null
  readonly keys: LegendKeys
  /**
   * The figure the colours part at — Romania, on a map coloured against it:
   * marked on the bar, with which side is which, instead of beside the title.
   */
  readonly reference?: { readonly value: number; readonly label: string; readonly below: string; readonly above: string }
}) {
  const countyValue = county ? (figures.counties[county] ?? null) : null
  const activeClass = active === null ? null : scale.classAt(active)
  const activeAt = activeClass === null || active === null ? null : scale.positionOf(figures.values[active]!)
  const at = (position: number) => ({ left: `${(position * 100).toFixed(2)}%` })
  const withUnit = (value: number) => `${format(value)} ${unit}`
  const referenceAt = reference ? scale.positionOf(reference.value) : null

  return (
    <div className="space-y-3" data-legend="colour">
      <MonoLabel className="block leading-relaxed text-muted-foreground">
        {title}
        {figures.national !== null && !reference ? (
          <>
            {' · '}
            {t`România`} <span className="text-foreground">{withUnit(figures.national)}</span>
          </>
        ) : unit ? (
          ` · ${unit}`
        ) : null}
        {county && countyValue !== null ? (
          <>
            {' · '}
            {countyLabel(county)} <span className="text-foreground">{withUnit(countyValue)}</span>
          </>
        ) : null}
      </MonoLabel>
      <div className="max-w-lg">
        {reference && referenceAt !== null ? (
          // The two sides named at the ends, the figure between them, over the middle class it
          // always falls in — sharing the row, so no label runs into another on a phone.
          <div className="mb-1.5 flex items-end gap-3">
            <MonoLabel className="shrink-0 text-muted-foreground">
              <span aria-hidden="true">← </span>
              {reference.below}
            </MonoLabel>
            <MonoLabel className="min-w-0 flex-1 text-center text-foreground">{reference.label}</MonoLabel>
            <MonoLabel className="shrink-0 text-muted-foreground">
              {reference.above}
              <span aria-hidden="true"> →</span>
            </MonoLabel>
          </div>
        ) : null}
        <div className="relative" aria-hidden="true">
          {/* Each class as the map draws it: the same colour, at the same opacity, over the same background. */}
          <div className="flex h-2.5 gap-px">
            {scale.classes.map((drawn, index) => (
              <span key={index} className={cn('flex-1', drawn.swatch)} style={{ opacity: drawn.opacity }} />
            ))}
          </div>
          {referenceAt !== null ? <span className="absolute -inset-y-1 border-l border-dashed border-foreground" style={at(referenceAt)} /> : null}
          {activeAt !== null ? <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-foreground" style={at(activeAt)} /> : null}
        </div>
        {/* Every class named whole, the open ends included: the bounds between them alone leave the ends unread. */}
        <ol className="mt-1.5 grid gap-px" style={{ gridTemplateColumns: `repeat(${scale.classes.length}, minmax(0, 1fr))` }}>
          {scale.classes.map(({ interval }, index) => (
            <li key={index} className="text-center font-mono text-[10px] leading-tight tabular-nums text-muted-foreground">
              {intervalLabel(format, interval)}
            </li>
          ))}
        </ol>
      </div>
      {keys.noData > 0 || keys.noNetwork > 0 ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          <Keys keys={keys} />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Where the figures come from and the one misreading to avoid — under every
 * map. The day is when the figures were taken from INS, named as that act:
 * beside „la 1 ianuarie 2026" a bare date reads as the data's own.
 */
export const SourceLine = memo(function SourceLine({ meta, generatedAt }: { readonly meta: SeriesMeta; readonly generatedAt: string }) {
  const day = formatSourceDate(generatedAt)
  return (
    <p className="text-xs leading-relaxed text-muted-foreground" data-source-line>
      {meta.caveat}{' '}
      {t`Sursa: INS Tempo, ${meta.sources}; calculat de Transparenta.eu din cifrele preluate pe ${day}.`}
    </p>
  )
})

/** A swatch drawn as the map draws it, at the map's on-screen size. */
function LegendKey({ kind, children }: { readonly kind: 'hatch' | 'muted'; readonly children: ReactNode }) {
  const id = useId()
  return (
    <span className="flex items-center gap-2">
      <svg width="16" height="10" className="block shrink-0" aria-hidden="true">
        {kind === 'muted' ? (
          <rect width="16" height="10" className="fill-muted" />
        ) : (
          <>
            <defs>
              <pattern id={`${id}-hatch`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" className="fill-muted" />
                <line x1="0" y1="0" x2="0" y2="5" className="stroke-muted-foreground/45" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="16" height="10" fill={`url(#${id}-hatch)`} />
          </>
        )}
      </svg>
      <MonoLabel className="leading-relaxed text-muted-foreground">{children}</MonoLabel>
    </span>
  )
}
