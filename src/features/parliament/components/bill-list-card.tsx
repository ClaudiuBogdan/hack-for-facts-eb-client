import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { ParliamentBillSummary } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { formatBillUpdatedAt, getChamberLabel } from '../lib/formatting'
import { getBillTypeLabel } from '../lib/bill-profile-data'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly bill: ParliamentBillSummary
  readonly className?: string
}

const VALUE_CLASS = 'text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]'

/** House micro-label (see agenda-list-card, bill-passage-tracker). */
const LABEL_CLASS =
  'text-xs font-black uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]'

/** One labelled fact of the row's definition list. */
function BillFact({
  label,
  className,
  children,
}: {
  readonly label: string
  readonly className?: string
  readonly children: ReactNode
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className={LABEL_CLASS}>{label}</dt>
      {children}
    </div>
  )
}

/**
 * A bill in a list — one row of a bordered container, not a card of its own.
 *
 * It USED to frame itself: a border, a 5px accent, two internal rules and an
 * outlined badge. Inside the hub's bordered section and inside the browse list's
 * container alike, every one of those was a second border a few pixels from an
 * existing one. What carries the structure now is a label/value hierarchy: the
 * title, the originating chamber badged in that chamber's colour, and four
 * facts on shared column tracks.
 *
 * The tracks are FIXED widths rather than content-sized, because each row is
 * its own grid — sized to content they would land at a different x in every
 * row, and the point of columns in a list is reading one fact straight down it.
 * They pack left and leave the slack at the end.
 */
export function BillListCard({ bill, className }: Props) {
  const originColor =
    bill.originatingChamber === 'camera'
      ? PARLIAMENT_CAMERA_GREEN
      : PARLIAMENT_SENAT_RED

  return (
    <Link
      to="/parlament/proiecte/$billId"
      params={{ billId: bill.billId }}
      aria-label={`${bill.number} — ${bill.title}`}
      className={cn(
        'group block px-5 py-4 transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] focus-visible:ring-inset sm:px-6',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0 text-base font-bold leading-snug text-[#0b0c0c] group-hover:underline dark:text-[var(--pnrr-fg)]">
            {bill.title}
          </h3>
          {/*
            The originating chamber, badged under the title in that chamber's
            own colour — what the 5px accent stripe used to carry. It SAYS
            "Inițiat în" rather than naming the chamber alone: a bare chamber
            name on a bill reads as where the bill is now, which is a different
            fact and often a different chamber.
          */}
          <span
            className="mt-2 inline-flex items-center rounded-none px-2 py-0.5 text-xs font-bold leading-5 text-white"
            style={{ backgroundColor: originColor }}
          >
            Inițiat în {getChamberLabel(bill.originatingChamber)}
          </span>
          {/*
            The bill's own account of what it does, where it exists — 1,007 of
            41,990 bills (2.4%), averaging ~466 characters.

            It sits OUTSIDE the four-track grid on purpose. The tracks are fixed
            widths so a fact can be read straight down the list, and a paragraph
            of source prose in one of them would either blow the column or wrap
            to six lines and break that alignment for every row below it. Clamped
            to two lines: the card is a way in, not the document.
          */}
          {bill.objectOfRegulation ? (
            <p className="mt-2 line-clamp-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {bill.objectOfRegulation}
            </p>
          ) : null}
        </div>
        <ParliamentCardChevron className="mt-0.5 shrink-0 text-[#505a5f] dark:text-[var(--pnrr-muted)]" />
      </div>

      {/* Two columns on a phone (a 2×2 block), four tracks from lg up. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:gap-x-8 lg:grid-cols-[8rem_14rem_13rem_1fr]">
        {/*
          THIS bill's own registration year (plx_year / senate_year), not the
          hub's current legislature. The card used to print
          `Legislatura {hub.legislature.label}` — which rendered as "Legislatura
          Legislatura 2024" AND stamped the current legislature onto a bill
          registered in, say, 2012.
        */}
        <BillFact label="Înregistrat">
          <dd className={cn('mt-1', VALUE_CLASS)}>{bill.legislatureId}</dd>
        </BillFact>

        <BillFact label="Următoarea etapă">
          <dd className={cn('mt-1', VALUE_CLASS)}>
            {bill.nextStageLabel ?? bill.currentStageLabel}
          </dd>
          <dd className="mt-1 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {bill.number}
          </dd>
        </BillFact>

        <BillFact label="Tip">
          <dd className={cn('mt-1', VALUE_CLASS)}>
            {getBillTypeLabel(bill.billType)}
          </dd>
        </BillFact>

        {/*
          The last track is the `1fr` one — the only one with room for a
          sentence, which is why WHAT happened goes here rather than in a fixed
          column. The date alone told the reader a bill had moved and nothing
          about what the movement was.
        */}
        <BillFact label="Actualizat">
          <dd className={cn('mt-1', VALUE_CLASS)}>
            {formatBillUpdatedAt(bill.lastUpdatedAt)}
          </dd>
          {bill.lastEventDescription ? (
            <dd className="mt-1 line-clamp-2 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {bill.lastEventDescription}
            </dd>
          ) : null}
        </BillFact>
      </dl>
    </Link>
  )
}

/**
 * The bordered container a list of `BillListCard` rows lives in — the border
 * belongs to the LIST, drawn once, instead of to each row.
 */
export function BillListContainer({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <div
      className={cn(
        'divide-y divide-[var(--pnrr-border)]/20 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
