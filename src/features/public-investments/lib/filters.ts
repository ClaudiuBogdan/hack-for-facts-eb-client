/**
 * Public Investments — privacy boundary + search filtering helpers.
 *
 * The adapter is the privacy boundary: any party with `served === false`,
 * `privacyClass === 'personal_moderate'`, `potentialNaturalPerson === true`,
 * or `reviewState === 'unreviewed'` is withheld. Raw payload excerpts for
 * evidence are scrubbed before reaching the UI; gated/person-like names are
 * replaced with the redaction marker. No function that returns parties for
 * public display may leak a gated `displayName`.
 */

import type {
  Party,
  PartyRole,
  ObjectiveSummary,
  RelatedLink,
} from './types'
import type { PublicInvestmentsSearchState } from '@/schemas/public-investments'
import { compareObjectives, isMoneySuspect } from './formatting'

/** Internal token used for withheld party names in evidence excerpts. */
export const REDACTED_NAME_MARKER = '[[PUBLIC_INVESTMENTS_REDACTED_NAME]]'

export const REDACTED_NAME_MARKER_KEY =
  'publicInvestments.privacy.nameWithheld'

/**
 * A party is publicly servable only when none of the privacy gates trip.
 * This is the single source of truth for the fail-safe check.
 */
export function isPartyPubliclyServable(party: Party): boolean {
  if (!party.served) return false
  if (party.privacyClass === 'personal_moderate') return false
  if (party.potentialNaturalPerson) return false
  if (party.reviewState === 'unreviewed') return false
  return true
}

/**
 * Returns the public display name for a party, or `null` when the party is
 * withheld. This is the only helper components should call to obtain a name.
 * Gated parties never leak `displayName` even if the raw fixture carried one.
 */
export function getPublicPartyDisplay(party: Party): string | null {
  if (!isPartyPubliclyServable(party)) {
    return null
  }
  return party.displayName
}

/**
 * Filter a list of parties down to those that may be publicly served.
 * Used by the directory / Contract / Părți tabs.
 */
export function filterPubliclyServableParties(
  parties: readonly Party[],
): readonly Party[] {
  return parties.filter(isPartyPubliclyServable)
}

/** Group parties by role, dropping withheld ones. */
export function groupPublicPartiesByRole(
  parties: readonly Party[],
): Readonly<Record<PartyRole, readonly Party[]>> {
  const executant: Party[] = []
  const proiectant: Party[] = []
  const beneficiar: Party[] = []

  for (const party of parties) {
    if (!isPartyPubliclyServable(party)) continue
    if (party.role === 'executant') executant.push(party)
    else if (party.role === 'proiectant') proiectant.push(party)
    else if (party.role === 'beneficiar') beneficiar.push(party)
  }

  return {
    executant,
    proiectant,
    beneficiar,
  }
}

/**
 * Redact gated party names inside a raw payload excerpt (string). Replaces any
 * occurrence of a gated party's display name (or CUI when person-like) with
 * the redaction marker. The adapter is expected to scrub server-side; this is
 * the client fail-safe so no gated name ever reaches the evidence viewer.
 */
export function redactEvidencePayload(
  raw: string,
  partyContext: readonly Party[],
): string {
  const gatedNames = partyContext
    .filter((party) => !isPartyPubliclyServable(party))
    .flatMap((party) => {
      const names: string[] = []
      if (party.displayName) names.push(party.displayName)
      // Person-like CUIs are withheld too; redact the raw CUI string as well.
      if (party.potentialNaturalPerson && party.cui) names.push(party.cui)
      return names
    })
    .filter((name): name is string => Boolean(name) && name.length > 0)

  if (gatedNames.length === 0) {
    return raw
  }

  // Escape regex metacharacters in each name before joining.
  const escaped = gatedNames
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length) // longest first to avoid partials

  const pattern = new RegExp(escaped.join('|'), 'g')
  return raw.replace(pattern, REDACTED_NAME_MARKER)
}

/** Strip party display names from a related-links rail (gated parties only). */
export function redactRelatedLinks(
  links: readonly RelatedLink[],
  partyContext: readonly Party[],
): readonly RelatedLink[] {
  const redactedPayload = redactEvidencePayload(
    links.map((link) => link.label).join('\u0001'),
    partyContext,
  )
  const redactedLabels = redactedPayload.split('\u0001')
  return links.map((link, index) => ({
    ...link,
    label: redactedLabels[index] ?? link.label,
  }))
}

// ---------------------------------------------------------------------------
// Search filtering / sorting / pagination (mock adapter)
// ---------------------------------------------------------------------------

export type FilteredObjectives = {
  readonly rows: readonly ObjectiveSummary[]
  readonly total: number
  readonly excludedSuspectCount: number
}

function matchesTextQuery(objective: ObjectiveSummary, query: string): boolean {
  if (!query) return true
  const haystack = [
    objective.title,
    objective.county,
    objective.uat ?? '',
    objective.domain ?? '',
    ...(objective.searchTokens ?? []),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

function withinRange(
  value: number | null | undefined,
  min: number | undefined,
  max: number | undefined,
): boolean {
  if (value == null) return false
  if (min != null && value < min) return false
  if (max != null && value > max) return false
  return true
}

function hasObjectiveDataQuality(
  objective: ObjectiveSummary,
  quality: 'precision_warning' | 'suspect_x1000',
): boolean {
  return (
    objective.allocated?.confidence === quality ||
    objective.contracted?.confidence === quality ||
    objective.reimbursed?.confidence === quality
  )
}

/**
 * Filter / sort / paginate objective rows for the mock search adapter.
 * Suspect (×1000) rows are excluded from amount/absorption range matching and
 * from amount-based sorting cohorts, and the excluded count is surfaced so
 * the UI can show "X cu valori în verificare, excluse din filtrele pe sumă".
 */
export function filterSortPaginateObjectives(
  objectives: readonly ObjectiveSummary[],
  search: Partial<PublicInvestmentsSearchState>,
): FilteredObjectives {
  const query = search.q?.trim().toLowerCase() ?? ''
  const programs = search.programs
  const domains = search.domains
  const counties = search.counties
  const siruta = search.siruta
  const stages = search.stages
  const amountField = search.amountField ?? 'contracted'
  const amountMin = search.amountMin
  const amountMax = search.amountMax
  const absMin = search.absMin
  const absMax = search.absMax
  const dataQuality = search.dataQuality
  const hasContractorCui = search.hasContractorCui
  const hasDesignerCui = search.hasDesignerCui
  const hasSiruta = search.hasSiruta
  const identity = search.identity
  const sort = search.sort ?? 'contracted'
  const order = search.order ?? 'desc'
  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 25
  const hasRangeFilter =
    amountMin != null || amountMax != null || absMin != null || absMax != null

  const programSet = programs ? new Set(programs) : null
  const domainSet = domains ? new Set(domains) : null
  const countySet = counties ? new Set(counties.map((c) => c.toUpperCase())) : null
  const stageSet = stages ? new Set(stages) : null
  const identitySet = identity ? new Set(identity) : null
  const dataQualitySet = dataQuality ? new Set(dataQuality) : null

  let excludedSuspectCount = 0

  const filtered: ObjectiveSummary[] = []
  for (const objective of objectives) {
    if (programSet && !programSet.has(objective.program)) continue
    if (domainSet && (!objective.domainKey || !domainSet.has(objective.domainKey))) {
      continue
    }
    if (countySet && !countySet.has(objective.countyCode.toUpperCase())) continue
    if (siruta && objective.siruta !== siruta) continue
    if (stageSet && !stageSet.has(objective.stage.bucket)) continue
    if (identitySet && !identitySet.has(objective.identityConfidence)) continue
    if (hasContractorCui != null && objective.hasContractorCui !== hasContractorCui) {
      continue
    }
    if (hasDesignerCui != null && objective.hasDesignerCui !== hasDesignerCui) continue
    if (hasSiruta != null) {
      const has = objective.siruta != null
      if (has !== hasSiruta) continue
    }
    if (!matchesTextQuery(objective, query)) continue

    // dataQuality facet: include only rows matching the requested confidence.
    if (dataQualitySet) {
      const matches =
        (dataQualitySet.has('precision_warning') &&
          hasObjectiveDataQuality(objective, 'precision_warning')) ||
        (dataQualitySet.has('suspect_x1000') &&
          hasObjectiveDataQuality(objective, 'suspect_x1000'))
      if (!matches) continue
    }

    // Amount / absorption range filters EXCLUDE suspect rows (PI-1 guard).
    const amountValue =
      amountField === 'contracted'
        ? objective.contracted
        : amountField === 'reimbursed'
          ? objective.reimbursed
          : objective.allocated

    const isSuspect = isMoneySuspect(amountValue)
    if (isSuspect) {
      // Suspect rows are dropped from amount/absorption range matching but
      // still appear when no range filter is active.
      if (hasRangeFilter) {
        excludedSuspectCount += 1
        continue
      }
    } else {
      if (amountMin != null || amountMax != null) {
        if (!withinRange(amountValue?.amount ?? null, amountMin, amountMax)) {
          continue
        }
      }
      if (absMin != null || absMax != null) {
        if (!withinRange(objective.absorptionPct, absMin, absMax)) {
          continue
        }
      }
    }

    filtered.push(objective)
  }

  const sorted = [...filtered].sort((a, b) => compareObjectives(a, b, sort, order))

  const start = (page - 1) * pageSize
  const rows = sorted.slice(start, start + pageSize)

  return {
    rows,
    total: sorted.length,
    excludedSuspectCount,
  }
}

/**
 * Compute the "top stalled" teaser: objectives in
 * `contractat | in_executie` with lowest non-null absorption, excluding any
 * whose contracted amount is suspect (PI-1 guard).
 */
export function computeTopStalled(
  objectives: readonly ObjectiveSummary[],
  limit = 6,
): readonly ObjectiveSummary[] {
  const stalledBuckets = new Set(['contractat', 'in_executie'])
  return objectives
    .filter(
      (objective) =>
        stalledBuckets.has(objective.stage.bucket) &&
        objective.absorptionPct != null &&
        !isMoneySuspect(objective.contracted),
    )
    .sort((a, b) => (a.absorptionPct ?? 0) - (b.absorptionPct ?? 0))
    .slice(0, limit)
}
