import { t } from '@lingui/core/macro'
import {
  COMPANY_ANALYSIS_MAIN_ACTIVITY_STATUSES,
  COMPANY_ANALYSIS_MAIN_SELECTING_STATUSES,
  releaseOffersMainActivity,
  type CompanyAnalysisBucket,
  type CompanyAnalysisMainActivity,
  type CompanyAnalysisMainActivityStatus,
  type CompanyAnalysisRelease,
  type CompanyAnalysisScope,
} from '@/schemas/company-analytics'
import type { CompanyMainActivity } from '@/schemas/private-company-main-activity'
import { DEFAULT_STATE, normalizedScope, urlSearchOf, type CompanyAnalyticsUrlSearch } from './company-analytics-url'
import { mainKeyText } from './company-main-activity-model'

/**
 * The ANAF-assumed main activity in the analysis (v4, staged): its buckets'
 * names, its unresolved buckets (never ranked), and the one way a profile
 * links into a release's main cohort. Nothing here falls back to the derived
 * activity, ANAF's fiscal code or an authorized ONRC code for a main
 * question, remaps a revision or invents a division label.
 */

/** A bucket's unresolved main status (`NO_ONRC_MATCH`, …), from its main activity or its key `(no_onrc_match)`; null for a named key. */
export function unresolvedMainStatusOf(bucket: { readonly key: string | null; readonly mainActivity?: CompanyAnalysisMainActivity | null }): CompanyAnalysisMainActivityStatus | null {
  const status = bucket.mainActivity?.status ?? null
  if (status !== null) return COMPANY_ANALYSIS_MAIN_SELECTING_STATUSES.has(status) ? null : status
  const named = /^\(([A-Za-z_]+)\)$/u.exec(bucket.key ?? '')?.[1]?.toUpperCase()
  const known = COMPANY_ANALYSIS_MAIN_ACTIVITY_STATUSES.find((value) => value === named)
  return known !== undefined && !COMPANY_ANALYSIS_MAIN_SELECTING_STATUSES.has(known) ? known : null
}

export function isUnresolvedMainActivity(bucket: CompanyAnalysisBucket): boolean {
  return unresolvedMainStatusOf(bucket) !== null
}

/** An unresolved main bucket's name: why its companies have no ONRC key — never "no activity". */
export function unresolvedMainLabel(status: CompanyAnalysisMainActivityStatus): string {
  switch (status) {
    case 'NO_ONRC_MATCH':
      return t`Cod ANAF fără potrivire ONRC (revizie necunoscută)`
    case 'UNRESOLVED_TOKEN_FORM':
      return t`Cod ANAF într-o formă fără corespondent ONRC`
    case 'TOKEN_PLACEHOLDER':
      return t`Cod substitut ANAF (nu indică o activitate)`
    case 'TOKEN_INVALID':
      return t`Cod ANAF nevalid`
    case 'SOURCE_MISSING':
      return t`Fără cod CAEN ANAF (nu înseamnă fără activitate)`
    case 'SOURCE_UNBOUND':
      return t`Observație ANAF nelegată de înregistrarea fiscală`
    case 'CORRECTION_WITHHELD':
      return t`Potrivire reținută printr-o corecție revizuită`
    case 'RESOLVED':
    case 'RESOLVED_LATEST_REVISION':
    case 'CORRECTED':
      return t`Activitate principală presupusă`
  }
}

/** A named main bucket in one line: the exact ONRC key with the label frozen in the release, „4711 · label · ONRC Rev.3". */
export function mainActivityBucketText(main: CompanyAnalysisMainActivity): string {
  if (!COMPANY_ANALYSIS_MAIN_SELECTING_STATUSES.has(main.status) || main.code === null) return unresolvedMainLabel(main.status)
  const revision = main.revision ? ` · ONRC ${main.revision.replace(/^rev/u, 'Rev.')}` : ''
  return main.label ? `${main.code} · ${main.label}${revision}` : `${main.code}${revision}`
}

/** An exact main selector as the analysis's chips name it: „Rev.3 4711 (ONRC)". */
export function mainActivitySelectorText(selector: { readonly revision: string; readonly code: string }): string {
  return t`${mainKeyText(selector)} (ONRC, activitate principală presupusă)`
}

/**
 * The analysis scope a profile's main activity opens in a release, or null
 * when it would be another cohort: the release must list MAIN_ACTIVITY and
 * pin exactly the profile's main content — the same ONRC edition and content
 * epoch, under the same policy — and the profile's assignment must be current
 * and name an exact key, its ANAF source public. Never widened to any other filter.
 */
export function mainActivityAnalysisScope(release: CompanyAnalysisRelease, activity: CompanyMainActivity): CompanyAnalysisScope | null {
  if (!releaseOffersMainActivity(release)) return null
  const pin = release.mainCaen
  if (!pin || activity.currentness !== 'CURRENT' || activity.anafWithdrawn || activity.resolved === null || activity.edition === null) return null
  if (pin.editionId !== activity.edition.editionId || pin.contentEpoch !== activity.contentEpoch || pin.policy !== activity.policy) return null
  return { mainActivity: [{ revision: activity.resolved.revision, code: activity.resolved.code }] }
}

/** The analysis address of that scope, pinned to that release (`editie`), so the link opens exactly its cohort. */
export function mainActivityAnalysisSearch(release: CompanyAnalysisRelease, activity: CompanyMainActivity): CompanyAnalyticsUrlSearch | null {
  const scope = mainActivityAnalysisScope(release, activity)
  if (scope === null) return null
  return urlSearchOf({ ...DEFAULT_STATE, release: release.release.releaseId, scope: normalizedScope(scope) })
}
