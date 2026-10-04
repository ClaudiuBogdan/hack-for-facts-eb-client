import type { CompanyRegistryEnvelope } from './private-company-registry'

/**
 * Registry groupings as API19 serves them: `companyCountyProfile` (the
 * directory's facets) and `companyHubStats` (the `/companies` hub). Every
 * figure is bound to the pinned edition its envelope names.
 *
 * - COUNTY / STATUS buckets: each CUI counts once, under its consensus value
 *   or an explicit basis bucket (`basis` set, key `(<basis>)`); a county key is
 *   the county code, its label the canonical name; a status label is this
 *   application's nomenclature, not an ONRC-observed label. Their counts add
 *   up to the denominator.
 * - CAEN_DIVISION buckets: `<revision|unknown>:<2 digits>`, distinct CUIs per
 *   bucket, and buckets OVERLAP — never added up or read as shares of a whole.
 */

export interface CompanyRegistryBucket {
  readonly key: string
  readonly label: string | null
  readonly count: number
  /** Set for a bucket of CUIs without a consensus value: multiple_values, partial_observations, missing, unresolved, not_in_edition. */
  readonly basis: string | null
}

export type CompanyGroupByDim = 'COUNTY' | 'STATUS' | 'CAEN_DIVISION'

export interface CompanyGroupProfile {
  readonly registry: CompanyRegistryEnvelope
  readonly groupBy: CompanyGroupByDim
  /** The filtered population (distinct CUIs), never a sum of overlapping buckets. */
  readonly denominator: number
  readonly groups: readonly CompanyRegistryBucket[]
}

export interface CompanyHubStats {
  readonly registry: CompanyRegistryEnvelope
  /** Every company on the platform's CUI directory, not the whole ONRC registry. */
  readonly totalCompanies: number
  /** Directory companies with ANY public original 1048 on a resolved identifier of the edition, conflicts included. */
  readonly activeCompanies: number
  /** One bucket per company: its status consensus, or the basis that leaves it without one. */
  readonly statusMix: readonly CompanyRegistryBucket[]
  /** The ten largest county consensus buckets among the active companies. */
  readonly topCounties: readonly CompanyRegistryBucket[]
  /** (revision, division) buckets among the active companies; they overlap. */
  readonly caenDivisions: readonly CompanyRegistryBucket[]
  readonly coverage: { readonly territoryMatched: number | null; readonly territoryUnmatched: number | null }
  /** The instant the server computed the figures. */
  readonly computedAt: string
}
