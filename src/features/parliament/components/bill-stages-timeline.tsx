import { cn } from '@/lib/utils'
import type { ParliamentBillTimelineStep } from '@/schemas/parliament'
import {
  BILL_STAGE_COLUMN_META,
  PARLIAMENT_ACTION_BLUE,
} from '../lib/bill-detail-theme'
import {
  billStageColumnOf,
  buildChronology,
  chronologySpanDays,
  romanianNeedsDe,
  shouldNameRecord,
  sourceRecordShortLabel,
  type ChronologyEntry,
} from '../lib/bill-stages-view'
// The shared UTC-pinned day formatter: formatting a date-only value in browser
// time renders 2026-03-23 as 22 March for anyone west of Bucharest.
import { formatVoteDayLong as formatDayLong } from '../lib/formatting'
import { StepActions, StepLinks } from './bill-step-links'

type Props = {
  readonly steps: readonly ParliamentBillTimelineStep[]
  readonly recordOrder: readonly string[]
  /** True when the dossier merges two chambers' records worth naming per event. */
  readonly showRecordChip: boolean
}

/**
 * The chronological reading: one vertical line, both chambers interleaved.
 *
 * This is the only view that can answer "what happened next", because a column
 * is a place and not a moment. Nothing is collapsed behind a disclosure here —
 * the median bill carries 20 procedural steps and the 99th percentile 53, so the
 * rail stays readable at full length (only 208 bills of 41,962 exceed 60).
 */
export function BillStagesTimeline({
  steps,
  recordOrder,
  showRecordChip,
}: Props) {
  const chronological = buildChronology(steps, recordOrder)
  const span = chronologySpanDays(chronological)
  const stepCount = chronological.reduce(
    (sum, entry) => sum + entry.steps.length,
    0,
  )
  const undatedCount = chronological
    .filter((entry) => entry.kind === 'undated')
    .reduce((sum, entry) => sum + entry.steps.length, 0)

  // Newest day first: what a bill did last is what a reader came to find out,
  // and on a long procedure it saves scrolling past a year of avize to reach it.
  // Only the DAY blocks flip — inside a day the record's own order is the only
  // sequence there is, and reversing it would put a rejection above the sitting
  // that produced it.
  const entries = [...chronological].reverse()

  if (entries.length === 0) {
    return (
      <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        Nu există etape procedurale înregistrate pentru acest proiect.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <TimelineSummary
        stepCount={stepCount}
        span={span}
        undatedCount={undatedCount}
      />
      {/* The left margin is the gutter the chamber labels sit in. */}
      <ol className="ml-[4.25rem] border-l-2 border-[#b1b4b6] sm:ml-[7rem] dark:border-[var(--pnrr-border)]">
        {entries.map((entry) => (
          <TimelineEntry
            key={entry.key}
            entry={entry}
            showRecordChip={showRecordChip}
          />
        ))}
      </ol>
    </div>
  )
}

function TimelineSummary({
  stepCount,
  span,
  undatedCount,
}: {
  readonly stepCount: number
  readonly span: number | undefined
  readonly undatedCount: number
}) {
  return (
    <p className="max-w-4xl text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
      <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {stepCount}
      </span>{' '}
      {romanianNeedsDe(stepCount) ? 'de ' : ''}
      {stepCount === 1 ? 'etapă' : 'etape'}
      {span !== undefined && span > 0 ? (
        <>
          , pe parcursul a{' '}
          <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {span}
          </span>{' '}
          {romanianNeedsDe(span) ? 'de ' : ''}
          {span === 1 ? 'zi' : 'zile'}
        </>
      ) : null}
      .{' '}
      {undatedCount > 0 ? (
        <>
          Sursa nu a consemnat data pentru{' '}
          {undatedCount === 1 ? (
            'una dintre ele'
          ) : (
            <>
              <span className="font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                {undatedCount}
              </span>{' '}
              dintre ele
            </>
          )}
          ; {undatedCount === 1 ? 'o arătăm' : 'le arătăm'} în intervalul pe care
          fișa îl dovedește, nu la o dată inventată.
        </>
      ) : null}
    </p>
  )
}

function TimelineEntry({
  entry,
  showRecordChip,
}: {
  readonly entry: ChronologyEntry
  readonly showRecordChip: boolean
}) {
  const isMilestoneDay = entry.steps.some((step) => step.isMilestone)
  return (
    <li className="relative pb-12 last:pb-0">
      <div className="relative pl-5 sm:pl-7">
        {/* The rail occupies x ∈ [-2, 0] here, so its centre is at -1: a 14px
            marker straddles it at -8px, centred on the heading's 24px line at
            top 5px. */}
        <span
          className={cn(
            'absolute top-[5px] -left-[8px] h-3.5 w-3.5 rounded-full border-2 bg-white dark:bg-[var(--pnrr-bg)]',
            entry.kind === 'undated'
              ? 'border-dashed border-[#b1b4b6]'
              : 'border-[#b1b4b6]',
          )}
          style={
            isMilestoneDay
              ? {
                  borderColor: PARLIAMENT_ACTION_BLUE,
                  backgroundColor: PARLIAMENT_ACTION_BLUE,
                }
              : undefined
          }
          aria-hidden
        />
        <EntryHeading entry={entry} isMilestoneDay={isMilestoneDay} />
      </div>
      <ul className="mt-4 space-y-7">
        {entry.steps.map((step) => (
          <TimelineStep
            key={step.stepId}
            step={step}
            showRecordChip={showRecordChip}
          />
        ))}
      </ul>
    </li>
  )
}

function EntryHeading({
  entry,
  isMilestoneDay,
}: {
  readonly entry: ChronologyEntry
  readonly isMilestoneDay: boolean
}) {
  // The date is set in sentence case at a larger size, and the chamber captions
  // below it stay small and uppercase. Both levels shouting in caps flattened
  // the hierarchy and made a day hard to pick out while scrolling.
  if (entry.kind === 'day') {
    return (
      <h4
        className={cn(
          'text-base font-bold leading-6',
          isMilestoneDay
            ? 'text-[#1d70b8]'
            : 'text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
        )}
      >
        {formatDayLong(entry.date)}
      </h4>
    )
  }
  return (
    <div>
      <h4 className="text-base font-bold leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {undatedRangeLabel(entry)}
      </h4>
      <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        Dată neconsemnată de sursă — poziția în fișă este singura dovadă
      </p>
    </div>
  )
}

/**
 * Say exactly what the record proves about when an undated step happened.
 *
 * 88.6% of undated steps are bracketed by dated ones on both sides, so an
 * interval is almost always available; the remainder can still be placed after
 * the last date the record carries.
 */
function undatedRangeLabel(
  entry: Extract<ChronologyEntry, { kind: 'undated' }>,
): string {
  if (entry.after && entry.before) {
    return `Între ${formatDayLong(entry.after)} și ${formatDayLong(entry.before)}`
  }
  if (entry.after) return `După ${formatDayLong(entry.after)}`
  if (entry.before) return `Înainte de ${formatDayLong(entry.before)}`
  return 'Fără dată'
}

/**
 * One event on the rail — no box.
 *
 * The chamber moves OUT of the sentence and into the gutter left of the line,
 * colour-coded, where it can be scanned down a whole procedure at once. That is
 * what the boxes were being asked to do, badly: on a long bill they stacked into
 * a ladder of rules competing with the rail itself, which is the one line the
 * reader is meant to follow. What is left in the content column is the sentence
 * and whatever the step links to.
 */
function TimelineStep({
  step,
  showRecordChip,
}: {
  readonly step: ParliamentBillTimelineStep
  readonly showRecordChip: boolean
}) {
  const column = billStageColumnOf(step)
  const meta = BILL_STAGE_COLUMN_META[column]
  const color = meta?.color ?? '#505a5f'
  const nameRecord = shouldNameRecord(step, showRecordChip)

  return (
    <li className="relative pl-5 sm:pl-7">
      {/* `right-full` puts the label's right edge exactly on the rail, so the
          gutter reads as one column no matter how long a description runs.
          Both the label and the dot are centred on the first line of the
          description (24px tall → centre at 12px), so the three read as one row:
          label box is 16px → top 4px; dot is 12px → top 6px. */}
      <span
        className="absolute top-1 right-full mr-3 w-14 text-right text-[11px] leading-4 font-black uppercase sm:w-24 sm:text-xs"
        style={{ color }}
      >
        {meta?.gutter ?? 'Necunoscut'}
      </span>
      <span
        className="absolute top-1.5 -left-[7px] h-3 w-3 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <p
        className={cn(
          'text-base leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
          step.isMilestone && 'font-bold',
        )}
      >
        {step.description}
      </p>
      {/* WHOSE record this row is — said only where the gutter's chamber does
          not already imply it. */}
      {nameRecord && step.sourceBillKey ? (
        <p className="mt-0.5 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          consemnat în fișa {sourceRecordShortLabel(step.sourceBillKey)}
        </p>
      ) : null}
      <StepActions step={step} />
      <StepLinks step={step} />
    </li>
  )
}
