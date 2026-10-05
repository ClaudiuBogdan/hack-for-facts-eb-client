import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '@lingui/core/macro'

import { approvedAmountToLei } from '@/features/national-budget/page/model/amounts'
import { cn } from '@/lib/utils'
import type { ApprovedSeriesPoint, BudgetEdition, EditionKey } from '@/schemas/national-budget-page'
import { formatBillions, formatLei, measureLabel } from './page.format'

/**
 * Each law's plan for its own year, and what it forecast for the next three.
 * One accent: the selected law's forecasts are navy; the other laws' are grey;
 * the line through every law's own year is ink. Forecasts are never joined
 * across laws, and the draft is hollow. A single tab stop: arrows move between
 * points, Enter opens the point's law and year.
 */

type Geometry = { readonly width: number; readonly height: number; readonly font: number; readonly left: number; readonly bottom: number; readonly top: number; readonly right: number }

const PHONE: Geometry = { width: 360, height: 240, font: 10, left: 34, bottom: 22, top: 24, right: 10 }
const WIDE: Geometry = { width: 960, height: 300, font: 12, left: 48, bottom: 26, top: 28, right: 16 }

function niceStep(max: number, ticks: number): number {
  const raw = max / ticks
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power
}

type Point = ApprovedSeriesPoint & { readonly lei: number; readonly x: number; readonly y: number }

function Plot({
  geometry,
  points,
  editions,
  selected,
  selectedYear,
  onSelect,
  className,
}: {
  readonly geometry: Geometry
  readonly points: readonly ApprovedSeriesPoint[]
  readonly editions: readonly BudgetEdition[]
  readonly selected: EditionKey
  readonly selectedYear: number
  readonly onSelect: (edition: EditionKey, year: number) => void
  readonly className?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const { width, height, font, left, bottom, top, right } = geometry
  const years = points.map((point) => point.measureYear)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const maxLei = Math.max(...points.map((point) => approvedAmountToLei(point.amountThousandLei)))
  const step = niceStep(maxLei, 4)
  const yMax = Math.ceil(maxLei / step) * step
  const x = (year: number) => left + ((year - minYear) / Math.max(1, maxYear - minYear)) * (width - left - right)
  const y = (lei: number) => top + (1 - lei / yMax) * (height - top - bottom)

  const placed: Point[] = points
    .map((point) => {
      const lei = approvedAmountToLei(point.amountThousandLei)
      return { ...point, lei, x: x(point.measureYear), y: y(lei) }
    })
    .slice().sort((a, b) => a.measureYear - b.measureYear || a.budgetYear - b.budgetYear)
  const own = placed.filter((point) => point.kind !== 'forecast')
  const byEdition = new Map<EditionKey, Point[]>()
  for (const point of placed) byEdition.set(point.edition, [...(byEdition.get(point.edition) ?? []), point])
  const path = (list: readonly Point[]) => list.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')

  const nearest = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - box.left) / box.width) * width
    const py = ((event.clientY - box.top) / box.height) * height
    let best = 0
    let bestDistance = Number.POSITIVE_INFINITY
    placed.forEach((point, index) => {
      const distance = (point.x - px) ** 2 + (point.y - py) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })
    return bestDistance < (width / 18) ** 2 ? best : null
  }
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (placed.length === 0) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((current) => (current === null ? 0 : Math.min(placed.length - 1, current + 1)))
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current) => (current === null ? placed.length - 1 : Math.max(0, current - 1)))
    } else if (event.key === 'Enter' && active !== null) {
      onSelect(placed[active].edition, placed[active].measureYear)
    } else if (event.key === 'Escape') {
      setActive(null)
    }
  }

  const activePoint = active === null ? null : placed[active]
  const editionOfPoint = (point: Point) => editions.find((edition) => edition.key === point.edition)
  const tooltip = activePoint
    ? `${(() => {
        const edition = editionOfPoint(activePoint)
        return edition ? measureLabel(edition, activePoint.measureYear) : ''
      })()}: ${formatLei(activePoint.lei)}`
    : null

  const ticks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, index) => index * step)
  const yearTicks = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index).filter(
    (year) => width > 500 || (year - minYear) % 2 === 0,
  )

  return (
    <div
      className={cn('relative outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      role="group"
      tabIndex={0}
      onKeyDown={onKey}
      onBlur={() => setActive(null)}
      aria-label={t`Graficul planurilor: săgețile trec de la un punct la altul, Enter alege legea și anul.`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" onPointerMove={(event) => setActive(nearest(event))} onPointerLeave={() => setActive(null)} onClick={() => activePoint && onSelect(activePoint.edition, activePoint.measureYear)} aria-hidden="true">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth={1} />
            <text x={left - 6} y={y(tick)} dy="0.32em" textAnchor="end" fontSize={font} className="fill-muted-foreground tabular-nums">
              {Math.round(tick / 1e9)}
            </text>
          </g>
        ))}
        <text x={2} y={font} textAnchor="start" fontSize={font - 1} className="fill-muted-foreground">
          {t`mld. lei`}
        </text>
        {yearTicks.map((year) => (
          <text key={year} x={x(year)} y={height - 6} textAnchor="middle" fontSize={font} className={cn('tabular-nums', year === selectedYear ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}>
            {year}
          </text>
        ))}
        {/* Each law's forecasts: grey, the selected law's navy and on top. */}
        {[...byEdition.entries()]
          .slice().sort(([a], [b]) => (a === selected ? 1 : b === selected ? -1 : 0))
          .map(([key, list]) => (
            <path
              key={key}
              d={path(list)}
              fill="none"
              strokeWidth={key === selected ? 2 : 1.25}
              strokeDasharray="4 3"
              strokeLinecap="round"
              className={key === selected ? 'stroke-primary' : 'stroke-muted-foreground/45'}
            />
          ))}
        {/* The plan of each law for its own year. */}
        <path d={path(own.filter((point) => point.kind === 'approved'))} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-foreground" />
        {placed.map((point, index) => {
          const isSelected = point.edition === selected
          const isOwn = point.kind !== 'forecast'
          const isActive = index === active
          return (
            <circle
              key={`${point.edition}-${point.measureYear}`}
              cx={point.x}
              cy={point.y}
              r={isActive ? 6 : isOwn ? 4.5 : 3.5}
              strokeWidth={2}
              className={cn(
                'stroke-background',
                point.kind === 'proposed'
                  ? 'fill-background stroke-amber-700 dark:stroke-amber-400'
                  : isOwn
                    ? isSelected
                      ? 'fill-primary'
                      : 'fill-foreground'
                    : isSelected
                      ? 'fill-primary'
                      : 'fill-muted-foreground/60',
                point.kind === 'proposed' && '[stroke-width:2]',
              )}
            />
          )
        })}
        {activePoint ? <line x1={activePoint.x} x2={activePoint.x} y1={top} y2={height - bottom} className="stroke-foreground/30" strokeWidth={1} /> : null}
      </svg>
      {tooltip && activePoint ? (
        <div
          className="pointer-events-none absolute z-10 max-w-[16rem] -translate-x-1/2 -translate-y-full border bg-popover px-2 py-1 text-xs shadow-md"
          style={{ left: `${(activePoint.x / width) * 100}%`, top: `calc(${(activePoint.y / height) * 100}% - 10px)` }}
          role="status"
        >
          {tooltip}
        </div>
      ) : (
        <span className="sr-only" role="status" />
      )}
    </div>
  )
}

export function EditionsChart({
  points,
  editions,
  selected,
  selectedYear,
  onSelect,
}: {
  readonly points: readonly ApprovedSeriesPoint[]
  readonly editions: readonly BudgetEdition[]
  readonly selected: EditionKey
  readonly selectedYear: number
  readonly onSelect: (edition: EditionKey, year: number) => void
}) {
  const tableId = useId()
  if (points.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">{t`Nicio valoare pentru acest buget în eșantion.`}</p>
  }
  const selectedEdition = editions.find((edition) => edition.key === selected)
  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="1" x2="21" y1="4" y2="4" strokeWidth="2" className="stroke-foreground" />
            <circle cx="11" cy="4" r="3" className="fill-foreground" />
          </svg>
          {t`planul fiecărei legi pentru anul ei`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="1" x2="21" y1="4" y2="4" strokeWidth="2" strokeDasharray="4 3" className="stroke-primary" />
          </svg>
          {selectedEdition?.status === 'draft'
            ? t`estimările din proiectul ${selectedEdition.budgetYear}`
            : selectedEdition
              ? t`estimările din legea ${selectedEdition.budgetYear}`
              : t`estimările legii alese`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="1" x2="21" y1="4" y2="4" strokeWidth="1.25" strokeDasharray="4 3" className="stroke-muted-foreground/60" />
          </svg>
          {t`estimările celorlalte legi`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden="true">
            <circle cx="5" cy="5" r="3.5" strokeWidth="1.5" className="fill-background stroke-amber-700 dark:stroke-amber-400" />
          </svg>
          {t`proiectul 2026`}
        </span>
        <a href={`#${tableId}`} className="ml-auto underline-offset-4 hover:text-foreground hover:underline sm:ml-0">
          {t`tabel`}
        </a>
      </figcaption>
      <Plot geometry={PHONE} points={points} editions={editions} selected={selected} selectedYear={selectedYear} onSelect={onSelect} className="sm:hidden" />
      <Plot geometry={WIDE} points={points} editions={editions} selected={selected} selectedYear={selectedYear} onSelect={onSelect} className="hidden sm:block" />
      <details id={tableId} className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-muted-foreground hover:text-foreground sm:min-h-0">{t`Valorile, ca tabel`}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-3 font-normal">{t`Lege`}</th>
                {[...new Set(points.map((point) => point.measureYear))].slice().sort((a, b) => a - b).map((year) => (
                  <th key={year} className="py-1 pr-3 text-right font-normal tabular-nums">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editions.map((edition) => {
                const mine = points.filter((point) => point.edition === edition.key)
                if (mine.length === 0) return null
                return (
                  <tr key={edition.key} className="border-b last:border-0">
                    <th scope="row" className="py-1 pr-3 text-left font-normal">
                      {edition.status === 'draft' ? t`Proiect ${edition.budgetYear}` : edition.budgetYear}
                    </th>
                    {[...new Set(points.map((point) => point.measureYear))].slice().sort((a, b) => a - b).map((year) => {
                      const point = mine.find((item) => item.measureYear === year)
                      return (
                        <td key={year} className={cn('py-1 pr-3 text-right tabular-nums', point?.kind !== 'forecast' && point && 'font-semibold')}>
                          {point ? formatBillions(approvedAmountToLei(point.amountThousandLei)) : ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">{t`Miliarde de lei. Îngroșat: valoarea pentru anul legii; restul, estimări.`}</p>
        </div>
      </details>
    </figure>
  )
}
