import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { HomeParty, RecentRecord } from './home-model'

/**
 * What the state buys, in a reader's words. CPV divisions are too coarse to
 * say where money goes („Lucrări de construcții" is two thirds of 2025's
 * contract value) and too fine elsewhere, so the front door groups CPV codes
 * into categories a reader recognises — roads, buildings, medicines, energy —
 * each a set of CPV prefixes. A code belongs to the category with its longest
 * matching prefix, so a category can take a slice of another's division
 * (`336` medicines out of `33`, `797` guarding out of `79`).
 *
 * The API ranks one CPV level per breakdown, so the leaves come from a few
 * nested breakdowns (`CPV_DRILL`), each refining its parent. Every leaf is in
 * exactly one breakdown, so the categories add up to the population's total.
 */

export interface ReaderCategory {
  readonly key: string
  readonly label: MessageDescriptor
  /** CPV prefixes: a division („45"), a group („336"), a class („4521") or a category („45233"). */
  readonly prefixes: readonly string[]
}

export const READER_CATEGORIES: readonly ReaderCategory[] = [
  { key: 'drumuri', label: msg`Drumuri, poduri și autostrăzi`, prefixes: ['45233', '45221'] },
  { key: 'cai-ferate', label: msg`Căi ferate și metrou`, prefixes: ['45234'] },
  { key: 'retele', label: msg`Apă, canalizare și rețele`, prefixes: ['45231', '45232', '4524'] },
  { key: 'cladiri', label: msg`Construcția și renovarea clădirilor`, prefixes: ['4521', '453', '454'] },
  { key: 'constructii', label: msg`Alte lucrări de construcții`, prefixes: ['45'] },
  { key: 'aparare', label: msg`Apărare și securitate`, prefixes: ['35'] },
  { key: 'medicamente', label: msg`Medicamente`, prefixes: ['336'] },
  { key: 'medical', label: msg`Echipamente și materiale medicale`, prefixes: ['33'] },
  { key: 'energie', label: msg`Energie, gaze și combustibili`, prefixes: ['09', '65'] },
  { key: 'it', label: msg`IT și telecomunicații`, prefixes: ['302', '48', '72', '32', '64'] },
  { key: 'transport', label: msg`Vehicule și transport`, prefixes: ['34', '60', '63'] },
  { key: 'salubrizare', label: msg`Salubrizare și deșeuri`, prefixes: ['90'] },
  { key: 'proiectare', label: msg`Proiectare și inginerie`, prefixes: ['71'] },
  { key: 'consultanta', label: msg`Consultanță și servicii`, prefixes: ['79'] },
  { key: 'paza', label: msg`Pază și curățenie`, prefixes: ['797', '909'] },
  { key: 'intretinere', label: msg`Reparații și întreținere`, prefixes: ['50'] },
  { key: 'hrana', label: msg`Alimente și catering`, prefixes: ['15', '55', '03'] },
  { key: 'birotica', label: msg`Mobilier, birotică și papetărie`, prefixes: ['30', '22', '39'] },
  { key: 'materiale', label: msg`Materiale de construcții`, prefixes: ['44', '14'] },
  { key: 'echipamente', label: msg`Echipamente și utilaje`, prefixes: ['31', '38', '42', '43'] },
  { key: 'sociale', label: msg`Sănătate, social și formare`, prefixes: ['85', '80'] },
]

/** Codes no category claims, and a breakdown's own remainder. */
export const OTHER_CATEGORY: ReaderCategory = { key: 'altele', label: msg`Altele`, prefixes: [] }
/** Records with no CPV at all. */
export const UNKNOWN_CATEGORY: ReaderCategory = { key: 'necunoscut', label: msg`Fără cod CPV`, prefixes: [] }

export type CpvDrillDimension = 'cpvClass' | 'cpvCategory' | 'cpvGroup'

/** The breakdowns that refine a parent prefix into its children. */
export const CPV_DRILL: readonly { readonly key: string; readonly dimension: CpvDrillDimension; readonly parent: string }[] = [
  { key: 'c45', dimension: 'cpvClass', parent: '45' },
  { key: 'k4522', dimension: 'cpvCategory', parent: '4522' },
  { key: 'k4523', dimension: 'cpvCategory', parent: '4523' },
  { key: 'g30', dimension: 'cpvGroup', parent: '30' },
  { key: 'g33', dimension: 'cpvGroup', parent: '33' },
  { key: 'g79', dimension: 'cpvGroup', parent: '79' },
  { key: 'g90', dimension: 'cpvGroup', parent: '90' },
]

export type CpvLevelScope =
  | { readonly cpvDivision: string }
  | { readonly cpvGroup: string }
  | { readonly cpvClass: string }
  | { readonly cpvCategory: string }

/** The analysis scope that selects a CPV prefix, at its level. */
export function cpvScope(prefix: string): CpvLevelScope {
  const code = prefix.padEnd(8, '0')
  switch (prefix.length) {
    case 2:
      return { cpvDivision: prefix }
    case 3:
      return { cpvGroup: code }
    case 4:
      return { cpvClass: code }
    default:
      return { cpvCategory: code }
  }
}

/** The explorer's filter for a CPV prefix, at its level. */
export function cpvSearch(prefix: string): { readonly cpv_division: string } | { readonly cpv_group: string } | { readonly cpv_class: string } | { readonly cpv_category: string } {
  const code = prefix.padEnd(8, '0')
  switch (prefix.length) {
    case 2:
      return { cpv_division: prefix }
    case 3:
      return { cpv_group: code }
    case 4:
      return { cpv_class: code }
    default:
      return { cpv_category: code }
  }
}

/** A CPV code without its trailing zeros: `45233000` → `45233`; a division keeps two digits. */
export function cpvPrefix(code: string): string {
  const digits = code.replace(/\D/g, '')
  const trimmed = digits.replace(/0+$/, '')
  return trimmed.length < 2 ? digits.slice(0, 2) : trimmed
}

export function categoryOfCode(code: string): ReaderCategory {
  let best: { readonly category: ReaderCategory; readonly length: number } | null = null
  for (const category of READER_CATEGORIES) {
    for (const prefix of category.prefixes) {
      if (code.startsWith(prefix) && (!best || prefix.length > best.length)) best = { category, length: prefix.length }
    }
  }
  return best?.category ?? OTHER_CATEGORY
}

export interface CpvBucket {
  readonly key: string | null
  /** `top`, `other` (the rest past the top N) or `unknown` (no code). */
  readonly kind: string
  readonly count: number
  /** Null when the API published no money for the bucket: unknown, never 0. */
  readonly value: number | null
  /** Records with a published value, where the read carries it: a remainder with none left is unknown money, not 0 lei. */
  readonly valued?: number | null
}

export interface CpvLeaf {
  /** The leaf's prefix; empty for a remainder no category can claim. */
  readonly prefix: string
  readonly value: number | null
  readonly count: number
}

/**
 * The leaves of the CPV tree: each division, replaced by its breakdown's
 * children where one refines it, recursively. A refinement's remainder (past
 * its top N, or known only to the parent's level) stays with the parent's
 * prefix; a record with no CPV at all is a leaf of its own.
 */
export function cpvLeaves(
  divisions: readonly CpvBucket[],
  refinements: ReadonlyMap<string, readonly CpvBucket[]>,
): { readonly leaves: readonly CpvLeaf[]; readonly unknown: CpvLeaf | null } {
  const byParent = new Map(CPV_DRILL.map((drill) => [drill.parent, refinements.get(drill.key)]))
  const leaves: CpvLeaf[] = []
  let unknownCount = 0
  let unknownValue: number | null = null
  const visit = (prefix: string, bucket: CpvBucket) => {
    const children = byParent.get(prefix)
    if (!children) {
      leaves.push({ prefix, value: bucket.value, count: bucket.count })
      return
    }
    for (const child of children) {
      if (child.count === 0 && !child.value) continue
      // The rest past the top N, and records known only to the parent's level, stay with the parent.
      if (child.kind === 'top' && child.key) visit(cpvPrefix(child.key), child)
      else leaves.push({ prefix, value: child.value, count: child.count })
    }
  }
  for (const division of divisions) {
    if (division.count === 0 && !division.value) continue
    if (division.kind === 'top' && division.key) visit(cpvPrefix(division.key), division)
    else if (division.kind === 'unknown') {
      unknownCount += division.count
      if (division.value !== null) unknownValue = (unknownValue ?? 0) + division.value
    } else leaves.push({ prefix: '', value: division.value, count: division.count })
  }
  return { leaves, unknown: unknownCount > 0 || (unknownValue !== null && unknownValue !== 0) ? { prefix: '', value: unknownValue, count: unknownCount } : null }
}

/**
 * The leaves from one flat breakdown per CPV level — division, group, class,
 * category — instead of a drilled tree, for one buyer. Each bucket holds the
 * next level's buckets that share its prefix and keeps what they do not: the
 * records coded only at its own level (a works contract filed under 45210000
 * stays with 4521, medicines under 33600000 with 336) and, for a large buyer,
 * the codes past the API's hundred (a little precision lost, no money). A
 * remainder with no records and no money is dropped; one whose records carry
 * no published value (`valued` known and none left) is unknown, never 0 lei.
 */
export function levelCpvLeaves(levels: readonly (readonly CpvBucket[])[]): { readonly leaves: readonly CpvLeaf[]; readonly unknown: CpvLeaf | null } {
  const [divisions = [], ...finer] = levels
  type Node = CpvLeaf & { readonly valued: number | null | undefined }
  const nodeOf = (bucket: CpvBucket & { readonly key: string }): Node => ({ prefix: cpvPrefix(bucket.key), value: bucket.value, count: bucket.count, valued: bucket.valued })
  const named = finer.map((level) => level.flatMap((bucket) => (bucket.kind === 'top' && bucket.key ? [nodeOf({ ...bucket, key: bucket.key })] : [])))
  const leaves: CpvLeaf[] = []
  const leaf = (node: Node): CpvLeaf => ({ prefix: node.prefix, value: node.value, count: node.count })
  const visit = (node: Node, depth: number) => {
    const children = (named[depth] ?? []).filter((child) => child.prefix.length > node.prefix.length && child.prefix.startsWith(node.prefix))
    if (children.length === 0) {
      leaves.push(leaf(node))
      return
    }
    let count = 0
    let value = 0
    let valued: number | null = node.valued ?? null
    for (const child of children) {
      visit(child, depth + 1)
      count += child.count
      value += child.value ?? 0
      valued = valued === null || child.valued === null || child.valued === undefined ? null : valued - child.valued
    }
    const restCount = node.count - count
    // Records left with no published value hold no known money: unknown, never 0 lei.
    const restValue = node.value === null || valued === 0 ? null : node.value - value
    // Rounding in the API's sums can leave a cent: a remainder under a leu with no records is none.
    if (restCount > 0 || (restValue !== null && restValue >= 1)) {
      leaves.push({ prefix: node.prefix, value: restValue === null ? null : Math.max(restValue, 0), count: Math.max(restCount, 0) })
    }
  }
  let unknownCount = 0
  let unknownValue: number | null = null
  for (const division of divisions) {
    if (division.count === 0 && !division.value) continue
    if (division.kind === 'unknown') {
      unknownCount += division.count
      if (division.value !== null) unknownValue = (unknownValue ?? 0) + division.value
    } else if (division.kind === 'top' && division.key) {
      visit(nodeOf({ ...division, key: division.key }), 0)
    } else {
      leaves.push({ prefix: '', value: division.value, count: division.count })
    }
  }
  return { leaves, unknown: unknownCount > 0 || (unknownValue !== null && unknownValue !== 0) ? { prefix: '', value: unknownValue, count: unknownCount } : null }
}

export interface CategoryFigure {
  readonly category: ReaderCategory
  /** Null when none of the category's records carries published money: unknown, never 0. */
  readonly value: number | null
  readonly count: number
  /** Share of the population's known value; null with the value. */
  readonly share: number | null
}

/** Named categories first, largest first, the unvalued after them; „Altele" and no CPV last. */
export function readerCategories(leaves: readonly CpvLeaf[], unknown: CpvLeaf | null): readonly CategoryFigure[] {
  const sums = new Map<string, { readonly category: ReaderCategory; value: number | null; count: number }>()
  const add = (category: ReaderCategory, leaf: CpvLeaf) => {
    const sum = sums.get(category.key) ?? { category, value: null, count: 0 }
    if (leaf.value !== null) sum.value = (sum.value ?? 0) + leaf.value
    sum.count += leaf.count
    sums.set(category.key, sum)
  }
  for (const leaf of leaves) add(leaf.prefix ? categoryOfCode(leaf.prefix) : OTHER_CATEGORY, leaf)
  if (unknown) add(UNKNOWN_CATEGORY, unknown)
  const total = [...sums.values()].reduce((sum, entry) => sum + (entry.value ?? 0), 0)
  const last = (key: string) => (key === OTHER_CATEGORY.key ? 1 : key === UNKNOWN_CATEGORY.key ? 2 : 0)
  return [...sums.values()]
    .filter((entry) => entry.count > 0 || (entry.value !== null && entry.value !== 0))
    .map((entry) => ({
      category: entry.category,
      value: entry.value,
      count: entry.count,
      share: entry.value !== null && total > 0 ? entry.value / total : null,
    }))
    .sort((a, b) => last(a.category.key) - last(b.category.key) || (b.value ?? -Infinity) - (a.value ?? -Infinity))
}

// ────────────────────────────────────────── one contract, all its winners ──

export interface ContractRow {
  readonly id: string
  readonly contractNo: string | null
  readonly date: string | null
  readonly title: string | null
  readonly cpvCode: string | null
  readonly buyer: HomeParty
  readonly supplier: HomeParty
  readonly value: number
}

function partyKey(party: HomeParty): string {
  return party.cui?.trim() || party.name.toLocaleLowerCase('ro-RO').replace(/[^a-z0-9ăâîșşțţ]/g, '')
}

/**
 * SEAP publishes one award row per consortium member, each carrying the
 * whole contract's value — and some awards twice, from two sources. Rows of
 * one contract share its buyer, number and value; grouped, a consortium is
 * one contract with its winners named, and its value is counted once. A row
 * with no contract number stays a contract of its own.
 */
export function groupContracts(rows: readonly ContractRow[], limit = Infinity): readonly RecentRecord[] {
  const groups = new Map<string, ContractRow[]>()
  for (const row of rows) {
    const number = row.contractNo?.trim()
    const key = number ? `${partyKey(row.buyer)}|${number}|${Math.round(row.value)}` : `id:${row.id}`
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return [...groups.values()]
    .map((group): RecentRecord => {
      const lead = group.find((row) => row.title) ?? group[0]!
      const winners = new Map<string, HomeParty>()
      for (const row of group) if (!winners.has(partyKey(row.supplier))) winners.set(partyKey(row.supplier), row.supplier)
      const dates = group.map((row) => row.date).filter((date): date is string => date !== null).sort()
      return {
        id: lead.id,
        grain: 'contract',
        date: dates[0] ?? null,
        title: lead.title,
        cpvCode: lead.cpvCode ?? group.find((row) => row.cpvCode)?.cpvCode ?? null,
        buyer: lead.buyer,
        // SEAP names no leader: the members in name order, so one consortium always reads the same.
        winners: [...winners.values()].sort((a, b) => a.name.localeCompare(b.name, 'ro')),
        value: lead.value,
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/**
 * The contracts a value-sorted page holds whole. A consortium's rows share
 * one value, so when the page was full a contract at the page's last value
 * may have members on the next page; everything above that value is complete.
 */
export function completeContracts(contracts: readonly RecentRecord[], pageFull: boolean, lastValue: number | null): readonly RecentRecord[] {
  if (!pageFull || lastValue === null) return contracts
  return contracts.filter((contract) => contract.value > lastValue)
}

/** The firms named most often among the largest contracts, when a few stand out. */
export function frequentWinners(contracts: readonly RecentRecord[], atLeast = 3): { readonly names: readonly string[]; readonly times: number } | null {
  const tally = new Map<string, { readonly name: string; times: number }>()
  for (const contract of contracts) {
    for (const winner of contract.winners) {
      const key = partyKey(winner)
      const entry = tally.get(key) ?? { name: winner.name, times: 0 }
      entry.times += 1
      tally.set(key, entry)
    }
  }
  const most = Math.max(0, ...[...tally.values()].map((entry) => entry.times))
  if (most < atLeast) return null
  const names = [...tally.values()].filter((entry) => entry.times === most).map((entry) => entry.name)
  return names.length <= 3 ? { names, times: most } : null
}
