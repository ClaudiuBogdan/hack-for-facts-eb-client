import type {
  CompanyLitigationResult,
  CourtCaseloadResult,
  CaseSearchResult,
  JudicialCaseDetail,
  JusticeOverview,
} from '@/schemas/justice'

/**
 * Mock fixtures for the justice domain.
 *
 * Known ids (for later screenshots):
 * - court:            TB-BUCURESTI
 * - case:             portal-just-bucuresti-2024-001
 * - company CUI:      14399840
 *
 * Romanian-ish public institution / company mock names are used. No real
 * legal accusations are invented — labels are neutral ("litigiu comercial",
 * "litigiu fiscal") and case objects describe procedural status only.
 */

const PORTAL_JUST_PROVENANCE = {
  status: 'mock' as const,
  source: 'portal_just' as const,
  retrievedAt: '2026-06-20T09:00:00Z',
  lastModifiedAt: '2026-06-18T00:00:00Z',
  coverageNote: 'date dense din 2021 • fără ICCJ • doar metadata',
}

const GATED_LANE_AVAILABILITY = {
  companyCandidates: 'gated' as const,
  legalReferences: 'gated' as const,
  lineage: 'gated' as const,
}

const PARTIAL_PROVENANCE = {
  ...PORTAL_JUST_PROVENANCE,
  status: 'partial' as const,
  coverageNote:
    'date dense din 2021 • fără ICCJ • litigantii publicabili pot fi incompleti',
}

const STALE_PROVENANCE = {
  ...PORTAL_JUST_PROVENANCE,
  status: 'stale' as const,
  retrievedAt: '2026-03-05T09:00:00Z',
  lastModifiedAt: '2026-03-01T00:00:00Z',
  coverageNote: 'date dense din 2021 • fără ICCJ • snapshot mock mai vechi',
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export const mockJusticeOverview: JusticeOverview = {
  totals: {
    cases: 6_334_777,
    hearings: 18_620_000,
    appeals: 2_250_000,
    partyMentions: 16_760_000,
    courts: 246,
    publishableNameKeys: 745_538,
  },
  coverage: {
    denseSinceYear: 2021,
    yearCounts: [
      { year: 2026, count: 475_000 },
      { year: 2025, count: 1_270_000 },
      { year: 2024, count: 1_440_000 },
      { year: 2023, count: 1_340_000 },
      { year: 2022, count: 458_000 },
      { year: 2021, count: 153_000 },
      { year: 2020, count: 59_000 },
    ],
    nonStandardNumberCount: 757_000,
    iccjIncluded: false,
    hasCaseDocuments: false,
    personsNamed: false,
  },
  byTier: [
    { tier: 'judecatorie', courtCount: 179, caseCount: 3_900_000 },
    { tier: 'tribunal', courtCount: 46, caseCount: 1_700_000 },
    { tier: 'tribunal_militar', courtCount: 5, caseCount: 40_000 },
    { tier: 'curte_de_apel', courtCount: 15, caseCount: 690_000 },
    { tier: 'curte_militara_apel', courtCount: 1, caseCount: 4_777 },
  ],
  topCourts: [
    { institutionCode: 'TB-BUCURESTI', courtName: 'Tribunalul București', caseCount: 312_000 },
    { institutionCode: 'JU-BUCURESTI-1', courtName: 'Judecătoria București Sector 1', caseCount: 188_000 },
    { institutionCode: 'TB-CLUJ', courtName: 'Tribunalul Cluj', caseCount: 142_000 },
    { institutionCode: 'CA-BUCURESTI', courtName: 'Curtea de Apel București', caseCount: 128_000 },
    { institutionCode: 'TB-TIMIS', courtName: 'Tribunalul Timiș', caseCount: 96_000 },
  ],
  provenance: PORTAL_JUST_PROVENANCE,
}

export const mockJusticeOverviewPartial: JusticeOverview = {
  ...mockJusticeOverview,
  topCourts: [],
  provenance: PARTIAL_PROVENANCE,
}

export const mockJusticeOverviewStale: JusticeOverview = {
  ...mockJusticeOverview,
  provenance: STALE_PROVENANCE,
}

// ---------------------------------------------------------------------------
// Court caseload — Tribunalul București (TB-BUCURESTI)
// ---------------------------------------------------------------------------

export const mockCourtCaseloadBucuresti: CourtCaseloadResult = {
  court: {
    institutionCode: 'TB-BUCURESTI',
    courtName: 'Tribunalul București',
    ordinal: 1,
    courtLevel: 'tribunal',
    specialization: null,
    locality: 'București',
    countyCode: 'B',
    countyName: 'București',
    parentInstitutionCode: 'CA-BUCURESTI',
    mappingConfidence: 'high',
    parentCourtName: 'Curtea de Apel București',
  },
  headline: {
    totalCases: 312_000,
    totalHearings: 940_000,
    totalAppeals: 41_200,
    appealRatePct: 13.2,
    yearRange: { min: 2018, max: 2026 },
  },
  volumeByYear: [
    { year: 2026, count: 21_000 },
    { year: 2025, count: 64_000 },
    { year: 2024, count: 72_000 },
    { year: 2023, count: 68_000 },
    { year: 2022, count: 31_000 },
    { year: 2021, count: 24_000 },
    { year: 2020, count: 12_000 },
    { year: 2019, count: 11_000 },
    { year: 2018, count: 9_000 },
  ],
  byCategory: [
    { category: 'civil', categoryName: 'Litigii civile', count: 121_000 },
    { category: 'comercial', categoryName: 'Litigii comerciale', count: 78_000 },
    { category: 'penal', categoryName: 'Cauze penale', count: 44_000 },
    { category: 'administrativ', categoryName: 'Litigii administrativ-fiscale', count: 39_000 },
    { category: 'muncii', categoryName: 'Litigii de muncă', count: 18_000 },
    { category: 'familie', categoryName: 'Cauze de familie', count: 12_000 },
  ],
  byStage: [
    { stage: 'solutionat', stageName: 'Solutionat', count: 198_000 },
    { stage: 'in_curs', stageName: 'În curs', count: 71_000 },
    { stage: 'suspendat', stageName: 'Suspendat', count: 21_000 },
    { stage: 'revizuit', stageName: 'Revizuit', count: 14_000 },
    { stage: 'arhivat', stageName: 'Arhivat', count: 8_000 },
  ],
  topLitigants: [
    {
      nameKey: 'sct-prahova-administratie-publica',
      displayName: 'S.C. EXEMPLU PRHO SA',
      partyKind: 'company',
      mentionCount: 1840,
      confidence: { tier: 'A', method: 'name-key-exact', validationStatus: 'candidate' },
    },
    {
      nameKey: 'primaria-municipiului-bucuresti',
      displayName: 'Primaria Municipiului București',
      partyKind: 'public_entity',
      mentionCount: 1620,
      confidence: { tier: 'A', method: 'name-key-exact', validationStatus: 'candidate' },
    },
    {
      nameKey: 'compania-nationala-exemplu-sa',
      displayName: 'Compania Națională Exemplu SA',
      partyKind: 'company',
      mentionCount: 980,
      confidence: { tier: 'B', method: 'name-key-normalized', validationStatus: 'needs_review' },
    },
  ],
  laneAvailability: GATED_LANE_AVAILABILITY,
  provenance: PORTAL_JUST_PROVENANCE,
}

export const mockCourtCaseloadSmallJudecatorie: CourtCaseloadResult = {
  court: {
    institutionCode: 'JU-MOCK-MIC',
    courtName: 'Judecătoria Mock Mică',
    ordinal: 12,
    courtLevel: 'judecatorie',
    specialization: null,
    locality: 'Oraș Exemplu',
    countyCode: 'CJ',
    countyName: 'Cluj',
    parentInstitutionCode: 'TB-CLUJ',
    mappingConfidence: 'high',
    parentCourtName: 'Tribunalul Cluj',
  },
  headline: {
    totalCases: 1840,
    totalHearings: 3910,
    totalAppeals: 112,
    appealRatePct: 6.1,
    yearRange: { min: 2020, max: 2026 },
  },
  volumeByYear: [
    { year: 2026, count: 120 },
    { year: 2025, count: 430 },
    { year: 2024, count: 510 },
    { year: 2023, count: 410 },
    { year: 2022, count: 220 },
    { year: 2021, count: 110 },
    { year: 2020, count: 40 },
  ],
  byCategory: [
    { category: 'civil', categoryName: 'Litigii civile', count: 780 },
    { category: 'familie', categoryName: 'Cauze de familie', count: 410 },
    { category: 'contraventional', categoryName: 'Contravenții', count: 250 },
  ],
  byStage: [
    { stage: 'solutionat', stageName: 'Soluționat', count: 1220 },
    { stage: 'in_curs', stageName: 'În curs', count: 470 },
    { stage: 'suspendat', stageName: 'Suspendat', count: 150 },
  ],
  topLitigants: [],
  laneAvailability: GATED_LANE_AVAILABILITY,
  provenance: {
    ...PORTAL_JUST_PROVENANCE,
    coverageNote:
      'date dense din 2021 • instanță mică mock • litiganti publicabili indisponibili',
  },
}

export const mockCourtCaseloadMilitary: CourtCaseloadResult = {
  court: {
    institutionCode: 'TM-MOCK',
    courtName: 'Tribunalul Militar Mock',
    ordinal: 3,
    courtLevel: 'tribunal_militar',
    specialization: 'militar',
    locality: 'București',
    countyCode: 'B',
    countyName: 'București',
    parentInstitutionCode: 'CMA-MOCK',
    mappingConfidence: 'high',
    parentCourtName: 'Curtea Militară de Apel Mock',
  },
  headline: {
    totalCases: 620,
    totalHearings: 1480,
    totalAppeals: 51,
    appealRatePct: 8.2,
    yearRange: { min: 2021, max: 2026 },
  },
  volumeByYear: [
    { year: 2026, count: 44 },
    { year: 2025, count: 132 },
    { year: 2024, count: 158 },
    { year: 2023, count: 121 },
    { year: 2022, count: 96 },
    { year: 2021, count: 69 },
  ],
  byCategory: [
    { category: 'penal', categoryName: 'Cauze penale', count: 460 },
    { category: 'disciplinar', categoryName: 'Cauze disciplinare', count: 160 },
  ],
  byStage: [
    { stage: 'solutionat', stageName: 'Soluționat', count: 510 },
    { stage: 'in_curs', stageName: 'În curs', count: 110 },
  ],
  topLitigants: [],
  laneAvailability: GATED_LANE_AVAILABILITY,
  provenance: {
    ...PORTAL_JUST_PROVENANCE,
    coverageNote: 'date dense din 2021 • instanță militară mock • fără ICCJ',
  },
}

export const mockCourtCaseloadMediumConfidence: CourtCaseloadResult = {
  ...mockCourtCaseloadBucuresti,
  court: {
    ...mockCourtCaseloadBucuresti.court,
    institutionCode: 'CA-MOCK-MEDIUM',
    courtName: 'Curtea de Apel Mock cu mapare medie',
    courtLevel: 'curte_de_apel',
    locality: 'Municipiu Exemplu',
    countyCode: 'MS',
    countyName: 'Mureș',
    parentInstitutionCode: null,
    parentCourtName: null,
    mappingConfidence: 'medium',
  },
  headline: {
    totalCases: 22_400,
    totalHearings: 58_300,
    totalAppeals: 5200,
    appealRatePct: 23.2,
    yearRange: { min: 2021, max: 2026 },
  },
  volumeByYear: [
    { year: 2026, count: 1500 },
    { year: 2025, count: 4700 },
    { year: 2024, count: 5400 },
    { year: 2023, count: 5100 },
    { year: 2022, count: 3500 },
    { year: 2021, count: 2200 },
  ],
  topLitigants: mockCourtCaseloadBucuresti.topLitigants.slice(0, 2),
  provenance: {
    ...PARTIAL_PROVENANCE,
    coverageNote:
      'date dense din 2021 • mapare instanță cu încredere medie • fără ICCJ',
  },
}

export const mockCourtCaseloadZeroCoverage: CourtCaseloadResult = {
  court: {
    institutionCode: 'NO-COVERAGE',
    courtName: 'Judecătoria fără acoperire mock',
    ordinal: 99,
    courtLevel: 'judecatorie',
    specialization: null,
    locality: 'Localitate fără acoperire mock',
    countyCode: 'MM',
    countyName: 'Maramureș',
    parentInstitutionCode: 'TB-MARAMURES',
    mappingConfidence: 'high',
    parentCourtName: 'Tribunalul Maramureș',
  },
  headline: {
    totalCases: 0,
    totalHearings: 0,
    totalAppeals: 0,
    appealRatePct: null,
    yearRange: { min: 2021, max: 2026 },
  },
  volumeByYear: [],
  byCategory: [],
  byStage: [],
  topLitigants: [],
  laneAvailability: GATED_LANE_AVAILABILITY,
  provenance: {
    ...PORTAL_JUST_PROVENANCE,
    status: 'partial',
    coverageNote:
      'instanță mapată, dar fără cauze în acoperirea mock curentă • nu înseamnă inexistență',
  },
}

// ---------------------------------------------------------------------------
// Judicial case detail — portal-just-bucuresti-2024-001
// ---------------------------------------------------------------------------

export const mockJudicialCaseBucuresti2024: JudicialCaseDetail = {
  case: {
    caseId: 'portal-just-bucuresti-2024-001',
    sourceSlug: 'portal_just',
    institutionCode: 'TB-BUCURESTI',
    caseNumber: '1234/3/2024',
    caseNumberOld: '1234/2023',
    department: 'Secția civilă',
    category: 'comercial',
    categoryName: 'Litigii comerciale',
    stage: 'in_curs',
    stageName: 'În curs',
    object: 'Litigiu comercial privind executarea unui contract. Stadiu procedural: administrarea probelor.',
    sourceOpenedAt: '2024-02-14T00:00:00Z',
    latestSourceModifiedAt: '2026-05-30T00:00:00Z',
    firstSeenAt: '2024-02-15T00:00:00Z',
    lastSeenAt: '2026-06-18T00:00:00Z',
    courtName: 'Tribunalul București',
    courtId: 'TB-BUCURESTI',
  },
  hearings: [
    {
      hearingIndex: 1,
      hearingAt: '2024-03-12T00:00:00Z',
      panel: 'Complet civil',
      solution: null,
      solutionSummary: 'Comunicare acte și stabilire termen.',
      pronouncementDate: '2024-03-12T00:00:00Z',
      documentNumber: '12/2024',
      documentDate: '2024-03-12T00:00:00Z',
    },
    {
      hearingIndex: 2,
      hearingAt: '2024-05-08T00:00:00Z',
      panel: 'Complet civil',
      solution: null,
      solutionSummary: 'Administrare probe documentare.',
      pronouncementDate: '2024-05-08T00:00:00Z',
      documentNumber: '34/2024',
      documentDate: '2024-05-08T00:00:00Z',
    },
    {
      hearingIndex: 3,
      hearingAt: '2025-01-21T00:00:00Z',
      panel: 'Complet civil',
      solution: null,
      solutionSummary: 'Amânare cauză la cererea părților.',
      pronouncementDate: '2025-01-21T00:00:00Z',
      documentNumber: '8/2025',
      documentDate: '2025-01-21T00:00:00Z',
    },
  ],
  appeals: [
    {
      appealIndex: 1,
      appealDeclaredAt: '2025-06-10T00:00:00Z',
      appealType: 'apel principal',
    },
  ],
  parties: {
    named: [
      {
        partyIndex: 1,
        displayName: 'S.C. EXEMPLU COMERCIAL SA',
        legalForm: 'SA',
        partyKind: 'company',
        roleNormalized: 'Reclamant',
        nameKey: 'sc-exemplu-comercial-sa',
      },
      {
        partyIndex: 2,
        displayName: 'Regia Autonomă Exemplu București',
        legalForm: 'RA',
        partyKind: 'public_entity',
        roleNormalized: 'Pârât',
        nameKey: 'regia-autonoma-exemplu-bucuresti',
      },
    ],
    personCountsByRole: [
      { role: 'Martor', count: 2 },
      { role: 'Expert', count: 1 },
    ],
    unknownCountsByRole: [{ role: 'Pârât', count: 1 }],
  },
  legalReferences: [],
  laneAvailability: GATED_LANE_AVAILABILITY,
  provenance: PORTAL_JUST_PROVENANCE,
}

export const mockJudicialCaseSparsePersonsOnly: JudicialCaseDetail = {
  case: {
    caseId: 'portal-just-sparse-persons',
    sourceSlug: 'portal_just',
    institutionCode: 'JU-MOCK-MIC',
    caseNumber: '88/99/2021',
    caseNumberOld: null,
    department: null,
    category: 'civil',
    categoryName: 'Litigii civile',
    stage: 'solutionat',
    stageName: 'Soluționat',
    object: null,
    sourceOpenedAt: '2021-04-05T00:00:00Z',
    latestSourceModifiedAt: '2021-11-12T00:00:00Z',
    firstSeenAt: '2021-04-06T00:00:00Z',
    lastSeenAt: '2021-11-12T00:00:00Z',
    courtName: 'Judecătoria Mock Mică',
    courtId: 'JU-MOCK-MIC',
  },
  hearings: [
    {
      hearingIndex: 1,
      hearingAt: '2021-06-10T00:00:00Z',
      panel: null,
      solution: null,
      solutionSummary: 'Termen procedural înregistrat în portal.',
      pronouncementDate: null,
      documentNumber: null,
      documentDate: null,
    },
  ],
  appeals: [],
  parties: {
    named: [],
    personCountsByRole: [
      { role: 'Reclamant', count: 1 },
      { role: 'Pârât', count: 1 },
    ],
    unknownCountsByRole: [],
  },
  legalReferences: [],
  laneAvailability: GATED_LANE_AVAILABILITY,
  provenance: {
    ...PARTIAL_PROVENANCE,
    coverageNote:
      'dosar mock cu doar părți nepublicabile • persoanele sunt agregate pe rol',
  },
}

export const mockJudicialCaseNonStandardNumber: JudicialCaseDetail = {
  ...mockJudicialCaseBucuresti2024,
  case: {
    ...mockJudicialCaseBucuresti2024.case,
    caseId: 'portal-just-nonstandard-number',
    caseNumber: 'DS-LOCAL-2020-EXEMPLU',
    caseNumberOld: null,
    sourceOpenedAt: '2020-09-15T00:00:00Z',
    latestSourceModifiedAt: '2021-01-20T00:00:00Z',
    firstSeenAt: '2020-09-16T00:00:00Z',
    lastSeenAt: '2021-01-20T00:00:00Z',
  },
  hearings: mockJudicialCaseBucuresti2024.hearings.slice(0, 1),
  appeals: [],
  provenance: {
    ...STALE_PROVENANCE,
    coverageNote:
      'număr de dosar non-standard în fixture mock • acoperire subțire înainte de 2021',
  },
}

export const mockJudicialCaseLegalRefsLive: JudicialCaseDetail = {
  ...mockJudicialCaseBucuresti2024,
  case: {
    ...mockJudicialCaseBucuresti2024.case,
    caseId: 'portal-just-legal-refs-live',
    caseNumber: '555/3/2025',
    sourceOpenedAt: '2025-03-03T00:00:00Z',
    latestSourceModifiedAt: '2026-02-10T00:00:00Z',
    firstSeenAt: '2025-03-04T00:00:00Z',
    lastSeenAt: '2026-02-10T00:00:00Z',
  },
  legalReferences: [
    {
      rawCitation: 'Legea nr. 98/2016',
      targetActId: 'lege-98-2016',
      resolutionStatus: 'unique',
    },
    {
      rawCitation: 'art. 127 Cod procedură civilă',
      targetActId: null,
      resolutionStatus: 'ambiguous',
    },
  ],
  laneAvailability: {
    ...GATED_LANE_AVAILABILITY,
    legalReferences: 'live',
  },
  provenance: {
    ...PORTAL_JUST_PROVENANCE,
    coverageNote:
      'referințe legale mock rezolvate parțial • fără documente de dosar',
  },
}

// ---------------------------------------------------------------------------
// Case search result (default recent sort)
// ---------------------------------------------------------------------------

export const mockCaseSearchResult: CaseSearchResult = {
  rows: [
    {
      caseId: 'portal-just-bucuresti-2024-001',
      institutionCode: 'TB-BUCURESTI',
      courtLevel: 'tribunal',
      courtName: 'Tribunalul București',
      caseNumber: '1234/3/2024',
      stage: 'in_curs',
      stageName: 'În curs',
      category: 'comercial',
      categoryName: 'Litigii comerciale',
      sourceOpenedAt: '2024-02-14T00:00:00Z',
      latestHearingAt: '2025-01-21T00:00:00Z',
      hasAppeal: true,
      namedPartiesPreview: [
        {
          displayName: 'S.C. EXEMPLU COMERCIAL SA',
          role: 'Reclamant',
          partyKind: 'company',
          nameKey: 'sc-exemplu-comercial-sa',
        },
        {
          displayName: 'Regia Autonomă Exemplu București',
          role: 'Pârât',
          partyKind: 'public_entity',
          nameKey: 'regia-autonoma-exemplu-bucuresti',
        },
      ],
      personPartyCount: 3,
    },
    {
      caseId: 'portal-just-cluj-2025-0042',
      institutionCode: 'TB-CLUJ',
      courtLevel: 'tribunal',
      courtName: 'Tribunalul Cluj',
      caseNumber: '42/2/2025',
      stage: 'solutionat',
      stageName: 'Soluționat',
      category: 'administrativ',
      categoryName: 'Litigii administrativ-fiscale',
      sourceOpenedAt: '2025-01-09T00:00:00Z',
      latestHearingAt: '2025-11-04T00:00:00Z',
      hasAppeal: false,
      namedPartiesPreview: [
        {
          displayName: 'Primăria Municipiului Cluj-Napoca',
          role: 'Pârât',
          partyKind: 'public_entity',
          nameKey: 'primaria-municipiului-cluj-napoca',
        },
      ],
      personPartyCount: 1,
    },
    {
      caseId: 'portal-just-timis-2023-0909',
      institutionCode: 'TB-TIMIS',
      courtLevel: 'tribunal',
      courtName: 'Tribunalul Timiș',
      caseNumber: '909/4/2023',
      stage: 'revizuit',
      stageName: 'Revizuit',
      category: 'muncii',
      categoryName: 'Litigii de muncă',
      sourceOpenedAt: '2023-07-22T00:00:00Z',
      latestHearingAt: '2024-09-30T00:00:00Z',
      hasAppeal: true,
      namedPartiesPreview: [],
      personPartyCount: 4,
    },
  ],
  facets: {
    tiers: [
      { value: 'tribunal', count: 2 },
      { value: 'judecatorie', count: 0 },
      { value: 'curte_de_apel', count: 0 },
    ],
    categories: [
      { value: 'comercial', label: 'Litigii comerciale', count: 1 },
      { value: 'administrativ', label: 'Litigii administrativ-fiscale', count: 1 },
      { value: 'muncii', label: 'Litigii de muncă', count: 1 },
    ],
    stages: [
      { value: 'in_curs', label: 'În curs', count: 1 },
      { value: 'solutionat', label: 'Soluționat', count: 1 },
      { value: 'revizuit', label: 'Revizuit', count: 1 },
    ],
    roles: [
      { value: 'Reclamant', count: 1 },
      { value: 'Pârât', count: 2 },
    ],
    years: [
      { year: 2025, count: 1 },
      { year: 2024, count: 1 },
      { year: 2023, count: 1 },
    ],
  },
  pagination: { page: 1, pageSize: 25, total: 3 },
  provenance: PORTAL_JUST_PROVENANCE,
}

// ---------------------------------------------------------------------------
// Company litigation — CUI 14399840 (gated v1 default)
// ---------------------------------------------------------------------------

export const mockCompanyLitigationGated: CompanyLitigationResult = {
  cui: '14399840',
  matchedNameKeys: [],
  headline: {
    totalCases: null,
    asPartyKind: 'company',
  },
  cases: [],
  pagination: { page: 1, pageSize: 25, total: null },
  summary: {
    topCourts: [],
    topCategories: [],
    yearTrend: [],
  },
  laneAvailability: { companyCandidates: 'gated' },
  provenance: PORTAL_JUST_PROVENANCE,
}

export const mockCompanyLitigationPublicEntity: CompanyLitigationResult = {
  cui: '9000001',
  matchedNameKeys: [
    {
      nameKey: 'primaria-municipiului-cluj-napoca',
      displayName: 'Primăria Municipiului Cluj-Napoca',
      partyKind: 'public_entity',
      confidence: {
        tier: 'A',
        method: 'publishable-name-key-exact',
        validationStatus: 'candidate',
      },
    },
  ],
  headline: {
    totalCases: 2,
    asPartyKind: 'public_entity',
  },
  cases: [
    {
      caseId: 'portal-just-cluj-2025-0042',
      institutionCode: 'TB-CLUJ',
      courtName: 'Tribunalul Cluj',
      caseNumber: '42/2/2025',
      stageName: 'Soluționat',
      categoryName: 'Litigii administrativ-fiscale',
      latestHearingAt: '2025-11-04T00:00:00Z',
      role: 'Pârât',
    },
    {
      caseId: 'portal-just-bucuresti-2024-001',
      institutionCode: 'TB-BUCURESTI',
      courtName: 'Tribunalul București',
      caseNumber: '1234/3/2024',
      stageName: 'În curs',
      categoryName: 'Litigii comerciale',
      latestHearingAt: '2025-01-21T00:00:00Z',
      role: 'Terț',
    },
  ],
  pagination: { page: 1, pageSize: 25, total: 2 },
  summary: {
    topCourts: [
      { institutionCode: 'TB-CLUJ', courtName: 'Tribunalul Cluj', count: 1 },
      { institutionCode: 'TB-BUCURESTI', courtName: 'Tribunalul București', count: 1 },
    ],
    topCategories: [
      { category: 'administrativ', categoryName: 'Litigii administrativ-fiscale', count: 1 },
      { category: 'comercial', categoryName: 'Litigii comerciale', count: 1 },
    ],
    yearTrend: [
      { year: 2025, count: 1 },
      { year: 2024, count: 1 },
    ],
  },
  laneAvailability: { companyCandidates: 'live' },
  provenance: PORTAL_JUST_PROVENANCE,
}

export const mockCompanyLitigationCandidateCompany: CompanyLitigationResult = {
  cui: '9000002',
  matchedNameKeys: [
    {
      nameKey: 'sc-exemplu-comercial-sa',
      displayName: 'S.C. EXEMPLU COMERCIAL SA',
      partyKind: 'company',
      confidence: {
        tier: 'B',
        method: 'normalized-name-candidate',
        validationStatus: 'needs_review',
      },
    },
  ],
  headline: {
    totalCases: 1,
    asPartyKind: 'company',
  },
  cases: [
    {
      caseId: 'portal-just-bucuresti-2024-001',
      institutionCode: 'TB-BUCURESTI',
      courtName: 'Tribunalul București',
      caseNumber: '1234/3/2024',
      stageName: 'În curs',
      categoryName: 'Litigii comerciale',
      latestHearingAt: '2025-01-21T00:00:00Z',
      role: 'Reclamant',
    },
  ],
  pagination: { page: 1, pageSize: 25, total: 1 },
  summary: {
    topCourts: [
      { institutionCode: 'TB-BUCURESTI', courtName: 'Tribunalul București', count: 1 },
    ],
    topCategories: [
      { category: 'comercial', categoryName: 'Litigii comerciale', count: 1 },
    ],
    yearTrend: [{ year: 2024, count: 1 }],
  },
  laneAvailability: { companyCandidates: 'live' },
  provenance: {
    ...PORTAL_JUST_PROVENANCE,
    status: 'unverified',
    coverageNote:
      'legătură companie-dosar pe bază de nume • candidat, necesită verificare',
  },
}

export const mockCompanyLitigationNoCases: CompanyLitigationResult = {
  cui: '9000003',
  matchedNameKeys: [
    {
      nameKey: 'companie-fara-cauze-acoperite',
      displayName: 'Companie Exemplu fără cauze acoperite',
      partyKind: 'company',
      confidence: {
        tier: 'A',
        method: 'publishable-name-key-exact',
        validationStatus: 'candidate',
      },
    },
  ],
  headline: {
    totalCases: 0,
    asPartyKind: 'company',
  },
  cases: [],
  pagination: { page: 1, pageSize: 25, total: 0 },
  summary: {
    topCourts: [],
    topCategories: [],
    yearTrend: [],
  },
  laneAvailability: { companyCandidates: 'live' },
  provenance: {
    ...PORTAL_JUST_PROVENANCE,
    status: 'partial',
    coverageNote:
      'cheie publicabilă potrivită, dar fără cauze în intervalul acoperit mock',
  },
}

export function getMockCourtCaseload(courtId: string): CourtCaseloadResult | null {
  if (courtId === 'TB-BUCURESTI') {
    return mockCourtCaseloadBucuresti
  }
  if (courtId === 'JU-MOCK-MIC') {
    return mockCourtCaseloadSmallJudecatorie
  }
  if (courtId === 'TM-MOCK') {
    return mockCourtCaseloadMilitary
  }
  if (courtId === 'CA-MOCK-MEDIUM') {
    return mockCourtCaseloadMediumConfidence
  }
  if (courtId === 'NO-COVERAGE') {
    return mockCourtCaseloadZeroCoverage
  }
  if (courtId === 'STALE-MOCK') {
    return {
      ...mockCourtCaseloadBucuresti,
      court: {
        ...mockCourtCaseloadBucuresti.court,
        institutionCode: 'STALE-MOCK',
        courtName: 'Tribunal mock cu date învechite',
      },
      provenance: STALE_PROVENANCE,
    }
  }
  return null
}

export function getMockCompanyLitigation(cui: string): CompanyLitigationResult {
  if (cui === '9000001') {
    return mockCompanyLitigationPublicEntity
  }
  if (cui === '9000002') {
    return mockCompanyLitigationCandidateCompany
  }
  if (cui === '9000003') {
    return mockCompanyLitigationNoCases
  }
  return {
    ...mockCompanyLitigationGated,
    cui,
  }
}

export function getMockJudicialCase(caseId: string): JudicialCaseDetail | null {
  if (caseId === 'portal-just-bucuresti-2024-001') {
    return mockJudicialCaseBucuresti2024
  }
  if (caseId === 'portal-just-sparse-persons') {
    return mockJudicialCaseSparsePersonsOnly
  }
  if (caseId === 'portal-just-nonstandard-number') {
    return mockJudicialCaseNonStandardNumber
  }
  if (caseId === 'portal-just-legal-refs-live') {
    return mockJudicialCaseLegalRefsLive
  }
  return null
}
