import { useRef, useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { type BarPoint } from '@/features/national-budget/analytics/lib/analytics-data'
import { moneyText } from '@/features/national-budget/analytics/lib/analytics-format'
import { changeText, periodShort } from '@/features/national-budget/analytics/lib/analytics-view'
import { exactScaled, exactText } from '@/features/national-budget/analytics/lib/exact'
import { periodTypeOf } from '@/features/national-budget/analytics/lib/series'
import { cn } from '@/lib/utils'

function scaleOf(max: number): { readonly divisor: number; readonly power: number; readonly unit: string } {
  if (max >= 1e9) return { divisor: 1e9, power: 9, unit: t`mld. lei` }
  if (max >= 1e6) return { divisor: 1e6, power: 6, unit: t`mil. lei` }
  return { divisor: 1, power: 0, unit: t`lei` }
}

/** Which period labels to print under a long run: every year's first period, and the last. */
function shownTick(label: string, index: number, count: number): boolean {
  if (count <= 16) return true
  if (index === count - 1) return true
  const type = periodTypeOf(label)
  // A year's first tick too close to the last one would print over it.
  if (count - 1 - index < (type === 'MONTH' ? 8 : 3)) return false
  if (type === 'YEAR') return index % 2 === 0
  if (type === 'QUARTER') return label.endsWith('Q1')
  return label.endsWith('-01')
}

/**
 * Periods as the procurement analytics page draws its years: a bar a period,
 * the unit said once above, the chosen period solid. A period without a value
 * is a gap, drawn as one and said why — never a zero. A negative value (a
 * deficit) hangs below the zero line. Pointing at a period, or focusing it,
 * gives its exact amount and its change against the same period a year
 * earlier; a click makes it the page's period (a first tap on a touch screen
 * shows, a second takes).
 */
export function PeriodBars({
  points,
  caption,
  selected,
  onSelect,
  labelledBy,
  className,
}: {
  readonly points: readonly BarPoint[]
  /** What the bars measure, after the unit: „cheltuieli totale, bugetul general consolidat". */
  readonly caption: string
  readonly selected: string | null
  readonly onSelect?: (label: string) => void
  readonly labelledBy?: string
  readonly className?: string
}) {
  const [active, setActive] = useState<string | null>(null)
  const [tapped, setTapped] = useState(false)
  const pressedWith = useRef<string | null>(null)
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]))
  if (values.length === 0) return <p className={cn('py-8 text-sm text-muted-foreground', className)}>{t`Nicio valoare pentru aceste perioade.`}</p>
  const top = Math.max(0, ...values)
  const bottom = Math.max(0, ...values.map((value) => -value))
  const span = top + bottom || 1
  const scale = scaleOf(Math.max(top, bottom))
  // The zero line's place from the top, as a share of the plot.
  const zero = top / span
  const columns = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
  const dense = points.length > 20
  const byLabel = new Map(points.map((point) => [point.label, point]))
  return (
    <figure aria-labelledby={labelledBy} className={className}>
      <MonoLabel className="block text-muted-foreground">{`${scale.unit}, ${caption}`}</MonoLabel>
      <ol
        className="relative mt-3 grid h-52 sm:h-64"
        style={columns}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') setActive(null)
        }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 border-t border-foreground/25" style={{ top: `calc(1.25rem + (100% - 2.5rem) * ${zero})` }} />
        {points.map((point, index) => {
          const isActive = active === point.label
          const solid = selected === point.label
          const before = byLabel.get(`${Number(point.label.slice(0, 4)) - 1}${point.label.slice(4)}`)
          const change = changeText(point.exact, before?.exact ?? null)
          const height = point.value === null ? 0 : Math.abs(point.value) / span
          const negative = (point.value ?? 0) < 0
          // The label on the chart's unit, rounded on the exact digits (the float only picks how many).
          const figure = point.value === null || point.exact === null ? '' : (exactScaled(point.exact, scale.power, Math.abs(point.value / scale.divisor) >= 100 ? 0 : 1) ?? '')
          return (
            <li key={point.label} className={cn('relative h-full min-w-0 transition-colors', isActive && 'bg-muted/60')}>
              <button
                type="button"
                aria-pressed={solid}
                aria-label={[`${point.title}: ${point.exact ? `${exactText(point.exact, 0)} lei` : (point.gap ?? t`fără valoare`)}`, change ? t`${change} față de anul anterior` : null]
                  .filter(Boolean)
                  .join(', ')}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'touch') return
                  setTapped(false)
                  setActive(point.label)
                }}
                onPointerDown={(event) => {
                  pressedWith.current = event.pointerType
                }}
                onFocus={() => {
                  if (pressedWith.current === null) setActive(point.label)
                }}
                onBlur={() => setActive(null)}
                onClick={() => {
                  const touch = pressedWith.current === 'touch'
                  pressedWith.current = null
                  if (touch && !isActive) {
                    setTapped(true)
                    setActive(point.label)
                    return
                  }
                  if (point.value !== null) onSelect?.(point.label)
                }}
                className={cn(
                  'relative block h-full w-full outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  onSelect && point.value !== null ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {point.value === null ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[18%] border border-dashed border-muted-foreground/50"
                    style={{ top: `calc(1.25rem + (100% - 2.5rem) * ${zero} - 0.375rem)`, height: '0.75rem' }}
                  />
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-[12%] sm:inset-x-[18%]',
                        solid ? 'bg-primary' : isActive ? 'bg-primary/55' : negative ? 'bg-primary/35' : 'bg-primary/25',
                        dense && 'inset-x-[6%] sm:inset-x-[10%]',
                      )}
                      style={
                        negative
                          ? { top: `calc(1.25rem + (100% - 2.5rem) * ${zero})`, height: `max(2px, calc((100% - 2.5rem) * ${height}))` }
                          : { bottom: `calc(1.25rem + (100% - 2.5rem) * ${1 - zero})`, height: `max(2px, calc((100% - 2.5rem) * ${height}))` }
                      }
                    />
                    {!dense ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute inset-x-0 hidden truncate text-center text-[0.625rem] leading-none tabular-nums sm:block sm:text-xs',
                          solid ? 'font-semibold text-foreground' : 'text-muted-foreground',
                        )}
                        style={negative ? { top: `calc(1.25rem + (100% - 2.5rem) * ${zero + height} + 0.25rem)` } : { bottom: `calc(1.25rem + (100% - 2.5rem) * ${1 - zero + height} + 0.25rem)` }}
                      >
                        {figure}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
              {isActive ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute top-0 z-20 w-max max-w-48 space-y-1 border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md sm:max-w-64',
                    index < points.length / 2 ? 'left-full ml-1.5' : 'right-full mr-1.5',
                  )}
                >
                  <p className="font-semibold">{point.title}</p>
                  {/* The amount as it reads at a glance, then to the leu. */}
                  {point.exact ? (
                    <>
                      <p className="text-sm font-semibold tabular-nums">{moneyText(point.exact)}</p>
                      <p className="tabular-nums text-muted-foreground">{`${exactText(point.exact, 0)} lei`}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">{point.gap ?? t`fără valoare`}</p>
                  )}
                  {change ? <p className="tabular-nums text-muted-foreground">{t`${change} față de anul anterior`}</p> : null}
                  {onSelect && point.value !== null ? (
                    <p className="border-t pt-1 text-muted-foreground">{solid ? t`Perioada aleasă` : tapped ? t`Atinge iar pentru a o alege` : t`Clic: alege perioada`}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <ol className="mt-2 grid" style={columns} aria-hidden="true">
        {points.map((point, index) => (
          // A tick centres on its bar even when wider than its column; the first and the last keep to the chart's edges.
          <li key={point.label} className="relative h-3 min-w-0">
            {shownTick(point.label, index, points.length) ? (
              <MonoLabel
                className={cn(
                  'absolute top-0 whitespace-nowrap tabular-nums',
                  index === 0 ? 'left-0' : index === points.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                  selected === point.label ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  dense && 'text-[0.625rem]',
                )}
              >
                {periodTypeOf(point.label) === 'YEAR' ? (
                  <>
                    <span className="sm:hidden">{`'${point.label.slice(2)}`}</span>
                    <span className="hidden sm:inline">{point.label}</span>
                  </>
                ) : (
                  periodShort(point.label)
                )}
              </MonoLabel>
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
