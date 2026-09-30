/**
 * `ngoOrganizationProfile(cui)` as the server returns it (server
 * `src/modules/ngos/shell/graphql/organization-schema.ts`). Money stays an
 * exact integer string; `null` is a blank source cell and `"0"` a reported
 * zero.
 */

export type Availability = 'available' | 'not_loaded' | 'not_released'

export type IdentityMethod = 'registry_cui' | 'registry_cui_fiscal_agreement' | 'fiscal_exact_name_county' | 'document_registration_bridge'

export interface Section<T> {
  readonly availability: Availability
  readonly data: T | null
}

/** [code, label, value]: the statement's own dictionary label, the value as filed. */
export type RawIndicator = readonly [code: string, label: string, value: string | null]

export interface RawStatement {
  readonly fiscalYear: number
  readonly sourceUrl: string
  readonly dictionaryUrl: string
  readonly indicators: readonly RawIndicator[]
}

export interface RawProfile {
  readonly cui: string
  readonly name: string
  readonly registryNumber: string | null
  readonly category: string | null
  readonly county: string | null
  readonly locality: string | null
  readonly sourceRegistryStatus: string | null
  readonly identity: { readonly cui: string; readonly method: IdentityMethod }
  readonly conflicts: readonly string[]
  readonly snapshot: { readonly sourceUrl: string; readonly capturedAt: string; readonly refreshOverdue: boolean }
  readonly registryRecords: readonly { readonly id: string; readonly name: string | null; readonly nameWithheld: boolean }[]
  readonly anafRegistration: Section<{ readonly registrationStateText: string | null; readonly registrationDate: string | null; readonly queryDate: string }>
  readonly fiscal: Section<{
    readonly vatPayer: boolean | null
    readonly declaredFiscallyInactive: boolean | null
    readonly mainCaenCode: string | null
    readonly queryDate: string
  }>
  readonly financials: {
    readonly availability: Availability
    readonly fiscalYears: readonly number[]
    readonly statements: readonly RawStatement[]
  }
}
