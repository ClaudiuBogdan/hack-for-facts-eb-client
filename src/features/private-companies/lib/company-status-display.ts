import { t } from '@lingui/core/macro'
import type { PrivateCompanyProfile } from '@/schemas/private-company'

export type CompanyStatusTone = 'positive' | 'warning' | 'negative' | 'neutral'

type CompanyStatus = NonNullable<PrivateCompanyProfile['status']>

/** ONRC status codes — scrapper nomenclator / correlation profile */
const ACTIVE_STATUS_CODES = new Set(['1048'])
const DISSOLUTION_STATUS_CODES = new Set(['1084', '1049'])
const INSOLVENCY_STATUS_CODES = new Set(['1107', '1139'])
const LEGAL_IMPEDIMENT_STATUS_CODES = new Set(['2065', '2069'])

const STATUS_LABEL_BY_CODE: Record<string, () => string> = {
  '1048': () => t`Active`,
  '1084': () => t`Removed from register`,
  '1049': () => t`Dissolved`,
  '1107': () => t`Insolvency`,
  '1139': () => t`Insolvency (Law 85/2014)`,
  '2065': () => t`Directors term expired`,
  '2069': () => t`Registered office expired`,
}

function normalizeStatusLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[şș]/g, 's')
    .replace(/[ţț]/g, 't')
}

function toneFromLabel(label: string): CompanyStatusTone | null {
  const normalized = normalizeStatusLabel(label)

  if (
    normalized.includes('functiune') ||
    normalized.includes('functionare') ||
    normalized.includes('in functiune')
  ) {
    return 'positive'
  }
  if (
    normalized.includes('radiat') ||
    normalized.includes('dizolv') ||
    normalized.includes('lichid') ||
    normalized.includes('desfiint')
  ) {
    return 'negative'
  }
  if (normalized.includes('insolven')) {
    return 'negative'
  }
  if (normalized.includes('expirat') || normalized.includes('suspend')) {
    return 'warning'
  }

  return null
}

export function getCompanyStatusTone(status: CompanyStatus): CompanyStatusTone {
  const { code } = status

  if (ACTIVE_STATUS_CODES.has(code)) {
    return 'positive'
  }
  if (
    DISSOLUTION_STATUS_CODES.has(code) ||
    INSOLVENCY_STATUS_CODES.has(code)
  ) {
    return 'negative'
  }
  if (LEGAL_IMPEDIMENT_STATUS_CODES.has(code)) {
    return 'warning'
  }

  return toneFromLabel(status.label) ?? 'neutral'
}

export function getCompanyStatusDisplayLabel(status: CompanyStatus): string {
  const mapped = STATUS_LABEL_BY_CODE[status.code]
  if (mapped) {
    return mapped()
  }

  const normalized = normalizeStatusLabel(status.label)
  if (normalized.includes('functiune')) {
    return t`Active`
  }
  if (normalized.includes('radiat')) {
    return t`Removed from register`
  }
  if (normalized.includes('dizolv')) {
    return t`Dissolved`
  }
  if (normalized.includes('insolven')) {
    return t`Insolvency`
  }

  return status.label
}
