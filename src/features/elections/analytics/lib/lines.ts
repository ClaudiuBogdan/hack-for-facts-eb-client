import { t } from '@lingui/core/macro'
import type { ElectionAllocationPhase } from '@/schemas/elections-catalog'
import type { ElectionResultTally } from '@/schemas/elections-results'

/**
 * Party lines (owner, 2026-11-28; `docs/design/elections/pages.md`): a party
 * by its actor key, the two alliances by their ballot label once normalised
 * (lists carry no actor key), the independents as one line by kind with the
 * label dropped, everything else „Alte partide". Transparenta.eu's grouping,
 * said in the page's notes.
 */

const FAMILIES = {
  psd: ['partidul-social-democrat', 'alianta-politica-partidul-social-democrat-partidul-conservator'],
  pnl: ['partidul-national-liberal'],
  pdl: ['partidul-democrat-liberal'],
  usr: ['uniunea-salvati-romania', 'alianta-usr-plus'],
  udmr: ['uniunea-democrata-maghiara-din-romania'],
  aur: ['alianta-pentru-unirea-romanilor'],
  pmp: ['partidul-miscarea-populara'],
  alde: ['partidul-alianta-liberalilor-si-democratilor', 'partidul-alianta-liberalilor-si-democratilor-alde'],
  pro: ['partidul-pro-romania'],
  prm: ['partidul-romania-mare'],
  adu: ['alianta-dreapta-unita-usr-pmp-forta-dreptei'],
  psdpnl: ['alianta-electorala-psd-pnl'],
} as const

export type Line = keyof typeof FAMILIES | 'ind' | 'other'

const LINE_OF_ACTOR = new Map<string, Line>(Object.entries(FAMILIES).flatMap(([line, keys]) => keys.map((key) => [key, line as Line] as const)))

/** The two alliances drawn as their own lines, by their normalised ballot label. */
const LIST_LINES: Readonly<Record<string, Line>> = {
  'ALIANTA DREAPTA UNITA USR PMP FORTA DREPTEI': 'adu',
  'ALIANTA ELECTORALA PSD PNL': 'psdpnl',
}

export function normaliseLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/** The line a competitor is drawn on. An independent's label and key (a person's name) never leave this function. */
export function lineOfCompetitor(competitor: ElectionResultTally['competitor']): Line {
  if (competitor.kind === 'independent' || competitor.kind === 'independents_bucket') return 'ind'
  if (competitor.actorKey) return LINE_OF_ACTOR.get(competitor.actorKey) ?? 'other'
  if (competitor.kind === 'list') return LIST_LINES[normaliseLabel(competitor.label)] ?? 'other'
  return 'other'
}

export type LineCount = { readonly line: Line; readonly value: number; readonly suspect: boolean }

/** Lines by size, then the independents, then „Alte partide"; a line with nothing dropped. */
export function ordered(rows: readonly LineCount[]): readonly LineCount[] {
  const rank = (line: Line) => (line === 'other' ? 2 : line === 'ind' ? 1 : 0)
  return rows.filter((row) => row.value > 0).sort((a, b) => rank(a.line) - rank(b.line) || b.value - a.value)
}

/**
 * One measure and one allocation phase folded into lines: the counts summed,
 * a SUSPECT member marking its line. `null` when the place has no such rows:
 * missing, never zero. Phases are never summed with each other.
 */
export function foldLines(tallies: readonly ElectionResultTally[], measure: string, phase: ElectionAllocationPhase): readonly LineCount[] | null {
  const rows = tallies.filter((tally) => tally.measure === measure && tally.allocationPhase === phase)
  if (rows.length === 0) return null
  const lines = new Map<Line, { value: number; suspect: boolean }>()
  for (const tally of rows) {
    const line = lineOfCompetitor(tally.competitor)
    const was = lines.get(line) ?? { value: 0, suspect: false }
    lines.set(line, { value: was.value + Number(tally.value), suspect: was.suspect || tally.status === 'SUSPECT' })
  }
  return ordered([...lines].map(([line, { value, suspect }]) => ({ line, value, suspect })))
}

export const total = (rows: readonly LineCount[] | null): number => (rows ?? []).reduce((sum, row) => sum + row.value, 0)

/** The line with the most, among named lines: `null` without figures, `'tie'` when two share the most. */
export function leaderOf(rows: readonly LineCount[] | null): LineCount | 'tie' | null {
  const named = (rows ?? []).filter((row) => row.line !== 'other')
  const top = named.reduce<LineCount | null>((best, row) => (best === null || row.value > best.value ? row : best), null)
  if (!top) return null
  return named.filter((row) => row.value === top.value).length > 1 ? 'tie' : top
}

export interface LineStyle {
  readonly label: string
  readonly fill: string
  readonly swatch: string
}

/** The parties' short names, as they are known: not translated. */
const SHORT_NAMES: Readonly<Record<Exclude<Line, 'ind' | 'other'>, string>> = {
  psd: 'PSD',
  pnl: 'PNL',
  pdl: 'PDL',
  usr: 'USR',
  udmr: 'UDMR',
  aur: 'AUR',
  pmp: 'PMP',
  alde: 'ALDE',
  pro: 'PRO România',
  prm: 'PRM',
  adu: 'ADU',
  psdpnl: 'PSD + PNL',
}

/**
 * Colours near each party's own (Transparenta.eu's choice, always beside the
 * name). Written out in full so Tailwind sees every class.
 */
const CLASSES: Readonly<Record<Line, readonly [string, string]>> = {
  psd: ['fill-[#d7262e]', 'bg-[#d7262e]'],
  pnl: ['fill-[#f2c11b]', 'bg-[#f2c11b]'],
  pdl: ['fill-[#e8751a]', 'bg-[#e8751a]'],
  usr: ['fill-[#1e64c8]', 'bg-[#1e64c8]'],
  udmr: ['fill-[#2f8f46]', 'bg-[#2f8f46]'],
  aur: ['fill-[#8c6a1c]', 'bg-[#8c6a1c]'],
  pmp: ['fill-[#7fc3e8]', 'bg-[#7fc3e8]'],
  alde: ['fill-[#4b5fa8]', 'bg-[#4b5fa8]'],
  pro: ['fill-[#7b3fa0]', 'bg-[#7b3fa0]'],
  prm: ['fill-[#3a3a5c]', 'bg-[#3a3a5c]'],
  adu: ['fill-[#5b9be6]', 'bg-[#5b9be6]'],
  psdpnl: ['fill-[#ec8a2f]', 'bg-[#ec8a2f]'],
  ind: ['fill-[#57534e]', 'bg-[#57534e]'],
  other: ['fill-[#a8a29e]', 'bg-[#a8a29e]'],
}

export function lineLabel(line: Line): string {
  if (line === 'ind') return t`Independenți`
  if (line === 'other') return t`Alte partide`
  return SHORT_NAMES[line]
}

export function lineStyle(line: Line): LineStyle {
  const [fill, swatch] = CLASSES[line]
  return { label: lineLabel(line), fill, swatch }
}

/** Text that reads on the line's swatch. */
export const onSwatch = (line: Line) => (line === 'pnl' || line === 'pmp' ? 'text-foreground' : 'text-white')
