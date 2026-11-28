import { t } from '@lingui/core/macro'
import { legalEventKindLabel } from './legal-vocabulary'
import type { LegalActStatus, LegalEventKind, LegalRecentChange } from '@/schemas/legal'

/**
 * The Modificări page's model (owner, 27–28 November 2026; spec
 * docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md, prototype
 * `/development/legal/changes`): which event kinds are changes to existing acts and which are new laws, the verbs
 * the blocks say, and the grouping of feed rows into one block per act that makes the change.
 */

/** Changes to existing acts — the default tab. */
export const CHANGE_KINDS: readonly LegalEventKind[] = [
  'abrogare-totala',
  'abrogare-partiala',
  'modificare',
  'completare',
  'suspendare',
  'incetare-suspendare',
  'republicare',
  'rectificare',
  'iesire-din-vigoare',
]

/** New laws and approved ordinances — their own tab. */
export const NEW_LAW_KINDS: readonly LegalEventKind[] = ['promulgare', 'aprobare-oug', 'aprobare-og']

/** The chosen kinds inside the tab's own, or the tab's own when none of the chosen belongs to it — never empty. */
export function narrowKinds(tabKinds: readonly LegalEventKind[], chosen: readonly string[]): readonly LegalEventKind[] {
  const inside = tabKinds.filter((kind) => chosen.includes(kind))
  return inside.length > 0 ? inside : tabKinds
}

export type ChangeSource = NonNullable<LegalRecentChange['sourceAct']>

export type ChangeLine = {
  readonly actId: string
  readonly displayCitation: string
  readonly status: LegalActStatus
  readonly kinds: readonly string[]
}

export type ChangeBlock = {
  readonly key: string
  readonly date: string | null
  readonly source: ChangeSource | null
  /** Set only when there is no changing act: the block is the events of this kind on this date. */
  readonly kind: string | null
  readonly lines: readonly ChangeLine[]
}

type MutableBlock = { key: string; date: string | null; source: ChangeSource | null; kind: string | null; lines: Array<{ actId: string; displayCitation: string; status: LegalActStatus; kinds: string[] }> }

/**
 * One block per (changing act, date) — or per (kind, date) when no changing act is recorded — built from every row
 * loaded so far, in the order a key first appears. A group's rows are not always adjacent in the feed (ordered by
 * event id within a date) and may continue on the next page, so grouping never relies on adjacency.
 */
export function groupChanges(rows: readonly LegalRecentChange[]): readonly ChangeBlock[] {
  const blocks = new Map<string, MutableBlock>()
  for (const row of rows) {
    const date = row.effectiveDate
    const key = row.sourceAct !== null ? `s:${row.sourceAct.actId}|${date ?? 'none'}` : `k:${row.eventKind}|${date ?? 'none'}`
    let block = blocks.get(key)
    if (block === undefined) {
      block = { key, date, source: row.sourceAct, kind: row.sourceAct === null ? row.eventKind : null, lines: [] }
      blocks.set(key, block)
    }
    const line = block.lines.find((l) => l.actId === row.actId)
    if (line === undefined) block.lines.push({ actId: row.actId, displayCitation: row.displayCitation, status: row.status, kinds: [row.eventKind] })
    else if (!line.kinds.includes(row.eventKind)) line.kinds.push(row.eventKind)
  }
  return [...blocks.values()]
}

/** What the changing act does to the changed act, as a verb. */
export function kindVerb(kind: string): string {
  switch (kind) {
    case 'abrogare-totala':
      return t`abrogă`
    case 'abrogare-partiala':
      return t`abrogă parțial`
    case 'modificare':
      return t`modifică`
    case 'completare':
      return t`completează`
    case 'suspendare':
      return t`suspendă`
    case 'incetare-suspendare':
      return t`încetează suspendarea`
    case 'republicare':
      return t`republică`
    case 'rectificare':
      return t`rectifică`
    case 'iesire-din-vigoare':
      return t`scoate din vigoare`
    default:
      return legalEventKindLabel(kind)
  }
}

/** „modifică", „modifică și completează", „modifică, completează și abrogă". */
export function joinVerbs(kinds: readonly string[]): string {
  const verbs = kinds.map(kindVerb)
  if (verbs.length <= 1) return verbs[0] ?? ''
  const last = verbs[verbs.length - 1]
  const head = verbs.slice(0, -1).join(', ')
  return t`${head} și ${last}`
}

/** The head of a block with no changing act. */
export function sourcelessHead(kind: string): string {
  if (kind === 'republicare') return t`Republicări`
  if (kind === 'rectificare') return t`Rectificări`
  const label = legalEventKindLabel(kind)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
