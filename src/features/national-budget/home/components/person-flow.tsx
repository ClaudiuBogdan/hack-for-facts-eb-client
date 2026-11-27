import { t } from '@lingui/core/macro'

import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { cn } from '@/lib/utils'
import { changeText, restLine, useHundred, useOfficialTotals, type HundredLine } from '../hooks/use-person-data'
import { moneyText } from '../lib/home-format'
import { outOfHundred } from '../lib/per-resident'
import { residentLinesOf } from '../lib/receipt'
import { BORROWED_FILL, REST_FILL, inPeriod, toneOf, previousText } from '../lib/person-format'
import { TwoLists, type HundredPart } from './person-rows'
import { Section } from './person-shell'
import { usePageYear } from '../hooks/use-page-year'

/**
 * Every 100 lei the state spent, as two columns of the same height: on the
 * left where they came from (the revenue lines, and the borrowed lei,
 * hatched), on the right what they went on. Under the columns, the largest
 * lines with their official amounts; the rest open on request.
 */

function partsOf(lines: readonly HundredLine[], lei: readonly number[]): HundredPart[] {
  const named = lines.filter((line) => !line.rest).length
  return lines.map((line, rank) => ({ ...line, lei: lei[rank] ?? 0, fill: line.rest ? { className: REST_FILL } : { style: toneOf(rank, named) } }))
}

const HEIGHT = 640

/** One column: a block per line, as tall as its lei; the lei and the name on the outer side when the block has room for them. */
function Column({ parts, side }: { readonly parts: readonly HundredPart[]; readonly side: 'left' | 'right' }) {
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

function Flow() {
  const { view } = usePageYear()
  const revenue = useHundred(view, 'revenue')
  const spending = useHundred(view, 'spending')
  const totals = useOfficialTotals(view)
  if (!revenue.whole || !spending.whole) return <p className="text-sm text-muted-foreground">{t`Buletinul acestui an nu are împărțirea pe rânduri.`}</p>
  // The totals stand without their lines (2008, 2011, 2013): no breakdown, never a whole that is all „other".
  if (!revenue.lines.length || !spending.lines.length) {
    return (
      <p className="max-w-[60ch] text-sm text-muted-foreground">
        {t`${moneyText(revenue.whole)} încasați și ${moneyText(spending.whole)} cheltuiți ${inPeriod(view.text)}. Buletinul acestui an nu are împărțirea lor pe rânduri.`}
      </p>
    )
  }
  const previous = previousText(view)
  // The revenue lines share the lei the head says came from revenue, so the borrowed lei are the head's.
  const fromRevenue = outOfHundred(
    revenue.lines.map((line) => plotOf(line.exact) ?? 0),
    totals.fromRevenue,
  )
  const borrowed: HundredPart[] = totals.deficit
    ? [
        {
          key: 'borrowed',
          // The consolidated cash deficit, as the Ministry names it: what was spent beyond revenue, not the year's borrowing.
          label: t`Deficit bugetar (cash)`,
          hint: t`ce s-a cheltuit peste încasări`,
          exact: totals.deficit,
          lei: totals.borrowed,
          change: changeText(totals.deficit, totals.deficitBefore),
          fill: { className: BORROWED_FILL },
          strong: true,
        },
      ]
    : []
  const left = [...partsOf(revenue.lines, fromRevenue), ...borrowed]
  // Per resident, the spending rows print the receipt's figures, so a line reads the same in both sections.
  const residents = new Map(residentLinesOf({ lines: spending.lines, whole: spending.whole, year: view.year, rest: restLine('spending', view.year) })?.lines.map((line) => [line.key, line.perResident]))
  const right = partsOf(
    spending.lines,
    spending.lines.map((line) => line.lei),
  ).map((part) => ({ ...part, resident: residents.get(part.key) }))
  const received = moneyText(revenue.whole)
  const deficit = totals.deficit ? moneyText(totals.deficit) : null
  return (
    <div>
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="pb-3 pr-2 text-right">
            <p className="text-sm font-semibold">{t`De unde au venit`}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{deficit ? t`${received} încasați, ${deficit} deficit` : t`${received} încasați`}</p>
          </div>
          <div className="pb-3 pl-2">
            <p className="text-sm font-semibold">{t`Pe ce s-au dus`}</p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{t`${moneyText(spending.whole)} cheltuiți`}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Column parts={left} side="left" />
          <Column parts={right} side="right" />
        </div>
      </div>
      <TwoLists
        className="mt-12"
        left={{ title: t`De unde au venit cei 100 de lei`, parts: left }}
        right={{ title: t`Pe ce s-au dus`, parts: right }}
        previous={previous}
        note={t`Bugetul general consolidat ${inPeriod(view.text)}. Încasările plus deficitul fac cheltuielile, de aceea coloanele au aceeași înălțime. Leii din 100 sunt rotunjiți la întreg. Pe locuitor: suma împărțită la populația rezidentă de la 1 ianuarie.`}
      />
    </div>
  )
}

export function FlowSection() {
  return (
    <Section id="bani" title={t`De unde vin banii și pe ce se duc`} lede={t`Fiecare 100 de lei cheltuiți de stat: în stânga de unde au venit, în dreapta pe ce s-au dus.`}>
      <Flow />
    </Section>
  )
}
