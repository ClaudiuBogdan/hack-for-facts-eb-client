import type { ParliamentBillDetail } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { formatBillUpdatedAt, getChamberLabel } from '../lib/formatting'
import { getBillTypeLabel } from '../lib/bill-profile-data'
import {
  billDetailPageContainerClassName,
  getBillDetailHeroColor,
} from '../lib/bill-detail-theme'

type Props = {
  readonly bill: ParliamentBillDetail
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
