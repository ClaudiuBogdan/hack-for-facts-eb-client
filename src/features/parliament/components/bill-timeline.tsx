import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type {
  ParliamentBillDetail,
  ParliamentBillTimelineStep,
} from '@/schemas/parliament'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly bill: ParliamentBillDetail
}

/**
 * Source chamberCode → phase label. CD = Camera Deputaților, SE = Senat,
 * PA = the joint/promulgation stage (Parlament — president/promulgation/"devine
 * Legea"). Driven by the REAL chamberCode only; an unknown/absent code yields no
 * header (graceful flat render — never a fabricated bucket).
 */
const CHAMBER_PHASE_LABEL: Readonly<Record<string, string>> = {
  CD: 'Camera Deputaților',
  SE: 'Senat',
  PA: 'Parlament / Promulgare',
}

function phaseLabel(chamberCode: string | undefined): string | null {
  return chamberCode ? (CHAMBER_PHASE_LABEL[chamberCode] ?? null) : null
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

/** A routine step is collapsed by default — solicitare/primire aviz, termen. */
function isRoutineStep(step: ParliamentBillTimelineStep): boolean {
  if (step.isMilestone) return false
  const d = step.description.toLowerCase()
  return (
    d.includes('aviz') ||
    d.includes('termen') ||
    d.includes('punct de vedere') ||
    d.includes('prezentare în biroul')
  )
}

function StepRow({ step }: { readonly step: ParliamentBillTimelineStep }) {
  const date = formatStepDate(step)
  return (
    <li
      className={cn(
        'relative flex gap-4 pb-6 pl-6',
        // vertical connector line
        'before:absolute before:left-[7px] before:top-2 before:h-full before:w-px before:bg-[var(--pnrr-border)]',
        'last:pb-0 last:before:hidden',
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2',
          step.isMilestone
            ? 'border-[#1d70b8] bg-[#1d70b8]'
            : 'border-[var(--pnrr-border)] bg-[var(--pnrr-bg)]',
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
            'mt-0.5 leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]',
            step.isMilestone ? 'text-base font-bold' : 'text-sm',
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
 * Bill law-becoming + final-vote milestone hero cards. The law card surfaces the
 * resolved act (link deferred — the client has no legal-act route yet, flagged
 * to GM); the vote card links to the final-adoption vote with its tally.
 */
function MilestoneCards({ bill }: { readonly bill: ParliamentBillDetail }) {
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
 * Chronological etape timeline. Renders the bill's procedural events in raw
 * `position` order (no date re-sort) as a vertical timeline; milestones are
 * emphasised, routine steps collapse under a disclosure, and steps link to
 * their vote / documents. No fabricated chamber buckets — chamberCode-driven
 * phase grouping is added (gracefully) once the source exposes it.
 */
export function BillTimeline({ bill }: Props) {
  const [showRoutine, setShowRoutine] = useState(false)
  const steps = bill.timeline
  const routineCount = steps.filter(isRoutineStep).length
  const visible = showRoutine ? steps : steps.filter((s) => !isRoutineStep(s))

  return (
    <div className="space-y-8">
      <MilestoneCards bill={bill} />

      {steps.length > 0 ? (
        <>
          {routineCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowRoutine((v) => !v)}
              className="text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
            >
              {showRoutine
                ? `Ascunde pașii de rutină (${routineCount})`
                : `Arată toți pașii (${routineCount} de rutină ascunși)`}
            </button>
          ) : null}
          <ol className="mt-2">
            {visible.map((step, i) => {
              // Soft phase header on each chamber change (position order), driven
              // by the real chamberCode — same chamber recurring (reexaminare) is
              // re-headed, which mirrors the procedural reality. No header when the
              // code is unknown/absent.
              const label = phaseLabel(step.chamberCode)
              const prevLabel =
                i > 0 ? phaseLabel(visible[i - 1]!.chamberCode) : null
              const showHeader = label !== null && label !== prevLabel
              return (
                <div key={step.stepId}>
                  {showHeader ? (
                    <li className="mb-3 mt-2 list-none border-l-2 border-[#1d70b8] pl-4 first:mt-0">
                      <span className="text-xs font-black uppercase tracking-widest text-[#1d70b8]">
                        {label}
                      </span>
                    </li>
                  ) : null}
                  <StepRow step={step} />
                </div>
              )
            })}
          </ol>
        </>
      ) : (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există etape procedurale înregistrate pentru acest proiect.
        </p>
      )}
    </div>
  )
}
