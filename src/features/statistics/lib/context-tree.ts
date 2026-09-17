import { INS_ROOT_CONTEXTS } from '@/lib/ins/ins-metric-registry'
import type { StatisticsContextNode } from '@/schemas/statistics'

/**
 * The INS Tempo domain hierarchy, shaped for the catalog rail.
 *
 * INS publishes three levels — domain (`A. STATISTICA SOCIALA`), group
 * (`A.4 FORTA DE MUNCA`) and subdomain (`4. SOMERI INREGISTRATI`) — and hangs
 * every dataset off a subdomain. The server can filter datasets by a domain
 * (`rootContextCode`) or by an exact context (`contextCode`), which is why a
 * group is a place to open, not a filter to apply: see
 * `isSelectableContextLevel`.
 */
export interface StatisticsContextTreeNode {
  readonly code: string
  readonly label: string
  readonly level: number
  readonly children: readonly StatisticsContextTreeNode[]
}

/** Code → node, for ancestor lookups and chip labels. */
export type StatisticsContextIndex = ReadonlyMap<
  string,
  { readonly node: StatisticsContextTreeNode; readonly parentCode: string | null }
>

const DOMAIN_LEVEL = 0
const GROUP_LEVEL = 1

/**
 * INS appends the caption of its own press-release links to a context name, so
 * `A.1 POPULATIE SI STRUCTURA DEMOGRAFICA` arrives with `Comunicate de presa`
 * glued to it, and `A.4 FORTA DE MUNCA` with two captioned links. The names
 * themselves are upper-case, the captions are not, so the caption starts at the
 * first word carrying a lower-case letter.
 *
 * The cut only runs on names that carry one of the known link captions — in
 * either language, and INS writes the English one both ways — so the
 * sentence-case subdomain names (the sustainable-development targets) pass
 * through untouched. Checked against all 340 live nodes in both languages on
 * 2026-09-17: 30 Romanian and 28 English names are cut, every one of them
 * correctly, no subdomain name is touched, and no domain or group name is
 * left carrying a caption.
 */
const LINK_CAPTIONS =
  /Comunicate? de presa|Press releases?|\(\s*Detalii\s*\)|\(\s*Details\s*\)/i
const LOWER_CASE_LETTER = /\p{Ll}/u

export function cleanContextName(name: string): string {
  if (!LINK_CAPTIONS.test(name)) return name.trim()

  const words: string[] = []
  for (const word of name.split(/\s+/)) {
    if (LOWER_CASE_LETTER.test(word)) break
    words.push(word)
  }

  const cleaned = words.join(' ').replace(/[\s-]+$/, '')
  return cleaned === '' ? name.trim() : cleaned
}

/**
 * Builds the tree the rail draws.
 *
 * Domains keep their translated product labels (`Social`, `Economic`, …) — the
 * eight of them are a fixed registry the whole app already names that way —
 * while every other level shows the INS name. A domain the registry does not
 * know still renders, under its own INS name, rather than dropping its subtree,
 * and a domain the server did not send still renders childless, so the rail
 * filters by theme exactly as it did before the tree existed even when the
 * context read fails.
 *
 * Children sort by numeric code, which is the order INS numbers them in
 * (verified against all 78 parents of the live tree, 2026-09-17).
 */
export function buildStatisticsContextTree(
  nodes: readonly StatisticsContextNode[],
  locale: string,
): readonly StatisticsContextTreeNode[] {
  const childrenByParent = new Map<string, StatisticsContextNode[]>()
  for (const node of nodes) {
    if (node.parentCode === null) continue
    const siblings = childrenByParent.get(node.parentCode)
    if (siblings) siblings.push(node)
    else childrenByParent.set(node.parentCode, [node])
  }

  // `seen` guards the walk: a `parent_code` cycle in the payload would
  // otherwise recurse until the stack blows, and this runs during render.
  const toTreeNode = (
    node: StatisticsContextNode,
    seen: ReadonlySet<string>,
  ): StatisticsContextTreeNode => {
    const path = new Set(seen).add(node.code)

    return {
      code: node.code,
      label: contextLabel(node, locale),
      level: node.level,
      children: (childrenByParent.get(node.code) ?? [])
        .filter((child) => !path.has(child.code))
        .sort(byNumericCode)
        .map((child) => toTreeNode(child, path)),
    }
  }

  const domains = nodes.filter((node) => node.level === DOMAIN_LEVEL)
  const served = new Set(domains.map((domain) => domain.code))
  const missing: StatisticsContextNode[] = INS_ROOT_CONTEXTS.filter(
    (root) => !served.has(root.code),
  ).map((root) => ({
    code: root.code,
    nameRo: null,
    nameEn: null,
    level: DOMAIN_LEVEL,
    parentCode: null,
  }))

  return [...domains, ...missing]
    .sort(byRegistryOrder)
    .map((domain) => toTreeNode(domain, new Set()))
}

/** Flattens the tree into a lookup of every node and its parent. */
export function indexStatisticsContextTree(
  roots: readonly StatisticsContextTreeNode[],
): StatisticsContextIndex {
  const index = new Map<
    string,
    { node: StatisticsContextTreeNode; parentCode: string | null }
  >()

  const visit = (node: StatisticsContextTreeNode, parentCode: string | null) => {
    if (index.has(node.code)) return
    index.set(node.code, { node, parentCode })
    for (const child of node.children) visit(child, node.code)
  }

  for (const root of roots) visit(root, null)
  return index
}

/**
 * The codes to open so that `code` is visible — its ancestors, not itself.
 * An unknown code (a hand-typed URL, a context INS retired) opens nothing.
 */
export function contextAncestorCodes(
  index: StatisticsContextIndex,
  code: string | undefined,
): readonly string[] {
  const ancestors: string[] = []
  const seen = new Set<string>(code ? [code] : [])
  let current = code ? index.get(code)?.parentCode : null

  while (current && !seen.has(current)) {
    ancestors.push(current)
    seen.add(current)
    current = index.get(current)?.parentCode ?? null
  }

  return ancestors
}

/**
 * Whether a level can be filtered on. The server filters datasets by domain or
 * by the exact context a dataset hangs from; a group sits between the two and
 * matches no dataset, so its row opens rather than filters. Lifting that limit
 * needs a server-side filter over a context subtree.
 */
export function isSelectableContextLevel(level: number): boolean {
  return level !== GROUP_LEVEL
}

/** True for the eight INS domains, which filter as `rootContextCode`. */
export function isRootContextCode(code: string): boolean {
  return INS_ROOT_CONTEXTS.some((root) => root.code === code)
}

/**
 * The domains keep their product labels; every level below shows the INS name
 * in the reader's language, falling back to the other one when INS published
 * only one of them.
 */
function contextLabel(node: StatisticsContextNode, locale: string): string {
  if (node.level === DOMAIN_LEVEL) {
    const root = INS_ROOT_CONTEXTS.find((entry) => entry.code === node.code)
    if (root) return root.label
  }

  const name = locale.startsWith('en')
    ? (node.nameEn ?? node.nameRo)
    : (node.nameRo ?? node.nameEn)
  return name ? cleanContextName(name) : node.code
}

function byNumericCode(a: StatisticsContextNode, b: StatisticsContextNode): number {
  const left = Number(a.code)
  const right = Number(b.code)
  if (Number.isFinite(left) && Number.isFinite(right) && left !== right) {
    return left - right
  }
  return a.code.localeCompare(b.code)
}

function byRegistryOrder(a: StatisticsContextNode, b: StatisticsContextNode): number {
  const left = INS_ROOT_CONTEXTS.findIndex((root) => root.code === a.code)
  const right = INS_ROOT_CONTEXTS.findIndex((root) => root.code === b.code)
  if (left === right) return byNumericCode(a, b)
  // A domain the registry does not know sorts after the eight it does.
  if (left === -1) return 1
  if (right === -1) return -1
  return left - right
}
