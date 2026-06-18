import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type {
  ParliamentBillDetail,
  ParliamentBillTimelineStep,
} from '@/schemas/parliament'
import {
  BILL_DETAIL_FINAL_PURPLE,
  billDetailCardClassName,
  billDetailSectionTitleClassName,
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/bill-detail-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentChamberMark } from './parliament-hub-panel'

type Props = {
  readonly bill: ParliamentBillDetail
}

// ── chamber bucketing (driven by the REAL chamberCode — no string heuristic) ──

type ColumnKey = 'camera' | 'senat' | 'final'

const COLUMN_BY_CHAMBER_CODE: Readonly<Record<string, ColumnKey>> = {
  CD: 'camera',
  SE: 'senat',
  PA: 'final',
}

const COLUMN_META: Record<
  ColumnKey,
  { readonly title: string; readonly color: string }
> = {
  camera: { title: 'Camera Deputaților', color: PARLIAMENT_CAMERA_GREEN },
  senat: { title: 'Senat', color: PARLIAMENT_SENAT_RED },
  final: { title: 'Parlament / Promulgare', color: BILL_DETAIL_FINAL_PURPLE },
}

const COLUMN_ORDER: readonly ColumnKey[] = ['camera', 'senat', 'final']

/** Group the position-ordered steps into the 3 chamber columns by chamberCode. */
function bucketByChamber(
  steps: readonly ParliamentBillTimelineStep[],
): Record<ColumnKey, ParliamentBillTimelineStep[]> {
  const cols: Record<ColumnKey, ParliamentBillTimelineStep[]> = {
    camera: [],
    senat: [],
    final: [],
  }
  for (const step of steps) {
    const key = step.chamberCode ? COLUMN_BY_CHAMBER_CODE[step.chamberCode] : undefined
    // Unknown/absent code → not bucketed (no fabricated placement).
    if (key) cols[key].push(step)
  }
  return cols
}

// ── routine vs milestone grouping within a column ─────────────────────────────

/**
 * Routine clusters that collapse under an "avize & termene" disclosure. A step
 * that is a milestone OR carries a vote / document is NEVER collapsed (its link
 * must stay visible).
 */
function isRoutineStep(step: ParliamentBillTimelineStep): boolean {
  if (step.isMilestone || step.voteId || step.docUrls.length > 0) return false
  const d = step.description.toLowerCase()
  return (
    d.includes('aviz') ||
    d.includes('termen') ||
    d.includes('punct de vedere') ||
    d.includes('prezentare în biroul') ||
    d.includes('adresa')
  )
}

function formatStepDate(step: ParliamentBillTimelineStep): string | null {
  if (step.date) {
    return new Intl.DateTimeFormat('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(step.date))
  }
  return step.dateText ?? null
}

function StepRow({ step }: { readonly step: ParliamentBillTimelineStep }) {
  const date = formatStepDate(step)
  return (
    <li
      className={cn(
        'flex items-start gap-3 px-4 py-3',
        step.isMilestone ? 'bg-[#f8f8f8] dark:bg-[var(--pnrr-subtle)]' : '',
      )}
    >
      <span
        className={cn(
          'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
          step.isMilestone ? 'bg-[#1d70b8]' : 'bg-[#b1b4b6]',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        {date ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {date}
          </p>
        ) : null}
        <p
          className={cn(
            'leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
            step.isMilestone ? 'text-sm font-bold' : 'text-sm',
          )}
        >
          {step.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          {step.voteId ? (
            <Link
              to="/parlament/voturi/$chamber/$voteId"
              params={{ chamber: 'camera', voteId: step.voteId }}
              className="text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
            >
              Vezi votul
            </Link>
          ) : null}
          {step.docUrls.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#1d70b8] underline underline-offset-4"
            >
              {step.docUrls.length > 1 ? `Document ${i + 1}` : 'Document'}
            </a>
          ))}
        </div>
      </div>
    </li>
  )
}

/**
 * One chamber column. Milestone steps are always visible + emphasised; the
 * routine cluster (avize/termene/puncte de vedere) collapses under a disclosure
 * so the column stays scannable. Steps keep their source position order.
 */
function PassageColumn({
  columnKey,
  steps,
}: {
  readonly columnKey: ColumnKey
  readonly steps: readonly ParliamentBillTimelineStep[]
}) {
  const [showRoutine, setShowRoutine] = useState(false)
  const { title, color } = COLUMN_META[columnKey]

  if (steps.length === 0) {
    return (
      <div className={cn(billDetailCardClassName, 'flex flex-col opacity-60')}>
        <ColumnHeader title={title} color={color} />
        <p className="px-4 py-4 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu a parcurs această etapă.
        </p>
      </div>
    )
  }

  // Preserve position order, but pull routine steps into a collapsible cluster
  // rendered inline at the position of the first routine run is overkill — keep
  // it simple: show milestone + non-routine inline, collapse all routine at the
  // bottom of the column under one disclosure.
  const primary = steps.filter((s) => !isRoutineStep(s))
  const routine = steps.filter(isRoutineStep)

  return (
    <div className={cn(billDetailCardClassName, 'flex flex-col')}>
      <ColumnHeader title={title} color={color} />
      <ol className="divide-y divide-[#e5e5e5] dark:divide-[var(--pnrr-border)]">
        {primary.map((step) => (
          <StepRow key={step.stepId} step={step} />
        ))}
      </ol>
      {routine.length > 0 ? (
        <div className="border-t border-[#e5e5e5] dark:border-[var(--pnrr-border)]">
          <button
            type="button"
            onClick={() => setShowRoutine((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#1d70b8]"
          >
            <span>
              {showRoutine
                ? `Ascunde avize & termene (${routine.length})`
                : `Avize & termene (${routine.length})`}
            </span>
            <ParliamentCardChevron
              className={cn('shrink-0 transition-transform', showRoutine && 'rotate-90')}
            />
          </button>
          {showRoutine ? (
            <ol className="divide-y divide-[#e5e5e5] border-t border-[#e5e5e5] dark:divide-[var(--pnrr-border)] dark:border-[var(--pnrr-border)]">
              {routine.map((step) => (
                <StepRow key={step.stepId} step={step} />
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ColumnHeader({ title, color }: { readonly title: string; readonly color: string }) {
  return (
    <div
      className="flex items-center gap-2 border-b border-[#b1b4b6] px-4 py-3 dark:border-[var(--pnrr-border)]"
      style={{ borderTopWidth: 4, borderTopColor: color, borderTopStyle: 'solid' }}
    >
      <ParliamentChamberMark color={color} className="mt-0" />
      <h3 className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {title}
      </h3>
    </div>
  )
}

/** Law + final-vote outcome summary (the key result), above the columns. */
function OutcomeSummary({ bill }: { readonly bill: ParliamentBillDetail }) {
  const finalVote = bill.relatedVotes[0]
  if (!bill.lawMilestone && !finalVote) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {bill.lawMilestone ? (
        <div className="border-2 border-[#00703c] bg-[#f3faf5] p-4 dark:bg-[var(--pnrr-bg)]">
          <p className="text-xs font-black uppercase tracking-wide text-[#00703c]">
            Promulgată ca lege
          </p>
          <p className="mt-1 text-lg font-black text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {bill.lawMilestone.actTitle ??
              `Legea nr. ${bill.lawMilestone.lawNumber}/${bill.lawMilestone.lawYear ?? ''}`}
          </p>
        </div>
      ) : null}
      {finalVote ? (
        <Link
          to="/parlament/voturi/$chamber/$voteId"
          params={{ chamber: finalVote.chamber, voteId: finalVote.voteId }}
          className="group flex items-start justify-between gap-3 border-2 border-[#1d70b8] bg-[#f0f6fb] p-4 transition-colors hover:bg-[#e3eef8] dark:bg-[var(--pnrr-bg)]"
        >
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#1d70b8]">
              Vot final
            </p>
            <p className="mt-1 truncate text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {new Intl.DateTimeFormat('ro-RO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(finalVote.heldAt))}
            </p>
          </div>
          <ParliamentCardChevron className="mt-1 shrink-0" />
        </Link>
      ) : null}
    </div>
  )
}

/**
 * Three-column bill passage tracker (GOV.UK-style), driven by the REAL
 * `chamberCode` (CD → Camera, SE → Senat, PA → Parlament/Promulgare). Steps keep
 * source position order; within each column milestones are emphasised and the
 * routine cluster collapses. No string-heuristic / fabricated buckets.
 */
export function BillPassageTracker({ bill }: Props) {
  const columns = bucketByChamber(bill.timeline)
  const hasAnyBucketed = COLUMN_ORDER.some((k) => columns[k].length > 0)

  return (
    <div className="space-y-6">
      <OutcomeSummary bill={bill} />

      <h2 className={billDetailSectionTitleClassName}>Parcurs legislativ</h2>

      {hasAnyBucketed ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {COLUMN_ORDER.map((key) => (
            <PassageColumn key={key} columnKey={key} steps={columns[key]} />
          ))}
        </div>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există etape procedurale înregistrate pentru acest proiect.
        </p>
      )}
    </div>
  )
}
