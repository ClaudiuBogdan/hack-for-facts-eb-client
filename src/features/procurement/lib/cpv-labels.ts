import { t } from '@lingui/core/macro'
import type { CategoryRow } from '@/schemas/procurement'

/** Romanian CPV division labels (loader-derived where known; EN fallback). */
const CPV_DIVISION_RO: Record<string, string> = {
  '45': 'Lucrări de construcții',
  '30': 'Echipamente de calcul și birotică',
  '90': 'Servicii de curățenie',
  '50': 'Servicii de reparații',
  '48': 'Pachete software și servicii IT',
  '71': 'Servicii arhitecturale și inginerești',
  '79': 'Servicii de afaceri',
  '85': 'Servicii de educație',
  '80': 'Servicii de securitate',
}

const CPV_DIVISION_EN: Record<string, string> = {
  '45': 'Construction work',
  '30': 'Computer and office equipment',
  '90': 'Cleaning services',
  '50': 'Repair services',
  '48': 'Software and IT services',
  '71': 'Architectural and engineering services',
  '79': 'Business services',
  '85': 'Education services',
  '80': 'Security services',
}

export function cpvDivisionLabelRo(code: string): string | null {
  return CPV_DIVISION_RO[code] ?? null
}

export function cpvDivisionLabelEn(code: string): string {
  return CPV_DIVISION_EN[code] ?? t`Categorie CPV`
}

export function resolveCpvLabel(
  code: string | null,
  fallback?: { readonly labelRo: string | null; readonly labelEn: string } | null,
): { readonly code: string; readonly labelRo: string | null; readonly labelEn: string } | null {
  if (!code) return null
  const division = code.length >= 2 ? code.slice(0, 2) : code
  const labelRo = fallback?.labelRo ?? cpvDivisionLabelRo(division)
  const labelEn = fallback?.labelEn ?? cpvDivisionLabelEn(division)
  return { code, labelRo, labelEn }
}

export function categoryRowLabel(row: CategoryRow): string {
  return row.labelRo ?? row.labelEn
}
