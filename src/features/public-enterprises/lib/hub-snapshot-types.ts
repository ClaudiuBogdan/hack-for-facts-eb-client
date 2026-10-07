/**
 * The public-enterprise hub's figures, as `scripts/generate-public-enterprise-hub-fixture.mjs`
 * counts them from the API on the date the snapshot carries. The API serves a
 * list and a profile but no aggregate (design note §12.3, ask 1), so these
 * counts are the shape a server aggregate would serve. Counts are exact;
 * money stays exact decimal text; a missing value is null, never zero.
 */

export type PublicEnterpriseLevel = 'central' | 'local'

/** The controlling authority's kind, from its own budget record (`entity(cui)`), never from its name. */
export type PublicEnterpriseAuthorityKind =
  | 'county'
  | 'municipality'
  | 'town'
  | 'commune'
  | 'sector'
  | 'central_authority'
  | 'public_entity'
  | 'education'
  | 'unresolved'

export type PublicEnterpriseSourceFamily = 'amepip' | 's1001' | 'json_apt'

export type PublicEnterpriseAuthorityRow = {
  readonly cui: string
  /** ANAF's list's own words (its most frequent spelling); where it gave none, the AMEPIP announcements' or the budget record's name. */
  readonly name: string | null
  /** Where `name` came from: the page says when it is not ANAF's list. */
  readonly nameSource: 's1001' | 'json_apt' | 'budget' | null
  readonly level: PublicEnterpriseLevel | null
  /** The authority's county, from its budget record. */
  readonly county: string | null
  /** The authority has a budget in the platform (`/entities/$cui`). */
  readonly hasBudget: boolean
  /** Current members ANAF's list puts under it. */
  readonly enterprises: number
  /** Of those, the ones ANAF's list marks INACTIV. */
  readonly inactive: number
}

export type PublicEnterpriseRankedEnterprise = {
  readonly cui: string
  readonly name: string | null
  /** Exact decimal text: lei, or a headcount. */
  readonly value: string
  /** The authority ANAF's list puts the enterprise under, by its name (see `authorityNameSource`). */
  readonly authority: string | null
  /** Where the authority's name came from: ANAF's list, or, where it gave none, another source. */
  readonly authorityNameSource: PublicEnterpriseAuthorityRow['nameSource']
}

/** One row of a count by level: every current member is in `total`, and in exactly one of the other three. */
export type PublicEnterpriseSplit = {
  readonly total: number
  readonly central: number
  readonly local: number
  /** Members with no S1001 control edge: no level. */
  readonly none: number
}

export type PublicEnterpriseStatusCount = {
  /** The source's own word; null where it gave none. */
  readonly status: string | null
  readonly enterprises: number
}

export type PublicEnterpriseHubSnapshot = {
  readonly generatedAt: string
  readonly sources: readonly {
    readonly family: PublicEnterpriseSourceFamily
    readonly laneStatus: 'available' | 'partial' | 'unavailable'
    readonly sourceUrl: string | null
    readonly observedAt: string | null
    readonly sourceLastModifiedAt: string | null
  }[]
  readonly members: { readonly anchors: number; readonly current: number; readonly historical: number }
  readonly control: {
    readonly central: number
    readonly local: number
    /** Current members with no S1001 control edge. */
    readonly noS1001: number
    readonly s1001Authorities: number
    readonly s1001AuthoritiesWithBudget: number
    /** Members for which JSON-APT names an authority ANAF's list does not. */
    readonly disagreements: number
    /** By the authority's kind and ANAF's level: one with no budget record (`unresolved`) is central or local by the list's word. */
    readonly kinds: readonly { readonly kind: PublicEnterpriseAuthorityKind; readonly level: PublicEnterpriseLevel; readonly enterprises: number }[]
    readonly ranking: {
      readonly central: readonly PublicEnterpriseAuthorityRow[]
      readonly county: readonly PublicEnterpriseAuthorityRow[]
      readonly local: readonly PublicEnterpriseAuthorityRow[]
    }
  }
  readonly status: {
    /** The statuses of the members ANAF's list holds, in its words; null: listed with a blank status. */
    readonly s1001: readonly PublicEnterpriseStatusCount[]
    /** Members ANAF's list does not hold (only in the AMEPIP register). */
    readonly s1001NotListed: number
    /** The trade registry's headline status of the members with a company record; null: the record's evidence conflicts or is partial. */
    readonly onrc: readonly PublicEnterpriseStatusCount[]
    /** Members with no company record at all. */
    readonly onrcMissing: number
    readonly anafInactive: number
    /** Where the sources disagree, each a floor: the trade registry's status is null where its evidence conflicts. */
    readonly crossings: {
      readonly radiatedButS1001Active: number
      readonly fiscallyInactiveButS1001Active: number
    }
    /** AMEPIP's status for the financial year, in its own words, of the members with a row for it. */
    readonly amepip: readonly PublicEnterpriseStatusCount[]
    /** Members with no AMEPIP row for the financial year: no observation, not a blank status. */
    readonly amepipMissing: number
  }
  /** By the county of the enterprise's seat (the trade registry's address); null: none. */
  readonly counties: readonly (PublicEnterpriseSplit & { readonly county: string | null })[]
  /** By the first two digits of the main CAEN code ANAF holds; null: none. */
  readonly sectors: readonly (PublicEnterpriseSplit & { readonly division: string | null })[]
  readonly financials: {
    /** The last complete financial year. */
    readonly year: number
    /** Members with a statement for `year`, admitted or not. */
    readonly filed: number
    /** Who published the year's statements (`anaf`, `mfp`). */
    readonly publishers: readonly string[]
    /** Statements already filed for the year after: a count, not a claim of completeness. */
    readonly nextYearFiled: number
    /** Of the year's statements, the ones whose net result the companies module's evaluator reported: the base of `loss`. */
    readonly netReported: number
    readonly loss: number
    /** Reported headcounts no enterprise can have, kept out of the ranking and named. */
    readonly implausibleEmployees: readonly { readonly cui: string; readonly name: string | null; readonly employees: string }[]
    /** Only values the evaluator reported: turnover, headcount, and the loss as the reported net result's size. */
    readonly largest: {
      readonly turnover: readonly PublicEnterpriseRankedEnterprise[]
      readonly employees: readonly PublicEnterpriseRankedEnterprise[]
      readonly loss: readonly PublicEnterpriseRankedEnterprise[]
    }
  }
  /** Members with at least one SEAP record in the span: counts, never sums. */
  readonly procurement: {
    readonly from: string
    readonly to: string
    readonly buyers: number
    readonly buyerDirect: number
    readonly buyerAwards: number
    readonly sellers: number
    /** Members SEAP did not answer for (a count it withheld): the four counts are floors. */
    readonly unknown: number
  }
}
