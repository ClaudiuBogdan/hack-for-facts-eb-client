import entityDirectoryCsv from '@/assets/data/pnrr-beneficiary-entity-directory.csv?raw'
// Compact CUI lookup generated from the official 2023 public companies CSV:
// https://data.gov.ro/dataset/5c4554c0-3ceb-4fa5-9c6c-a8ce78a170cb/resource/f2a75408-03f5-439d-aa1a-2c86f4386bb2
import publicCompaniesCsv from '@/assets/data/public-companies-2023.csv?raw'
import { COUNTY_NAME_TO_MNEMONIC, MNEMONIC_TO_COUNTY_NAME } from './county-mnemonics'
import { UAT_CUI_TO_NATCODE, UAT_LOCALITY_TO_NATCODE } from './uat-mapping'

type EntityDirectoryRecord = {
  readonly t: string | null
  readonly u: boolean
  readonly c: string | null
  readonly l: string | null
  readonly m1: string | null
  readonly m2: string | null
}

type ProjectSirutaInput = {
  readonly beneficiary: string
  readonly cui: string | null
  readonly locality: string
  readonly county: string
}

type ProjectLocationAssignment = {
  readonly sirutaCode: string | null
  readonly locality: string
  readonly county: string
}

const ENTITY_TYPE_BY_CODE = [
  'admin_central_agency',
  'admin_commune_hall',
  'admin_county_council',
  'admin_ministry',
  'admin_municipality',
  'admin_sector_hall',
  'admin_town_hall',
  'culture_library',
  'culture_museum',
  'culture_youth_center',
  'defence_military_unit',
  'edu_kindergarten',
  'edu_primary_school',
  'edu_research_institute',
  'edu_secondary_school',
  'edu_training_center',
  'edu_university',
  'edu_vocational_school',
  'environment_agency',
  'finance_health_fund',
  'finance_social_security',
  'finance_tax_authority',
  'health_ambulance_service',
  'health_clinic',
  'health_general_hospital',
  'health_public_health_dir',
  'health_special_hospital',
  'justice_court',
  'public_order_intelligence',
  'public_order_police',
  'social_assistance_dir',
  'social_benefits_agency',
  'social_child_protection',
  'social_disability_care',
  'social_employment_agency',
  'sport_club',
  'uncategorized',
] as const

function splitCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  values.push(current)
  return values
}

function decodeEntityType(code: string | undefined): string | null {
  if (!code) return null

  const index = Number.parseInt(code, 36) - 1
  return ENTITY_TYPE_BY_CODE[index] ?? null
}

function decodeCounty(value: string | undefined): string | null {
  if (!value) return null
  return MNEMONIC_TO_COUNTY_NAME[value] ?? value
}

function parseEntityDirectory(csv: string): Record<string, EntityDirectoryRecord> {
  const directory: Record<string, EntityDirectoryRecord> = {}

  for (const line of csv.split('\n')) {
    if (!line) continue

    const [cui, typeCode, isUat, county, locality, mainCreditor1, mainCreditor2] = splitCsvLine(line)
    if (!cui) continue

    directory[cui] = {
      t: decodeEntityType(typeCode),
      u: isUat === '1',
      c: decodeCounty(county),
      l: locality || null,
      m1: mainCreditor1 || null,
      m2: mainCreditor2 || null,
    }
  }

  return directory
}

const entityDirectory = parseEntityDirectory(entityDirectoryCsv)

function parseCuiLookupCsv(csv: string): Set<string> {
  const cuis = new Set<string>()
  const lines = csv.replace(/^\uFEFF/, '').split('\n')

  for (const line of lines.slice(1)) {
    if (!line) continue

    const [cui] = splitCsvLine(line)
    const normalizedCui = normalizeCui(cui)
    if (normalizedCui) cuis.add(normalizedCui)
  }

  return cuis
}

const publicCompanyCuis = parseCuiLookupCsv(publicCompaniesCsv)

export function getPnrrBeneficiaryDirectoryType(cui: string | null | undefined): string | null {
  const normalizedCui = normalizeCui(cui)
  return normalizedCui ? entityDirectory[normalizedCui]?.t ?? null : null
}

export function isOfficialPublicCompanyCui(cui: string | null | undefined): boolean {
  const normalizedCui = normalizeCui(cui)
  return normalizedCui ? publicCompanyCuis.has(normalizedCui) : false
}

const CANONICAL_COUNTY_BY_NORMALIZED = Object.fromEntries(
  Object.keys(COUNTY_NAME_TO_MNEMONIC).map((countyName) => [normalizeLocation(countyName), countyName])
)

function isCountyMnemonic(value: string | null | undefined): value is keyof typeof MNEMONIC_TO_COUNTY_NAME {
  return Boolean(value && MNEMONIC_TO_COUNTY_NAME[value])
}

const BUCHAREST_SECTOR_TO_NATCODE: Record<string, string> = {
  '1': '179141',
  '2': '179150',
  '3': '179169',
  '4': '179178',
  '5': '179187',
  '6': '179196',
}

const BUCHAREST_MUNICIPALITY_CUI = '4267117'
const BUCHAREST_MUNICIPALITY_NATCODE = '179132'

const ALWAYS_NATIONAL_ENTITY_TYPES = new Set([
  'admin_ministry',
  'finance_tax_authority',
  'finance_health_fund',
  'finance_social_security',
  'public_order_intelligence',
])

const NATIONAL_UNLESS_LOCAL_PARENT_TYPES = new Set([
  'admin_central_agency',
  'environment_agency',
  'social_benefits_agency',
  'social_employment_agency',
  'justice_court',
  'public_order_police',
])

function normalizeCui(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/^RO/i, '').replace(/\s+/g, '')
}

function stripAdministrativePrefix(value: string): string {
  const prefixes = ['MUNICIPIUL ', 'ORAȘUL ', 'ORASUL ', 'COMUNA ', 'JUDEȚUL ', 'JUDETUL ']
  const trimmed = value.trim()
  const upper = trimmed.toUpperCase()

  for (const prefix of prefixes) {
    if (upper.startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim()
    }
  }

  return trimmed
}

function normalizeLocation(value: string): string {
  return stripAdministrativePrefix(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

function resolveBucharestSector(locality: string, county: string): string | null {
  const normalizedCounty = normalizeLocation(county)
  if (normalizedCounty !== 'bucuresti' && normalizedCounty !== 'municipiulbucuresti') {
    return null
  }

  const sectorMatch = locality
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/sector(?:ul)?\s*([1-6])/i)

  return sectorMatch ? BUCHAREST_SECTOR_TO_NATCODE[sectorMatch[1]] ?? null : null
}

function resolveSirutaFromLocality(locality: string | null, county: string | null): string | null {
  if (!locality || !county || county === 'Național') return null

  const sectorSiruta = resolveBucharestSector(locality, county)
  if (sectorSiruta) return sectorSiruta

  const key = `${normalizeLocation(locality)}|${normalizeLocation(county)}`
  return UAT_LOCALITY_TO_NATCODE[key] ?? null
}

function formatCountyDisplay(county: string | null): string | null {
  if (!county) return null

  const normalizedCounty = normalizeLocation(county)
  if (normalizedCounty === 'bucuresti' || normalizedCounty === 'municipiulbucuresti') {
    return 'București'
  }

  return CANONICAL_COUNTY_BY_NORMALIZED[normalizedCounty] ?? county
}

function formatLocalityDisplay(locality: string | null): string | null {
  if (!locality) return null

  return locality
    .trim()
    .toLocaleLowerCase('ro-RO')
    .replace(/(^|\s|-)([a-zăâîșț])/g, (match) => match.toLocaleUpperCase('ro-RO'))
    .replace(/\bAl\b/g, 'al')
    .replace(/\bA\b/g, 'a')
}

function getCountyCouncilCounty(
  beneficiary: string,
  directAssignment: string | undefined,
  entity: EntityDirectoryRecord | undefined,
  inputCounty: string
): string | null {
  if (isCountyMnemonic(directAssignment)) {
    return MNEMONIC_TO_COUNTY_NAME[directAssignment]
  }

  const countyFromName = CANONICAL_COUNTY_BY_NORMALIZED[normalizeLocation(beneficiary)]
  if (countyFromName) return countyFromName

  return formatCountyDisplay(inputCounty) ?? formatCountyDisplay(entity?.c ?? null)
}

function formatCountyCouncilLocality(county: string | null): string | null {
  return county ? `Județul ${county}` : null
}

function getUatNatcodeByCui(cui: string): string | undefined {
  if (cui === BUCHAREST_MUNICIPALITY_CUI) return BUCHAREST_MUNICIPALITY_NATCODE
  return UAT_CUI_TO_NATCODE[cui]
}

function getLocalParentSiruta(entity: EntityDirectoryRecord): string | null {
  for (const creditorCui of [entity.m1, entity.m2]) {
    const normalizedCreditorCui = normalizeCui(creditorCui)
    if (!normalizedCreditorCui) continue

    const directSiruta = getUatNatcodeByCui(normalizedCreditorCui)
    if (directSiruta && !isCountyMnemonic(directSiruta)) return directSiruta
  }

  return null
}

function hasLocalUatParent(entity: EntityDirectoryRecord): boolean {
  return [entity.m1, entity.m2].some((creditorCui) => {
    const normalizedCreditorCui = normalizeCui(creditorCui)
    const directAssignment = normalizedCreditorCui ? getUatNatcodeByCui(normalizedCreditorCui) : undefined
    const parent = normalizedCreditorCui ? entityDirectory[normalizedCreditorCui] : undefined
    return Boolean(parent?.u && parent.t !== 'admin_county_council' && !isCountyMnemonic(directAssignment))
  })
}

function isNationalEntity(entity: EntityDirectoryRecord, hasLocalParent: boolean): boolean {
  if (!entity.t) return false
  if (ALWAYS_NATIONAL_ENTITY_TYPES.has(entity.t)) return true
  return !hasLocalParent && NATIONAL_UNLESS_LOCAL_PARENT_TYPES.has(entity.t)
}

function hasPrivateMarker(beneficiary: string): boolean {
  const normalized = beneficiary
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, '')

  return (
    normalized.includes('SRL') ||
    /\bSA\b/.test(normalized) ||
    normalized.includes('SOCIETATE CU RASPUNDERE LIMITATA') ||
    normalized.includes('PERSOANA FIZICA AUTORIZATA') ||
    /\bPFA\b/.test(normalized)
  )
}

export function resolvePnrrProjectLocation(input: ProjectSirutaInput): ProjectLocationAssignment {
  const normalizedCui = normalizeCui(input.cui)
  const directAssignment = getUatNatcodeByCui(normalizedCui)
  const entity = entityDirectory[normalizedCui]
  const rawAssignment = {
    sirutaCode: null,
    locality: input.locality,
    county: input.county,
  }

  if (isCountyMnemonic(directAssignment) || entity?.t === 'admin_county_council') {
    const county = getCountyCouncilCounty(input.beneficiary, directAssignment, entity, input.county)
    return {
      sirutaCode: null,
      locality: formatCountyCouncilLocality(county) ?? input.locality,
      county: county ?? input.county,
    }
  }

  if (directAssignment) {
    if (normalizedCui === BUCHAREST_MUNICIPALITY_CUI) {
      return {
        sirutaCode: directAssignment,
        locality: 'Municipiul București',
        county: 'București',
      }
    }

    return {
      sirutaCode: directAssignment,
      locality: formatLocalityDisplay(entity?.l) ?? input.locality,
      county: formatCountyDisplay(entity?.c) ?? input.county,
    }
  }

  if (entity) {
    const hasLocalParent = hasLocalUatParent(entity)

    if (isNationalEntity(entity, hasLocalParent)) {
      return {
        sirutaCode: null,
        locality: 'NAȚIONAL',
        county: 'Național',
      }
    }

    const resolvedSiruta = resolveSirutaFromLocality(entity.l, entity.c)
    if (resolvedSiruta) {
      return {
        sirutaCode: resolvedSiruta,
        locality: formatLocalityDisplay(entity.l) ?? input.locality,
        county: formatCountyDisplay(entity.c) ?? input.county,
      }
    }

    const localParentSiruta = getLocalParentSiruta(entity)
    if (localParentSiruta) {
      return {
        sirutaCode: localParentSiruta,
        locality: formatLocalityDisplay(entity.l) ?? input.locality,
        county: formatCountyDisplay(entity.c) ?? input.county,
      }
    }

    return rawAssignment
  }

  // Unknown private entities cannot be safely assigned to a UAT from the PNRR
  // row locality alone; that locality is often an implementation location.
  if (hasPrivateMarker(input.beneficiary)) return rawAssignment

  return rawAssignment
}

export function resolvePnrrProjectSiruta(input: ProjectSirutaInput): string | null {
  return resolvePnrrProjectLocation(input).sirutaCode
}
