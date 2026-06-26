/**
 * Mock legal fixtures — examples shaped after the source contracts in
 * `docs/ux-research/legal.md` §5 and `docs/design/legal/design.md` §7, NOT
 * source facts. These exist so the UI can be built and reviewed before the
 * live adapter is connected. Swap them out in `src/features/legal/api/`.
 *
 * Coverage policy mirror (monitorul-publication-card feature): pre-2012 MO
 * issues default to metadata-only (`hasFullText: false`); 2012+ default to
 * full-text (`hasFullText: true`). Fixtures follow that rule.
 */

import type {
  LandingData,
  LegalAct,
  LegalStatus,
} from '@/schemas/legal'

// ---------------------------------------------------------------------------
// Source provenance fixtures (shared)
// ---------------------------------------------------------------------------

export const sourceProvenancePortal = {
  sourceName: 'portal-legislativ',
  sourceUrl: 'https://legislatie.just.ro/lista-acte/lege-227-2015',
  retrievedAt: '2026-06-20T08:00:00Z',
  publishedAt: '2015-10-08',
  parserNotes:
    'Codul fiscal — act consolidat; textul canonic este republicarea 2024.',
  sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
} as const

export const sourceProvenanceMonitorul = {
  sourceName: 'monitorul-oficial',
  sourceUrl: 'https://monitoruloficial.ro/monitor/712/2015',
  retrievedAt: '2026-06-20T08:00:00Z',
  publishedAt: '2015-10-08',
  parserNotes: 'Număr din epoca text-layer (2012+); text integral disponibil.',
  sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
} as const

// ---------------------------------------------------------------------------
// Act 1 — Full: Legea nr. 227/2015 (Codul fiscal), status modificat
// ---------------------------------------------------------------------------

export const legea227_2015Act: LegalAct = {
  dataStatus: 'mock',
  actId: 'lege-227-2015',
  displayCitation: 'Legea nr. 227/2015',
  actType: 'lege',
  actNumber: '227',
  actYear: 2015,
  issuerSlug: 'parlament',
  issuerRaw: 'Parlamentul României',
  status: 'modificat',
  modificationCount: 137,
  entryIntoForce: '2016-01-01',
  canonicalDocumentId: 'lege-227-2015-republicare-2024',
  summary: {
    plainLanguageSummary:
      'Codul fiscal reglementează impozitele și taxele din România: impozitul pe profit, pe venit, pe valoarea adăugată, accizele și contribuțiile sociale. Actul a fost modificat de numeroase ori, iar versiunea canonică este republicarea din 2024. Este un act central pentru orice analiză a impactului fiscal asupra persoanelor fizice și juridice.',
    summary:
      'Legea codului fiscal — sistemul de impunere directă și indirectă.',
    description:
      'Legea nr. 227/2015 reglementează sistemul fiscal românesc.',
    domains: ['fiscal', 'economie', 'finante-publice'],
    affectedAudiences: [
      'persoane-fizice',
      'persoane-juridice',
      'institutii-publice',
      'oameni-afaceri',
    ],
    keywords: ['impozit', 'tva', 'accize', 'contributii', 'profit'],
    keyDates: [
      { label: 'Intrare în vigoare', date: '2016-01-01' },
      { label: 'Publicare în MO', date: '2015-10-08' },
      { label: 'Ultima republicare', date: '2024-01-01' },
    ],
    fiscalImpact:
      'Impact fiscal major — baza legală pentru colectarea veniturilor bugetare.',
    penaltiesMentioned: [
      'sancțiuni fiscale pentru declarare incorectă',
      'dobânzi penalizatoare pentru restanțe',
    ],
    confidence: 0.92,
    model: 'gpt-4o-legal-summarizer',
    promptVersion: 'legal-summary-v3.2',
  },
  versions: [
    {
      documentId: 'lege-227-2015-republicare-2024',
      versionKind: 'republicare',
      versionDate: '2024-01-01',
      isCanonical: true,
      extractionStatus: 'complete',
      moPart: 'PI',
      moNumber: '12',
      moDate: '2024-01-12',
    },
    {
      documentId: 'lege-227-2015-original',
      versionKind: 'original',
      versionDate: '2015-10-08',
      isCanonical: false,
      extractionStatus: 'complete',
      moPart: 'PI',
      moNumber: '712',
      moDate: '2015-10-08',
    },
  ],
  mo: {
    issueId: 'mo-712-2015',
    partCode: 'PI',
    issueNumber: '712',
    issueYear: 2015,
    issueDate: '2015-10-08',
    pageStart: 1,
    pageEnd: 248,
    pdfUrl: 'https://monitoruloficial.ro/monitor/712/2015.pdf',
    pdfSha256:
      'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
    hasFullText: true,
    resolution: 'unique',
  },
  billLink: {
    billKey: 'pls-2014-285',
    billTitle: 'Proiectul de lege privind Codul fiscal',
    relationshipKind: 'becomes_law',
    resolutionStatus: 'linked',
    confidenceLabel: 'high',
    promulgationDecree: {
      actId: 'decret-412-2015',
      label: 'Decretul nr. 412/2015 pentru promulgarea Legii codului fiscal',
      moIssueId: 'mo-699-2015',
    },
  },
  source: sourceProvenancePortal,
}

// ---------------------------------------------------------------------------
// Act 2 — In-force minimal
// ---------------------------------------------------------------------------

export const legeaMinimalaInVigoareAct: LegalAct = {
  dataStatus: 'mock',
  actId: 'lege-100-2024',
  displayCitation: 'Legea nr. 100/2024',
  actType: 'lege',
  actNumber: '100',
  actYear: 2024,
  issuerSlug: 'parlament',
  issuerRaw: 'Parlamentul României',
  status: 'in-vigoare',
  modificationCount: 0,
  entryIntoForce: '2024-07-01',
  canonicalDocumentId: 'lege-100-2024-original',
  summary: {
    plainLanguageSummary:
      'Legea reglementează o procedură administrativă simplificată pentru autorizarea unor activități profesionale independente.',
    summary: 'Procedură administrativă simplificată.',
    description: 'Legea nr. 100/2024 privind autorizarea simplificată.',
    domains: ['administrativ', 'economie'],
    affectedAudiences: [],
    keywords: ['autorizare', 'procedura-simplificata'],
    keyDates: [
      { label: 'Intrare în vigoare', date: '2024-07-01' },
      { label: 'Publicare în MO', date: '2024-05-20' },
    ],
    fiscalImpact: null,
    penaltiesMentioned: [],
    confidence: 0.81,
    model: 'gpt-4o-legal-summarizer',
    promptVersion: 'legal-summary-v3.2',
  },
  versions: [
    {
      documentId: 'lege-100-2024-original',
      versionKind: 'original',
      versionDate: '2024-05-20',
      isCanonical: true,
      extractionStatus: 'complete',
      moPart: 'PI',
      moNumber: '410',
      moDate: '2024-05-20',
    },
  ],
  mo: {
    issueId: 'mo-410-2024',
    partCode: 'PI',
    issueNumber: '410',
    issueYear: 2024,
    issueDate: '2024-05-20',
    pageStart: 12,
    pageEnd: 18,
    pdfUrl: 'https://monitoruloficial.ro/monitor/410/2024.pdf',
    pdfSha256:
      'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2',
    hasFullText: true,
    resolution: 'unique',
  },
  billLink: null,
  source: sourceProvenancePortal,
}

// ---------------------------------------------------------------------------
// Act 3 — Abrogated
// ---------------------------------------------------------------------------

export const legeaAbrogataAct: LegalAct = {
  dataStatus: 'mock',
  actId: 'lege-50-1992',
  displayCitation: 'Legea nr. 50/1992',
  actType: 'lege',
  actNumber: '50',
  actYear: 1992,
  issuerSlug: 'parlament',
  issuerRaw: 'Parlamentul României',
  status: 'abrogat',
  modificationCount: 23,
  entryIntoForce: '1992-04-15',
  canonicalDocumentId: 'lege-50-1992-original',
  summary: {
    plainLanguageSummary:
      'Legea a reglementat o procedură specifică în domeniul financiar-bancar și a fost abrogată integral prin Legea nr. 21/2015.',
    summary: 'Procedură financiar-bancară (abrogată).',
    description: 'Legea nr. 50/1992, abrogată integral.',
    domains: ['financiar', 'bancar'],
    affectedAudiences: ['institutii-financiare'],
    keywords: ['procedura-financiara', 'abrogata'],
    keyDates: [
      { label: 'Intrare în vigoare', date: '1992-04-15' },
      { label: 'Publicare în MO', date: '1992-04-10' },
      { label: 'Abrogare', date: '2015-03-01' },
    ],
    fiscalImpact: null,
    penaltiesMentioned: [],
    confidence: 0.74,
    model: 'gpt-4o-legal-summarizer',
    promptVersion: 'legal-summary-v3.2',
  },
  versions: [
    {
      documentId: 'lege-50-1992-original',
      versionKind: 'original',
      versionDate: '1992-04-10',
      isCanonical: true,
      extractionStatus: 'complete',
      moPart: 'PI',
      moNumber: '48',
      moDate: '1992-04-10',
    },
  ],
  mo: {
    // Pre-2012 issue → metadata-only per coverage policy (P4 guardrail).
    issueId: 'mo-48-1992',
    partCode: 'PI',
    issueNumber: '48',
    issueYear: 1992,
    issueDate: '1992-04-10',
    pageStart: 3,
    pageEnd: 7,
    pdfUrl: 'https://monitoruloficial.ro/monitor/48/1992.pdf',
    pdfSha256:
      'd4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3',
    hasFullText: false,
    resolution: 'unique',
  },
  billLink: null,
  source: {
    ...sourceProvenancePortal,
    sourceUrl: 'https://legislatie.just.ro/lista-acte/lege-50-1992',
    publishedAt: '1992-04-10',
    parserNotes: 'Act istoric, abrogat integral prin Legea nr. 21/2015.',
  },
}

// ---------------------------------------------------------------------------
// Act 4 — Summary missing (no AI enrichment yet)
// ---------------------------------------------------------------------------

export const legeaFaraRezumatAct: LegalAct = {
  dataStatus: 'partial',
  actId: 'hg-1234-2025',
  displayCitation: 'HG nr. 1234/2025',
  actType: 'hg',
  actNumber: '1234',
  actYear: 2025,
  issuerSlug: 'guvern',
  issuerRaw: 'Guvernul României',
  status: 'in-vigoare',
  modificationCount: 2,
  entryIntoForce: '2025-02-01',
  canonicalDocumentId: 'hg-1234-2025-original',
  summary: null,
  versions: [
    {
      documentId: 'hg-1234-2025-original',
      versionKind: 'original',
      versionDate: '2025-01-20',
      isCanonical: true,
      extractionStatus: 'pending',
      moPart: 'PI',
      moNumber: '55',
      moDate: '2025-01-20',
    },
  ],
  mo: null,
  billLink: null,
  source: {
    ...sourceProvenancePortal,
    sourceUrl: 'https://legislatie.just.ro/lista-acte/hg-1234-2025',
    publishedAt: '2025-01-20',
    parserNotes: 'Hotărâre de guvern recentă; rezumatul AI nu este încă disponibil.',
  },
}

// ---------------------------------------------------------------------------
// Act 5 — Unknown status
// ---------------------------------------------------------------------------

export const legeaStatusNecunoscutAct: LegalAct = {
  dataStatus: 'partial',
  actId: 'ordin-867-2011',
  displayCitation: 'Ordin MS/CNAS 867/541/2011',
  actType: 'ordin',
  actNumber: '867/541',
  actYear: 2011,
  issuerSlug: 'ministerul-sanatatii',
  issuerRaw: 'Ministerul Sănătății / CNAS',
  status: 'necunoscut',
  modificationCount: 0,
  entryIntoForce: null,
  canonicalDocumentId: 'ordin-867-2011-original',
  summary: {
    plainLanguageSummary:
      'Ordin comun de aplicare a unor pachete de servicii medicale. Statusul nu a putut fi derivat din sursele disponibile — verifică sursa înainte de utilizare.',
    summary: 'Ordin comun MS/CNAS (status nederivat).',
    description: 'Ordinul MS/CNAS 867/541/2011.',
    domains: ['sanatate', 'asigurari-sociale'],
    affectedAudiences: ['oameni-sanatate', 'asigurati'],
    keywords: ['pachet-servicii', 'cnas', 'ordin-comun'],
    keyDates: [
      { label: 'Publicare în MO', date: '2011-09-12' },
    ],
    fiscalImpact: null,
    penaltiesMentioned: [],
    confidence: 0.45,
    model: 'gpt-4o-legal-summarizer',
    promptVersion: 'legal-summary-v3.2',
  },
  versions: [
    {
      documentId: 'ordin-867-2011-original',
      versionKind: 'original',
      versionDate: '2011-09-12',
      isCanonical: true,
      extractionStatus: 'complete',
      moPart: 'PI',
      moNumber: '612',
      moDate: '2011-09-12',
    },
  ],
  mo: {
    // Pre-2012 issue → metadata-only per coverage policy (P4 guardrail).
    issueId: 'mo-612-2011',
    partCode: 'PI',
    issueNumber: '612',
    issueYear: 2011,
    issueDate: '2011-09-12',
    pageStart: 8,
    pageEnd: 14,
    pdfUrl: 'https://monitoruloficial.ro/monitor/612/2011.pdf',
    pdfSha256:
      'f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5',
    hasFullText: false,
    resolution: 'ambiguous',
  },
  billLink: null,
  source: {
    ...sourceProvenancePortal,
    sourceUrl: 'https://legislatie.just.ro/lista-acte/ordin-867-2011',
    publishedAt: '2011-09-12',
    parserNotes:
      'Ordin multi-issuer; cheia de citare este compusă. Statusul nu a putut fi derivat.',
  },
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const mockActsById: Readonly<Record<string, LegalAct>> = {
  'lege-227-2015': legea227_2015Act,
  'lege-100-2024': legeaMinimalaInVigoareAct,
  'lege-50-1992': legeaAbrogataAct,
  'hg-1234-2025': legeaFaraRezumatAct,
  'ordin-867-2011': legeaStatusNecunoscutAct,
}

export function getMockLegalAct(actId: string): LegalAct | null {
  return mockActsById[actId] ?? null
}

export const mockLegalActIds = Object.keys(mockActsById) as string[]

export function getMockLegalActSummaries(): readonly {
  readonly actId: string
  readonly displayCitation: string
  readonly actType: string
  readonly actNumber: string
  readonly actYear: number
  readonly status: LegalStatus
  readonly modificationCount: number
  readonly changeKind: string | null
  readonly changeDate: string | null
  readonly modifierCitation: string | null
}[] {
  return mockLegalActIds.map((actId) => {
    const act = mockActsById[actId]
    return {
      actId,
      displayCitation: act.displayCitation,
      actType: act.actType,
      actNumber: act.actNumber,
      actYear: act.actYear,
      status: act.status,
      modificationCount: act.modificationCount,
      changeKind: null,
      changeDate: null,
      modifierCitation: null,
    }
  })
}

// ---------------------------------------------------------------------------
// Landing data
// ---------------------------------------------------------------------------

export const landingDataMock: LandingData = {
  dataStatus: 'mock',
  sampleActs: [...getMockLegalActSummaries()],
  recentlyModified: [
    {
      actId: 'lege-227-2015',
      displayCitation: 'Legea nr. 227/2015',
      status: 'modificat',
      changeKind: 'modificare',
      changeDate: '2026-06-15',
      modifierCitation: 'Legea nr. 12/2026',
    },
    {
      actId: 'lege-100-2024',
      displayCitation: 'Legea nr. 100/2024',
      status: 'in-vigoare',
      changeKind: 'modificare',
      changeDate: '2026-06-10',
      modifierCitation: 'OUG nr. 30/2026',
    },
    {
      actId: 'lege-50-1992',
      displayCitation: 'Legea nr. 50/1992',
      status: 'abrogat',
      changeKind: 'abrogare-totala',
      changeDate: '2015-03-01',
      modifierCitation: 'Legea nr. 21/2015',
    },
  ],
  todayInMonitorul: [
    {
      issueId: 'mo-410-2026',
      partCode: 'PI',
      issueNumber: '410',
      issueDate: '2026-06-26',
      sectionCount: 24,
      hasFullText: true,
      sourceUrl: 'https://monitoruloficial.ro/e-monitor/',
      pdfUrl: 'https://monitoruloficial.ro/monitor/410/2026.pdf',
    },
    {
      issueId: 'mo-411-2026',
      partCode: 'PIII',
      issueNumber: '411',
      issueDate: '2026-06-26',
      sectionCount: 6,
      hasFullText: true,
      sourceUrl: 'https://monitoruloficial.ro/e-monitor/',
      pdfUrl: 'https://monitoruloficial.ro/monitor/411/2026.pdf',
    },
  ],
  coverage: {
    hasFullText: true,
    note: 'Acoperire Monitorul Oficial: text disponibil 2012–prezent; înainte de 2012 doar coordonate de publicare.',
    lane: 'mo',
    freshness: 'actualizat la 2026-06-26',
  },
}
