import { Link } from '@tanstack/react-router'
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
          <Link
            to="/parlament/proiecte/$billId/etape"
            params={{ billId: bill.billId }}
            className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-2 hover:text-white/90"
          >
            Vezi parcursul complet
          </Link>
        </div>
      </div>
    </section>
  )
}
