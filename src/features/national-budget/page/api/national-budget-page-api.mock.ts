import { z } from 'zod'

import {
  anafStateBudgetSchema,
  approvedBudgetLineRowSchema,
  budgetCatalogSchema,
  budgetEditionSchema,
  executionFactRowSchema,
  pendingEditionSchema,
  releaseIndexEntrySchema,
  type ApprovedBudgetLineRow,
  type ApprovedFund,
  type ApprovedLine,
  type ApprovedSeriesPoint,
  type ApprovedTotalCell,
  type AuthorityLine,
  type AuthorityRow,
  type BudgetCatalog,
  type BudgetEdition,
  type CreditType,
  type EditionKey,
  type ExecutionFact,
  type ExecutionFactRow,
  type Unavailable,
} from '@/schemas/national-budget-page'
import anafFixture from '../mocks/fixtures/anaf-state-budget.json'
import approvedFixture from '../mocks/fixtures/approved-lines.sample.json'
import catalogFixture from '../mocks/fixtures/catalog.json'
import demoFixture from '../mocks/fixtures/demo-2025-authorities.json'
import draftFixture from '../mocks/fixtures/draft-2026.json'
import executionFixture from '../mocks/fixtures/execution-facts.sample.json'
import { authorityLineLevel, selectCreditTotal, selectRevenueTotal } from '../model/descriptors'
import type { NationalBudgetPageAdapter } from './national-budget-page-api'

/**
 * The mock adapter: an in-memory implementation of the proposed endpoints over
 * the fixtures `scripts/generate-national-budget-page-fixtures.mjs` writes.
 *
 * - Real rows (`approved-lines.sample.json`, `execution-facts.sample.json`) are
 *   parsed with the wire schemas and mapped as the live adapter will map the
 *   API's rows. They are a sample: anything production holds that the sample
 *   does not answers `not_in_sample`, never zero.
 * - The March 2026 draft (`draft-2026.json`) is real but unreviewed and a draft;
 *   its values carry `origin: 'draft_static'`.
 * - The 2025 authority list beyond Administrația Prezidențială is invented
 *   (`demo-2025-authorities.json`, `origin: 'synthetic_demo'`); only the first
 *   prototype (`national-budget/page`) reads it.
 * - `anaf-state-budget.json` is a snapshot of the served ANAF lane
 *   (`scripts/generate-national-budget-anaf-fixture.mjs`): real, its own
 *   population and data-through date.
 */

const FUNDS: readonly ApprovedFund[] = ['state_budget', 'state_social_insurance', 'health_insurance', 'unemployment_insurance']

// ── Fixtures, parsed once ───────────────────────────────────────────────────

const draftSchema = z.object({
  publication: z.string(),
  extractedOn: z.string(),
  totals: z.object({
    credite_bugetare: z.record(z.string(), z.number()),
    credite_angajament: z.record(z.string(), z.number()),
  }),
  authorities: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      proposed2026: z.string(),
      estimate2027: z.string().nullable(),
    }),
  ),
  economic: z.array(z.object({ key: z.string(), code: z.string(), label: z.string(), proposed2026: z.string() })),
})

const demoSchema = z.object({
  kind: z.literal('synthetic_demo'),
  authorities: z.array(
    z.object({
      key: z.string(),
      code: z.string(),
      name: z.string(),
      budgetCredits: z.record(z.string(), z.string()),
      commitmentCredits: z.record(z.string(), z.string()),
    }),
  ),
})

type Data = {
  readonly catalog: BudgetCatalog
  readonly lines: readonly ApprovedLine[]
  readonly facts: readonly ExecutionFact[]
  readonly draft: z.infer<typeof draftSchema>
  readonly demo: z.infer<typeof demoSchema>
  readonly anaf: z.infer<typeof anafStateBudgetSchema>
}

let parsed: Data | undefined

function toApprovedLine(row: ApprovedBudgetLineRow): ApprovedLine {
  return {
    id: `${row.interpretation_id}#${row.record_index}#${row.field}`,
    budgetYear: row.budget_year,
    measureYear: row.measure_year,
    measure: row.measure,
    publication: row.publication,
    fund: row.fund,
    form: row.form,
    authority: { code: row.authority_code, name: row.authority_name },
    codes: {
      capitol: row.capitol,
      subcapitol: row.subcapitol,
      paragraf: row.paragraf,
      grupa: row.grupa,
      titlu: row.titlu,
      articol: row.articol,
      alineat: row.alineat,
    },
    label: row.label,
    rowRole: row.row_role,
    creditType: row.credit_type,
    context:
      row.context_record_index === null || row.context_label === null
        ? null
        : { recordIndex: row.context_record_index, label: row.context_label },
    token: row.token,
    amountThousandLei: row.amount,
    provenance: {
      interpretationId: row.interpretation_id,
      recordIndex: row.record_index,
      field: row.field,
      annex: row.annex,
      sourceFileId: row.source_file_id,
      contentSha256: row.content_sha256,
      objectKey: row.object_key,
      objectVersionId: row.object_version_id,
    },
  }
}

function toExecutionFact(row: ExecutionFactRow): ExecutionFact {
  return {
    ...row.semantic_key,
    id: `${row.release_id}#${row.input_id}#${row.observation_key}`,
    periodEnd: row.period_end,
    releaseId: row.release_id,
    inputId: row.input_id,
    observationKey: row.observation_key,
    sourceToken: row.source_token,
    value: row.normalized_value,
    unit: row.normalized_unit,
    sourceUrl: row.source_url,
    originalSha256: row.original_sha256,
  }
}

function data(): Data {
  if (parsed) return parsed
  const catalog = budgetCatalogSchema.parse({
    status: 'ok',
    editions: z.array(budgetEditionSchema).parse(catalogFixture.editions),
    pendingEditions: z.array(pendingEditionSchema).parse(catalogFixture.pendingEditions),
    executionCoverage: catalogFixture.executionCoverage,
    releases: z.array(releaseIndexEntrySchema).parse(catalogFixture.releases),
  })
  parsed = {
    catalog,
    lines: z.array(approvedBudgetLineRowSchema).parse(approvedFixture.rows).map(toApprovedLine),
    facts: z.array(executionFactRowSchema).parse(executionFixture.rows).map(toExecutionFact),
    draft: draftSchema.parse(draftFixture),
    demo: demoSchema.parse(demoFixture),
    anaf: anafStateBudgetSchema.parse(anafFixture),
  }
  return parsed
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const unavailable = (reason: Unavailable['reason']): Unavailable => ({ status: 'unavailable', reason })

function editionOf(key: EditionKey): BudgetEdition | undefined {
  return data().catalog.editions.find((edition) => edition.key === key)
}

/** The draft's columns by target year: proposed for its own year, estimates after. */
const DRAFT_COLUMN: Readonly<Record<number, string>> = {
  2026: 'propuneri_2026',
  2027: 'estimari_2027',
  2028: 'estimari_2028',
  2029: 'estimari_2029',
}

function draftTotal(targetYear: number, creditType: CreditType): ApprovedTotalCell {
  const column = DRAFT_COLUMN[targetYear]
  const table = creditType === 'budget_credits' ? data().draft.totals.credite_bugetare : data().draft.totals.credite_angajament
  const value = column === undefined ? undefined : table[column]
  if (value === undefined) return unavailable(column === undefined ? 'not_in_edition' : 'not_extracted')
  return {
    status: 'ok',
    origin: 'draft_static',
    amountThousandLei: String(value),
    descriptor: creditType === 'budget_credits' ? 'II. Credite bugetare, capitol 5001' : 'I. Credite de angajament, capitol 5001',
  }
}

/** The authority's own total and detail rows of one 2025 annex (the sample's one authority). */
function realAuthorityLines(code: string, targetYear: number, creditType: CreditType): readonly ApprovedLine[] {
  return data().lines.filter(
    (line) =>
      line.form === 'state_budget_authority_detail' &&
      line.budgetYear === 2025 &&
      line.authority.code === code &&
      line.measureYear === targetYear &&
      line.rowRole === 'credit' &&
      line.creditType === creditType,
  )
}

/** Small deterministic hash → [0, 1) sequence, so a synthetic split is the same on server and client. */
function seeded(key: string): () => number {
  let h = 2166136261
  for (const char of key) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The economic titles a synthetic authority is split into. Codes and names are the classification's; shares are invented. */
const DEMO_TITLES: readonly { readonly code: string; readonly label: string; readonly group: '01' | '70' }[] = [
  { code: '10', label: 'TITLUL I CHELTUIELI DE PERSONAL', group: '01' },
  { code: '20', label: 'TITLUL II BUNURI SI SERVICII', group: '01' },
  { code: '51', label: 'TITLUL VI TRANSFERURI INTRE UNITATI ALE ADMINISTRATIEI PUBLICE', group: '01' },
  { code: '57', label: 'TITLUL IX ASISTENTA SOCIALA', group: '01' },
  { code: '59', label: 'TITLUL XI ALTE CHELTUIELI', group: '01' },
  { code: '71', label: 'TITLUL XIII ACTIVE NEFINANCIARE', group: '70' },
]

function demoLines(authority: AuthorityRow, total: number): readonly AuthorityLine[] {
  const random = seeded(authority.key)
  const weights = DEMO_TITLES.map(() => 0.2 + random())
  const sum = weights.reduce((a, b) => a + b, 0)
  const parts = weights.map((weight) => Math.floor((total * weight) / sum))
  parts[0] += total - parts.reduce((a, b) => a + b, 0)
  const group = (code: '01' | '70') => DEMO_TITLES.reduce((acc, title, index) => (title.group === code ? acc + parts[index] : acc), 0)
  const line = (key: string, level: 0 | 1 | 2, code: string, label: string, amount: number): AuthorityLine => ({
    key: `${authority.key}:${key}`,
    level,
    code,
    label,
    amountThousandLei: String(amount),
    origin: 'synthetic_demo',
    provenance: null,
  })
  return [
    line('5001', 0, '5001', 'CHELTUIELI - BUGET DE STAT', total),
    line('01', 1, '01', 'CHELTUIELI CURENTE', group('01')),
    ...DEMO_TITLES.filter((title) => title.group === '01').map((title) =>
      line(title.code, 2, title.code, title.label, parts[DEMO_TITLES.indexOf(title)]),
    ),
    line('70', 1, '70', 'CHELTUIELI DE CAPITAL', group('70')),
    ...DEMO_TITLES.filter((title) => title.group === '70').map((title) =>
      line(title.code, 2, title.code, title.label, parts[DEMO_TITLES.indexOf(title)]),
    ),
  ]
}

function authorityRows(edition: EditionKey, targetYear: number, creditType: CreditType): readonly AuthorityRow[] | Unavailable {
  if (edition === '2025') {
    const presidency = realAuthorityLines('01', targetYear, creditType).find((line) => authorityLineLevel(line) === 0)
    const demo = data().demo.authorities.map<AuthorityRow>((row) => ({
      key: row.key,
      code: row.code,
      name: row.name,
      origin: 'synthetic_demo',
      amountThousandLei: (creditType === 'budget_credits' ? row.budgetCredits : row.commitmentCredits)[String(targetYear)] ?? null,
    }))
    const real: AuthorityRow[] = presidency
      ? [{ key: 'cod-01', code: '01', name: presidency.authority.name, origin: 'real_sample', amountThousandLei: presidency.amountThousandLei }]
      : []
    return [...real, ...demo]
  }
  if (edition === '2026-draft') {
    if (creditType !== 'budget_credits') return unavailable('not_extracted')
    if (targetYear !== 2026 && targetYear !== 2027) return unavailable('not_extracted')
    return data().draft.authorities.map<AuthorityRow>((row) => ({
      key: row.key,
      code: null,
      name: row.name,
      origin: 'draft_static',
      amountThousandLei: targetYear === 2026 ? row.proposed2026 : row.estimate2027,
    }))
  }
  return unavailable('not_in_sample')
}

// ── The adapter ─────────────────────────────────────────────────────────────

export const nationalBudgetMockAdapter: NationalBudgetPageAdapter = {
  id: 'mock',
  mode: 'mock',

  getCatalog: async () => data().catalog,

  getApprovedTotals: async ({ edition: key, targetYear, creditType }) => {
    const edition = editionOf(key)
    if (!edition || !edition.targetYears.includes(targetYear)) return unavailable('not_in_edition')
    if (edition.status === 'draft') {
      return {
        status: 'ok',
        edition,
        targetYear,
        creditType,
        // The extract holds Anexa 3's state-budget credits only; the draft's other annexes were not extracted.
        funds: FUNDS.map((fund) => ({
          fund,
          revenue: unavailable('not_extracted'),
          credits: fund === 'state_budget' ? draftTotal(targetYear, creditType) : unavailable('not_extracted'),
        })),
      }
    }
    const lines = data().lines
    return {
      status: 'ok',
      edition,
      targetYear,
      creditType,
      funds: FUNDS.map((fund) => {
        const query = { fund, budgetYear: edition.budgetYear, measureYear: targetYear }
        return {
          fund,
          revenue: selectRevenueTotal(lines, query),
          credits: selectCreditTotal(lines, { ...query, creditType }),
        }
      }),
    }
  },

  getApprovedSeries: async ({ fund, line, creditType }) => {
    const points: ApprovedSeriesPoint[] = []
    for (const edition of data().catalog.editions) {
      for (const measureYear of edition.targetYears) {
        if (edition.status === 'draft') {
          if (line !== 'credits' || fund !== 'state_budget') continue
          const cell = draftTotal(measureYear, creditType)
          if (cell.status !== 'ok' || cell.origin !== 'draft_static') continue
          points.push({
            edition: edition.key,
            budgetYear: edition.budgetYear,
            measureYear,
            kind: measureYear === edition.budgetYear ? 'proposed' : 'forecast',
            editionStatus: edition.status,
            amountThousandLei: cell.amountThousandLei,
            origin: 'draft_static',
          })
          continue
        }
        const query = { fund, budgetYear: edition.budgetYear, measureYear }
        const cell =
          line === 'revenue' ? selectRevenueTotal(data().lines, query) : selectCreditTotal(data().lines, { ...query, creditType })
        if (cell.status !== 'ok' || cell.origin !== 'real_sample') continue
        points.push({
          edition: edition.key,
          budgetYear: edition.budgetYear,
          measureYear,
          kind: cell.line.measure,
          editionStatus: edition.status,
          amountThousandLei: cell.line.amountThousandLei,
          origin: 'real_sample',
        })
      }
    }
    return { status: 'ok', fund, line, points }
  },

  getAuthorities: async ({ edition, targetYear, creditType }) => {
    const rows = authorityRows(edition, targetYear, creditType)
    if (!Array.isArray(rows)) return rows as Unavailable
    const total =
      edition === '2026-draft'
        ? draftTotal(targetYear, creditType)
        : selectCreditTotal(data().lines, {
            fund: 'state_budget',
            budgetYear: Number(edition),
            measureYear: targetYear,
            creditType,
          })
    const totalThousandLei =
      total.status !== 'ok' ? null : total.origin === 'draft_static' ? total.amountThousandLei : total.line.amountThousandLei
    const sorted = [...rows].sort((a, b) => Number(b.amountThousandLei ?? -1) - Number(a.amountThousandLei ?? -1))
    return { status: 'ok', edition, targetYear, creditType, rows: sorted, totalThousandLei }
  },

  getAuthorityDetail: async ({ edition, targetYear, creditType, authorityKey }) => {
    const rows = authorityRows(edition, targetYear, creditType)
    if (!Array.isArray(rows)) return rows as Unavailable
    const authority = rows.find((row) => row.key === authorityKey)
    if (!authority || authority.amountThousandLei === null) return unavailable('not_in_sample')

    if (authority.origin === 'real_sample' && authority.code !== null) {
      const lines = realAuthorityLines(authority.code, targetYear, creditType).map<AuthorityLine>((line) => ({
        key: line.id,
        level: authorityLineLevel(line),
        code: (line.codes.titlu ?? '').trim() || line.codes.capitol,
        label: line.context?.label ?? line.label,
        amountThousandLei: line.amountThousandLei,
        origin: 'real_sample',
        provenance: line.provenance,
      }))
      // The sample holds the annex's first records only.
      return { status: 'ok', authority, targetYear, creditType, lines, complete: false }
    }
    if (authority.origin === 'synthetic_demo') {
      return {
        status: 'ok',
        authority,
        targetYear,
        creditType,
        lines: demoLines(authority, Number(authority.amountThousandLei)),
        complete: true,
      }
    }
    // Draft: the extract's economic split, proposed 2026 only.
    if (targetYear !== 2026) {
      return {
        status: 'ok',
        authority,
        targetYear,
        creditType,
        lines: [
          {
            key: `${authority.key}:total`,
            level: 0,
            code: '5001',
            label: 'CHELTUIELI - BUGET DE STAT',
            amountThousandLei: authority.amountThousandLei,
            origin: 'draft_static',
            provenance: null,
          },
        ],
        complete: false,
      }
    }
    const titles = data().draft.economic.filter((row) => row.key === authority.key)
    const sum = titles.reduce((acc, row) => acc + Number(row.proposed2026), 0)
    return {
      status: 'ok',
      authority,
      targetYear,
      creditType,
      lines: [
        {
          key: `${authority.key}:total`,
          level: 0,
          code: '5001',
          label: 'CHELTUIELI - BUGET DE STAT',
          amountThousandLei: authority.amountThousandLei,
          origin: 'draft_static',
          provenance: null,
        },
        ...[...titles]
          .sort((a, b) => Number(b.proposed2026) - Number(a.proposed2026))
          .map<AuthorityLine>((row) => ({
            key: `${authority.key}:${row.code}`,
            level: 2,
            code: row.code,
            label: row.label,
            amountThousandLei: row.proposed2026,
            origin: 'draft_static',
            provenance: null,
          })),
      ],
      complete: sum === Number(authority.amountThousandLei),
    }
  },

  getAnafStateBudget: async () => ({ status: 'ok', ...data().anaf }),

  getExecutionRelease: async ({ month }) => {
    const entry = data().catalog.releases.find((release) => release.periodEnd.startsWith(month))
    if (!entry) return unavailable('not_in_sample')
    if (entry.status === 'gap' && entry.gapReason) return { status: 'gap', periodEnd: entry.periodEnd, reason: entry.gapReason }
    const facts = data().facts.filter((fact) => fact.periodEnd === entry.periodEnd)
    if (facts.length === 0) return unavailable('not_in_sample')
    const first = facts[0]
    return {
      status: 'ok',
      periodEnd: entry.periodEnd,
      releaseId: first.releaseId,
      sourceUrl: first.sourceUrl,
      originalSha256: first.originalSha256,
      facts,
    }
  },
}
