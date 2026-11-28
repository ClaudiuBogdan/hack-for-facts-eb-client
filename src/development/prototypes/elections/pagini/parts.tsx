import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import type { LucideIcon } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import { COUNTY_TILES, countyName, lineStyle, type Line } from '../componente-fable/model'
import { useFormat } from '../shared/parts'
import type { LineCount } from './data'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

export const lineLabel = (line: Line) => (line === 'ind' ? t`Independenți` : line === 'other' ? t`Alte partide` : lineStyle(line).label)
export const onSwatch = (line: Line) => (line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white')

/** The status mark the contest page uses: amber words after the figure, never a tinted pill. */
export function SuspectMark() {
  return <span className="ml-1.5 text-xs text-amber-800 dark:text-amber-300">{t`defect cunoscut`}</span>
}

// ───────────────────────────────────────────────────────────── the way home ──

const SEP = <span aria-hidden="true" className="mx-2 text-muted-foreground/50">/</span>

/** „Acasă / Alegeri / …" as the polish spec writes it: plain words, the page's own name in the foreground. */
export function WayHome({ trail }: { readonly trail: readonly { readonly label: string; readonly href?: string }[] }) {
  return (
    <nav aria-label={t`Ești aici`} className="text-sm text-muted-foreground">
      <Link to="/" className="-my-3 inline-block py-3 transition-colors hover:text-foreground">
        {t`Acasă`}
      </Link>
      {trail.map((step, index) => (
        <span key={step.label}>
          {SEP}
          {index === trail.length - 1 ? (
            <span className="text-foreground">{step.label}</span>
          ) : step.href ? (
            <a href={step.href} className="-my-3 inline-block py-3 transition-colors hover:text-foreground">
              {step.label}
            </a>
          ) : (
            step.label
          )}
        </span>
      ))}
    </nav>
  )
}

// ───────────────────────────────────────────────────────────── the pinned bar ──

export type BarSection = { readonly id: string; readonly label: string; readonly icon: LucideIcon }

/** The section a reader is in: one IntersectionObserver on a line a quarter of the way down (the national budget's rule). */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(' ')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive((was) => (entry.isIntersecting ? entry.target.id : was === entry.target.id ? null : was))
      },
      { rootMargin: '-25% 0px -74% 0px' },
    )
    for (const id of key.split(' ')) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}

/**
 * A prototype-only copy of the national budget's `SectionBar` (client-dev-polish, 2026-11-28: the shared
 * `HomeSectionNav` gains icons, the underline and the phone follow on feat/hub-polish-20261128; until then a
 * local copy under /development only). The real page imports the shared bar.
 */
export function SectionBar({ title, sections }: { readonly title: string; readonly sections: readonly BarSection[] }) {
  const active = useActiveSection(sections.map((section) => section.id))
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const link = active ? list.current?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null
    if (link && list.current) list.current.scrollTo({ left: link.offsetLeft - (list.current.clientWidth - link.offsetWidth) / 2 })
  }, [active])
  return (
    <nav aria-label={t`Secțiunile paginii`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden shrink-0 text-sm font-semibold tracking-tight md:block">{title}</span>
        <ol ref={list} className="relative -mx-2.5 flex min-w-0 scroll-smooth overflow-x-auto motion-reduce:scroll-auto md:ml-auto md:mr-0">
          {sections.map((section) => {
            const current = active === section.id
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  className={cn(
                    'relative inline-flex h-12 items-center gap-2 px-2.5 text-sm transition-colors hover:text-foreground',
                    'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity',
                    current ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                  )}
                >
                  <section.icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {section.label}
                </a>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ───────────────────────────────────────────────────────────── charts ──

/** A line's name in a legend: the swatch, the name, the count, the status mark when a member is SUSPECT. */
export function LegendRow({ row, unit }: { readonly row: LineCount; readonly unit?: string }) {
  const format = useFormat()
  return (
    <li className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn('size-2.5 shrink-0 rounded-[2px]', lineStyle(row.line).swatch)} aria-hidden="true" />
      <span className="text-foreground">{lineLabel(row.line)}</span>
      <span className="tabular-nums text-muted-foreground">
        {format.n(row.value)}
        {unit ? ` ${unit}` : ''}
      </span>
      {row.suspect ? <SuspectMark /> : null}
    </li>
  )
}

/** One stacked bar of lines, each part as wide as its share, with its legend under it. */
export function StackBar({ rows, label, top = 6 }: { readonly rows: readonly LineCount[]; readonly label: ReactNode; readonly top?: number }) {
  const format = useFormat()
  const whole = rows.reduce((sum, row) => sum + row.value, 0)
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{format.n(whole)}</span>
      </figcaption>
      <div className="mt-2 flex h-5 overflow-hidden bg-muted" role="img" aria-label={rows.map((row) => `${lineLabel(row.line)} ${format.n(row.value)}`).join(', ')}>
        {rows.map((row) => (
          <span key={row.line} className={cn('block h-full', lineStyle(row.line).swatch)} style={{ width: `${(100 * row.value) / whole}%` }} />
        ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {rows.slice(0, top).map((row) => (
          <LegendRow key={row.line} row={row} />
        ))}
      </ul>
    </figure>
  )
}

/** Largest remainder: whole squares per line that add up to the rounded total. */
function units(rows: readonly LineCount[], per: number): readonly (readonly [Line, number])[] {
  const whole = Math.round(rows.reduce((sum, row) => sum + row.value, 0) / per)
  const exact = rows.map((row) => row.value / per)
  const floors = exact.map(Math.floor)
  let left = whole - floors.reduce((sum, n) => sum + n, 0)
  for (const [, index] of exact.map((value, i) => [value - Math.floor(value), i] as const).sort((a, b) => b[0] - a[0])) {
    if (left <= 0) break
    floors[index] = (floors[index] ?? 0) + 1
    left -= 1
  }
  return rows.map((row, index) => [row.line, floors[index] ?? 0] as const)
}

/** A waffle: one square per `per` mandates, coloured by line, a legend under it. */
export function Waffle({ rows, per, columns = 50 }: { readonly rows: readonly LineCount[]; readonly per: number; readonly columns?: number }) {
  const format = useFormat()
  const squares = units(rows, per).flatMap(([line, n]) => Array.from({ length: n }, () => line))
  return (
    <figure className="min-w-0">
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${Math.min(columns, Math.max(squares.length, 1))}, minmax(0, 1fr))` }}
        role="img"
        aria-label={rows.map((row) => `${lineLabel(row.line)} ${format.n(row.value)}`).join(', ')}
      >
        {squares.map((line, index) => (
          <span key={index} className={cn('aspect-square rounded-[1px]', lineStyle(line).swatch)} />
        ))}
      </div>
      <figcaption className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">{per === 1 ? t`Un pătrat = un mandat` : t`Un pătrat = ${format.n(per)} mandate`}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {rows.map((row) => (
            <LegendRow key={row.line} row={row} />
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}

/** Two semicircles, one per allocation phase: never one chamber from summed phases (owner, 2026-11-28). */
export function PhasePair({ first, second }: { readonly first: readonly LineCount[] | null; readonly second: readonly LineCount[] | null }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <Semicircle rows={first} label={t`Prima repartizare`} />
      <Semicircle rows={second} label={t`A doua repartizare`} />
    </div>
  )
}

function Semicircle({ rows, label }: { readonly rows: readonly LineCount[] | null; readonly label: string }) {
  const format = useFormat()
  if (!rows) return <Absent label={label} />
  const whole = rows.reduce((sum, row) => sum + row.value, 0)
  let start = Math.PI
  const arcs = rows.map((row) => {
    const sweep = (Math.PI * row.value) / whole
    const end = start - sweep
    const point = (angle: number, r: number) => `${100 + r * Math.cos(angle)} ${100 - r * Math.sin(angle)}`
    const large = sweep > Math.PI ? 1 : 0
    const d = `M ${point(start, 92)} A 92 92 0 ${large} 1 ${point(end, 92)} L ${point(end, 52)} A 52 52 0 ${large} 0 ${point(start, 52)} Z`
    start = end
    return { line: row.line, d }
  })
  return (
    <figure className="min-w-0">
      <svg viewBox="0 0 200 104" className="w-full max-w-sm" role="img" aria-label={`${label}: ${rows.map((row) => `${lineLabel(row.line)} ${format.n(row.value)}`).join(', ')}`}>
        {arcs.map((arc) => (
          <path key={arc.line} d={arc.d} className={lineStyle(arc.line).fill} />
        ))}
        <text x="100" y="96" textAnchor="middle" className="fill-foreground text-[15px] font-semibold tabular-nums">
          {format.n(whole)}
        </text>
      </svg>
      <figcaption className="mt-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {rows.slice(0, 6).map((row) => (
            <LegendRow key={row.line} row={row} />
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}

/** Missing is never zero: a dashed frame that says so. */
export function Absent({ label, children }: { readonly label: ReactNode; readonly children?: ReactNode }) {
  return (
    <div className="flex min-h-32 flex-col justify-center border border-dashed p-5 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <span className="mt-1">{children ?? t`Nu e în date.`}</span>
    </div>
  )
}

/** Counties on a tile grid, each in the colour of the line with the most mayoralties; a county without figures dashed. */
export function CountyTiles({
  counties,
  chosen,
  onChoose,
}: {
  readonly counties: ReadonlyMap<string, readonly LineCount[] | null>
  readonly chosen?: string | null
  readonly onChoose?: (code: string) => void
}) {
  const format = useFormat()
  const cells = Object.entries(COUNTY_TILES)
  return (
    <div className="grid max-w-md grid-cols-7 gap-1" role="list" aria-label={t`Județele`}>
      {cells.map(([code, [column, row]]) => {
        const rows = counties.get(code) ?? null
        const leader = rows?.find((item) => item.line !== 'other') ?? null
        const tie = leader && rows ? rows.filter((item) => item.value === leader.value).length > 1 : false
        const title = rows && leader ? `${countyName(code)}: ${lineLabel(leader.line)} ${format.n(leader.value)}${tie ? ` (${t`egalitate`})` : ''}` : `${countyName(code)}: ${t`nu e în date`}`
        return (
          <button
            key={code}
            type="button"
            role="listitem"
            title={title}
            aria-label={title}
            onClick={onChoose ? () => onChoose(code) : undefined}
            style={{ gridColumn: column + 1, gridRow: row + 1 }}
            className={cn(
              'grid aspect-square place-items-center rounded-[2px] font-mono text-[10px] font-medium',
              leader && !tie ? cn(lineStyle(leader.line).swatch, onSwatch(leader.line)) : 'border border-dashed text-muted-foreground',
              chosen === code && 'ring-2 ring-foreground ring-offset-1 ring-offset-background',
              !onChoose && 'cursor-default',
            )}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}

/** A tab whose panel is not drawn here: built in a later change, or waiting on data the API does not serve yet. */
export function TabPending({ state, children }: { readonly state: 'later' | 'waits' | 'partly'; readonly children: ReactNode }) {
  return (
    <div className="border border-dashed p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
      <p className="font-medium text-foreground">{state === 'later' ? t`În curând` : state === 'partly' ? t`Parțial în date` : t`Încă nu e în date`}</p>
      <p className="mt-1 max-w-[60ch]">{children}</p>
    </div>
  )
}
