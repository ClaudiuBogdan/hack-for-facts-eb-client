import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'
import { leiNumber, leiText, type PersonLine, usePersonRevenue, usePersonSpending, usePersonTotals } from './persoana.data'
import { Fig, HeadFrame } from './persoana.head'
import { BORROWED_FILL, BorrowingSection, DomainsSection, FurtherSection, MinistriesSection, NowSection, REST_FILL, inPeriod, toneOf } from './persoana.sections'
import { Note, PersonPage, Section, usePersonYear, type SectionEntry } from './persoana.shell'

/**
 * Version „Fluxul": a resident's share of the year as two columns of the same
 * height — where the money came from (taxes, contributions, EU money, and the
 * borrowed part, hatched) and where it went. Revenue plus borrowing is the
 * spending, so the columns balance; the page's one memorable object is that
 * balance.
 */

const SECTIONS: readonly SectionEntry[] = [
  { id: 'flux', nav: 'Venit și cheltuit' },
  { id: 'domenii', nav: 'Pe domenii' },
  { id: 'ministere', nav: 'Cine' },
  { id: 'imprumut', nav: 'Împrumutul' },
  { id: 'anul', nav: 'Anul în curs' },
]

function Title() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  return (
    <>
      Pentru fiecare locuitor, statul a încasat <Fig>{leiText(totals.revenue)}</Fig> și a cheltuit <Fig>{leiText(totals.spending)}</Fig>.
    </>
  )
}

function Lede() {
  const { view } = usePersonYear()
  const totals = usePersonTotals(view)
  const monthly = usePersonTotals(view, 'month')
  const borrowed = totals.balance === null ? null : -totals.balance
  return (
    <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
      {inPeriod(view.text).replace(/^î/u, 'Î')}, diferența, <strong className="font-semibold text-foreground tabular-nums">{leiText(borrowed)}</strong> de fiecare locuitor, s-a împrumutat. Pe lună, asta înseamnă {leiText(monthly.spending)} cheltuiți,
      din care {leiText(monthly.balance === null ? null : -monthly.balance)} pe datorie.
    </p>
  )
}

// ───────────────────────────────────────────────────────── the two columns ──

type Block = { readonly key: string; readonly label: string; readonly lei: number; readonly fill: { readonly className?: string; readonly style?: CSSProperties }; readonly strong?: boolean }

function blocksOf(lines: readonly PersonLine[]): Block[] {
  const named = lines.filter((line) => !line.rest).length
  return lines.map((line, rank) => ({ key: line.key, label: line.label, lei: line.lei, fill: line.rest ? { className: REST_FILL } : { style: toneOf(rank, named).style } }))
}

/** One column: blocks stacked top to bottom, each labelled on its outer side when it is tall enough to carry a label. */
function Column({ blocks, total, side, height }: { readonly blocks: readonly Block[]; readonly total: number; readonly side: 'left' | 'right'; readonly height: number }) {
  let top = 0
  return (
    <div className="relative" style={{ height }}>
      {blocks.map((block) => {
        const h = (block.lei / total) * height
        const at = top
        top += h
        const labelled = h >= 46
        return (
          <div key={block.key} className="absolute inset-x-0" style={{ top: at, height: h }}>
            <div title={`${block.label}: ${leiText(block.lei)}`} className={cn('absolute inset-y-0 w-16 border-b border-background sm:w-24', side === 'left' ? 'right-0' : 'left-0', block.fill.className)} style={block.fill.style} />
            {labelled ? (
              <div className={cn('absolute inset-y-0 flex flex-col justify-center text-sm leading-tight', side === 'left' ? 'right-[4.75rem] items-end text-right sm:right-[6.75rem]' : 'left-[4.75rem] sm:left-[6.75rem]')}>
                <span className={cn('max-w-[20ch]', block.strong && 'font-semibold')}>{block.label}</span>
                <span className="tabular-nums text-muted-foreground">{leiNumber(block.lei)} lei</span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function Flow() {
  const { view } = usePersonYear()
  const revenue = usePersonRevenue(view)
  const spending = usePersonSpending(view)
  const totals = usePersonTotals(view)
  if (revenue.whole === null || spending.whole === null) return <p className="text-sm text-muted-foreground">Buletinul acestui an nu are împărțirea pe rânduri.</p>
  const borrowed = totals.balance !== null && totals.balance < 0 ? -totals.balance : 0
  const left: Block[] = [...blocksOf(revenue.lines), ...(borrowed ? [{ key: 'borrowed', label: 'Împrumutat', lei: borrowed, fill: { className: BORROWED_FILL }, strong: true }] : [])]
  const right = blocksOf(spending.lines)
  const total = Math.max(revenue.whole + borrowed, spending.whole)
  const height = 640
  const small = (blocks: readonly Block[]) => blocks.filter((block) => (block.lei / total) * height < 46)
  return (
    <div>
      <div className="grid grid-cols-2 gap-0">
        <div className="pb-3 pr-3 text-right">
          <p className="text-sm text-muted-foreground">De unde au venit</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{leiText(revenue.whole + borrowed)}</p>
        </div>
        <div className="pb-3 pl-3">
          <p className="text-sm text-muted-foreground">Pe ce s-au dus</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{leiText(spending.whole)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Column blocks={left} total={total} side="left" height={height} />
        <Column blocks={right} total={total} side="right" height={height} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6 text-xs text-muted-foreground">
        <p className="text-right">{small(left).map((block) => `${block.label} ${leiNumber(block.lei)}`).join(' · ')}</p>
        <p>{small(right).map((block) => `${block.label} ${leiNumber(block.lei)}`).join(' · ')}</p>
      </div>
      <Note className="mx-auto text-center">
        Bugetul general consolidat {inPeriod(view.text)}, per locuitor (populația rezidentă de la 1 ianuarie). Încasările plus împrumutul fac cheltuielile; cele două coloane au aceeași înălțime. Sursa: buletinele de execuție ale Ministerului Finanțelor.
      </Note>
    </div>
  )
}

export function PersonFluxVariant() {
  return (
    <PersonPage
      sections={SECTIONS}
      head={
        <HeadFrame title={<Title />}>
          <Lede />
        </HeadFrame>
      }
    >
      <Section id="flux" title="De unde au venit banii și pe ce s-au dus" lede="Partea fiecărui locuitor: în stânga ce a încasat statul și cât s-a împrumutat, în dreapta pe ce s-a cheltuit.">
        <Flow />
      </Section>
      <DomainsSection unit="year" />
      <MinistriesSection unit="year" />
      <BorrowingSection unit="year" />
      <NowSection unit="year" />
      <FurtherSection />
    </PersonPage>
  )
}
