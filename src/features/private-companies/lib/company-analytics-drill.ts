import type { CompanyAnalysisBucket, CompanyAnalysisDimension, CompanyAnalysisScope } from '@/schemas/company-analytics'
import {
  COMPANY_ANALYSIS_MAIN_SELECTING_STATUSES,
  COMPANY_ANALYSIS_SELECTING_BASES,
  COMPANY_ANALYSIS_SIZE_BANDS,
  type CompanyAnalysisSizeBand,
} from '@/schemas/company-analytics'
import { unclassifiedBasisOf } from './company-activity-text'
import { unresolvedMainStatusOf } from './company-analytics-main-activity'
import { activitySelectorOf, mainActivitySelectorOf } from './company-analytics-url'

/**
 * A breakdown row clicked: the same question narrowed to that group, with a
 * filter the API reads exactly as the group was counted. A group is a key —
 * for a county, locality or status also a basis group's own key,
 * `(multiple_values)`, never widened to every company without a value. The
 * unknown group is the field's own unknown value where the API has one (a
 * fiscal flag, a missing ANAF fiscal CAEN code); a consensus grouping's unknown is an
 * empty slot (`includeUnknown` would select every basis group instead), so it
 * is no drill. „Other" folds many groups and the unknown size band mixes
 * companies without a statement with statements without a headcount: neither
 * narrows to one filter, so neither is a drill. A selected activity narrows
 * to that exact activity — ONRC with its revision, ANAF without one — and an
 * unclassified activity bucket to its basis. A main activity (v4) narrows to
 * its exact ONRC key, an unresolved one to its status — only ever with the
 * main activity's own filters, never the derived activity's, ANAF's fiscal
 * code or an authorized ONRC code.
 */
export function drillScope(scope: CompanyAnalysisScope, dimension: CompanyAnalysisDimension, bucket: CompanyAnalysisBucket): CompanyAnalysisScope | null {
  if (dimension === 'ACTIVITY') return bucket.kind === 'GROUP' ? withActivity(scope, bucket) : null
  if (dimension === 'MAIN_ACTIVITY') return bucket.kind === 'GROUP' ? withMainActivity(scope, bucket) : null
  if (bucket.kind === 'GROUP' && bucket.key !== null) return withGroup(scope, dimension, bucket.key)
  if (bucket.kind === 'UNKNOWN') return withUnknown(scope, dimension)
  return null
}

/**
 * An ACTIVITY bucket's exact filter: an unclassified one (several classes,
 * an uncatalogued ANAF code, no qualified selection) by its basis; a
 * selected activity by its source, code and — ONRC only — revision, read
 * from the bucket's activity or, failing that, its key (`onrc:rev2:6201`,
 * `anaf:6201`). An ONRC bucket holds both ONRC bases, as the exact filter
 * does.
 */
function withActivity(scope: CompanyAnalysisScope, bucket: CompanyAnalysisBucket): CompanyAnalysisScope | null {
  const unclassified = unclassifiedBasisOf(bucket)
  if (unclassified !== null && !COMPANY_ANALYSIS_SELECTING_BASES.has(unclassified)) return { ...scope, activityBasis: [unclassified] }
  const activity = bucket.activity
  if (activity?.source === 'ONRC' && activity.code && activity.revision) return { ...scope, activity: [{ source: 'ONRC', code: activity.code, revision: activity.revision }] }
  if (activity?.source === 'ANAF' && activity.code) return { ...scope, activity: [{ source: 'ANAF', code: activity.code }] }
  const selector = bucket.key ? activitySelectorOf(bucket.key) : null
  return selector ? { ...scope, activity: [selector] } : null
}

/**
 * A MAIN_ACTIVITY bucket's exact filter: an unresolved status by that status;
 * a selected key by its revision and code, read from the bucket's main
 * activity or, failing that, its key (`main:rev3:4711`).
 */
function withMainActivity(scope: CompanyAnalysisScope, bucket: CompanyAnalysisBucket): CompanyAnalysisScope | null {
  const unresolved = unresolvedMainStatusOf(bucket)
  if (unresolved !== null) return { ...scope, mainActivityStatus: [unresolved] }
  const main = bucket.mainActivity
  if (main && COMPANY_ANALYSIS_MAIN_SELECTING_STATUSES.has(main.status) && main.revision && main.code) return { ...scope, mainActivity: [{ revision: main.revision, code: main.code }] }
  const selector = bucket.key ? mainActivitySelectorOf(bucket.key) : null
  return selector ? { ...scope, mainActivity: [selector] } : null
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
    case 'ACTIVITY':
    case 'MAIN_ACTIVITY':
      return null
  }
}

function withUnknown(scope: CompanyAnalysisScope, dimension: CompanyAnalysisDimension): CompanyAnalysisScope | null {
  switch (dimension) {
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

/**
 * After a drill, the breakdown moves on: a county opens its localities, anything else the first grouping not already narrowed to one value.
 * The derived and the main activity are never moved to (a release may not offer them): they are left for the reader to choose.
 */
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
      case 'ACTIVITY':
        return (scope.activity?.length ?? 0) === 1
      case 'MAIN_ACTIVITY':
        return (scope.mainActivity?.length ?? 0) === 1
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
