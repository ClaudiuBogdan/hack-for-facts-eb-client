import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ParliamentBillTimelineStep } from '@/schemas/parliament'
import {
  BILL_STAGE_COLUMN_META,
  billDetailCardClassName,
} from '../lib/bill-detail-theme'
import {
  BILL_STAGE_COLUMN_ORDER,
  bucketByChamber,
  groupByRecord,
  sourceRecordLabel,
  type BillStageColumnKey,
} from '../lib/bill-stages-view'
import { formatStepDate } from '../lib/bill-step-format'
import { StepActions, StepLinks } from './bill-step-links'
import { ParliamentCardChevron } from './parliament-card-chevron'
import { ParliamentChamberMark } from './parliament-hub-panel'

// ── routine vs milestone grouping within a column ─────────────────────────────

/**
 * Routine clusters that collapse under an "avize & termene" disclosure.
 *
 * This is a DISPLAY preference, not a claim about the data — which is why it is
 * still a keyword test. What used to be conflated with it, and is now decided by
 * the source instead, is whether a row is a procedural step at all: see
 * `isProceduralStep`, which the server derives structurally.
 */
function isRoutineStep(step: ParliamentBillTimelineStep): boolean {
  if (step.isMilestone || step.voteId || step.docUrls.length > 0) return false
  if (step.links.length > 0) return false
  const d = step.description.toLowerCase()
  return (
    d.includes('aviz') ||
    d.includes('termen') ||
    d.includes('punct de vedere') ||
    d.includes('prezentare în biroul') ||
    d.includes('adresa')
  )
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
        <StepActions step={step} />
        <StepLinks step={step} />
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
  readonly columnKey: BillStageColumnKey
  readonly steps: readonly ParliamentBillTimelineStep[]
}) {
  const [showRoutine, setShowRoutine] = useState(false)
  const meta = BILL_STAGE_COLUMN_META[columnKey]
  const title = meta?.title ?? ''
  const color = meta?.color ?? '#505a5f'

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

  const primary = steps.filter((step) => !isRoutineStep(step))
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
            onClick={() => setShowRoutine((value) => !value)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[#1d70b8]"
          >
            <span>
              {showRoutine
                ? `Ascunde avize & termene (${routine.length})`
                : `Avize & termene (${routine.length})`}
            </span>
            <ParliamentCardChevron
              className={cn(
                'shrink-0 transition-transform',
                showRoutine && 'rotate-90',
              )}
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

function ColumnHeader({
  title,
  color,
}: {
  readonly title: string
  readonly color: string
}) {
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

function ColumnGrid({
  columns,
}: {
  readonly columns: Record<BillStageColumnKey, ParliamentBillTimelineStep[]>
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {BILL_STAGE_COLUMN_ORDER.filter(
        // The three chamber columns always render (an empty one is itself a
        // fact: "did not go through this stage"). The unstated column is only
        // meaningful when it holds something.
        (key) => key !== 'unstated' || columns.unstated.length > 0,
      ).map((key) => (
        <PassageColumn key={key} columnKey={key} steps={columns[key]} />
      ))}
    </div>
  )
}

/**
 * The classic three columns, with BOTH official records poured into them.
 *
 * The shortest answer to "where is it now" — but it is also where the two
 * chambers' near-duplicate entries land side by side in the same column, so the
 * duplication is named rather than left to look like a bug.
 */
export function BillStagesColumns({
  steps,
}: {
  readonly steps: readonly ParliamentBillTimelineStep[]
}) {
  return <ColumnGrid columns={bucketByChamber(steps)} />
}

/**
 * One lane per official record.
 *
 * A bicameral bill is TWO official records, not one sequence: each chamber keeps
 * its own fișă and each mirrors much of the other's procedure. Measured on prod,
 * 19,031 of 19,068 merged dossiers carry steps dated the same day in both, and
 * the mirroring lands in the SAME chamber column — so a flat merged reading
 * shows the reader the same act twice with nothing to explain it.
 *
 * We do NOT deduplicate: both entries are genuine official records, and the
 * near-duplicates ("respinsă de către Senat" vs "respins de Senat") do not match
 * exactly anyway, so suppression would be a judgement on fuzzy evidence.
 */
export function BillStagesRecordLanes({
  steps,
  recordOrder,
  fallbackKey,
}: {
  readonly steps: readonly ParliamentBillTimelineStep[]
  readonly recordOrder: readonly string[]
  readonly fallbackKey: string
}) {
  const lanes = groupByRecord(steps, recordOrder, fallbackKey)
  return (
    <div className="space-y-6">
      {lanes.map((lane) => (
        <section key={lane.sourceBillKey} className="space-y-4">
          {lanes.length > 1 ? (
            <h3 className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {sourceRecordLabel(lane.sourceBillKey)}
            </h3>
          ) : null}
          <ColumnGrid columns={lane.columns} />
        </section>
      ))}
    </div>
  )
}
