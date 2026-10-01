import { useId, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { monthText } from '@/features/procurement/lib/home-format'
import { HubLoadError, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { bucketStart, POPULATIONS, type Measure, type PopulationId, type Query } from '../../lib/analytics-model'
import type { Point } from '../../api/procurement-analytics-api'
import type { Answer } from '../../hooks/use-procurement-analytics'
import { changeText, measureLabel, moneyText, recordsCount } from '../../lib/analytics-text'

/**
 * The selection's years since 2019, in a band of its own: a bar a year with
 * its figure on it, the unit said once above; the page's window solid, a year
 * the data does not finish (or whose sources mix) dashed. Pointing at a year,
 * or focusing it, gives its figures — the count, the lei, the change on the
 * year before — and a click makes it the page's year. On a touch screen the
 * first tap shows the figures and the second takes the year.
 */
export function YearsBand({ query, answer, onChange }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void }) {
  const titleId = useId()
  // By year, the answer's own chart is this one.
  if (query.dupa.axis === 'timp' && query.dupa.bucket === 'year') return null
  const population = POPULATIONS[query.tip]
  const cutoff = answer.cutoff?.[population.cutoff] ?? null
  const byValue = query.masura !== 'numar' && population.money !== 'none'
  const measures: Measure[] = population.money === 'none' ? [] : ['numar', 'lei']
  const points = answer.years.data
  return (
    <section id="ani" className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead
          titleId={titleId}
          index={cutoff ? `${population.comparableFrom}–${cutoff.slice(0, 4)}` : String(population.comparableFrom)}
          title={t`Pe ani`}
          aside={
            measures.length > 0 ? (
              <IndicatorToggle<Measure>
                label={t`Măsura`}
                value={byValue ? 'lei' : 'numar'}
                onChange={(masura) => onChange({ ...query, masura })}
                options={measures.map((key) => ({ key, label: measureLabel(key, query.tip) }))}
              />
            ) : null
          }
        />
        <div className="mt-8">
          {answer.years.isError ? (
            <HubLoadError onRetry={answer.years.retry} />
          ) : points ? (
            <YearsChart query={query} answer={answer} points={points} byValue={byValue} labelledBy={titleId} onChange={onChange} />
          ) : (
            <div className="h-56 animate-pulse bg-muted/40 sm:h-64" aria-hidden="true" />
          )}
        </div>
      </RuledFrame>
    </section>
  )
}

/** The unit a chart's labels share, from its largest figure: „mld. lei, fără TVA" once, „15,4" on the bar. */
function scaleOf(max: number, money: boolean, tip: PopulationId): { readonly divisor: number; readonly digits: number; readonly caption: string } {
  const noun = tip === 'directe' ? t`achiziții directe` : tip === 'contracte' ? t`contracte atribuite` : t`acorduri-cadru`
  const basis = POPULATIONS[tip].money === 'provisional' ? t`provizoriu` : t`fără TVA`
  if (max >= 1e9) return { divisor: 1e9, digits: 1, caption: money ? `${t`mld. lei`}, ${basis}` : t`miliarde de ${noun}` }
  if (max >= 1e6) return { divisor: 1e6, digits: 1, caption: money ? `${t`mil. lei`}, ${basis}` : t`milioane de ${noun}` }
  if (max >= 1e4) return { divisor: 1e3, digits: max >= 1e5 ? 0 : 1, caption: money ? `${t`mii lei`}, ${basis}` : t`mii de ${noun}` }
  return { divisor: 1, digits: 0, caption: money ? `${t`lei`}, ${basis}` : noun }
}

function YearsChart({
  query,
  answer,
  points,
  byValue,
  labelledBy,
  onChange,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly points: readonly Point[]
  readonly byValue: boolean
  readonly labelledBy: string
  readonly onChange: (query: Query) => void
}) {
  const [active, setActive] = useState<string | null>(null)
  // A tap shows the year's figures, a second tap takes it: the pointer that pressed decides.
  const [tapped, setTapped] = useState(false)
  const pressedWith = useRef<string | null>(null)
  const population = POPULATIONS[query.tip]
  const figure = (point: Point) => (byValue ? point.money : point.count) ?? 0
  const max = Math.max(0, ...points.map(figure))
  const scale = scaleOf(max, byValue, query.tip)
  const cutoff = answer.cutoff?.[population.cutoff] ?? null
  const partYear = cutoff !== null && !cutoff.endsWith('-12') ? cutoff.slice(0, 4) : null
  const partMonth = cutoff ? (monthText(cutoff).split(/\s/u)[0] ?? cutoff) : ''
  const split = population.kindSplitUntil
  const mixed = (year: string) => split !== undefined && bucketStart(year) > split
  const period = answer.period
  const inWindow = (year: string) => period !== null && period.from.slice(0, 4) <= year && period.to.slice(0, 4) >= year
  const pageYear = query.period.kind === 'year' && period && !period.replaced ? String(query.period.year) : null
  const columns = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
  const label = (point: Point) => {
    if (byValue && point.money === null && (point.count ?? 0) > 0) return '—'
    return formatHubNumber(figure(point) / scale.divisor, { digits: scale.digits })
  }
  const moneyLine = (point: Point) => {
    if (population.money === 'none') return null
    if (point.money === null) return (point.count ?? 0) > 0 ? t`valoare nepublicată` : null
    return population.money === 'provisional' ? `${moneyText(point.money)} ${t`(provizoriu)`}` : `${moneyText(point.money)} ${t`fără TVA`}`
  }
  // The change on the year before: two whole years of a population that compares.
  const changeLine = (index: number) => {
    const point = points[index]!
    const before = points[index - 1]
    if (!population.changes || !before || point.bucket === partYear) return null
    const change = changeText(figure(point), figure(before))
    if (change === null) return null
    return change.startsWith('+') || change.startsWith('−') ? t`${change} față de ${before.bucket}` : t`la fel ca în ${before.bucket}`
  }
  const choose = (year: string) => onChange({ ...query, period: { kind: 'year', year: Number(year) } })
  return (
    <figure aria-labelledby={labelledBy}>
      <MonoLabel className="block text-muted-foreground">{scale.caption}</MonoLabel>
      <ol
        className="mt-3 grid h-48 items-end border-b border-foreground/20 sm:h-60"
        style={columns}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') setActive(null)
        }}
      >
        {points.map((point, index) => {
          const isActive = active === point.bucket
          const solid = inWindow(point.bucket)
          const part = point.bucket === partYear
          const dashed = part || mixed(point.bucket)
          const value = figure(point)
          const money = moneyLine(point)
          const change = changeLine(index)
          return (
            <li key={point.bucket} className={cn('relative h-full min-w-0 transition-colors', isActive && 'bg-muted/60')}>
              <button
                type="button"
                aria-pressed={point.bucket === pageYear}
                aria-label={[`${point.bucket}: ${recordsCount(query.tip, point.count ?? 0)}`, money, change, part ? t`până în ${partMonth}` : null].filter(Boolean).join(', ')}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'touch') return
                  setTapped(false)
                  setActive(point.bucket)
                }}
                onPointerDown={(event) => {
                  pressedWith.current = event.pointerType
                }}
                onFocus={() => {
                  if (pressedWith.current === null) setActive(point.bucket)
                }}
                onBlur={() => setActive(null)}
                onClick={() => {
                  const touch = pressedWith.current === 'touch'
                  pressedWith.current = null
                  if (touch && !isActive) {
                    setTapped(true)
                    setActive(point.bucket)
                    return
                  }
                  choose(point.bucket)
                }}
                className="flex h-full w-full cursor-pointer flex-col items-center justify-end px-1 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-3"
              >
                <span className={cn('mb-1.5 block h-3.5 max-w-full truncate text-[0.625rem] leading-none tabular-nums sm:text-xs', solid ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-hidden="true">
                  {label(point)}
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
                  style={{ height: `calc((100% - 1.25rem) * ${max > 0 ? value / max : 0})`, minHeight: value > 0 ? 2 : 0 }}
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
                    {point.bucket}
                    {part ? <span className="font-normal text-muted-foreground">{` · ${t`până în ${partMonth}`}`}</span> : null}
                  </p>
                  <p className="tabular-nums">{recordsCount(query.tip, point.count ?? 0)}</p>
                  {money ? <p className="tabular-nums">{money}</p> : null}
                  {change ? <p className="tabular-nums text-muted-foreground">{change}</p> : null}
                  {mixed(point.bucket) ? (
                    <p className="text-amber-700 dark:text-amber-400">{query.tip === 'contracte' ? t`Se numără și acordurile-cadru.` : t`Lipsesc: se numără ca atribuiri.`}</p>
                  ) : null}
                  <p className="border-t pt-1 text-muted-foreground">
                    {point.bucket === pageYear ? t`Anul ales` : tapped ? t`Atinge iar: doar ${point.bucket}` : t`Clic: doar ${point.bucket}`}
                  </p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
      <ol className="mt-2 grid" style={columns} aria-hidden="true">
        {points.map((point) => (
          <li key={point.bucket} className="min-w-0 text-center">
            <MonoLabel className={cn('tabular-nums', inWindow(point.bucket) ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              <span className="sm:hidden">{`'${point.bucket.slice(2)}`}</span>
              <span className="hidden sm:inline">{point.bucket}</span>
            </MonoLabel>
            {point.bucket === partYear ? <span className="mt-1 hidden text-[0.6875rem] text-muted-foreground sm:block">{t`până în ${partMonth}`}</span> : null}
          </li>
        ))}
      </ol>
    </figure>
  )
}
