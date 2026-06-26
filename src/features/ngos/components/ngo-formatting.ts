import type {
  NgoValidityState,
  ServiceDiscoveryRow,
  SourceCoverageRow,
  SourceSnapshot,
} from '@/schemas/ngos'
import type { DataStatusVariant } from '@/components/provenance/source-provenance'

export const NGO_AUTHORITY_LABELS: Readonly<Record<string, string>> = {
  ANOFM: 'ANOFM',
  MMuncii: 'Ministerul Muncii',
  ANAF: 'ANAF',
  MJ: 'Ministerul Justitiei',
  SGG: 'Secretariatul General al Guvernului',
}

export function formatRoDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export function formatRoNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('ro-RO').format(value)
}

export function formatRoMoney(
  value: number,
  currency: 'RON' | 'EUR',
): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function locationLabel(
  locality: string | null | undefined,
  county: string | null | undefined,
): string {
  if (locality && county) return `${locality}, ${county}`
  return locality ?? county ?? 'Localitate necunoscuta'
}

export function sourceStatusVariant(
  status: SourceCoverageRow['status'],
): DataStatusVariant {
  if (status === 'loaded') return 'live'
  if (status === 'loaded_stale') return 'stale'
  if (status === 'pending') return 'partial'
  if (status === 'name_only') return 'name_only'
  return 'blocked'
}

export function snapshotAuthorityLabel(snapshot?: SourceSnapshot | null): string {
  if (!snapshot) return 'Sursa necunoscuta'
  return NGO_AUTHORITY_LABELS[snapshot.sourceId] ?? snapshot.sourceId
}

export function serviceValidityLabel(state: NgoValidityState): string {
  if (state === 'expired') return 'Expirat'
  if (state === 'expiring') return 'Expira curand'
  return 'Activ'
}

export function serviceValidityVariant(
  state: NgoValidityState,
): DataStatusVariant {
  if (state === 'expired') return 'blocked'
  if (state === 'expiring') return 'partial'
  return 'live'
}

export function normalizedText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function serviceRowMatchesQuery(
  row: ServiceDiscoveryRow,
  query: string | undefined,
): boolean {
  const normalizedQuery = normalizedText(query)
  if (!normalizedQuery) return true

  return [
    row.providerName,
    row.serviceName,
    row.county,
    row.locality,
    row.licenseNumber,
    row.providerCui,
  ].some((value) => normalizedText(value).includes(normalizedQuery))
}
