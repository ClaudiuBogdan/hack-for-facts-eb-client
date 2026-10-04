/**
 * Literal `searchEntities` answers shaped as the server serializes them under
 * the shared-search contract r2 (uppercase SDL enums, every selected field
 * present, null where the server sends null). Test-only: written from the
 * contract and the SDL, not captured from a producer or an oracle.
 */

// The generation-control contract's shapes: a build UID and a published scope key
// (`onrc:published:<edition>:<publicationEpoch>:<accessEpoch>`).
const SCOPE_41 = 'onrc:published:41:3:7'
const GENERATION_41 = { generationId: 'entities_build_1759593600000_k3x9q2', registryScopeKey: SCOPE_41 }

/** A company document: title, line and county are its fresh ONRC values. */
export const COMPANY_HIT = {
  id: 'company_2816464_x',
  docType: 'company',
  title: 'DEDEMAN SRL',
  snippet: 'SRL, Bacău',
  score: 0.98,
  docId: 'company:2816464',
  docKey: '2816464',
  subtitle: 'SRL, Bacău',
  countyName: 'Bacău',
  url: null,
  cuis: ['2816464'],
  identifiers: ['2816464', 'J04/2621/1992'],
  roles: ['company'],
  isActive: true,
  isUat: false,
  entityTags: [],
  ngoRegistryNumber: null,
  ngoRegistryStatus: null,
  company: {
    registryState: 'IN_EDITION',
    name: 'DEDEMAN SRL',
    nameSource: 'onrc_edition',
    legalForm: 'SRL',
    countyCode: 'BC',
    countyName: 'Bacău',
    active: true,
    identifiers: ['J04/2621/1992'],
  },
} as const

/** A company document whose activity the registry cannot tell: unknown, not active. */
export const UNKNOWN_ACTIVITY_HIT = {
  id: 'company_31234567_x',
  docType: 'company',
  title: 'EXEMPLU CONSTRUCT SRL',
  snippet: 'SRL, Cluj',
  score: 0.7,
  docId: 'company:31234567',
  docKey: '31234567',
  subtitle: 'SRL, Cluj',
  countyName: 'Cluj',
  url: null,
  cuis: ['31234567'],
  identifiers: ['31234567', 'J12/100/2013'],
  roles: ['company'],
  isActive: null,
  isUat: false,
  entityTags: [],
  ngoRegistryNumber: null,
  ngoRegistryStatus: null,
  company: {
    registryState: 'IN_EDITION',
    name: 'EXEMPLU CONSTRUCT SRL',
    nameSource: 'onrc_edition',
    legalForm: 'SRL',
    countyCode: 'CJ',
    countyName: 'Cluj',
    active: null,
    identifiers: ['J12/100/2013'],
  },
} as const

/**
 * A public enterprise whose core kind is company: its own title, line, roles
 * and link stay; the company part has no ONRC county, so the generic county
 * is its own institution's territory county (r2 §4).
 */
export const MIXED_ENTERPRISE_HIT = {
  id: 'pe_10020943_x',
  docType: 'public_enterprise',
  title: 'REGIA AUTONOMĂ EXEMPLU',
  snippet: 'Companie de stat',
  score: 0.61,
  docId: 'public_enterprise:core:10020943:2019',
  docKey: 'core:10020943:2019',
  subtitle: 'Companie de stat',
  countyName: 'Ilfov',
  url: null,
  cuis: ['10020943'],
  identifiers: ['10020943'],
  roles: ['organization', 'public_enterprise'],
  isActive: true,
  isUat: false,
  entityTags: [],
  ngoRegistryNumber: null,
  ngoRegistryStatus: null,
  company: {
    registryState: 'NOT_IN_EDITION',
    name: 'REGIA AUTONOMA EXEMPLU RA',
    nameSource: 'core_organization',
    legalForm: null,
    countyCode: null,
    countyName: null,
    active: null,
    identifiers: [],
  },
} as const

/** An institution: no company part, its own county and activity. */
export const INSTITUTION_HIT = {
  id: 'organization_4278337_x',
  docType: 'organization',
  title: 'MUNICIPIUL BACĂU',
  snippet: 'Municipiu · beneficiar PNRR',
  score: 0.72,
  docId: 'organization:4278337',
  docKey: '4278337',
  subtitle: 'Municipiu · beneficiar PNRR',
  countyName: 'Bacău',
  url: null,
  cuis: ['4278337'],
  identifiers: ['4278337'],
  roles: ['organization', 'pnrr_entity'],
  isActive: true,
  isUat: true,
  entityTags: [],
  ngoRegistryNumber: null,
  ngoRegistryStatus: null,
  company: null,
} as const

/** A legal act: its own key domain, untouched by the company part. */
export const LEGAL_ACT_HIT = {
  id: 'legal_act_doc_1_x',
  docType: 'legal_act',
  title: 'Legea 1/2017 privind achizițiile',
  snippet: 'Monitorul Oficial',
  score: 0.81,
  docId: '1',
  docKey: 'doc:1',
  subtitle: 'Monitorul Oficial',
  countyName: null,
  url: 'https://legislatie.just.ro/Public/DetaliiDocument/1',
  cuis: [],
  identifiers: ['Legea 1/2017'],
  roles: ['legal_act'],
  isActive: true,
  isUat: null,
  entityTags: [],
  ngoRegistryNumber: null,
  ngoRegistryStatus: null,
  company: null,
} as const

const DOC_TYPE_FACETS = [
  { field: 'doc_type', value: 'company', count: 300 },
  { field: 'doc_type', value: 'legal_act', count: 12 },
] as const

/** Page 1 at offset 0: current, four of twenty candidates visible, more follow. */
export const CURRENT_PAGE = {
  query: 'dedeman',
  engine: 'meili',
  degraded: false,
  estimatedTotalHits: 312,
  facets: DOC_TYPE_FACETS,
  hits: [COMPANY_HIT, MIXED_ENTERPRISE_HIT, INSTITUTION_HIT, UNKNOWN_ACTIVITY_HIT],
  generation: GENERATION_41,
  companyScope: SCOPE_41,
  companyContribution: 'CURRENT',
  companyContributionReason: null,
  continuation: { candidatesReturned: 20, nextOffset: 20 },
} as const

/** An initial page at offset 0 whose candidates were all withheld, with a next page. */
export const CURRENT_EMPTY_FIRST_PAGE_WITH_MORE = {
  ...CURRENT_PAGE,
  hits: [],
  continuation: { candidatesReturned: 20, nextOffset: 20 },
} as const

/** Page 2 at offset 20 of the same answer: every candidate withheld, and a next page still. */
export const CURRENT_EMPTY_PAGE_WITH_MORE = {
  ...CURRENT_PAGE,
  hits: [],
  continuation: { candidatesReturned: 20, nextOffset: 40 },
} as const

/** Page 3 at offset 40: the last, short candidate page, nothing visible on it. */
export const CURRENT_EMPTY_LAST_PAGE = {
  ...CURRENT_PAGE,
  hits: [],
  continuation: { candidatesReturned: 7, nextOffset: null },
} as const

/** A current answer with no candidate at all: the only real "no match". */
export const CURRENT_NO_MATCH = {
  ...CURRENT_PAGE,
  query: 'zzzqqq',
  estimatedTotalHits: 0,
  facets: [],
  hits: [],
  continuation: { candidatesReturned: 0, nextOffset: null },
} as const

/** Fresh values under edition 41, candidates from a generation built for 40. */
export const PARTIAL_PAGE = {
  ...CURRENT_PAGE,
  generation: { generationId: 'entities_build_1759507200000_p7m2c8', registryScopeKey: 'onrc:published:40:2:7' },
  companyContribution: 'PARTIAL',
  companyContributionReason: 'generation_scope_stale',
} as const

/**
 * No generation witnessed: no company value, no company document; the
 * institution keeps only its CUI and an unknown activity (r2 §4).
 */
export const UNAVAILABLE_PAGE = {
  ...CURRENT_PAGE,
  hits: [
    { ...INSTITUTION_HIT, isActive: null, identifiers: ['4278337'] },
    LEGAL_ACT_HIT,
  ],
  generation: null,
  companyScope: SCOPE_41,
  companyContribution: 'UNAVAILABLE',
  companyContributionReason: 'control_missing',
} as const

/** The fresh check failed: every CUI identity withheld, the page empty, the next page real. */
export const WITHHELD_EMPTY_PAGE_WITH_MORE = {
  ...CURRENT_PAGE,
  hits: [],
  companyScope: null,
  companyContribution: 'UNAVAILABLE',
  companyContributionReason: 'company_check_unavailable',
  continuation: { candidatesReturned: 20, nextOffset: 20 },
} as const

/** Its page 2 at offset 20, read the same way: an act is no CUI identity, so it is served. */
export const WITHHELD_NEXT_PAGE = {
  ...WITHHELD_EMPTY_PAGE_WITH_MORE,
  hits: [LEGAL_ACT_HIT],
  continuation: { candidatesReturned: 3, nextOffset: null },
} as const

/** Page 2 read under a newly established generation of the same scope. */
export const MOVED_GENERATION_PAGE = {
  ...CURRENT_PAGE,
  hits: [LEGAL_ACT_HIT],
  generation: { generationId: 'entities_build_1759600800000_z5w1n4', registryScopeKey: SCOPE_41 },
  continuation: { candidatesReturned: 20, nextOffset: 40 },
} as const

/** Page 2 read after the company scope moved to edition 42 (the generation is still 41's). */
export const MOVED_SCOPE_PAGE = {
  ...CURRENT_PAGE,
  hits: [LEGAL_ACT_HIT],
  companyScope: 'onrc:published:42:4:7',
  companyContribution: 'PARTIAL',
  companyContributionReason: 'generation_scope_stale',
  continuation: { candidatesReturned: 20, nextOffset: 40 },
} as const

/** The engine could not answer. */
export const DEGRADED_PAGE = {
  ...CURRENT_PAGE,
  engine: 'none',
  degraded: true,
  estimatedTotalHits: 0,
  facets: [],
  hits: [],
  generation: null,
  companyScope: null,
  companyContribution: 'UNAVAILABLE',
  companyContributionReason: 'engine_unavailable',
  continuation: { candidatesReturned: 0, nextOffset: null },
} as const

/** A GraphQL response body carrying one answer. */
export const answerBody = (searchEntities: unknown) => ({ data: { searchEntities } })

/** The server's final check refused the answer (r2 §5). */
export const REFUSED_BODY = {
  data: { searchEntities: null },
  errors: [
    {
      message: 'the company scope moved while the answer was served; retry',
      path: ['searchEntities'],
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    },
  ],
} as const
