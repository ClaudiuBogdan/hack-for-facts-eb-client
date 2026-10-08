import fixtureJson from './portfolio.fixture.json'

/**
 * The authority portfolio prototype's data: the sampled authorities and their
 * enterprises, as `scripts/generate-public-enterprise-hub-fixture.mjs` read
 * them from the dev API on the date the file carries. The API's list serves
 * names only and a company read per enterprise is slow (AAAS's 69 took 11 s,
 * database errors in 5 of 7 batches, on 2026-10-08), so the page reads a snapshot; this file is the
 * shape a server read would have to serve (design note §12.8). Statuses stay
 * each source's own; money stays exact decimal text; a missing value is null.
 */

export type SourceFamily = 's1001' | 'json_apt'

export type AuthorityKind = 'county' | 'municipality' | 'town' | 'commune' | 'sector' | 'central_authority' | 'public_entity' | 'education' | 'unresolved'

export type PortfolioEdge = {
  readonly source: SourceFamily
  readonly cui: string | null
  /** The source's own spelling, HTML entities decoded. */
  readonly name: string | null
}

export type PortfolioEnterprise = {
  readonly cui: string
  readonly name: string | null
  readonly legalForm: string | null
  /** The seat's county, from the trade registry. */
  readonly county: string | null
  /** The main CAEN code ANAF holds. */
  readonly caen: string | null
  /** Null: not in ANAF's list; a null status: listed with a blank status cell. */
  readonly s1001: { readonly status: string | null } | null
  /** AMEPIP's newest company-year row, in its own words. */
  readonly amepip: { readonly year: number; readonly status: string | null } | null
  /** Null: no company record; a null code: the registry's evidence conflicts or is partial. */
  readonly registry: { readonly code: string | null; readonly label: string | null } | null
  readonly fiscallyInactive: boolean | null
  readonly edges: readonly PortfolioEdge[]
  /** The financial year's statement (`financialYear`), admitted values only. */
  readonly financials: {
    readonly filed: boolean
    readonly turnover: string | null
    readonly employees: string | null
    /** A headcount no enterprise can have, kept out of the figures and named. */
    readonly implausibleEmployees: string | null
    readonly net: string | null
    /** The newest year it filed any statement for. */
    readonly newestYear: number | null
    /** Each value's status in the evaluator's words (`reported`, `missing`, `held_profile`, …, `unassessed`); null with no statement. */
    readonly statuses: { readonly turnover: string | null; readonly employees: string | null; readonly net: string | null }
  }
  /** SEAP record counts over `seapSpan`; null: SEAP did not answer. */
  readonly seap: { readonly buyerDirect: number | null; readonly buyerAwards: number | null; readonly supplierDirect: number | null } | null
}

export type PortfolioAuthority = {
  readonly cui: string
  /** ANAF's list's most frequent spelling; where it gave none, the announcements', else the budget record's. */
  readonly name: string | null
  readonly nameSource: 's1001' | 'json_apt' | 'budget' | null
  readonly spellings: { readonly s1001: readonly string[]; readonly json_apt: readonly string[] }
  /** The budget record's name: it names the territory („JUDETUL CLUJ"), not the council. */
  readonly budgetName: string | null
  /** ANAF's list's level; null when the list names it for no enterprise. */
  readonly level: 'central' | 'local' | null
  readonly kind: AuthorityKind
  readonly county: string | null
  readonly hasBudget: boolean
  /** The enterprises ANAF's list puts under it. */
  readonly s1001: readonly string[]
  /** The enterprises AMEPIP's selection announcements name it for. */
  readonly jsonApt: readonly string[]
}

export type PortfolioSource = {
  readonly family: 'amepip' | 's1001' | 'json_apt'
  readonly laneStatus: string
  readonly sourceUrl: string | null
  readonly observedAt: string | null
  readonly sourceLastModifiedAt: string | null
}

export type PortfolioFixture = {
  readonly generatedAt: string
  readonly financialYear: number
  readonly seapSpan: { readonly from: string; readonly to: string }
  readonly sources: readonly PortfolioSource[]
  readonly authorities: readonly PortfolioAuthority[]
  readonly enterprises: Readonly<Record<string, PortfolioEnterprise>>
}

export const PORTFOLIO = fixtureJson as unknown as PortfolioFixture

/** The picker's labels and what each sample shows. */
export const SAMPLES: readonly { readonly cui: string; readonly label: string; readonly note: string }[] = [
  { cui: '43507695', label: 'Ministerul Energiei', note: '33 in the list, the largest companies; 18 in the announcements' },
  { cui: '11795573', label: 'AAAS', note: '69, 56 inactive in the list: privatisation leftovers' },
  { cui: '24931499', label: 'Economie', note: '60, mostly industry' },
  { cui: '13729380', label: 'Educație', note: '50 research institutes (INCD)' },
  { cui: '14818116', label: 'ADS', note: '32, 30 inactive; no budget record' },
  { cui: '4267117', label: 'CGMB', note: '21 in the list, one more only in the announcements' },
  { cui: '4283481', label: 'Voluntari', note: 'a town with 16, all active' },
  { cui: '4288110', label: 'CJ Cluj', note: 'a county council, 7' },
  { cui: '4374474', label: 'CJ Hunedoara', note: '3 in the list, 2 more only in the announcements' },
  { cui: '4270740', label: 'CL Sibiu', note: '4; the announcements name another authority for Tursib' },
  { cui: '4420465', label: 'Sector 3', note: 'the list drops the sector number' },
  { cui: '4390526', label: 'Borș', note: 'a commune with 4; two spellings in the list' },
  { cui: '38474532', label: 'ADI București-Ilfov', note: 'named only by the announcements, for 3' },
  { cui: '45699112', label: 'ADI Sibiu', note: 'named only by the announcements, for Tursib' },
]

export const DEFAULT_AUTHORITY = '43507695'
