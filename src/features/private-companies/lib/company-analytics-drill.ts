import type { CompanyAnalysisBucket, CompanyAnalysisDimension, CompanyAnalysisScope } from '@/schemas/company-analytics'
import { COMPANY_ANALYSIS_SIZE_BANDS, type CompanyAnalysisSizeBand } from '@/schemas/company-analytics'

/**
 * A breakdown row clicked: the same question narrowed to that group, with a
 * filter the API reads exactly as the group was counted. A group is a key;
 * the unknown group is the field's own unknown value where the API has one
 * (a county, a UAT, a status, a fiscal flag, a missing main activity).
 * „Other" folds many groups and the unknown size band mixes companies
 * without a statement with statements without a headcount: neither narrows
 * to one filter, so neither is a drill.
 */
export function drillScope(scope: CompanyAnalysisScope, dimension: CompanyAnalysisDimension, bucket: CompanyAnalysisBucket): CompanyAnalysisScope | null {
  if (bucket.kind === 'GROUP' && bucket.key !== null) return withGroup(scope, dimension, bucket.key)
  if (bucket.kind === 'UNKNOWN') return withUnknown(scope, dimension)
  return null
}

function withGroup(scope: CompanyAnalysisScope, dimension: CompanyAnalysisDimension, key: string): CompanyAnalysisScope | null {
  switch (dimension) {
    case 'COUNTY':
      return { ...scope, county: { in: [key] } }
    case 'UAT':
      return { ...scope, uat: { in: [key] } }
    case 'OBSERVED_STATUS':
      return { ...scope, observedStatus: { in: [key] } }
    case 'LEGAL_FORM':
      return { ...scope, legalForms: [key] }
    case 'VAT_PAYER':
      return key === 'YES' || key === 'NO' ? { ...scope, vatPayer: [key] } : null
    case 'FISCALLY_INACTIVE':
      return key === 'YES' || key === 'NO' ? { ...scope, fiscallyInactive: [key] } : null
    case 'MAIN_CAEN': {
      // The API's key: `revision:code`, or `?:code` when ANAF published no revision — kept unknown, never guessed.
      const separator = key.indexOf(':')
      if (separator <= 0) return null
      const revision = key.slice(0, separator)
      const code = key.slice(separator + 1)
      return { ...scope, mainCaen: [revision === '?' ? { code } : { code, revision }] }
    }
    case 'EMPLOYEE_SIZE':
      return (COMPANY_ANALYSIS_SIZE_BANDS as readonly string[]).includes(key) ? { ...scope, employeeSizeBands: [key as CompanyAnalysisSizeBand] } : null
  }
}

function withUnknown(scope: CompanyAnalysisScope, dimension: CompanyAnalysisDimension): CompanyAnalysisScope | null {
  switch (dimension) {
    case 'COUNTY':
      return { ...scope, county: { includeUnknown: true } }
    case 'UAT':
      return { ...scope, uat: { includeUnknown: true } }
    case 'OBSERVED_STATUS':
      return { ...scope, observedStatus: { includeUnknown: true } }
    case 'VAT_PAYER':
      return { ...scope, vatPayer: ['UNKNOWN'] }
    case 'FISCALLY_INACTIVE':
      return { ...scope, fiscallyInactive: ['UNKNOWN'] }
    case 'MAIN_CAEN':
      return { ...scope, mainCaen: undefined, mainCaenBasis: ['MISSING'] }
    default:
      return null
  }
}

const DRILL_ORDER: readonly CompanyAnalysisDimension[] = ['COUNTY', 'UAT', 'MAIN_CAEN', 'LEGAL_FORM', 'OBSERVED_STATUS', 'EMPLOYEE_SIZE', 'VAT_PAYER', 'FISCALLY_INACTIVE']

/** After a drill, the breakdown moves on: a county opens its localities, anything else the first grouping not already narrowed to one value. */
export function nextDimension(dimension: CompanyAnalysisDimension, scope: CompanyAnalysisScope): CompanyAnalysisDimension {
  if (dimension === 'COUNTY') return 'UAT'
  const narrowed = (candidate: CompanyAnalysisDimension) => {
    switch (candidate) {
      case 'COUNTY':
        return (scope.county?.in?.length ?? 0) + (scope.county?.includeUnknown ? 1 : 0) === 1
      case 'UAT':
        return (scope.uat?.in?.length ?? 0) + (scope.uat?.includeUnknown ? 1 : 0) === 1 || !scope.county
      case 'MAIN_CAEN':
        return (scope.mainCaen?.length ?? 0) === 1
      case 'LEGAL_FORM':
        return (scope.legalForms?.length ?? 0) === 1
      case 'OBSERVED_STATUS':
        return (scope.observedStatus?.in?.length ?? 0) === 1
      case 'EMPLOYEE_SIZE':
        return (scope.employeeSizeBands?.length ?? 0) === 1
      case 'VAT_PAYER':
        return (scope.vatPayer?.length ?? 0) === 1
      case 'FISCALLY_INACTIVE':
        return (scope.fiscallyInactive?.length ?? 0) === 1
    }
  }
  return DRILL_ORDER.find((candidate) => candidate !== dimension && !narrowed(candidate)) ?? dimension
}
