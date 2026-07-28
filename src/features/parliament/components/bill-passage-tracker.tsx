import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import type {
  ParliamentBillDetail,
  ParliamentBillTimelineStep,
} from '@/schemas/parliament'
import { isFinalBillVote } from '../api/graphql/parliament-mappers'
import { formatVoteDayLong } from '../lib/formatting'
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

type ColumnKey = 'camera' | 'senat' | 'final' | 'unstated'

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
  unstated: { title: 'Etape fără cameră indicată', color: '#505a5f' },
}

const COLUMN_ORDER: readonly ColumnKey[] = ['camera', 'senat', 'final', 'unstated']

/**
 * Group the position-ordered steps into chamber columns by the REAL chamberCode.
 *
 * A step whose chamber the source never stated goes to its own declared column —
 * it is NOT dropped. The previous `if (key) cols[key].push(step)` silently
 * discarded every such row, and the source leaves the chamber blank on 234,321
 * events (19.9%, almost all Senate). A reader was shown a timeline missing a
 * fifth of its steps with nothing to indicate the omission.
 *
 * Naming the column for what is true — "chamber not stated" — keeps the step
 * visible without inventing a placement the source does not support.
 */
function bucketByChamber(
  steps: readonly ParliamentBillTimelineStep[],
): Record<ColumnKey, ParliamentBillTimelineStep[]> {
  const cols: Record<ColumnKey, ParliamentBillTimelineStep[]> = {
    camera: [],
    senat: [],
    final: [],
    unstated: [],
  }
  for (const step of steps.filter(isProceduralStep)) {
    const key = step.chamberCode ? COLUMN_BY_CHAMBER_CODE[step.chamberCode] : undefined
    cols[key ?? 'unstated'].push(step)
  }
  return cols
}

// ── routine vs milestone grouping within a column ─────────────────────────────

/**
 * Routine clusters that collapse under an "avize & termene" disclosure.
 *
 * This is a DISPLAY preference, not a claim about the data — which is why it is
 * still a keyword test. What used to be conflated with it, and is now decided by
 * the source instead, is whether a row is a procedural step at all: see
 * `rowKind`, which the server derives structurally.
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

/**
 * Keep only the rows the SOURCE printed as procedural events.
 *
 * cdep.ro emits a `<tr>` per attached document and per committee anchor as well
 * as per step — 7 procedural rows for bill 23135 against 12 captured rows, and
 * 276,251 attachment rows across the corpus (34.7% cdep / 15.1% senat). Showing
 * them as peers reads as procedural events that never happened.
 *
 * An attachment is NOT lost: its documents and its committee/vote/stenogram
 * links are already carried on the parent step by the server (206,130 such
 * edges on prod). A row the derive has not classified (`rowKind` absent) is kept
 * as a step — the failure direction must be an extra visible row, never a hidden
 * one.
 */
function isProceduralStep(step: ParliamentBillTimelineStep): boolean {
  return step.rowKind !== 'attachment'
}

/**
 * Route a step's vote to the chamber it was actually held in.
 *
 * This used to be hardcoded to 'camera'. Today that is wrong for only the four
 * joint-sitting (`comun`) divisions reachable this way, because the underlying
 * `voteIdv` column is cdep-only — but the vote key itself carries the namespace,
 * and the Senate anchors now being resolved (6,221 divisions under `senat:`)
 * would all route to the wrong chamber under a hardcode.
 */
function chamberOfVoteKey(voteKey: string): 'camera' | 'senat' {
  return voteKey.startsWith('senat:') ? 'senat' : 'camera'
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

/**
 * The bodies a step touched, linked into the platform where we can resolve them.
 *
 * Every one of these comes from an anchor the chamber ITSELF printed on the
 * procedure table — never from matching a name. That distinction is the reason
 * the chips are trustworthy: the free-text committee column yields 4,147
 * distinct strings for 499 real committees (1.9% exact match), while the anchor
 * resolves at 99.88%.
 *
 * An unresolved link still renders, as plain text with its official source
 * link. `unresolved_registry` is not a gap in the record — the body is real and
 * we simply do not hold it (the Senate committee registry covers 33 of the 183
 * GUIDs the source cites, and plenary agenda days have no registry at all) — so
 * saying nothing would be less honest than showing the name without a route.
 */
function StepLinks({ step }: { readonly step: ParliamentBillTimelineStep }) {
  if (step.links.length === 0) return null

  const committees = step.links.filter((l) => l.linkKind === 'committee')
  const stenograms = step.links.filter(
    (l) => l.linkKind === 'stenogram' && l.resolutionStatus === 'linked',
  )
  const votes = step.links.filter(
    (l) => l.linkKind === 'vote' && l.resolutionStatus === 'linked',
  )
  if (committees.length === 0 && stenograms.length === 0 && votes.length === 0) {
    return null
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {committees.map((link) =>
        link.targetKey ? (
          <Link
            key={link.sourceHref}
            to="/parlament/comisii/$committeeKey"
            params={{ committeeKey: link.targetKey }}
            className="inline-flex max-w-full items-center rounded-sm border border-[#b1b4b6] bg-white px-2 py-0.5 text-xs font-semibold text-[#1d70b8] hover:bg-[#f3f2f1] dark:bg-transparent"
          >
            <span className="truncate">{link.sourceText ?? 'Comisie'}</span>
          </Link>
        ) : (
          <a
            key={link.sourceHref}
            href={link.sourceHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Comisia este publicată de sursă, dar nu figurează în registrul nostru"
            className="inline-flex max-w-full items-center rounded-sm border border-dashed border-[#b1b4b6] px-2 py-0.5 text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]"
          >
            <span className="truncate">{link.sourceText ?? 'Comisie'}</span>
          </a>
        ),
      )}
      {votes.map((link) => (
        <Link
          key={link.sourceHref}
          to="/parlament/voturi/$chamber/$voteId"
          params={{
            chamber: chamberOfVoteKey(link.targetKey ?? ''),
            voteId: link.targetKey ?? '',
          }}
          className="inline-flex items-center rounded-sm border border-[#1d70b8] px-2 py-0.5 text-xs font-semibold text-[#1d70b8] hover:bg-[#f0f6fb]"
        >
          Votul
        </Link>
      ))}
      {stenograms.map((link) => (
        <Link
          key={link.sourceHref}
          // The SITTING transcript, not a single speech: /stenograme/$speechKey
          // is a different surface and a session key there resolves to nothing.
          to="/parlament/stenograme/sedinte/$sessionKey"
          params={{ sessionKey: link.targetKey ?? '' }}
          className="inline-flex items-center rounded-sm border border-[#512178] px-2 py-0.5 text-xs font-semibold text-[#512178] hover:bg-[#f6f2f9]"
        >
          Dezbaterea
        </Link>
      ))}
    </div>
  )
}

/** Which chamber's official record a set of steps came from. */
function sourceRecordLabel(sourceBillKey: string): string {
  return sourceBillKey.startsWith('senat:')
    ? 'Fișa Senatului'
    : 'Fișa Camerei Deputaților'
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
              params={{ chamber: chamberOfVoteKey(step.voteId), voteId: step.voteId }}
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

/** Law + headline-vote summary (the key result), above the columns. */
function OutcomeSummary({ bill }: { readonly bill: ParliamentBillDetail }) {
  // Prefer a vote the SOURCE marks as final (`bill_vote_links.role`); otherwise
  // fall back to the most recent related vote and LABEL IT AS SUCH. Calling the
  // newest vote "Vot final" was a claim the data never made — an amendment or a
  // procedural division is routinely the latest one.
  const roleFinalVote = bill.relatedVotes.find(isFinalBillVote)
  const headlineVote = roleFinalVote ?? bill.relatedVotes[0]
  const isProvenFinal = roleFinalVote !== undefined
  if (!bill.lawMilestone && !headlineVote) return null
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
      {headlineVote ? (
        <Link
          to="/parlament/voturi/$chamber/$voteId"
          params={{ chamber: headlineVote.chamber, voteId: headlineVote.voteId }}
          className="group flex items-start justify-between gap-3 border-2 border-[#1d70b8] bg-[#f0f6fb] p-4 transition-colors hover:bg-[#e3eef8] dark:bg-[var(--pnrr-bg)]"
        >
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#1d70b8]">
              {isProvenFinal ? 'Vot final' : 'Cel mai recent vot asociat'}
            </p>
            <p className="mt-1 truncate text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {formatVoteDayLong(headlineVote.heldAt)}
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
/**
 * Split the merged timeline back into the official records it was assembled
 * from, canonical view first (the order `dossierBillIds` already carries).
 * A single-view bill yields exactly one lane and renders as before.
 */
function groupByDossier(
  bill: ParliamentBillDetail,
): { sourceBillKey: string; columns: Record<ColumnKey, ParliamentBillTimelineStep[]> }[] {
  const order = bill.dossierBillIds.length > 0 ? bill.dossierBillIds : [bill.billId]
  const byKey = new Map<string, ParliamentBillTimelineStep[]>()
  for (const step of bill.timeline) {
    const key = step.sourceBillKey ?? order[0] ?? bill.billId
    const bucket = byKey.get(key)
    if (bucket) bucket.push(step)
    else byKey.set(key, [step])
  }
  const keys = [
    ...order.filter((k) => byKey.has(k)),
    ...[...byKey.keys()].filter((k) => !order.includes(k)),
  ]
  return keys
    .map((sourceBillKey) => ({
      sourceBillKey,
      columns: bucketByChamber(byKey.get(sourceBillKey) ?? []),
    }))
    .filter((lane) => COLUMN_ORDER.some((k) => lane.columns[k].length > 0))
}

export function BillPassageTracker({ bill }: Props) {
  // A bicameral bill is TWO official records, not one sequence: each chamber
  // keeps its own fișă and each mirrors much of the other's procedure. Measured
  // on prod, 19,031 of 19,068 merged dossiers carry steps dated the same day in
  // both, and the mirroring lands in the SAME chamber column — so a flat merged
  // reading shows the reader the same act twice with nothing to explain it.
  //
  // We do NOT deduplicate: both entries are genuine official records, and the
  // near-duplicates ("respinsă de către Senat" vs "respins de Senat") do not
  // match exactly anyway, so suppression would be a judgement on fuzzy evidence.
  // Grouping by the record instead makes the duplication structurally impossible
  // to misread — each lane is one chamber's own account, internally coherent.
  const lanes = groupByDossier(bill)

  return (
    <div className="space-y-6">
      <OutcomeSummary bill={bill} />

      <h2 className={billDetailSectionTitleClassName}>Parcurs legislativ</h2>

      {lanes.length > 1 ? (
        <p className="max-w-4xl text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Fiecare Cameră ține propria fișă a aceluiași proiect, iar cele două
          consemnează în bună parte aceleași momente. Le arătăm separat, așa cum
          au fost publicate: nu am eliminat suprapunerile, pentru că ambele sunt
          înregistrări oficiale.
        </p>
      ) : null}

      {lanes.length === 0 ? (
        <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Nu există etape procedurale înregistrate pentru acest proiect.
        </p>
      ) : (
        lanes.map((lane) => (
          <section key={lane.sourceBillKey} className="space-y-4">
            {lanes.length > 1 ? (
              <h3 className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                {sourceRecordLabel(lane.sourceBillKey)}
              </h3>
            ) : null}
            <div className="grid gap-6 xl:grid-cols-3">
              {COLUMN_ORDER.filter(
                // The three chamber columns always render (an empty one is itself
                // a fact: "did not go through this stage"). The unstated column is
                // only meaningful when it holds something.
                (key) => key !== 'unstated' || lane.columns.unstated.length > 0,
              ).map((key) => (
                <PassageColumn key={key} columnKey={key} steps={lane.columns[key]} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
