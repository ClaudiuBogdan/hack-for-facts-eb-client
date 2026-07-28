import type { ParliamentBillTimelineStep } from '@/schemas/parliament'

/**
 * The three readings of a bill's procedure.
 *
 * They differ in what they let the reader compare, not in what they contain —
 * every view draws on the same steps, so switching never hides an event.
 *
 * - `fise` — one lane per official record. A bicameral bill is TWO dossiers and
 *   each mirrors much of the other; this is the only view where the reader can
 *   tell whose account a row is without reading a chip.
 * - `camere` — the classic three columns (Camera · Senat · Parlament), with both
 *   records merged into them. Shortest path to "where is it now".
 * - `cronologic` — one line, in time order, chambers interleaved. The only view
 *   that answers "what happened next", which the column views cannot: a column
 *   is a place, not a moment.
 */
export const BILL_STAGES_VIEWS = ['cronologic', 'camere', 'fise'] as const
export type BillStagesView = (typeof BILL_STAGES_VIEWS)[number]

/**
 * The rail leads, and is what an unparameterised link shows.
 *
 * It is the only view that answers "what happened, and then what" — and it is
 * also the one that survives the duplication best: where the columns print the
 * two chambers' near-identical entries in the same box with nothing to separate
 * them, the rail lands them on the same day and names the record that diverges.
 */
export const DEFAULT_BILL_STAGES_VIEW: BillStagesView = 'cronologic'

/** Short enough to read at a glance; the hint below carries the precision. */
export const BILL_STAGES_VIEW_LABELS: Readonly<Record<BillStagesView, string>> =
  {
    cronologic: 'Cronologic',
    camere: 'Camere unificate',
    fise: 'Camere separate',
  }

export const BILL_STAGES_VIEW_HINTS: Readonly<Record<BillStagesView, string>> = {
  cronologic:
    'Toate etapele pe o singură linie, de la cea mai recentă spre început, indiferent de Cameră.',
  camere:
    'Ambele fișe, turnate în aceleași trei coloane. Momentele consemnate de amândouă apar de două ori.',
  fise: 'Fiecare Cameră își ține propria fișă. Le arătăm separat, așa cum au fost publicate.',
}

export type BillStagesSearch = {
  readonly vedere?: BillStagesView
}

/**
 * Read the view out of the URL — the app's shareable-state contract, so a link
 * to this page carries the reading its author chose.
 *
 * Tolerant by design: a hand-edited or stale param falls back to the default
 * rather than throwing a page away.
 */
export function parseBillStagesSearch(
  search: Record<string, unknown>,
): BillStagesSearch {
  const vedere = search.vedere
  return typeof vedere === 'string' &&
    (BILL_STAGES_VIEWS as readonly string[]).includes(vedere)
    ? { vedere: vedere as BillStagesView }
    : {}
}

/**
 * Keep only the rows the SOURCE printed as procedural events.
 *
 * cdep.ro emits a `<tr>` per attached document and per committee anchor as well
 * as per step — 276,251 attachment rows across the corpus. Their documents and
 * links are already carried on the parent step, so nothing is lost.
 *
 * A row the derive has not classified (`rowKind` absent) is kept: the failure
 * direction must be an extra visible row, never a hidden one.
 */
export function isProceduralStep(step: ParliamentBillTimelineStep): boolean {
  return step.rowKind !== 'attachment'
}

// ── chamber bucketing (driven by the REAL chamberCode — no string heuristic) ──

export type BillStageColumnKey = 'camera' | 'senat' | 'final' | 'unstated'

const COLUMN_BY_CHAMBER_CODE: Readonly<Record<string, BillStageColumnKey>> = {
  CD: 'camera',
  SE: 'senat',
  PA: 'final',
}

export const BILL_STAGE_COLUMN_ORDER: readonly BillStageColumnKey[] = [
  'camera',
  'senat',
  'final',
  'unstated',
]

/**
 * Which column a step belongs to, from the chamber the SOURCE stated.
 *
 * A step whose chamber was never stated goes to its own declared bucket — it is
 * NOT dropped. The source leaves the chamber blank on 131,383 procedural steps,
 * and a reader shown a tracker silently missing them would have no way to know.
 */
export function billStageColumnOf(
  step: ParliamentBillTimelineStep,
): BillStageColumnKey {
  const key = step.chamberCode
    ? COLUMN_BY_CHAMBER_CODE[step.chamberCode]
    : undefined
  return key ?? 'unstated'
}

/** Group the position-ordered steps into chamber columns. */
export function bucketByChamber(
  steps: readonly ParliamentBillTimelineStep[],
): Record<BillStageColumnKey, ParliamentBillTimelineStep[]> {
  const columns: Record<BillStageColumnKey, ParliamentBillTimelineStep[]> = {
    camera: [],
    senat: [],
    final: [],
    unstated: [],
  }
  for (const step of steps.filter(isProceduralStep)) {
    columns[billStageColumnOf(step)].push(step)
  }
  return columns
}

/**
 * Split the merged timeline back into the official records it was assembled
 * from, canonical view first (the order `dossierBillIds` already carries).
 * A single-view bill yields exactly one lane.
 */
export function groupByRecord(
  steps: readonly ParliamentBillTimelineStep[],
  recordOrder: readonly string[],
  fallbackKey: string,
): {
  sourceBillKey: string
  columns: Record<BillStageColumnKey, ParliamentBillTimelineStep[]>
}[] {
  const order = recordOrder.length > 0 ? recordOrder : [fallbackKey]
  const byKey = new Map<string, ParliamentBillTimelineStep[]>()
  for (const step of steps) {
    const key = step.sourceBillKey ?? order[0] ?? fallbackKey
    const bucket = byKey.get(key)
    if (bucket) bucket.push(step)
    else byKey.set(key, [step])
  }
  // Deduped: a repeated entry in `recordOrder` would otherwise render the same
  // lane twice, under a duplicate React key. Any record that carries steps but
  // is absent from `order` still gets a lane — the reader sees every account we
  // hold, never only the ones the dossier list happened to name.
  const keys = [
    ...new Set([
      ...order.filter((key) => byKey.has(key)),
      ...[...byKey.keys()].filter((key) => !order.includes(key)),
    ]),
  ]
  return keys
    .map((sourceBillKey) => ({
      sourceBillKey,
      columns: bucketByChamber(byKey.get(sourceBillKey) ?? []),
    }))
    .filter((lane) =>
      BILL_STAGE_COLUMN_ORDER.some((key) => lane.columns[key].length > 0),
    )
}

/** Which chamber's official record a set of steps came from. */
export function sourceRecordLabel(sourceBillKey: string): string {
  return sourceBillKey.startsWith('senat:')
    ? 'Fișa Senatului'
    : 'Fișa Camerei Deputaților'
}

/** Genitive form, to read as "din fișa Senatului" in the chronological view. */
export function sourceRecordShortLabel(sourceBillKey: string): string {
  return sourceBillKey.startsWith('senat:')
    ? 'Senatului'
    : 'Camerei Deputaților'
}

/** Which chamber keeps a given record. */
function recordChamber(sourceBillKey: string): BillStageColumnKey {
  return sourceBillKey.startsWith('senat:') ? 'senat' : 'camera'
}

/**
 * Whether naming the record a step came from adds anything.
 *
 * On a merged dossier the chamber mark and the record usually agree — a Senate
 * step in the Senate's own fișă — and repeating it on every card would be noise
 * the reader learns to skip. It is worth saying exactly when they DIVERGE: the
 * Chamber's fișă records "înaintat la Senat" under chamber SE, and the two
 * records of the same rejection sit side by side on 24 June. Naming the record
 * only there is what tells those two apart.
 */
export function shouldNameRecord(
  step: ParliamentBillTimelineStep,
  isMergedDossier: boolean,
): boolean {
  if (!isMergedDossier || !step.sourceBillKey) return false
  return billStageColumnOf(step) !== recordChamber(step.sourceBillKey)
}

/**
 * Romanian puts "de" between a numeral and its noun when the last two digits
 * fall outside 1–19: "3 zile" but "98 de zile"; "101 zile" but "120 de zile".
 */
export function romanianNeedsDe(count: number): boolean {
  const lastTwo = Math.abs(Math.trunc(count)) % 100
  return lastTwo === 0 || lastTwo > 19
}

// ── chronology ────────────────────────────────────────────────────────────────

/**
 * One block on the vertical rail: either a day the source dated, or a run of
 * steps it left undated, bounded by the dates around them.
 */
export type ChronologyEntry =
  | {
      readonly kind: 'day'
      readonly key: string
      readonly date: string
      readonly steps: readonly ParliamentBillTimelineStep[]
    }
  | {
      readonly kind: 'undated'
      readonly key: string
      /** The record proves the steps happened at or after this date. */
      readonly after?: string
      /** …and at or before this one. Absent when nothing dated follows them. */
      readonly before?: string
      readonly steps: readonly ParliamentBillTimelineStep[]
    }

type AnchoredStep = {
  readonly step: ParliamentBillTimelineStep
  readonly recordIndex: number
  /** Sort key: the earliest date this step can have. '' when nothing precedes it. */
  readonly bound: string
  readonly after?: string
  readonly before?: string
}

/**
 * Merge every record's steps into one time-ordered rail.
 *
 * ## Why undated steps are placed rather than dropped
 *
 * 85,497 of 903,931 procedural steps carry no date (9.5%), and they are not
 * spread thin: **20,751 of 41,962 bills — half the corpus — have at least one**.
 * They are also overwhelmingly one chamber's habit (24.2% of Camera steps
 * against 0.2% of Senate ones), so dropping them would quietly delete a quarter
 * of the Chamber's procedure from a view that claims to be complete.
 *
 * Their place is not guesswork. A record's `position` order IS the chamber's own
 * sequence, so an undated step between two dated ones happened between those
 * dates — and 75,728 of the 85,497 (88.6%) are bracketed on both sides. We sort
 * them by that lower bound and print the interval instead of a date. Only 7 rows
 * corpus-wide have no earlier dated step at all.
 *
 * ## Why sorting by date is safe here
 *
 * The mapper deliberately keeps `position` order, on the reasoning that deadline
 * dates ("termen adoptare") would jumble the procedure. Measured, that fear does
 * not materialise inside a single record: of 776,491 consecutive dated pairs,
 * **3 run backwards, across 2 bills**. Date order and the source's own order
 * agree. The reordering this view actually performs is the interleaving of the
 * two chambers, which is the whole point of it.
 */
export function buildChronology(
  steps: readonly ParliamentBillTimelineStep[],
  recordOrder: readonly string[],
): ChronologyEntry[] {
  const anchored = anchorSteps(steps, recordOrder)
  return foldEntries(anchored)
}

function anchorSteps(
  steps: readonly ParliamentBillTimelineStep[],
  recordOrder: readonly string[],
): AnchoredStep[] {
  const byRecord = new Map<string, ParliamentBillTimelineStep[]>()
  for (const step of steps.filter(isProceduralStep)) {
    const key = step.sourceBillKey ?? ''
    const bucket = byRecord.get(key)
    if (bucket) bucket.push(step)
    else byRecord.set(key, [step])
  }

  const anchored: AnchoredStep[] = []
  for (const [recordKey, recordSteps] of byRecord) {
    const known = recordOrder.indexOf(recordKey)
    // A record the dossier list never named still sorts deterministically,
    // after the ones it did — it must not collide with index 0.
    const recordIndex = known >= 0 ? known : recordOrder.length
    const ordered = [...recordSteps].sort((a, b) => a.position - b.position)

    // Nearest dated step at or before / at or after each row, in the record's
    // own sequence. These two passes are what turn "no date" into an interval.
    const previous: (string | undefined)[] = []
    let seen: string | undefined
    for (const step of ordered) {
      previous.push(seen)
      if (step.date) seen = step.date
    }
    const following: (string | undefined)[] = new Array<string | undefined>(
      ordered.length,
    )
    let upcoming: string | undefined
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      following[i] = upcoming
      const date = ordered[i]?.date
      if (date) upcoming = date
    }

    ordered.forEach((step, index) => {
      if (step.date) {
        anchored.push({ step, recordIndex, bound: step.date })
        return
      }
      const after = previous[index]
      const before = following[index]
      anchored.push({
        step,
        recordIndex,
        bound: after ?? '',
        ...(after ? { after } : {}),
        ...(before ? { before } : {}),
      })
    })
  }

  return anchored.sort((a, b) => {
    if (a.bound !== b.bound) return a.bound < b.bound ? -1 : 1
    // A step known only to be *after* date D belongs below the steps dated D.
    const aUndated = a.step.date ? 0 : 1
    const bUndated = b.step.date ? 0 : 1
    if (aUndated !== bUndated) return aUndated - bUndated
    if (a.recordIndex !== b.recordIndex) return a.recordIndex - b.recordIndex
    return a.step.position - b.step.position
  })
}

/** Mutable while folding; the exported shape is readonly. */
type DraftEntry = {
  kind: 'day' | 'undated'
  key: string
  date?: string
  after?: string
  before?: string
  steps: ParliamentBillTimelineStep[]
}

function foldEntries(anchored: readonly AnchoredStep[]): ChronologyEntry[] {
  const drafts: DraftEntry[] = []
  for (const item of anchored) {
    const last = drafts[drafts.length - 1]
    if (item.step.date) {
      if (last && last.kind === 'day' && last.date === item.step.date) {
        last.steps.push(item.step)
        continue
      }
      drafts.push({
        kind: 'day',
        // stepId is unique per record+position, so no two entries can collide.
        key: `day-${item.step.stepId}`,
        date: item.step.date,
        steps: [item.step],
      })
      continue
    }
    if (
      last &&
      last.kind === 'undated' &&
      last.after === item.after &&
      last.before === item.before
    ) {
      last.steps.push(item.step)
      continue
    }
    drafts.push({
      kind: 'undated',
      key: `undated-${item.step.stepId}`,
      ...(item.after ? { after: item.after } : {}),
      ...(item.before ? { before: item.before } : {}),
      steps: [item.step],
    })
  }

  return drafts.map((draft) =>
    draft.kind === 'day'
      ? {
          kind: 'day' as const,
          key: draft.key,
          date: draft.date ?? '',
          steps: draft.steps,
        }
      : {
          kind: 'undated' as const,
          key: draft.key,
          ...(draft.after ? { after: draft.after } : {}),
          ...(draft.before ? { before: draft.before } : {}),
          steps: draft.steps,
        },
  )
}

/** How many days the rail spans, or undefined when fewer than two are dated. */
export function chronologySpanDays(
  entries: readonly ChronologyEntry[],
): number | undefined {
  const days = entries.filter(
    (entry): entry is Extract<ChronologyEntry, { kind: 'day' }> =>
      entry.kind === 'day',
  )
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) return undefined
  const ms = Date.parse(last.date) - Date.parse(first.date)
  return Number.isFinite(ms) ? Math.round(ms / 86_400_000) : undefined
}
