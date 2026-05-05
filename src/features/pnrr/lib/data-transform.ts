import {
  RawPnrrBeneficiaryPaymentSchema,
  RawPnrrIndicatorSchema,
  RawPnrrProjectSchema,
  type RawPnrrBeneficiaryPayment,
  type RawPnrrIndicator,
  type RawPnrrProject,
  type PnrrBeneficiaryPayment,
  type PnrrOfficialIndicators,
  type PnrrProject,
  type PnrrProjectRecord,
  type PnrrProjectStatus,
  type AnomalyType,
  type DataQualitySignalType,
  type PnrrAggregates,
  type PnrrEntityType,
  type PnrrBeneficiaryType,
  type PnrrSearchState,
} from '@/schemas/pnrr'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import {
  getPnrrBeneficiaryDirectoryType,
  isOfficialPublicCompanyCui,
  resolvePnrrProjectLocation,
} from './pnrr-uat-assignment'

/** Date when the PNRR dataset was last updated (shown in UI and used in export filenames). */
export const PNRR_LAST_UPDATED = '2026-04-30'

const OFFICIAL_RON_TO_EUR_RATE = 5

function generatePnrrHash(message: string): string {
  let hash = 0x811c9dc5

  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }

  return Math.abs(hash).toString(16).padStart(8, '0')
}

const PROGRESS_CATEGORY_TO_STATUS = {
  completed: 'completed',
  advanced: 'advanced',
  mid: 'mid-progress',
  under30: 'under-30',
  'not-started': 'not-started',
  unknown: 'unknown',
} as const satisfies Readonly<
  Record<
    NonNullable<PnrrSearchState['progressCategories']>[number],
    PnrrProjectStatus
  >
>

// ---------------------------------------------------------------------------
// Progress parsing
// ---------------------------------------------------------------------------

export function parseProgress(
  val: string | undefined
): number | null | 'in-implementation' {
  if (!val || val.trim() === '') return null
  const trimmed = val.trim()

  if (trimmed === 'ÎN IMPLEMENTARE (sub 30%)') return 'in-implementation'
  if (trimmed === 'ÎN IMPLEMENTARE') return 'in-implementation'
  if (trimmed === 'FINALIZAT') return 100

  if (trimmed.endsWith('%')) {
    const num = Number.parseFloat(trimmed.slice(0, -1))
    if (!Number.isNaN(num)) return roundProgressValue(num)
  }

  const num = Number.parseFloat(trimmed)
  if (!Number.isNaN(num)) return roundProgressValue(num)

  return null
}

function roundProgressValue(value: number): number {
  return Math.round(value * 100) / 100
}

// ---------------------------------------------------------------------------
// Status classification
// ---------------------------------------------------------------------------

export function classifyStatus(
  tech: number | null | 'in-implementation'
): PnrrProjectStatus {
  if (typeof tech === 'number' && tech >= 100) return 'completed'
  if (tech === 0) return 'not-started'
  if (tech === 'in-implementation') return 'under-30'
  if (typeof tech === 'number') {
    if (tech < 30) return 'under-30'
    if (tech < 70) return 'mid-progress'
    return 'advanced'
  }
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Anomaly detection
// ---------------------------------------------------------------------------

type AnomalyInput = {
  readonly techProgress: number | null | 'in-implementation'
  readonly finProgress: number | null | 'in-implementation'
  readonly valueEur: number
}

function getRiskTechProgress(
  progress: number | null | 'in-implementation'
): number | null {
  return progress === 'in-implementation' ? 15 : progress
}

export function detectAnomalies(project: AnomalyInput): readonly AnomalyType[] {
  const anomalies: AnomalyType[] = []

  const tech = getRiskTechProgress(project.techProgress)
  const fin =
    project.finProgress === 'in-implementation' ? null : project.finProgress

  if (fin !== null && fin > 100) {
    anomalies.push('financial-overrun')
  }

  if (tech === 100 && fin !== null && fin < 80) {
    anomalies.push('stalled-completion')
  }

  if (
    tech !== null &&
    fin !== null &&
    fin <= 100 &&
    tech < 90 &&
    ((tech === 0 && fin > 0) || fin - tech > 50)
  ) {
    anomalies.push('payment-ahead-delivery')
  }

  if (project.valueEur >= 10_000_000 && tech !== null && tech < 30) {
    anomalies.push('large-low-progress')
  }

  return anomalies
}

export function detectDataQualitySignals(
  project: Pick<PnrrProjectRecord, 'techProgress' | 'finProgress' | 'valueEur'>
): readonly DataQualitySignalType[] {
  const signals: DataQualitySignalType[] = []

  if (project.finProgress === null && project.valueEur >= 10_000_000) {
    signals.push('large-missing-financial-progress')
  }

  if (
    project.techProgress === 100 &&
    project.finProgress === null &&
    project.valueEur >= 1_000_000
  ) {
    signals.push('completed-missing-financial-progress')
  }

  return signals
}

// ---------------------------------------------------------------------------
// Entity type classification
// ---------------------------------------------------------------------------

const PUBLIC_KEYWORDS: readonly string[] = [
  // Ministries & central government
  'MINISTERUL',
  // Authorities & agencies (with and without diacritics)
  'AUTORITATEA',
  'ADMINISTRAȚIA',
  'ADMINISTRATIA',
  'AGENȚIA',
  'AGENTIA',
  'DIRECȚIA',
  'DIRECTIA',
  // Military
  'UNITATEA MILITARĂ',
  'UNITATEA MILITARA',
  'U.M.',
  // Public institutions
  'REGIA AUTONOMĂ',
  'REGIA AUTONOMA',
  'REGIE AUTONOMĂ',
  'REGIE AUTONOMA',
  'CASCI',
  'CASA JUDEȚEANĂ',
  'CASA JUDETEANA',
  'CASA DE ASIGURĂRI',
  'CASA DE ASIGURARI',
  'CENTRUL NAȚIONAL',
  'CENTRUL NATIONAL',
  'INSTITUTUL NAȚIONAL',
  'INSTITUTUL NATIONAL',
  'BANCA NAȚIONALĂ',
  'BANCA NATIONALA',
  'ACADEMIA',
  // Healthcare
  'SPITALUL',
  // Local government (with and without diacritics, with and without suffix)
  'PRIMĂRIA',
  'PRIMARIA',
  'CONSILIUL',
  'INSPECTORATUL',
  'MUNICIPIUL',
  'MUNICIPIU',
  'ORAȘUL',
  'ORASUL',
  'ORAȘ',
  'ORAS',
  'COMUNA',
  // Education (with and without diacritics)
  'UNIVERSITATEA',
  'INSTITUTUL',
  'LICEUL',
  'COLEGIUL',
  // Police & security
  'POLIȚIA',
  'POLITIA',
  'JANDARMERIA',
  'SERVICIUL ROMÂN',
  'SERVICIUL ROMAN',
  // Other public entities
  'MUZEUL',
  'MUZEU',
  'SECTORUL',
  'REGIA NAȚIONALĂ',
  'REGIA NATIONALA',
  'DIRECTORATUL',
  'INSPECȚIA',
  'INSPECTIA',
  'CASA NAȚIONALĂ',
  'CASA NATIONALA',
]

const PRIORITY_PUBLIC_KEYWORDS: readonly string[] = [
  'COMPANIA NAȚIONALĂ',
  'COMPANIA NATIONALA',
  'SOCIETATEA NAȚIONALĂ DE TRANSPORT',
  'SOCIETATEA NATIONALA DE TRANSPORT',
  'SECRETARIATUL GENERAL AL GUVERNULUI',
  'SERVICIUL DE TELECOMUNICAȚII SPECIALE',
  'SERVICIUL DE TELECOMUNICATII SPECIALE',
  'REGIA PUBLICĂ LOCALĂ',
  'REGIA PUBLICA LOCALA',
]

const NON_PUBLIC_KEYWORDS: readonly string[] = [
  'ASOCIATIA',
  'ASOCIAȚIA',
  'FUNDATIA',
  'FUNDAȚIA',
  'FEDERATIA',
  'FEDERAȚIA',
  'PAROHIA',
  'BISERICA',
  'MANASTIREA',
  'MĂNĂSTIREA',
  'ARHIEPISCOPIA',
  'EPISCOPIA',
]

/**
 * Check if a beneficiary name contains an explicit private-company marker:
 * SRL (with/without dots/spaces), SA (word-boundary, with/without dots),
 * PERSOANĂ FIZICĂ AUTORIZATĂ (diacritic-insensitive), or PFA.
 */
function hasPrivateMarker(beneficiary: string): boolean {
  const normalized = beneficiary
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, '')

  const hasSrl = normalized.includes('SRL')
  const hasSa = /\bSA\b/.test(normalized)
  const hasLimitedLiability = normalized.includes('SOCIETATE CU RASPUNDERE LIMITATA')
  const hasPfa =
    normalized.includes('PERSOANA FIZICA AUTORIZATA') || normalized.includes('PFA')

  return hasSrl || hasSa || hasLimitedLiability || hasPfa
}

function isPublicDirectoryType(directoryType: string | null): boolean {
  return Boolean(directoryType && directoryType !== 'uncategorized')
}

export function classifyEntityType(
  beneficiary: string,
  directoryType: string | null = null,
  isOfficialPublicCompany = false,
): PnrrEntityType {
  const normalized = normalizeBeneficiaryName(beneficiary)
  const upper = beneficiary.toUpperCase()
  const hasPriorityPublicKeyword = PRIORITY_PUBLIC_KEYWORDS.some((kw) =>
    upper.includes(kw),
  )
  const hasPublicKeyword = PUBLIC_KEYWORDS.some((kw) => upper.includes(kw))
  const hasCountyCouncilName = isCountyCouncilBeneficiaryName(normalized)
  const hasExplicitPrivateMarker = hasPrivateMarker(beneficiary)
  const hasNonPublicKeyword = hasAnyBeneficiaryKeyword(normalized, NON_PUBLIC_KEYWORDS)

  if (isOfficialPublicCompany || hasPriorityPublicKeyword) {
    return 'public'
  }

  if (hasExplicitPrivateMarker || hasNonPublicKeyword) {
    return 'private'
  }

  if (isPublicDirectoryType(directoryType) || hasPublicKeyword || hasCountyCouncilName) {
    return 'public'
  }

  return 'private'
}

const UAT_DIRECTORY_TYPES = new Set([
  'admin_commune_hall',
  'admin_municipality',
  'admin_sector_hall',
  'admin_town_hall',
])

const CENTRAL_AGENCY_DIRECTORY_TYPES = new Set([
  'admin_central_agency',
  'environment_agency',
  'finance_health_fund',
  'finance_social_security',
  'finance_tax_authority',
  'justice_court',
  'public_order_intelligence',
  'public_order_police',
  'social_benefits_agency',
  'social_employment_agency',
])

const SOCIAL_DIRECTORY_TYPES = new Set([
  'social_assistance_dir',
  'social_child_protection',
  'social_disability_care',
])

function normalizeBeneficiaryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasAnyBeneficiaryKeyword(value: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword))
}

function isCountyCouncilBeneficiaryName(value: string): boolean {
  return /^(JUDETUL|CONSILIUL JUDETEAN)(\s|$)/.test(value)
}

export function classifyBeneficiaryType(
  beneficiary: string,
  cui: string | null,
  entityType: PnrrEntityType,
  directoryType = getPnrrBeneficiaryDirectoryType(cui),
  isNationalProject = false,
  isOfficialPublicCompany = isOfficialPublicCompanyCui(cui),
): PnrrBeneficiaryType {
  const normalized = normalizeBeneficiaryName(beneficiary)

  if (entityType === 'private') {
    if (hasPrivateMarker(beneficiary)) return 'company'
    if (hasAnyBeneficiaryKeyword(normalized, ['ASOCIATIA', 'FUNDATIA', 'FEDERATIA'])) return 'ngo'
    if (
      hasAnyBeneficiaryKeyword(normalized, [
        'PAROHIA',
        'BISERICA',
        'MANASTIREA',
        'ARHIEPISCOPIA',
        'EPISCOPIA',
      ])
    ) {
      return 'religious'
    }
    return 'other-private'
  }

  if (isOfficialPublicCompany) return 'public-company'

  if (directoryType) {
    if (UAT_DIRECTORY_TYPES.has(directoryType)) return 'uat'
    if (directoryType === 'admin_county_council') return 'county-council'
    if (directoryType === 'admin_ministry') return 'ministry'
    if (directoryType.startsWith('edu_')) return 'education'
    if (directoryType.startsWith('health_')) return 'health'
    if (directoryType.startsWith('defence_')) return 'military'
    if (directoryType.startsWith('culture_')) return 'culture'
    if (SOCIAL_DIRECTORY_TYPES.has(directoryType)) return 'social'
    if (CENTRAL_AGENCY_DIRECTORY_TYPES.has(directoryType)) return 'central-agency'
  }

  if (hasAnyBeneficiaryKeyword(normalized, ['ASOCIATIA', 'FUNDATIA', 'FEDERATIA'])) return 'ngo'
  if (
    hasAnyBeneficiaryKeyword(normalized, [
      'PAROHIA',
      'BISERICA',
      'MANASTIREA',
      'ARHIEPISCOPIA',
      'EPISCOPIA',
    ])
  ) {
    return 'religious'
  }
  if (
    hasAnyBeneficiaryKeyword(normalized, [
      'MUNICIPIUL',
      'ORASUL',
      'COMUNA',
      'PRIMARIA',
      'SECTORUL',
    ])
  ) {
    return 'uat'
  }
  if (isCountyCouncilBeneficiaryName(normalized)) {
    return 'county-council'
  }
  if (normalized.includes('MINISTERUL')) return 'ministry'
  if (
    hasAnyBeneficiaryKeyword(normalized, [
      'UNIVERSITATEA',
      'LICEUL',
      'COLEGIUL',
      'SCOALA',
      'GRADINITA',
      'INSTITUTUL DE CERCETARE',
    ])
  ) {
    return 'education'
  }
  if (
    hasAnyBeneficiaryKeyword(normalized, [
      'SPITALUL',
      'AMBULANTA',
      'DIRECTIA DE SANATATE',
      'CLINIC',
    ])
  ) {
    return 'health'
  }
  if (
    normalized.startsWith('U M ') ||
    normalized.startsWith('UM ') ||
    hasAnyBeneficiaryKeyword(normalized, ['UNITATEA MILITARA', ' U M ', ' UM '])
  ) {
    return 'military'
  }
  if (hasAnyBeneficiaryKeyword(normalized, ['MUZEUL', 'BIBLIOTECA', 'CASA DE CULTURA'])) {
    return 'culture'
  }
  if (isNationalProject) return 'national'
  return 'other-public'
}

// ---------------------------------------------------------------------------
// Title normalization (for deduplication)
// ---------------------------------------------------------------------------

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Raw → Normalized transformation
// ---------------------------------------------------------------------------

export function normalizePnrrProjectRecord(raw: RawPnrrProject): PnrrProjectRecord {
  const normalized = normalizeRawProject(raw)
  const techRaw = parseProgress(normalized.techProgressInput)
  const finRaw = parseProgress(normalized.finProgressInput)

  const componentCode = normalized.componentCode
  const measureCode = normalized.measureCode
  const measureFullCode = `${componentCode}-${measureCode}`
  const cui = normalized.cui
  const resolvedLocation = resolvePnrrProjectLocation({
    beneficiary: normalized.beneficiary,
    cui,
    locality: normalized.locality,
    county: normalized.county,
  })
  const county = resolvedLocation.county
  const locality = resolvedLocation.locality
  const beneficiaryDirectoryType = getPnrrBeneficiaryDirectoryType(cui)
  const isOfficialPublicCompany = isOfficialPublicCompanyCui(cui)
  const entityType = classifyEntityType(
    normalized.beneficiary,
    beneficiaryDirectoryType,
    isOfficialPublicCompany,
  )

  const projectBase = {
    id: generatePnrrHash(
      `${normalized.engagementId ?? ''}|${normalized.rowSignature}`
    ),
    engagementId: normalized.engagementId,
    title: normalized.title,
    beneficiary: normalized.beneficiary,
    cui,
    county,
    locality,
    fundingSource: normalized.fundingSource,
    valueEur: normalized.valueEur,
    techProgress: techRaw,
    finProgress: finRaw,
    status: classifyStatus(techRaw),
    componentCode,
    measureCode,
    measureFullCode,
    cri: normalized.cri,
    anomalies: [] as readonly AnomalyType[],
    dataQualitySignals: [] as readonly DataQualitySignalType[],
    isReform: measureCode.startsWith('R'),
    entityType,
    beneficiaryType: classifyBeneficiaryType(
      normalized.beneficiary,
      cui,
      entityType,
      beneficiaryDirectoryType,
      county === 'Național',
      isOfficialPublicCompany,
    ),
    sirutaCode: resolvedLocation.sirutaCode,
  }

  // Attach anomalies
  return {
    ...projectBase,
    anomalies: detectAnomalies(projectBase),
    dataQualitySignals: detectDataQualitySignals(projectBase),
  }
}

export function transformProject(raw: RawPnrrProject): PnrrProjectRecord {
  return normalizePnrrProjectRecord(raw)
}

export function normalizePnrrBeneficiaryPayment(
  raw: RawPnrrBeneficiaryPayment,
): PnrrBeneficiaryPayment {
  const record = raw as Record<string, unknown>
  const beneficiary = stringValue(
    record['full legal name'],
    [record['first name'], record['last name']]
      .map((value) => stringValue(value))
      .filter(Boolean)
      .join(' '),
  )
  const cui =
    nullableStringValue(record['tax identification number']) ??
    nullableStringValue(record['unique identifier']) ??
    nullableStringValue(record['vat number']) ??
    nullableStringValue(record['other unique identifier'])
  const valueRon = toNumber(record['received amount in lei']) ?? 0
  const lastPaymentDate = normalizeOfficialPaymentDate(
    nullableStringValue(record['last date funding received']),
  )

  return {
    id: `payment:${cui ?? generatePnrrHash(beneficiary)}`,
    beneficiary,
    cui,
    valueRon,
    lastPaymentDate,
  }
}

export function processPnrrBeneficiaryPayments(
  rawPayments: readonly unknown[],
): readonly PnrrBeneficiaryPayment[] {
  return rawPayments
    .map((raw) => {
      const parsed = RawPnrrBeneficiaryPaymentSchema.safeParse(raw)
      return normalizePnrrBeneficiaryPayment(
        parsed.success
          ? parsed.data
          : (raw as RawPnrrBeneficiaryPayment),
      )
    })
    .filter((payment) => payment.beneficiary && payment.valueRon > 0)
    .sort((a, b) => b.valueRon - a.valueRon)
}

export function normalizePnrrOfficialIndicators(
  raw: RawPnrrIndicator,
): PnrrOfficialIndicators {
  const record = raw as Record<string, unknown>

  return {
    allocatedTotalEur: toNumber(record.alocat_eur),
    paidTotalEur: toNumber(record.platit_eur),
    receivedFromEuEur: toNumber(record.incasat_eur),
    prefinancingEur: toNumber(record.prefinantare_eur),
    suspendedEur: toNumber(record.suspendat_eur),
    revokedEur: toNumber(record.revocat_eur),
    contractedBeneficiaryCount: toNumber(record.nr_beneficiari_contracte),
    paidBeneficiaryCount: toNumber(record.nr_beneficiari_plati),
    projectCount: toNumber(record.nr_proiecte),
    nationalImpactProjectCount: toNumber(record.nr_proiecte_impact_national),
  }
}

export function processPnrrOfficialIndicators(
  rawIndicators: unknown,
): PnrrOfficialIndicators | null {
  const rawItems = extractOfficialItems(rawIndicators)
  const firstItem = rawItems[0]
  if (!firstItem) return null

  const parsed = RawPnrrIndicatorSchema.safeParse(firstItem)
  return normalizePnrrOfficialIndicators(
    parsed.success ? parsed.data : (firstItem as RawPnrrIndicator),
  )
}

type NormalizedRawProject = {
  readonly engagementId: string | null
  readonly title: string
  readonly beneficiary: string
  readonly cui: string | null
  readonly county: string
  readonly locality: string
  readonly fundingSource: PnrrProjectRecord['fundingSource']
  readonly valueEur: number
  readonly techProgressInput: string | undefined
  readonly finProgressInput: string | undefined
  readonly componentCode: string
  readonly measureCode: string
  readonly cri: string
  readonly rowSignature: string
}

function normalizeRawProject(raw: RawPnrrProject): NormalizedRawProject {
  const record = raw as Record<string, unknown>
  const hasOfficialValue =
    hasValue(record.valoare_fe) ||
    hasValue(record.id_angajament) ||
    hasValue(record.titlu_contract)
  const valueRon = toNumber(record.valoare_fe)
  const valueEur = hasValue(record.valoare_fe)
    ? (valueRon ?? 0) / OFFICIAL_RON_TO_EUR_RATE
    : (toNumber(record['Valoare (EUR)']) ?? 0)

  const techProgressInput = hasOfficialValue
    ? officialProgressInput(record.progres_fizic, record.stadiu)
    : stringValue(record['Progres Tehnic'])
  const finProgressInput = hasValue(record.progres_financiar)
    ? officialProgressInput(record.progres_financiar)
    : optionalStringValue(record['Progres Financiar'])

  return {
    engagementId: nullableStringValue(record.id_angajament),
    title: stringValue(record.titlu_contract, stringValue(record['Titlu Proiect'])),
    beneficiary: stringValue(
      record.denumire_beneficiar,
      stringValue(record['Nume Beneficiar']),
    ),
    cui: nullableStringValue(record.cui) ?? nullableStringValue(record['CUI']),
    county: stringValue(
      record.judet_implementare,
      stringValue(record['County']),
    ),
    locality: stringValue(
      record.localitate_implementare,
      stringValue(record['Localitate']),
    ),
    fundingSource: normalizeFundingSource(
      hasValue(record.sursa_finantare)
        ? record.sursa_finantare
        : record['Sursă Finanțare'],
    ),
    valueEur,
    techProgressInput,
    finProgressInput,
    componentCode: stringValue(
      record.cod_componenta,
      stringValue(record['Cod Componentă']),
    ),
    measureCode: stringValue(record.cod_masura, stringValue(record['Cod Măsură'])),
    cri: stringValue(record.cri, stringValue(record['CRI'])),
    rowSignature: JSON.stringify([
      record.id_angajament,
      record.cod_componenta,
      record.cod_masura,
      record.cod_submasura,
      record.cri,
      record.sursa_finantare,
      record.nr_contract,
      record.titlu_contract,
      record.denumire_beneficiar,
      record.cui,
      record.valoare_fe,
      record.judet_implementare,
      record.localitate_implementare,
      record.progres_fizic,
      record.progres_financiar,
      record['Titlu Proiect'],
      record['Nume Beneficiar'],
      record['CUI'],
      record['Valoare (EUR)'],
    ]),
  }
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function stringValue(value: unknown, fallback = ''): string {
  if (!hasValue(value)) return fallback
  return String(value).trim()
}

function optionalStringValue(value: unknown): string | undefined {
  return hasValue(value) ? String(value).trim() : undefined
}

function nullableStringValue(value: unknown): string | null {
  const text = optionalStringValue(value)
  return text ?? null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  const compact = value.trim().replace(/\s+/g, '')
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact
  if (!normalized) return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeOfficialPaymentDate(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/^(\d{4})[./-](\d{2})[./-](\d{2})$/)
  if (!match) return value
  return `${match[1]}-${match[2]}-${match[3]}`
}

function extractOfficialItems(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { readonly items?: unknown }).items)
  ) {
    return (value as { readonly items: readonly unknown[] }).items
  }
  return value ? [value] : []
}

function officialProgressInput(
  value: unknown,
  status?: unknown,
): string | undefined {
  const numeric = toNumber(value)
  if (numeric !== null) return String(roundProgressValue(numeric * 100))

  const normalizedStatus = stringValue(status).toUpperCase()
  if (normalizedStatus.includes('FINALIZAT')) return 'FINALIZAT'
  if (normalizedStatus.includes('IMPLEMENTARE')) return 'ÎN IMPLEMENTARE'
  return undefined
}

function normalizeFundingSource(value: unknown): PnrrProjectRecord['fundingSource'] {
  const normalized = stringValue(value, 'grant')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (
    normalized.includes('grant/loan') ||
    normalized.includes('grant / loan') ||
    (normalized.includes('grant') && normalized.includes('loan'))
  ) {
    return 'grant/loan'
  }
  if (normalized.includes('loan') || normalized.includes('imprumut')) {
    return 'loan'
  }
  return 'grant'
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

export function deduplicateProjects(
  projects: readonly PnrrProject[]
): readonly PnrrProject[] {
  const seen = new Map<string, PnrrProject>()

  for (const p of projects) {
    const key = getProjectIdentity(p)
    if (!seen.has(key)) {
      seen.set(key, p)
    }
  }

  return Array.from(seen.values())
}

export function getProjectIdentity(
  project: Pick<
    PnrrProjectRecord,
    'engagementId' | 'title' | 'cui'
  >,
): string {
  if (project.engagementId) return `engagement:${project.engagementId}`
  return `fallback:${normalizeTitle(project.title)}|${project.cui ?? ''}`
}

export function countUniqueProjects(projects: readonly PnrrProject[]): number {
  return new Set(projects.map(getProjectIdentity)).size
}

export function getProjectRecordIdentity(
  record: Pick<PnrrProjectRecord, 'engagementId' | 'title' | 'cui'>,
): string {
  return getProjectIdentity(record)
}

export function flattenPnrrProjectRecords(
  projects: readonly PnrrProject[],
): readonly PnrrProjectRecord[] {
  return projects.flatMap((project) => project.records ?? [project])
}

export function groupPnrrProjects(
  records: readonly PnrrProjectRecord[],
): readonly PnrrProject[] {
  const groups = new Map<string, PnrrProjectRecord[]>()

  for (const record of records) {
    const key = getProjectRecordIdentity(record)
    const existing = groups.get(key)
    if (existing) {
      existing.push(record)
    } else {
      groups.set(key, [record])
    }
  }

  return Array.from(groups.entries()).map(([id, group]) =>
    buildGroupedProject(id, group),
  )
}

function buildGroupedProject(
  id: string,
  records: readonly PnrrProjectRecord[],
): PnrrProject {
  const primaryRecord = records.reduce((best, record) =>
    record.valueEur > best.valueEur ? record : best,
  )
  const totalValueEur = records.reduce((sum, record) => sum + record.valueEur, 0)
  const statuses = new Set(records.map((record) => record.status))
  const componentCodes = uniqueInOrder(records.map((record) => record.componentCode))
  const measureCodes = uniqueInOrder(records.map((record) => record.measureCode))
  const measureFullCodes = uniqueInOrder(
    records.map((record) => record.measureFullCode),
  )
  const fundingSources = uniqueInOrder(
    records.map((record) => record.fundingSource),
  )
  const counties = uniqueInOrder(records.map((record) => record.county))
  const localities = uniqueInOrder(records.map((record) => record.locality))
  const cris = uniqueInOrder(records.map((record) => record.cri))
  const techProgressValues = uniqueInOrder(
    records.map((record) => progressIdentity(record.techProgress)),
  )
  const finProgressValues = uniqueInOrder(
    records.map((record) => progressIdentity(record.finProgress)),
  )
  const anomalies = uniqueInOrder(records.flatMap((record) => record.anomalies))
  const dataQualitySignals = uniqueInOrder(
    records.flatMap((record) => record.dataQualitySignals),
  )

  const groupedProject: PnrrProject = {
    ...primaryRecord,
    id,
    totalValueEur,
    recordCount: records.length,
    valueEur: totalValueEur,
    status: getGroupedProjectStatus(statuses),
    anomalies,
    dataQualitySignals,
    componentCodes,
    measureCodes,
    measureFullCodes,
    fundingSources,
    counties,
    localities,
    cris,
    variantCounts: {
      components: Math.max(0, componentCodes.length - 1),
      measures: Math.max(0, measureFullCodes.length - 1),
      fundingSources: Math.max(0, fundingSources.length - 1),
      counties: Math.max(0, counties.length - 1),
      localities: Math.max(0, localities.length - 1),
      cris: Math.max(0, cris.length - 1),
      techProgress: Math.max(0, techProgressValues.length - 1),
      finProgress: Math.max(0, finProgressValues.length - 1),
    },
  }

  if (records.length > 1) {
    return {
      ...groupedProject,
      records,
    }
  }

  return groupedProject
}

function uniqueInOrder<T extends string>(values: readonly T[]): readonly T[] {
  const seen = new Set<T>()
  const result: T[] = []

  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }

  return result
}

function progressIdentity(
  progress: PnrrProjectRecord['techProgress'],
): string {
  return progress === null ? 'null' : String(progress)
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export function computeAggregates(
  projects: readonly PnrrProject[]
): PnrrAggregates {
  const records = flattenPnrrProjectRecords(projects)
  const deduplicated = deduplicateProjects(records)

  let rawTotalValue = 0
  let completedCount = 0
  let completedValue = 0
  let inProgressCount = 0
  let notStartedCount = 0
  let missingFinProgressCount = 0
  let grantTotal = 0
  let loanTotal = 0
  let mixedTotal = 0

  const componentMap = new Map<
    string,
    {
      projectIds: Set<string>
      value: number
      missingFinProgressProjectIds: Set<string>
    }
  >()
  const countyMap = new Map<
    string,
    {
      projectIds: Set<string>
      value: number
    }
  >()
  const anomalyProjectIds: Record<AnomalyType, Set<string>> = {
    'financial-overrun': new Set(),
    'stalled-completion': new Set(),
    'payment-ahead-delivery': new Set(),
    'large-low-progress': new Set(),
  }
  const anomalyValues: Record<AnomalyType, number> = {
    'financial-overrun': 0,
    'stalled-completion': 0,
    'payment-ahead-delivery': 0,
    'large-low-progress': 0,
  }
  const dataQualitySignalCounts: Record<
    DataQualitySignalType,
    { count: number; value: number }
  > = {
    'duplicate-conflict': { count: 0, value: 0 },
    'large-missing-financial-progress': { count: 0, value: 0 },
    'completed-missing-financial-progress': { count: 0, value: 0 },
  }
  const dataQualitySignalProjectIds: Record<DataQualitySignalType, Set<string>> = {
    'duplicate-conflict': new Set(),
    'large-missing-financial-progress': new Set(),
    'completed-missing-financial-progress': new Set(),
  }
  const projectGroups = new Map<
    string,
    {
      value: number
      statuses: Set<PnrrProjectStatus>
      missingFinProgress: boolean
    }
  >()
  const beneficiaryMap = new Map<
    string,
    {
      beneficiary: string
      cui: string | null
      projectIds: Set<string>
      value: number
    }
  >()

  for (const p of records) {
    const projectId = getProjectIdentity(p)
    rawTotalValue += p.valueEur

    const projectGroup = projectGroups.get(projectId)
    if (projectGroup) {
      projectGroup.value += p.valueEur
      projectGroup.statuses.add(p.status)
      projectGroup.missingFinProgress =
        projectGroup.missingFinProgress || isMissingFinancialProgress(p)
    } else {
      projectGroups.set(projectId, {
        value: p.valueEur,
        statuses: new Set([p.status]),
        missingFinProgress: isMissingFinancialProgress(p),
      })
    }

    if (p.fundingSource === 'grant') grantTotal += p.valueEur
    else if (p.fundingSource === 'loan') loanTotal += p.valueEur
    else mixedTotal += p.valueEur

    // Component stats
    const componentStat = componentMap.get(p.componentCode)
    if (componentStat) {
      componentStat.projectIds.add(projectId)
      componentStat.value += p.valueEur
      if (isMissingFinancialProgress(p)) {
        componentStat.missingFinProgressProjectIds.add(projectId)
      }
    } else {
      componentMap.set(p.componentCode, {
        projectIds: new Set([projectId]),
        value: p.valueEur,
        missingFinProgressProjectIds: isMissingFinancialProgress(p)
          ? new Set([projectId])
          : new Set(),
      })
    }

    // County stats
    const countyStat = countyMap.get(p.county)
    if (countyStat) {
      countyStat.projectIds.add(projectId)
      countyStat.value += p.valueEur
    } else {
      countyMap.set(p.county, {
        projectIds: new Set([projectId]),
        value: p.valueEur,
      })
    }

    // Anomalies
    for (const a of p.anomalies) {
      anomalyProjectIds[a].add(projectId)
      anomalyValues[a] += p.valueEur
    }

    for (const signal of p.dataQualitySignals) {
      dataQualitySignalProjectIds[signal].add(projectId)
      dataQualitySignalCounts[signal].value += p.valueEur
    }

    // Beneficiary values remain row-level sums, but counts use distinct projects.
    const benKey = `${p.beneficiary}|${p.cui ?? ''}`
    const existing = beneficiaryMap.get(benKey)
    if (existing) {
      existing.projectIds.add(projectId)
      existing.value += p.valueEur
    } else {
      beneficiaryMap.set(benKey, {
        beneficiary: p.beneficiary,
        cui: p.cui,
        projectIds: new Set([projectId]),
        value: p.valueEur,
      })
    }
  }

  for (const group of projectGroups.values()) {
    if (group.missingFinProgress) {
      missingFinProgressCount++
    }

    const status = getGroupedProjectStatus(group.statuses)
    if (status === 'completed') {
      completedCount++
      completedValue += group.value
    } else if (status === 'not-started') {
      notStartedCount++
    } else {
      inProgressCount++
    }
  }

  for (const signal of Object.keys(dataQualitySignalCounts) as DataQualitySignalType[]) {
    dataQualitySignalCounts[signal].count = dataQualitySignalProjectIds[signal].size
  }

  const componentStats = Object.fromEntries(
    Array.from(componentMap.entries()).map(([code, stats]) => [
      code,
      {
        count: stats.projectIds.size,
        value: stats.value,
        missingFinProgress: stats.missingFinProgressProjectIds.size,
      },
    ]),
  )
  const countyStats = Object.fromEntries(
    Array.from(countyMap.entries()).map(([county, stats]) => [
      county,
      {
        count: stats.projectIds.size,
        value: stats.value,
      },
    ]),
  )
  const anomalyCounts = Object.fromEntries(
    (Object.keys(anomalyProjectIds) as AnomalyType[]).map((type) => [
      type,
      {
        count: anomalyProjectIds[type].size,
        value: anomalyValues[type],
      },
    ]),
  ) as Record<AnomalyType, { count: number; value: number }>
  const topBeneficiaries = Array.from(beneficiaryMap.values())
    .map((entry) => ({
      beneficiary: entry.beneficiary,
      cui: entry.cui,
      count: entry.projectIds.size,
      value: entry.value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)

  const totalValueForPercent = rawTotalValue || 1
  const projectCount = projectGroups.size

  return {
    rawTotalValue,
    deduplicatedTotalValue: rawTotalValue,
    projectCount,
    projectRecordCount: records.length,
    rawProjectCount: records.length,
    deduplicatedProjectCount: deduplicated.length,
    completedCount,
    completedValue,
    inProgressCount,
    notStartedCount,
    missingFinProgressCount,
    missingFinProgressPercent: projectCount > 0
      ? (missingFinProgressCount / projectCount) * 100
      : 0,
    grantTotal,
    loanTotal,
    mixedTotal,
    loanPercent: (loanTotal / totalValueForPercent) * 100,
    componentStats,
    countyStats,
    anomalyCounts,
    dataQualitySignalCounts,
    topBeneficiaries,
  }
}

function isMissingFinancialProgress(project: PnrrProjectRecord): boolean {
  return project.finProgress === null || project.finProgress === 'in-implementation'
}

function getGroupedProjectStatus(
  statuses: ReadonlySet<PnrrProjectStatus>,
): PnrrProjectStatus {
  if (statuses.size === 1 && statuses.has('completed')) return 'completed'
  if (statuses.size === 1 && statuses.has('not-started')) return 'not-started'
  return 'mid-progress'
}

function duplicateConflictSignature(project: PnrrProjectRecord): string {
  return JSON.stringify({
    beneficiary: project.beneficiary,
    county: project.county,
    locality: project.locality,
    fundingSource: project.fundingSource,
    valueEur: project.valueEur,
    techProgress: project.techProgress,
    finProgress: project.finProgress,
    cri: project.cri,
  })
}

// ---------------------------------------------------------------------------
// Full pipeline
// ---------------------------------------------------------------------------

export function processPnrrData(rawProjects: readonly unknown[]): {
  readonly projects: readonly PnrrProject[]
  readonly projectRecords: readonly PnrrProjectRecord[]
  readonly meta: {
    readonly projectCount: number
    readonly projectRecordCount: number
  }
} {
  const projectRecords = rawProjects.map((r) => {
    const parsed = RawPnrrProjectSchema.safeParse(r)
    return normalizePnrrProjectRecord(
      parsed.success ? parsed.data : (r as RawPnrrProject),
    )
  })

  // Validate component codes
  for (const p of projectRecords) {
    if (!PNRR_COMPONENTS[p.componentCode]) {
      console.warn(`Unknown component code: ${p.componentCode}`)
    }
  }

  // Legacy fallback rows do not carry id_angajament, so keep the old conflict
  // signal for them only. Official rows may repeat an engagement ID by design.
  const keyMap = new Map<string, PnrrProjectRecord[]>()
  for (const p of projectRecords) {
    if (p.engagementId) continue
    const key = getProjectRecordIdentity(p)
    const existing = keyMap.get(key)
    if (existing) {
      existing.push(p)
    } else {
      keyMap.set(key, [p])
    }
  }

  const recordsWithDuplicates = projectRecords.map((p) => {
    if (p.engagementId) return p

    const key = getProjectRecordIdentity(p)
    const group = keyMap.get(key)
    const hasConflict =
      group != null &&
      group.length > 1 &&
      new Set(group.map((item) => duplicateConflictSignature(item))).size > 1

    if (hasConflict && !p.dataQualitySignals.includes('duplicate-conflict')) {
      return {
        ...p,
        dataQualitySignals: [
          ...p.dataQualitySignals,
          'duplicate-conflict' as DataQualitySignalType,
        ],
      }
    }
    return p
  })
  const projects = groupPnrrProjects(recordsWithDuplicates)

  return {
    projects,
    projectRecords: recordsWithDuplicates,
    meta: {
      projectCount: projects.length,
      projectRecordCount: recordsWithDuplicates.length,
    },
  }
}

// ---------------------------------------------------------------------------
// Search query parser
//
// Supports: AND / OR (uppercase), "exact quotes", -exclusion, (grouping)
// Precedence (low→high): OR → AND (implicit) → NOT (-) → atom
//
// Implementation: tokenize → resolve (...) groups → flat OR/AND/NOT parse.
// One level of grouping only (no nested parens).
// ---------------------------------------------------------------------------

type SearchExpr =
  | { type: 'term'; value: string; exact: boolean }
  | { type: 'not'; clause: SearchExpr }
  | { type: 'and'; clauses: SearchExpr[] }
  | { type: 'or'; clauses: SearchExpr[] }

// A flat item is either a raw string token or an already-resolved SearchExpr
// (from a parenthesized group).
type FlatItem = string | SearchExpr

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/**
 * Tokenize a search query into a flat array of string tokens.
 * Special tokens: `(`, `)`, `AND`, `OR`, `-(`, `-term`, `-"exact"`, `"exact"`.
 */
function tokenizeSearch(query: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote = false
  let excludeQuote = false // true when '-' precedes an opening quote

  function flush() {
    const trimmed = current.trim()
    if (trimmed) {
      tokens.push(trimmed)
      current = ''
    }
  }

  for (const char of query) {
    // Inside a quoted phrase — accumulate verbatim
    if (inQuote) {
      if (char === '"') {
        tokens.push((excludeQuote ? '-"' : '"') + current + '"')
        current = ''
        inQuote = false
        excludeQuote = false
      } else {
        current += char
      }
      continue
    }

    // Outside quotes
    if (char === '"') {
      // If current is just '-', this is a negated quote: -"..."
      if (current.trim() === '-') {
        current = ''
        excludeQuote = true
      } else {
        flush()
      }
      inQuote = true
      continue
    }

    if (char === '(' || char === ')') {
      flush()
      // Merge a preceding standalone '-' with '(' → '-('
      if (char === '(' && tokens.length > 0 && tokens[tokens.length - 1] === '-') {
        tokens[tokens.length - 1] = '-('
      } else {
        tokens.push(char)
      }
      continue
    }

    if (/\s/.test(char)) {
      flush()
      continue
    }

    current += char
  }

  // Remaining token (unclosed quotes treated as plain text)
  flush()
  return tokens
}

// ---------------------------------------------------------------------------
// Group resolution — handle (…) and -(…) at one level
// ---------------------------------------------------------------------------

/**
 * Walk the token list once, resolving `(…)` and `-(…)` groups into SearchExpr
 * objects.  Returns a flat list of `FlatItem` (strings or SearchExprs) with
 * no `(`, `)`, or `-(` tokens remaining.
 *
 * Inner group content is parsed with `parseFlat` (no parentheses), so nesting
// is not supported — inner `(` / `)` are treated as literal text.
 */
function resolveGroups(tokens: readonly string[]): FlatItem[] {
  const out: FlatItem[] = []
  let i = 0

  while (i < tokens.length) {
    const tok = tokens[i]

    if (tok === '(' || tok === '-(') {
      // Scan forward for the matching ')'
      let depth = 1
      let j = i + 1
      while (j < tokens.length && depth > 0) {
        if (tokens[j] === '(' || tokens[j] === '-(') depth++
        else if (tokens[j] === ')') depth--
        j++
      }
      // Inner tokens: tokens[i+1 … j-2]  (j-1 is the ')' that closed it, or past end if unmatched)
      const inner = tokens.slice(i + 1, depth === 0 ? j - 1 : j)
      const innerExpr = parseFlat(inner)
      out.push(tok === '-(' ? { type: 'not', clause: innerExpr } : innerExpr)
      i = j
      continue
    }

    if (tok === ')') {
      // Unmatched ')' — skip it
      i++
      continue
    }

    out.push(tok)
    i++
  }

  return out
}

// ---------------------------------------------------------------------------
// Flat parser — OR → AND → NOT on a FlatItem list
// ---------------------------------------------------------------------------

/**
 * Parse a flat token list with OR having lowest precedence and AND (implicit)
// higher.  `-term` tokens become NOT nodes.  No parentheses are handled here.
 */
function parseFlat(items: readonly FlatItem[]): SearchExpr {
  if (items.length === 0) return { type: 'and', clauses: [] }

  // --- Split by OR ---
  const orGroups: FlatItem[][] = []
  let current: FlatItem[] = []

  for (const item of items) {
    if (item === 'OR') {
      if (current.length > 0) {
        orGroups.push(current)
        current = []
      }
    } else {
      current.push(item)
    }
  }
  if (current.length > 0) orGroups.push(current)

  if (orGroups.length === 0) return { type: 'and', clauses: [] }

  const orClauses = orGroups.map((g) => parseAndGroup(g))
  return orClauses.length === 1 ? orClauses[0] : { type: 'or', clauses: orClauses }
}

/**
 * Parse a group of FlatItems as an AND clause.
 * Explicit `AND` tokens split sub-groups; adjacent items are implicit AND.
 */
function parseAndGroup(items: readonly FlatItem[]): SearchExpr {
  const clauses: SearchExpr[] = []
  let buffer: FlatItem[] = []

  function flushBuffer() {
    if (buffer.length > 0) {
      for (const b of buffer) clauses.push(toExpr(b))
      buffer = []
    }
  }

  for (const item of items) {
    if (item === 'AND') {
      flushBuffer()
    } else {
      buffer.push(item)
    }
  }
  flushBuffer()

  if (clauses.length === 0) return { type: 'and', clauses: [] }
  return clauses.length === 1 ? clauses[0] : { type: 'and', clauses }
}

/**
 * Convert a single FlatItem to a SearchExpr leaf.
 */
function toExpr(item: FlatItem): SearchExpr {
  if (typeof item !== 'string') return item // already a SearchExpr (from a group)

  // -term / -"exact"
  if (item.startsWith('-') && item.length > 1) {
    return { type: 'not', clause: makeTerm(item.slice(1)) }
  }
  return makeTerm(item)
}

function makeTerm(token: string): SearchExpr {
  const isExact = token.startsWith('"') && token.endsWith('"') && token.length >= 2
  const raw = isExact ? token.slice(1, -1) : token
  // Strip trailing * — prefix matching is the default, so * is redundant
  const value = raw.endsWith('*') ? raw.slice(0, -1) : raw
  return {
    type: 'term',
    value,
    exact: isExact,
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

function buildSearchExpr(query: string): SearchExpr {
  const tokens = tokenizeSearch(query)
  const items = resolveGroups(tokens)
  return parseFlat(items)
}

/**
 * Evaluate a SearchExpr against a normalized haystack string.
 */
function evaluateSearchExpr(expr: SearchExpr, haystack: string): boolean {
  switch (expr.type) {
    case 'term': {
      const term = normalizeTitle(expr.value)
      if (!term) return true // empty term matches everything
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (expr.exact) {
        // Exact phrase: must appear contiguously with word boundaries on both sides
        return new RegExp(`\\b${escaped}\\b`).test(haystack)
      }
      // Prefix match: the term must appear at the start of a word
      return new RegExp(`\\b${escaped}`).test(haystack)
    }
    case 'not':
      return !evaluateSearchExpr(expr.clause, haystack)
    case 'and':
      return expr.clauses.every((c) => evaluateSearchExpr(c, haystack))
    case 'or':
      return expr.clauses.some((c) => evaluateSearchExpr(c, haystack))
  }
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export type PnrrFilters = {
  readonly search?: string
  readonly beneficiarySearch?: string
  readonly beneficiaryCui?: string
  readonly uatSiruta?: string
  readonly uatSirutas?: readonly string[]
  readonly components?: readonly string[]
  readonly counties?: readonly string[]
  readonly fundingSources?: readonly ('grant' | 'loan' | 'grant/loan')[]
  readonly measures?: readonly string[]
  readonly cris?: readonly string[]
  readonly progressCategories?: readonly PnrrProjectStatus[]
  readonly onlyAnomalies?: boolean
  readonly excludeMicro?: boolean
  readonly anomalyTypes?: readonly string[]
  readonly dataQualitySignalTypes?: readonly string[]
  readonly entityTypes?: readonly PnrrEntityType[]
  readonly beneficiaryTypes?: readonly PnrrBeneficiaryType[]
  readonly includeNational?: boolean
}

export function buildPnrrFiltersFromSearch(
  search: Partial<PnrrSearchState>,
): PnrrFilters {
  return {
    search: search.search,
    beneficiarySearch: search.beneficiarySearch,
    beneficiaryCui: search.beneficiaryCui,
    uatSiruta: search.uatSiruta,
    uatSirutas: search.uatSirutas,
    components: search.components,
    counties: search.counties,
    fundingSources: search.fundingSources,
    measures: search.measures,
    cris: search.cris,
    progressCategories: search.progressCategories?.map(
      (category) =>
        PROGRESS_CATEGORY_TO_STATUS[category] ?? 'unknown',
    ),
    onlyAnomalies: search.onlyAnomalies,
    excludeMicro: search.excludeMicro,
    anomalyTypes: search.anomalyTypes,
    dataQualitySignalTypes: search.dataQualitySignalTypes,
    entityTypes: search.entityTypes,
    beneficiaryTypes: search.beneficiaryTypes,
    includeNational: search.includeNational,
  }
}

export function filterProjectsBySearch(
  projects: readonly PnrrProject[],
  search: Partial<PnrrSearchState>,
): readonly PnrrProject[] {
  return filterProjects(projects, buildPnrrFiltersFromSearch(search))
}

// ---------------------------------------------------------------------------
// Active filter counting (shared between header and filter sheet)
// ---------------------------------------------------------------------------

type FilterCountInput = {
  readonly search?: string
  readonly beneficiarySearch?: string
  readonly beneficiaryCui?: string
  readonly uatSiruta?: string
  readonly uatName?: string
  readonly uatSirutas?: readonly string[]
  readonly components?: readonly string[]
  readonly counties?: readonly string[]
  readonly fundingSources?: readonly unknown[]
  readonly measures?: readonly string[]
  readonly cris?: readonly string[]
  readonly progressCategories?: readonly unknown[]
  readonly anomalyTypes?: readonly string[]
  readonly dataQualitySignalTypes?: readonly string[]
  readonly entityTypes?: readonly unknown[]
  readonly beneficiaryTypes?: readonly unknown[]
  readonly onlyAnomalies?: boolean
  readonly excludeMicro?: boolean
  readonly includeNational?: boolean
}

export function getActiveFilterCount(filters: FilterCountInput): number {
  let count = 0
  if (filters.search) count++
  if (filters.beneficiarySearch) count++
  if (filters.beneficiaryCui) count++
  if (filters.uatSiruta) count++
  count += filters.uatSirutas?.length ?? 0
  count += filters.components?.length ?? 0
  count += filters.counties?.length ?? 0
  count += filters.fundingSources?.length ?? 0
  count += filters.measures?.length ?? 0
  count += filters.cris?.length ?? 0
  count += filters.progressCategories?.length ?? 0
  count += filters.anomalyTypes?.length ?? 0
  count += filters.dataQualitySignalTypes?.length ?? 0
  count += filters.entityTypes?.length ?? 0
  count += filters.beneficiaryTypes?.length ?? 0
  if (filters.onlyAnomalies) count++
  if (filters.excludeMicro) count++
  if (filters.includeNational === false) count++
  return count
}

export function hasPnrrDataFilters(filters: FilterCountInput): boolean {
  return Boolean(
    filters.search ||
      filters.beneficiarySearch ||
      filters.beneficiaryCui ||
      filters.uatSiruta ||
      filters.uatSirutas?.length ||
      filters.components?.length ||
      filters.counties?.length ||
      filters.fundingSources?.length ||
      filters.measures?.length ||
      filters.cris?.length ||
      filters.progressCategories?.length ||
      filters.anomalyTypes?.length ||
      filters.dataQualitySignalTypes?.length ||
      filters.entityTypes?.length ||
      filters.beneficiaryTypes?.length ||
      filters.onlyAnomalies ||
      filters.excludeMicro ||
      filters.includeNational === false
  )
}

function normalizeCui(value: string): string {
  return value.trim().replace(/^RO/i, '').replace(/\s+/g, '')
}

function matchesBeneficiaryType(
  project: PnrrProjectRecord,
  beneficiaryTypes: readonly PnrrBeneficiaryType[]
): boolean {
  return beneficiaryTypes.some(
    (type) => type === project.beneficiaryType || type === project.entityType,
  )
}

export function filterProjectRecords(
  records: readonly PnrrProjectRecord[],
  filters: PnrrFilters
): readonly PnrrProjectRecord[] {
  const searchExpr = filters.search ? buildSearchExpr(filters.search) : null
  const beneficiarySearchExpr = filters.beneficiarySearch
    ? buildSearchExpr(filters.beneficiarySearch)
    : null
  const beneficiaryCui = filters.beneficiaryCui ? normalizeCui(filters.beneficiaryCui) : null
  const uatSiruta = filters.uatSiruta?.trim()
  const uatSirutas = filters.uatSirutas?.filter(Boolean)

  return records.filter((p) => {
    if (searchExpr) {
      const haystack = normalizeTitle(
        `${p.title} ${p.beneficiary} ${p.cui ?? ''} ${p.county} ${p.locality} ${p.componentCode} ${p.measureCode} ${p.measureFullCode} ${p.fundingSource} ${p.cri}`
      )
      if (!evaluateSearchExpr(searchExpr, haystack)) return false
    }

    if (beneficiarySearchExpr) {
      const nameHaystack = normalizeTitle(p.beneficiary)
      const nameMatch = evaluateSearchExpr(beneficiarySearchExpr, nameHaystack)
      const cuiMatch = p.cui
        ? evaluateSearchExpr(
            beneficiarySearchExpr,
            p.cui
          )
        : false
      if (!nameMatch && !cuiMatch) return false
    }

    if (beneficiaryCui && (!p.cui || normalizeCui(p.cui) !== beneficiaryCui)) {
      return false
    }

    if (uatSiruta && p.sirutaCode !== uatSiruta) {
      return false
    }

    if (uatSirutas?.length && (!p.sirutaCode || !uatSirutas.includes(p.sirutaCode))) {
      return false
    }

    if (filters.components?.length && !filters.components.includes(p.componentCode)) {
      return false
    }

    if (filters.counties?.length && !filters.counties.includes(p.county)) {
      return false
    }

    if (filters.fundingSources?.length && !filters.fundingSources.includes(p.fundingSource)) {
      return false
    }

    if (filters.measures?.length) {
      const measureMatch = filters.measures.some((key) => {
        const [component, measure, financing] = key.split('.')
        if (component !== p.componentCode) return false
        if (measure !== p.measureCode) return false
        if (p.fundingSource === 'grant/loan') return true
        return financing === p.fundingSource
      })
      if (!measureMatch) return false
    }

    if (filters.cris?.length && !filters.cris.includes(p.cri)) {
      return false
    }

    if (filters.progressCategories?.length && !filters.progressCategories.includes(p.status)) {
      return false
    }

    if (filters.excludeMicro && p.valueEur < 5000) {
      return false
    }

    if (filters.onlyAnomalies && p.anomalies.length === 0) {
      return false
    }

    if (filters.anomalyTypes?.length) {
      const hasMatch = p.anomalies.some((a) => filters.anomalyTypes!.includes(a))
      if (!hasMatch) return false
    }

    if (filters.dataQualitySignalTypes?.length) {
      const hasMatch = p.dataQualitySignals.some((signal) =>
        filters.dataQualitySignalTypes!.includes(signal)
      )
      if (!hasMatch) return false
    }

    if (filters.entityTypes?.length && !filters.entityTypes.includes(p.entityType)) {
      return false
    }

    if (filters.beneficiaryTypes?.length && !matchesBeneficiaryType(p, filters.beneficiaryTypes)) {
      return false
    }

    if (filters.includeNational === false && p.county === 'Național') {
      return false
    }

    return true
  })
}

export function filterProjects(
  projects: readonly PnrrProject[],
  filters: PnrrFilters
): readonly PnrrProject[] {
  const matchingRecords = filterProjectRecords(
    flattenPnrrProjectRecords(projects),
    filters,
  )
  return groupPnrrProjects(matchingRecords)
}
