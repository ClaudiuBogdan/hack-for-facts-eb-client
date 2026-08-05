import type { ParliamentBillDetail } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { formatBillUpdatedAt, getChamberLabel } from '../lib/formatting'
import { getBillTypeLabel } from '../lib/bill-profile-data'
import {
  getDecisionChamberLabel,
  getLawCharacterLabel,
} from '../lib/bill-source-facts'
import {
  billDetailPageContainerClassName,
  getBillDetailHeroColor,
} from '../lib/bill-detail-theme'

type Props = {
  readonly bill: ParliamentBillDetail
}

/**
 * The three procedural facts that change how the whole page reads.
 *
 * They are flags, not a table: each appears only when the source stated it.
 * `urgency` is the one that matters most and the one most easily got wrong — it
 * renders for `true` ALONE. An explicit "not urgent" (16,051 bills) and a silent
 * source (21,242) are different facts, and neither is worth a chip.
 *
 * Where each is then said: the explicit "Nu" gets a row in the procedure table
 * on the Detalii tab, where there is room for words. SILENCE GETS NOTHING —
 * no chip and no row — because we have nothing to report, and an "unknown" row
 * on 21,242 of 41,990 bills would be the loudest thing on the page. What must
 * never happen is a missing chip reading as a stated "no".
 */
function BillProcedureFlags({ bill }: Props) {
  const decisionChamber = getDecisionChamberLabel(bill.procedure.decisionChamber)
  const lawCharacter = getLawCharacterLabel(bill.procedure.lawCharacter)
  const flags = [
    bill.procedure.urgency === true ? 'Procedură de urgență' : undefined,
    decisionChamber ? `Cameră decizională: ${decisionChamber}` : undefined,
    lawCharacter,
  ].filter((flag): flag is string => flag !== undefined)

  if (flags.length === 0) return null

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {flags.map((flag) => (
        <li
          key={flag}
          className="inline-flex items-center border border-white/60 px-2 py-0.5 text-xs font-semibold text-white"
        >
          {flag}
        </li>
      ))}
    </ul>
  )
}

/** Full-width bill summary band — inner content aligned to main panel */
export function BillDetailHero({ bill }: Props) {
  const heroColor = getBillDetailHeroColor(bill.originatingChamber)
  // Honest current-status chip from the SOURCE status string (currentStageLabel
  // = server statusText) — no fabricated Camera→Senat→final progression (the
  // real chamber position isn't known until the source exposes chamberCode).
  const statusLabel = bill.lawMilestone
    ? bill.lawMilestone.actTitle ??
      `Legea nr. ${bill.lawMilestone.lawNumber}/${bill.lawMilestone.lawYear ?? ''}`
    : bill.currentStageLabel

  return (
    <section className="py-8 text-white" style={{ backgroundColor: heroColor }}>
      <div
        className={cn(
          billDetailPageContainerClassName,
          'grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start',
        )}
      >
        <div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl lg:text-[2rem]">
            {bill.title}
          </h2>
          <p className="mt-3 text-base font-bold text-white">{getBillTypeLabel(bill.billType)}</p>
          <p className="mt-3 text-base text-white/90">
            Inițiat în {getChamberLabel(bill.originatingChamber)} · {bill.number}
          </p>
          <p className="mt-1 text-sm text-white/80">
            Actualizat: {formatBillUpdatedAt(bill.lastUpdatedAt)}
          </p>
          <BillProcedureFlags bill={bill} />
        </div>

        <div className="min-w-[16rem]">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            Stadiu curent
          </p>
          <p className="mt-1 text-lg font-bold leading-snug text-white">
            {statusLabel}
          </p>
          {/*
            NO route to the stages here. "Etape" is one of the four tabs a few
            centimetres below, and the Detalii tab carries "Vezi toate etapele
            parcursului" under the status card — a third link to the same place
            from the same screen only made the hero busier.
          */}
        </div>
      </div>
    </section>
  )
}
