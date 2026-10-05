import { useRef, useState } from 'react'
import { t } from '@lingui/core/macro'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { cn } from '@/lib/utils'
import { moneyText } from './budget.format'

/**
 * Years as the procurement analytics page draws them: a bar a year, its figure
 * on it, the unit said once above; the chosen year solid, a year the data does
 * not finish (or a draft) dashed. Pointing at a year, or focusing it, gives its
 * figures; a click makes it the page's year (a first tap on a touch screen
 * shows, a second takes).
 */
export type YearPoint = {
  readonly year: number
  readonly lei: number
  /** Dashed, with this said beside the year: „până în august", „proiect". */
  readonly partial?: string
  /** Lines in the year's tooltip, under its value. */
  readonly notes?: readonly string[]
}

function scaleOf(max: number): { readonly divisor: number; readonly caption: string } {
  if (max >= 1e9) return { divisor: 1e9, caption: t`mld. lei` }
  if (max >= 1e6) return { divisor: 1e6, caption: t`mil. lei` }
  return { divisor: 1, caption: t`lei` }
}

export function YearsChart({
  points,
  caption,
  selected,
  onSelect,
  labelledBy,
}: {
  readonly points: readonly YearPoint[]
  /** What the bars measure, after the unit: „plăți din bugetul de stat". */
  readonly caption: string
  readonly selected: number | null
  readonly onSelect?: (year: number) => void
  readonly labelledBy?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const [tapped, setTapped] = useState(false)
  const pressedWith = useRef<string | null>(null)
  if (points.length === 0) return <p className="py-8 text-sm text-muted-foreground">{t`Nicio valoare pentru acești ani.`}</p>
  const max = Math.max(0, ...points.map((point) => point.lei))
  const scale = scaleOf(max)
  const columns = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
  return (
    <figure aria-labelledby={labelledBy}>
      <MonoLabel className="block text-muted-foreground">{`${scale.caption}, ${caption}`}</MonoLabel>
      <ol
        className="mt-3 grid h-48 items-end border-b border-foreground/20 sm:h-60"
        style={columns}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') setActive(null)
        }}
      >
        {points.map((point, index) => {
          const isActive = active === point.year
          const solid = selected === point.year
          const dashed = point.partial !== undefined
          const previous = points[index - 1]
          const change =
            previous && !dashed && previous.partial === undefined && previous.lei > 0
              ? t`${formatHubNumber(((point.lei - previous.lei) / previous.lei) * 100, { digits: 1, signed: true })}% față de ${previous.year}`
              : null
          return (
            <li key={point.year} className={cn('relative h-full min-w-0 transition-colors', isActive && 'bg-muted/60')}>
              <button
                type="button"
                aria-pressed={solid}
                aria-label={[`${point.year}: ${moneyText(point.lei)}`, point.partial, change].filter(Boolean).join(', ')}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'touch') return
                  setTapped(false)
                  setActive(point.year)
                }}
                onPointerDown={(event) => {
                  pressedWith.current = event.pointerType
                }}
                onFocus={() => {
                  if (pressedWith.current === null) setActive(point.year)
                }}
                onBlur={() => setActive(null)}
                onClick={() => {
                  const touch = pressedWith.current === 'touch'
                  pressedWith.current = null
                  if (touch && !isActive) {
                    setTapped(true)
                    setActive(point.year)
                    return
                  }
                  onSelect?.(point.year)
                }}
                className={cn(
                  'flex h-full w-full flex-col items-center justify-end px-1 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-3',
                  onSelect ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cn('mb-1.5 block h-3.5 max-w-full truncate text-[0.625rem] leading-none tabular-nums sm:text-xs', solid ? 'font-semibold text-foreground' : 'text-muted-foreground')}
                  aria-hidden="true"
                >
                  {formatHubNumber(point.lei / scale.divisor, { digits: point.lei / scale.divisor >= 100 ? 0 : 1 })}
                </span>
                <span
                  className={cn(
                    'block w-full max-w-24 transition-colors',
                    dashed
                      ? cn('border border-dashed border-primary', solid ? 'bg-primary/55' : isActive ? 'bg-primary/30' : 'bg-primary/10')
                      : solid
                        ? 'bg-primary'
                        : isActive
                          ? 'bg-primary/55'
                          : 'bg-primary/25',
                  )}
                  style={{ height: `calc((100% - 1.25rem) * ${max > 0 ? point.lei / max : 0})`, minHeight: point.lei > 0 ? 2 : 0 }}
                />
              </button>
              {isActive ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute top-0 z-20 w-max max-w-44 space-y-1 border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md sm:max-w-60',
                    index < points.length / 2 ? 'left-full ml-1.5' : 'right-full mr-1.5',
                  )}
                >
                  <p className="font-semibold tabular-nums">
                    {point.year}
                    {point.partial ? <span className="font-normal text-muted-foreground">{` · ${point.partial}`}</span> : null}
                  </p>
                  <p className="tabular-nums">{moneyText(point.lei)}</p>
                  {change ? <p className="tabular-nums text-muted-foreground">{change}</p> : null}
                  {point.notes?.map((note) => (
                    <p key={note} className="text-muted-foreground">
                      {note}
                    </p>
                  ))}
                  {onSelect ? (
                    <p className="border-t pt-1 text-muted-foreground">
                      {solid ? t`Anul ales` : tapped ? t`Atinge iar: ${point.year}` : t`Clic: ${point.year}`}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <ol className="mt-2 grid" style={columns} aria-hidden="true">
        {points.map((point) => (
          <li key={point.year} className="min-w-0 text-center">
            <MonoLabel className={cn('tabular-nums', selected === point.year ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              <span className="sm:hidden">{`'${String(point.year).slice(2)}`}</span>
              <span className="hidden sm:inline">{point.year}</span>
            </MonoLabel>
            {point.partial ? <span className="mt-1 hidden text-[0.6875rem] text-muted-foreground sm:block">{point.partial}</span> : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
