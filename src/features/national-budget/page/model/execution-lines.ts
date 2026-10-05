import type { ExecutionFact } from '@/schemas/national-budget-page'

/**
 * The hierarchy of the Ministry of Finance bulletin's national lines, keyed by
 * the source's own line names. The facts carry no parent; this catalog does,
 * checked against the December 2025 and July 2026 releases (each parent equals
 * the sum of its children at the source's precision, see the tests). A line
 * missing here is shown flat at the end, never guessed into the tree.
 */
type Node = { readonly parent: string | null; readonly level: 0 | 1 | 2 | 3 | 4 }

const REVENUE: Readonly<Record<string, Node>> = {
  'venituri totale': { parent: null, level: 0 },
  'venituri curente': { parent: 'venituri totale', level: 1 },
  'venituri fiscale': { parent: 'venituri curente', level: 2 },
  'impozitul pe profit, salarii, venit si castiguri din capital': { parent: 'venituri fiscale', level: 3 },
  'impozitul pe profit': { parent: 'impozitul pe profit, salarii, venit si castiguri din capital', level: 4 },
  'impozitul pe salarii si venit': { parent: 'impozitul pe profit, salarii, venit si castiguri din capital', level: 4 },
  'alte impozite pe venit, profit si castiguri din capital': {
    parent: 'impozitul pe profit, salarii, venit si castiguri din capital',
    level: 4,
  },
  'impozite si taxe pe proprietate': { parent: 'venituri fiscale', level: 3 },
  'impozite si taxe pe bunuri si servicii': { parent: 'venituri fiscale', level: 3 },
  tva: { parent: 'impozite si taxe pe bunuri si servicii', level: 4 },
  accize: { parent: 'impozite si taxe pe bunuri si servicii', level: 4 },
  'alte impozite si taxe pe bunuri si servicii': { parent: 'impozite si taxe pe bunuri si servicii', level: 4 },
  'taxe pe utilizarea bunurilor, autorizarea utilizarii bunurilor sau pe desfasurarea de activitati': {
    parent: 'impozite si taxe pe bunuri si servicii',
    level: 4,
  },
  'impozit pe comertul exterior si tranzactiile internationale (taxe vamale)': { parent: 'venituri fiscale', level: 3 },
  'alte impozite si taxe fiscale': { parent: 'venituri fiscale', level: 3 },
  'contributii de asigurari': { parent: 'venituri curente', level: 2 },
  'venituri nefiscale': { parent: 'venituri curente', level: 2 },
  subventii: { parent: 'venituri totale', level: 1 },
  'venituri din capital': { parent: 'venituri totale', level: 1 },
  donatii: { parent: 'venituri totale', level: 1 },
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari': { parent: 'venituri totale', level: 1 },
  'operatiuni financiare': { parent: 'venituri totale', level: 1 },
  'sume in curs de distribuire': { parent: 'venituri totale', level: 1 },
  'alte sume primite de la ue': { parent: 'venituri totale', level: 1 },
  'sume primite de la ue/alti donatori in contul platilor efectuate si prefinantari aferente cadrului financiar 2014-2020': {
    parent: 'venituri totale',
    level: 1,
  },
  'sume aferente asistentei financiare nerambursabile alocate pentru pnrr': { parent: 'venituri totale', level: 1 },
}

const CURRENT = 'cheltuieli curente'
const EXPENDITURE: Readonly<Record<string, Node>> = {
  'cheltuieli totale': { parent: null, level: 0 },
  [CURRENT]: { parent: 'cheltuieli totale', level: 1 },
  'cheltuieli de personal': { parent: CURRENT, level: 2 },
  'bunuri si servicii': { parent: CURRENT, level: 2 },
  dobanzi: { parent: CURRENT, level: 2 },
  subventii: { parent: CURRENT, level: 2 },
  'transferuri intre unitati ale administratiei publice': { parent: CURRENT, level: 2 },
  'alte transferuri': { parent: CURRENT, level: 2 },
  'proiecte cu finantare din fonduri externe nerambursabile': { parent: CURRENT, level: 2 },
  'asistenta sociala': { parent: CURRENT, level: 2 },
  'proiecte cu finantare din fonduri externe nerambursabile aferente cadrului financiar 2014-2020 si din fondul de modernizare':
    { parent: CURRENT, level: 2 },
  'alte cheltuieli': { parent: CURRENT, level: 2 },
  'proiecte cu finantare din sumele reprezentand asistenta financiara nerambursabila aferenta pnrr': {
    parent: CURRENT,
    level: 2,
  },
  'proiecte cu finantare din sumele aferente componentei de imprumut a pnrr': { parent: CURRENT, level: 2 },
  'cheltuieli aferente programelor cu finantare rambursabila': { parent: CURRENT, level: 2 },
  'cheltuieli de capital': { parent: 'cheltuieli totale', level: 1 },
  'active nefinanciare': { parent: 'cheltuieli de capital', level: 2 },
  'active financiare': { parent: 'cheltuieli de capital', level: 2 },
  'operatiuni financiare': { parent: 'cheltuieli totale', level: 1 },
  imprumuturi: { parent: 'operatiuni financiare', level: 2 },
  'rambursari de credite': { parent: 'operatiuni financiare', level: 2 },
  'plati efectuate in anii precedenti si recuperate in anul curent': { parent: 'cheltuieli totale', level: 1 },
}

const BALANCE: Readonly<Record<string, Node>> = {
  'excedent(+) / deficit(-)': { parent: null, level: 0 },
}

export const EXECUTION_LINE_CATALOG = { revenue: REVENUE, expenditure: EXPENDITURE, balance: BALANCE } as const

export type ExecutionSection = keyof typeof EXECUTION_LINE_CATALOG

export type ExecutionLineRow = {
  readonly lineItem: string
  readonly level: number
  readonly parent: string | null
  /** False when the catalog does not know the line: shown flat, last. */
  readonly placed: boolean
  readonly amount: ExecutionFact | null
  readonly gdpShare: ExecutionFact | null
}

/**
 * The rows of one section of one component of one release, in the catalog's
 * order (the source's order), each with its amount and, where printed, its
 * GDP share. Only current-period actual-or-estimate facts are read.
 */
export function executionRows(
  facts: readonly ExecutionFact[],
  { component, section }: { readonly component: string; readonly section: ExecutionSection },
): readonly ExecutionLineRow[] {
  const mine = facts.filter((fact) => fact.component === component && fact.section === section && fact.periodRole === 'current')
  const catalog: Readonly<Record<string, Node>> = EXECUTION_LINE_CATALOG[section]
  const known = Object.keys(catalog)
  const lineItems = [...new Set(mine.map((fact) => fact.lineItem))]
  const ordered = [
    ...known.filter((item) => lineItems.includes(item)),
    ...lineItems.filter((item) => !(item in catalog)),
  ]
  return ordered.map((lineItem) => {
    const node = catalog[lineItem]
    return {
      lineItem,
      level: node?.level ?? 1,
      parent: node?.parent ?? null,
      placed: node !== undefined,
      amount: mine.find((fact) => fact.lineItem === lineItem && fact.measure === 'amount') ?? null,
      gdpShare: mine.find((fact) => fact.lineItem === lineItem && fact.measure === 'gdp_share') ?? null,
    }
  })
}

/** Whether the catalog gives a line children. */
export function hasChildren(section: ExecutionSection, lineItem: string): boolean {
  const catalog: Readonly<Record<string, Node>> = EXECUTION_LINE_CATALOG[section]
  return Object.values(catalog).some((node) => node.parent === lineItem)
}

function isUnder(catalog: Readonly<Record<string, Node>>, lineItem: string, ancestor: string): boolean {
  let parent = catalog[lineItem]?.parent ?? null
  while (parent !== null) {
    if (parent === ancestor) return true
    parent = catalog[parent]?.parent ?? null
  }
  return false
}

/**
 * The tree cut at one depth: every line at `depth`, and every leaf above it,
 * so the cut's lines add up to their root (a table at any level is whole).
 * With `under`, the cut starts below that line: its descendants at `depth`
 * and its shallower leaves. Unplaced lines never enter a cut.
 */
export function cutRows(
  facts: readonly ExecutionFact[],
  {
    component,
    section,
    depth,
    under = null,
  }: { readonly component: string; readonly section: ExecutionSection; readonly depth: number; readonly under?: string | null },
): readonly ExecutionLineRow[] {
  const catalog: Readonly<Record<string, Node>> = EXECUTION_LINE_CATALOG[section]
  return executionRows(facts, { component, section }).filter((row) => {
    if (!row.placed || row.level === 0) return false
    if (under !== null && !isUnder(catalog, row.lineItem, under)) return false
    if (row.level === depth) return true
    return row.level < depth && !hasChildren(section, row.lineItem)
  })
}

/** The single headline fact of a section (its level-0 line), or null when the release lacks it. */
export function executionHeadline(
  facts: readonly ExecutionFact[],
  { component, section }: { readonly component: string; readonly section: ExecutionSection },
): ExecutionLineRow | null {
  return executionRows(facts, { component, section }).find((row) => row.level === 0 && row.placed) ?? null
}
