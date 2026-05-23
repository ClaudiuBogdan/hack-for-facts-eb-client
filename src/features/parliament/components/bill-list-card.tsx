import { Link } from '@tanstack/react-router'
import type { ParliamentBillSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { formatBillUpdatedAt, getChamberLabel } from '../lib/formatting'
import { getBillTypeLabel } from '../lib/bill-profile-data'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
  parliamentHubInternalBorderClassName,
  parliamentVoteCardClassName,
} from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentChamberMark } from './parliament-hub-panel'

type Props = {
  readonly bill: ParliamentBillSummary
  readonly legislatureLabel: string
  readonly className?: string
}

/** UK Parliament-style bill result card */
export function BillListCard({ bill, legislatureLabel, className }: Props) {
  const originColor =
    bill.originatingChamber === 'camera'
      ? PARLIAMENT_CAMERA_GREEN
      : PARLIAMENT_SENAT_RED

  return (
    <Link
      to="/parlament/proiecte/$billId"
      params={{ billId: bill.billId }}
      className={cn(parliamentVoteCardClassName, 'group flex', className)}
      aria-label={`${bill.number} — ${bill.title}`}
    >
      <span
        className="w-[5px] shrink-0 self-stretch"
        style={{ backgroundColor: originColor }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'flex min-h-[3.5rem] items-center gap-3 border-b px-4 py-3.5 sm:px-5 sm:py-4',
            parliamentHubInternalBorderClassName,
          )}
        >
          <h3 className="min-w-0 flex-1 text-base font-bold leading-snug text-[#0b0c0c] group-hover:underline sm:text-lg dark:text-[var(--pnrr-fg)]">
            {bill.title}
          </h3>
          <ParliamentCardChevron className="shrink-0 text-[#505a5f] dark:text-[var(--pnrr-muted)]" />
        </div>

        <div className="grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-[var(--pnrr-border)]">
          <div className="border-b px-4 py-3.5 sm:border-b-0 sm:px-5 sm:py-4">
            <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              Inițiat în
            </p>
            <div className="mt-2 flex items-center gap-2">
              <ParliamentChamberMark color={originColor} className="mt-0.5" />
              <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {getChamberLabel(bill.originatingChamber)}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Legislatura {legislatureLabel}
            </p>
          </div>

          <div className="px-4 py-3.5 sm:px-5 sm:py-4">
            <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              Următoarea etapă
            </p>
            <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {bill.nextStageLabel ?? bill.currentStageLabel}
            </p>
            <p className="mt-1 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {bill.number}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 sm:px-5 sm:py-3',
            parliamentHubInternalBorderClassName,
          )}
        >
          <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Actualizat: {formatBillUpdatedAt(bill.lastUpdatedAt)}
          </p>
          <span className="rounded-none border border-[#b1b4b6] px-2 py-0.5 text-xs font-semibold text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
            {getBillTypeLabel(bill.billType)}
          </span>
        </div>
      </div>
    </Link>
  )
}
