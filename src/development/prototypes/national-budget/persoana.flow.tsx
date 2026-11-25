import { moneyText } from '@/features/national-budget/home/lib/home-format'
import { cn } from '@/lib/utils'
import { changeOf, type HundredLine, outOfHundred, useHundred, useOfficialTotals } from './persoana.data'
import { TwoLists, type HundredPart } from './persoana.rows'
import { BORROWED_FILL, REST_FILL, inPeriod, toneOf } from './persoana.sections'
import { Section, usePersonYear } from './persoana.shell'

/**
 * The working version's first section: every 100 lei the state spent, as two
 * columns of the same height (the „Fluxul" version's object, in the hero's
 * measure). Left, where they came from: the revenue lines, and the borrowed
 * lei the hero names, hatched. Right, what they went on. Under the columns,
 * the largest lines with their official amount and, as a description, their
 * lei per resident; the rest open on request.
 */

type Part = HundredPart

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
      <TwoLists
        className="mt-12"
        left={{ title: 'De unde au venit cei 100 de lei', parts: left }}
        right={{ title: 'Pe ce s-au dus', parts: right }}
        previous={previous}
        note={`Bugetul general consolidat ${inPeriod(view.text)}. Încasările plus împrumutul fac cheltuielile, de aceea coloanele au aceeași înălțime. Leii din 100 sunt rotunjiți la întreg. Pe locuitor: suma împărțită la populația rezidentă de la 1 ianuarie.`}
      />
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
