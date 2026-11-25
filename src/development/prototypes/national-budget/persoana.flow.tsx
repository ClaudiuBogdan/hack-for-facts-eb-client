import type { CSSProperties } from 'react'

import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { cn } from '@/lib/utils'
import { changeOf, type HundredLine, leiText, outOfHundred, perPerson, useHundred, useOfficialTotals } from './persoana.data'
import { BORROWED_FILL, REST_FILL, inPeriod, toneOf } from './persoana.sections'
import { Note, Section, usePersonYear } from './persoana.shell'

/**
 * The working version's first section: every 100 lei the state spent, as two
 * columns of the same height (the „Fluxul" version's object, in the hero's
 * measure). Left, where they came from: the revenue lines, and the borrowed
 * lei the hero names, hatched. Right, what they went on. Under the columns,
 * each line with its official amount and, as a description, its lei per
 * resident.
 */

type Part = {
  readonly key: string
  readonly label: string
  readonly hint: string | null
  readonly exact: string
  /** Whole lei of every 100 spent. */
  readonly lei: number
  readonly change: string | null
  readonly fill: { readonly className?: string; readonly style?: CSSProperties }
  readonly strong?: boolean
}

function partsOf(lines: readonly HundredLine[], lei: readonly number[]): Part[] {
  const named = lines.filter((line) => !line.rest).length
  return lines.map((line, rank) => ({ ...line, lei: lei[rank] ?? 0, fill: line.rest ? { className: REST_FILL } : { style: toneOf(rank, named).style } }))
}

// ───────────────────────────────────────────────────────── the two columns ──

const HEIGHT = 640

/** One column: a block per line, as tall as its lei; the lei and the name on the outer side when the block has room for them. */
function Column({ parts, side }: { readonly parts: readonly Part[]; readonly side: 'left' | 'right' }) {
  let top = 0
  return (
    <div className="relative" style={{ height: HEIGHT }}>
      {parts.map((part) => {
        const height = (part.lei / 100) * HEIGHT
        const at = top
        top += height
        if (!height) return null
        return (
          <div key={part.key} className="absolute inset-x-0" style={{ top: at, height }}>
            <div className={cn('absolute inset-y-0 w-10 border-b border-background sm:w-24', side === 'left' ? 'right-0' : 'left-0', part.fill.className)} style={part.fill.style} />
            {height >= 19 ? (
              <div className={cn('absolute inset-y-0 flex items-center gap-1.5 leading-tight sm:gap-2', side === 'left' ? 'left-0 right-12 flex-row-reverse text-right sm:right-[6.5rem]' : 'left-12 right-0 sm:left-[6.5rem]')}>
                <span className="w-6 shrink-0 text-base font-semibold tabular-nums">{part.lei}</span>
                <span className="min-w-0">
                  <span className={cn('block text-xs sm:text-sm', height >= 30 ? 'line-clamp-2' : 'truncate', part.strong && 'font-semibold')}>{part.label}</span>
                  {height >= 58 ? <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">{moneyText(part.exact)}</span> : null}
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────── the detail ──

/** Every line of a column: its lei of 100, what it is, the official amount and the amount per resident. */
function Rows({ title, parts, previous }: { readonly title: string; readonly parts: readonly Part[]; readonly previous: string }) {
  const { view } = usePersonYear()
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 divide-y border-y">
        {parts.map((part) => (
          <li key={part.key} className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5">
            <span className="whitespace-nowrap text-right text-lg font-semibold tabular-nums">
              {part.lei} <span className="text-xs font-normal text-muted-foreground">{part.lei === 1 ? 'leu' : 'lei'}</span>
            </span>
            <span className="flex min-w-0 items-baseline gap-2 text-sm">
              <span className={cn('size-2.5 shrink-0 translate-y-px rounded-[2px]', part.fill.className)} style={part.fill.style} aria-hidden="true" />
              <span className={cn(part.strong && 'font-semibold')}>{part.label}</span>
            </span>
            <span className="text-right text-sm tabular-nums">{moneyText(part.exact)}</span>
            {/* What the line is and how it moved; the amount per resident beside it, under it on a phone. */}
            <span className="col-span-2 col-start-2 mt-0.5 grid gap-x-4 text-xs leading-snug text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto]">
              <span>{[part.hint, part.change ? `${part.change} față de ${previous}` : null].filter(Boolean).join(' · ')}</span>
              <span className="tabular-nums sm:text-right">{leiText(perPerson(part.exact, view))} pe locuitor</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Flow() {
  const { view } = usePersonYear()
  const revenue = useHundred(view, 'revenue')
  const spending = useHundred(view, 'spending')
  const totals = useOfficialTotals(view)
  if (!revenue.whole || !spending.whole) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are împărțirea pe rânduri.</p>
  const previous = view.partial ? `aceleași luni din ${view.year - 1}` : String(view.year - 1)
  // The revenue lines share the lei the hero says came from revenue, so the borrowed lei are the hero's.
  const fromRevenue = outOfHundred(
    revenue.lines.map((line) => Number(line.exact)),
    totals.fromRevenue,
  )
  const borrowed: Part[] = totals.deficit
    ? [
        {
          key: 'borrowed',
          label: 'Împrumut',
          hint: 'deficitul: ce s-a cheltuit peste încasări',
          exact: totals.deficit,
          lei: totals.borrowed,
          change: changeOf(Number(totals.deficit), totals.deficitBefore ? -Number(totals.deficitBefore) : null),
          fill: { className: BORROWED_FILL },
          strong: true,
        },
      ]
    : []
  const left = [...partsOf(revenue.lines, fromRevenue), ...borrowed]
  const right = partsOf(
    spending.lines,
    spending.lines.map((line) => line.lei),
  )
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="pb-3 pr-2 text-right">
            <p className="text-sm font-semibold">De unde au venit</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {moneyText(revenue.whole)} încasați{totals.deficit ? `, ${moneyText(totals.deficit)} împrumutați` : ''}
            </p>
          </div>
          <div className="pb-3 pl-2">
            <p className="text-sm font-semibold">Pe ce s-au dus</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{moneyText(spending.whole)} cheltuiți</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Column parts={left} side="left" />
          <Column parts={right} side="right" />
        </div>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
        <Rows title="De unde au venit cei 100 de lei" parts={left} previous={previous} />
        <Rows title="Pe ce s-au dus" parts={right} previous={previous} />
      </div>
      <Note>
        Bugetul general consolidat {inPeriod(view.text)}. Încasările plus împrumutul fac cheltuielile, de aceea coloanele au aceeași înălțime. Leii din 100 sunt rotunjiți la întreg. Pe locuitor: suma împărțită la populația rezidentă de la 1
        ianuarie.
      </Note>
    </div>
  )
}

export function FlowSection() {
  return (
    <Section id="bani" title="De unde vin banii și pe ce se duc" lede="Fiecare 100 de lei cheltuiți de stat: în stânga de unde au venit, în dreapta pe ce s-au dus.">
      <Flow />
    </Section>
  )
}
