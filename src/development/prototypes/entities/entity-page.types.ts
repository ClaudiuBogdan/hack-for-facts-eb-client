/**
 * Shared contract for the entity page rewrite (`/development/entities/entity-page`).
 *
 * Every sibling file owns one piece of the page and takes its inputs from
 * here, so the pieces can be built in parallel and composed by the two layout
 * variants without knowing each other's internals. Keep this file small and
 * stable; change a prop here and every consumer changes with it.
 */
import type { EntityDetailsData, ExecutionLineItem } from '@/lib/api/entities'

/** The five views the real route knows (`docs/user-stories/entity-details.md`). */
export const ENTITY_PAGE_VIEWS = ['main-info', 'contracts', 'commitments', 'ins', 'profile'] as const
export type EntityPageView = (typeof ENTITY_PAGE_VIEWS)[number]

export const ENTITY_PAGE_VIEW_LABELS: Record<EntityPageView, string> = {
  'main-info': 'Execuție bugetară',
  contracts: 'Achiziții publice',
  commitments: 'Angajamente',
  ins: 'Statistici INS',
  profile: 'Contact',
}

/** Sections of the default view, in page order. The section rail and the index use the same list. */
export const ENTITY_PAGE_SECTIONS = [
  { id: 'sinteza', number: '01', label: 'Sinteză' },
  { id: 'structura', number: '02', label: 'Structura cheltuielilor' },
  { id: 'venituri', number: '03', label: 'Structura veniturilor' },
  { id: 'evolutie', number: '04', label: 'Evoluție' },
  { id: 'subordonate', number: '05', label: 'Instituții subordonate' },
  { id: 'rapoarte', number: '06', label: 'Rapoarte sursă' },
  { id: 'intrebari', number: '07', label: 'Întrebări frecvente' },
] as const
export type EntityPageSectionId = (typeof ENTITY_PAGE_SECTIONS)[number]['id']

/** Read from the prototype URL (`useSearch({ strict: false })`) and written back with `navigate`. */
export type EntityPageState = {
  readonly view: EntityPageView
  readonly year: number
  readonly normalization: 'total' | 'per_capita'
  readonly grouping: 'fn' | 'ec'
}

export type EntityPageStateChange = (patch: Partial<EntityPageState>) => void

export type EntityPageReport = {
  readonly reportId: string
  readonly reportingYear: number
  readonly periodLabel: string
  readonly reportType: string
  readonly reportDate: string
  readonly mainCreditorName: string
  readonly budgetSector: string
  readonly downloadUrl: string
}

export type EntityPageSubordinate = {
  readonly cui: string
  readonly name: string
  readonly kind: string
  readonly totalExpenses: number
}

export type EntityPageTrendPoint = {
  readonly year: number
  readonly income: number
  readonly expenses: number
}

/**
 * Everything the page renders, shaped like the served `EntityDetailsData` plus
 * the line items the route loader fetches alongside it. `source` is the
 * data-trust flag: `'local'` is a fixture and must be labelled on screen
 * (`DESIGN.md` §Mock-First Contract); `'api'` is the shape the promoted page
 * will receive from the feature hooks.
 */
export type EntityPageData = {
  readonly source: 'local' | 'api'
  readonly entity: Pick<
    EntityDetailsData,
    | 'cui'
    | 'name'
    | 'address'
    | 'default_report_type'
    | 'entity_type'
    | 'is_uat'
    | 'is_territorial_executive'
    | 'uat'
    | 'parents'
    | 'totalIncome'
    | 'totalExpenses'
    | 'budgetBalance'
  >
  /** Human label for the entity type, e.g. "Municipiu" / "Minister". */
  readonly entityKindLabel: string
  /** The period the totals and the line items describe. */
  readonly period: {
    readonly year: number
    readonly label: string
    /** e.g. "MFIN · execuție la 30 iun. 2025 · date operative" */
    readonly provenance: string
    readonly availableYears: readonly number[]
  }
  readonly lineItems: readonly ExecutionLineItem[]
  readonly trend: readonly EntityPageTrendPoint[]
  readonly subordinates: readonly EntityPageSubordinate[]
  readonly subordinatesTotal: number
  readonly reports: readonly EntityPageReport[]
}

/** Props shared by every piece: the data, the URL state, and the way to change it. */
export type EntityPagePieceProps = {
  readonly data: EntityPageData
  readonly state: EntityPageState
  readonly onStateChange: EntityPageStateChange
}
