import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { privateCompanyProfileSchema } from '@/schemas/private-company'
import { mapCompanyProfile } from './company-mappers'
import {
  COMPANY_PROFILE_QUERY,
  COMPANY_PROFILE_QUERY_LEGACY,
  COMPANY_PROFILE_QUERY_WITHOUT_MAIN,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN,
  COMPANY_STATEMENT_FILES_QUERY,
  companyProfileResponseSchema,
  companyStatementFilesResponseSchema,
} from './company-queries'

const DOCUMENTS = {
  current: COMPANY_PROFILE_QUERY,
  withoutMain: COMPANY_PROFILE_QUERY_WITHOUT_MAIN,
  withoutSelection: COMPANY_PROFILE_QUERY_WITHOUT_SELECTION,
  withoutSelectionOrMain: COMPANY_PROFILE_QUERY_WITHOUT_SELECTION_OR_MAIN,
  legacy: COMPANY_PROFILE_QUERY_LEGACY,
}

/** A document's selection as a tree: a field with sub-fields is an object, a leaf is `true` (arguments skipped). */
type Selection = { readonly [field: string]: Selection | true }

function selectionOf(document: string): Selection {
  const tokens: readonly string[] = document.match(/[_A-Za-z][_0-9A-Za-z]*|[^\s]/gu) ?? []
  let at = tokens.indexOf('{')
  const block = (): Selection => {
    at += 1
    const fields: Record<string, Selection | true> = {}
    while (tokens[at] !== '}') {
      const name = tokens[at] ?? ''
      at += 1
      if (tokens[at] === '(') at = tokens.indexOf(')', at) + 1
      fields[name] = tokens[at] === '{' ? block() : true
    }
    at += 1
    return fields
  }
  return block()
}

/** Every field path of a selection, dotted (`company.registry.cuiState`). */
function pathsOf(selection: Selection, prefix = ''): string[] {
  return Object.entries(selection).flatMap(([name, sub]) => {
    const path = prefix ? `${prefix}.${name}` : name
    return sub === true ? [path] : [path, ...pathsOf(sub, path)]
  })
}

/** The raw schema's required keys the selection does not ask for: each would fail the whole profile's parse. */
function unselectedRequired(schema: z.ZodType, selection: Selection | true, at: string): string[] {
  const def = (schema as unknown as { def: { type: string } }).def
  const inner = schema as unknown as { unwrap?: () => z.ZodType; element?: z.ZodType; shape?: Record<string, z.ZodType> }
  if ((def.type === 'optional' || def.type === 'nullable' || def.type === 'default') && inner.unwrap) return unselectedRequired(inner.unwrap(), selection, at)
  if (def.type === 'array' && inner.element) return unselectedRequired(inner.element, selection, at)
  if (def.type !== 'object' || !inner.shape || selection === true) return []
  return Object.entries(inner.shape).flatMap(([key, field]) => {
    const sub = selection[key]
    if (sub === undefined) return field.safeParse(undefined).success ? [] : [`${at}.${key}`]
    return unselectedRequired(field, sub, `${at}.${key}`)
  })
}

/** A recorded answer cut down to what a document selects: what the server would send for it. */
function project(value: unknown, selection: Selection | true): unknown {
  if (selection === true || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => project(item, selection))
  const record = value as Record<string, unknown>
  return Object.fromEntries(Object.entries(selection).filter(([key]) => key in record).map(([key, sub]) => [key, project(record[key], sub)]))
}

/** Fields the server serves and no page reads (payload trim, 27 November 2026): never asked again by accident. */
const NEVER_ASKED = [
  'company.representatives',
  'company.euBranches',
  'company.headlineStatus.labelSource',
  'company.address.display',
  'company.address.locality',
  'company.fiscal.registeredName',
  'company.caenActivities.labelSource',
  'company.registry.identityObservations',
  'company.registry.caenObservations',
  'company.registry.statusObservations',
  'company.registry.profile.name',
  'company.registry.profile.countyName',
  'company.registry.profile.uatName',
  'company.registry.profile.caenCoverage',
  'company.registry.profile.statusCoverage',
  'company.registry.profile.identityObservations',
  'company.registry.profile.identifierCount',
  'company.registry.profile.unresolvedIdentifierCount',
  'company.registry.profile.unidentifiedObservations',
  'company.registry.identifiers.identityRowCount',
  'company.registry.identifiers.countyBasis',
  'company.registry.identifiers.caenObservations',
  'company.registry.identifiers.unknownRevisionCaenObservations',
  'companyFinancials.years.source.sourceSystem',
  'companyFinancials.years.source.statementProfileHash',
  'companyFinancials.years.source.metricRuleVersion',
  'companyFinancials.years.source.selectionBasis',
  'companyFinancials.years.qualification.holdDrift',
  // Read when a Ministry year opens (trim step 2a, 28 November 2026), by CompanyStatementFiles.
  'companyFinancials.years.source.contributingSources',
]

/** What the page's gates and bands read; most are nullable in the raw schema, so only this list keeps them asked. */
const ALWAYS_ASKED = [
  'company.registry.registry.scopeKey',
  'company.registry.cuiState',
  'company.registry.profile.statusCode.basis',
  'company.registry.profile.recordedDate.value',
  'company.registry.identifiers.hasActiveObservation',
  'company.registry.observationsTruncated',
  'company.caenActivities.source',
  'company.publicMoney.byYear.totalRon',
  'companyFinancials.years.summary',
  'companyFinancials.years.reportingForm',
  'companyFinancials.years.source.url',
  'companyFinancials.years.source.urlKind',
  ...['assessment', 'reason', 'releaseId', 'policyVersion', 'policySha256', 'policyApprovedOn', 'evaluatorVersion', 'netResultStatus', 'netResult', 'holdReason'].map(
    (field) => `companyFinancials.years.qualification.${field}`,
  ),
  'companyFinancials.years.qualification.metrics.metric',
  'companyFinancials.years.qualification.metrics.status',
  'companyFinancials.longFormOnly.resourceUrl',
  'companyFinancials.ifrsFormYears.sourceUrl',
  'companyFinancials.trajectory.netResultDeltaReason',
]

const RECORDED = ['abc-profile', 'ideatica-profile'].map((name) => ({
  name,
  data: (JSON.parse(readFileSync(resolve(process.cwd(), `tests/fixtures/companies-profile-flow/${name}.json`), 'utf8')) as { data: unknown }).data,
}))

describe('the CompanyProfile document', () => {
  it.each(Object.entries(DOCUMENTS))('%s asks for none of the fields no page reads', (_shape, document) => {
    const paths = new Set(pathsOf(selectionOf(document)))
    expect(NEVER_ASKED.filter((path) => paths.has(path))).toEqual([])
  })

  it.each(Object.entries(DOCUMENTS))('%s still asks for every field the page reads', (_shape, document) => {
    const paths = new Set(pathsOf(selectionOf(document)))
    expect(ALWAYS_ASKED.filter((path) => !paths.has(path))).toEqual([])
  })

  it.each(Object.entries(DOCUMENTS))('%s asks for every key the raw schema requires', (_shape, document) => {
    expect(unselectedRequired(companyProfileResponseSchema, selectionOf(document), 'data')).toEqual([])
  })

  it.each(Object.entries(DOCUMENTS))('%s: the recorded profiles, cut to its selection, parse and map', (_shape, document) => {
    const selection = selectionOf(document)
    for (const { name, data } of RECORDED) {
      const parsed = companyProfileResponseSchema.safeParse(project(data, selection))
      expect(parsed.success, `${name}: ${JSON.stringify(parsed.error?.issues ?? [])}`).toBe(true)
      const profile = parsed.success ? mapCompanyProfile(parsed.data) : null
      expect(profile, name).not.toBeNull()
      expect(() => privateCompanyProfileSchema.parse(profile)).not.toThrow()
    }
  })

  it('asks the registry profile only for the qualified fields the page shows, each with its basis', () => {
    const profile = selectionOf(COMPANY_PROFILE_QUERY).company
    const registry = profile === true || profile === undefined ? undefined : profile.registry
    const fields = registry === true || registry === undefined ? undefined : registry.profile
    expect(fields).toEqual({
      legalForm: { value: true, basis: true },
      recordedDate: { value: true, basis: true },
      countyCode: { value: true, basis: true },
      uatSirutaCode: { value: true, basis: true },
      statusCode: { value: true, basis: true },
    })
  })
})

describe('the CompanyStatementFiles document (trim step 2a)', () => {
  it('asks every key its raw schema requires, each year’s own link beside its files, and nothing more', () => {
    const selection = selectionOf(COMPANY_STATEMENT_FILES_QUERY)
    expect(unselectedRequired(companyStatementFilesResponseSchema, selection, 'data')).toEqual([])
    // Exactly these: nothing of the statement's values (they come with the profile), no snapshot ids.
    expect(pathsOf(selection).sort()).toEqual([
      'companyFinancials',
      'companyFinancials.years',
      'companyFinancials.years.source',
      'companyFinancials.years.source.contributingSources',
      'companyFinancials.years.source.contributingSources.indicators',
      'companyFinancials.years.source.contributingSources.indicators.code',
      'companyFinancials.years.source.contributingSources.indicators.name',
      'companyFinancials.years.source.contributingSources.rowNumber',
      'companyFinancials.years.source.contributingSources.url',
      'companyFinancials.years.source.url',
      'companyFinancials.years.year',
    ])
  })

})
