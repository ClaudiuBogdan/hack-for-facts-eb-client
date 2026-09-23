/**
 * The shape of the companies hub's snapshot (`hub-snapshot.ts`): figures read
 * once from the registry and the financial statements and kept in the
 * client, as the INS hub keeps its annual histories.
 */

/** A company in one of the hub's rankings. */
export interface HubLeader {
  readonly cui: string
  readonly name: string
  /** The county code (`CJ`, `B`) of the registered office, when the registry places it. */
  readonly county: string | null
  /** The two-digit CAEN division of the main activity declared to ANAF. */
  readonly division: string | null
  /** Its ONRC status at the registry capture: a company can lead a year and be struck off since. */
  readonly status: string | null
  /** The ranked figure for the snapshot's fiscal year. */
  readonly value: number
  /** The same figure a year earlier, when the company filed then. */
  readonly previous: number | null
}

/** One CAEN division, by the main activity each company declared to ANAF. */
export interface HubSector {
  readonly division: string
  /** Companies in business in the registry with this main activity. */
  readonly activeFirms: number
  /** Net turnover over the division's statements for the fiscal year, in lei. */
  readonly turnover: number
  /** Average employees over the same statements. */
  readonly employees: number
}

/** Statements of one size class, by average employees. */
export interface HubSizeClass {
  readonly key: '0' | '1-9' | '10-49' | '50-249' | '250+'
  readonly firms: number
  readonly turnover: number
  readonly employees: number
}

export interface HubCountyFigures {
  /** The county code (`CJ`, `B`). */
  readonly code: string
  /** Residents on 1 January of the fiscal year (INS POP105A). */
  readonly population: number
  readonly activeFirms: number
  /** Companies founded in the fiscal year with their registered office here. */
  readonly newFirms: number
  /** Turnover of the statements whose company has its registered office here, in lei. */
  readonly turnover: number
  readonly employees: number
}

export interface HubRegistrationYear {
  readonly year: number
  /** Companies registered that year. */
  readonly registered: number
  /** Of those, the ones still in business at the registry's capture. */
  readonly active: number
}

export interface CompanyHubSnapshot {
  /** When the figures were read, `YYYY-MM-DD`. */
  readonly capturedAt: string
  /** The registry capture the counts of companies in business describe, `YYYY-MM`. */
  readonly registryPeriod: string
  /** The fiscal year of the statements, and the year of the registrations counted as new. */
  readonly fiscalYear: number
  readonly national: {
    readonly population: number
    readonly activeFirms: number
    readonly newFirms: number
    readonly turnover: number
    readonly employees: number
    /** Statements filed for the fiscal year. */
    readonly statements: number
    /** Companies in any status of the insolvency procedure (`INSOLVENCY_STATUSES`). */
    readonly insolvency: number
    /** Companies in any form of dissolution, or in liquidation (`DISSOLUTION_STATUSES`). */
    readonly dissolution: number
    /** Companies in business at the registry that ANAF lists as fiscally inactive. */
    readonly fiscallyInactive: number
  }
  readonly leaders: {
    readonly turnover: readonly HubLeader[]
    readonly employees: readonly HubLeader[]
  }
  /** Every named division, by turnover. */
  readonly sectors: readonly HubSector[]
  /** Companies founded in the fiscal year, by the main activity declared to ANAF. */
  readonly newFirmsBySector: readonly { readonly division: string; readonly firms: number }[]
  readonly sizeClasses: readonly HubSizeClass[]
  readonly counties: readonly HubCountyFigures[]
  /** Registrations per year from 1991, with the ones still in business. */
  readonly registrations: readonly HubRegistrationYear[]
}
