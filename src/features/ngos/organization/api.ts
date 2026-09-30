import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'

/**
 * `ngoOrganizationProfile(cui)` — the NGO profile's one source (server
 * `src/modules/ngos/shell/graphql/organization-schema.ts`), read in three
 * requests that fail apart:
 *
 * - the profile: identity, registry, ANAF, and the statements' years only;
 * - the statements, every year's (1–20), each in its own dictionary;
 * - the purpose's text („Scop"), a field the API gains after this client:
 *   asked alone, so an API without it leaves the page whole.
 *
 * Money stays the exact integer string the source filed: `null` is a blank
 * cell, `"0"` a reported zero. `not_loaded` is missing coverage, never a
 * negative fact.
 */

const availability = z.enum(['available', 'not_loaded', 'not_released'])
export type NgoAvailability = z.infer<typeof availability>

const identityMethod = z.enum(['registry_cui', 'registry_cui_fiscal_agreement', 'fiscal_exact_name_county', 'document_registration_bridge'])
export type NgoIdentityMethod = z.infer<typeof identityMethod>

const section = <T extends z.ZodType>(data: T) => z.object({ availability, data: data.nullable() })

export const ngoOrganizationSchema = z.object({
  cui: z.string(),
  identity: z.object({ cui: z.string(), method: identityMethod }),
  registryNumber: z.string(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  legalForm: z.string().nullable(),
  county: z.string().nullable(),
  locality: z.string().nullable(),
  sourceRegistryStatus: z.string().nullable(),
  sourceReportsPublicUtility: z.boolean().nullable(),
  sourceRegistrationDate: z.string().nullable(),
  conflicts: z.array(z.string()),
  snapshot: z.object({ sourceUrl: z.string().url(), capturedAt: z.string(), refreshOverdue: z.boolean() }),
  registryRecords: z.array(z.object({ id: z.string(), name: z.string().nullable(), nameWithheld: z.boolean() })),
  anafRegistration: section(
    z.object({ registrationStateText: z.string().nullable(), registrationDate: z.string().nullable(), queryDate: z.string() }),
  ),
  fiscal: section(
    z.object({
      vatPayer: z.boolean().nullable(),
      declaredFiscallyInactive: z.boolean().nullable(),
      mainCaenCode: z.string().nullable(),
      queryDate: z.string().nullable(),
    }),
  ),
  financials: z.object({ availability, fiscalYears: z.array(z.number().int()) }),
})
export type NgoOrganization = z.infer<typeof ngoOrganizationSchema>

const indicatorSchema = z.object({ code: z.string(), label: z.string(), value: z.string().nullable() })
export const ngoStatementSchema = z.object({
  fiscalYear: z.number().int(),
  sourceUrl: z.string().url(),
  dictionaryUrl: z.string().url(),
  indicators: z.array(indicatorSchema),
})
export type NgoStatement = z.infer<typeof ngoStatementSchema>
export type NgoIndicator = z.infer<typeof indicatorSchema>

/** The statements' read, which fails apart from the profile's: a failure is said, never shown as „none". */
export type NgoStatementsRead = { readonly status: 'ready'; readonly statements: readonly NgoStatement[] } | { readonly status: 'failed' }

export const ngoPurposeSchema = z.object({ availability, text: z.string().nullable() })
export type NgoPurpose = z.infer<typeof ngoPurposeSchema>

export const NGO_ORGANIZATION_QUERY = `query NgoOrganization($cui: CUI!) {
  ngoOrganizationProfile(cui: $cui) {
    cui identity { cui method } registryNumber name category legalForm county locality sourceRegistryStatus
    sourceReportsPublicUtility sourceRegistrationDate conflicts
    snapshot { sourceUrl capturedAt refreshOverdue }
    registryRecords { id name nameWithheld }
    anafRegistration { availability data { registrationStateText registrationDate queryDate } }
    fiscal { availability data { vatPayer declaredFiscallyInactive mainCaenCode queryDate } }
    financials { availability fiscalYears }
  }
}`

export const NGO_STATEMENTS_QUERY = `query NgoStatements($cui: CUI!) {
  ngoOrganizationProfile(cui: $cui) {
    financials { statements { fiscalYear sourceUrl dictionaryUrl indicators { code label value } } }
  }
}`

export const NGO_PURPOSE_QUERY = `query NgoPurpose($cui: CUI!) {
  ngoOrganizationProfile(cui: $cui) { purpose { availability text } }
}`

type Options = { readonly signal?: AbortSignal }

/** The profile, or null where the CUI is no current registry organisation's admitted identity — not proof it is no NGO. */
export async function fetchNgoOrganization(cui: string, { signal }: Options = {}): Promise<NgoOrganization | null> {
  const data = await graphqlQuery<unknown>(NGO_ORGANIZATION_QUERY, { cui }, { operationName: 'NgoOrganization', auth: 'none', signal })
  return z.object({ ngoOrganizationProfile: ngoOrganizationSchema.nullable() }).parse(data).ngoOrganizationProfile
}

/** Every statement the platform admits for the CUI, newest first as the API gives them. */
export async function fetchNgoStatements(cui: string, { signal }: Options = {}): Promise<readonly NgoStatement[]> {
  const data = await graphqlQuery<unknown>(NGO_STATEMENTS_QUERY, { cui }, { operationName: 'NgoStatements', auth: 'none', signal })
  const parsed = z
    .object({ ngoOrganizationProfile: z.object({ financials: z.object({ statements: z.array(ngoStatementSchema) }) }).nullable() })
    .parse(data)
  return parsed.ngoOrganizationProfile?.financials.statements ?? []
}

/**
 * The purpose's text, or null where it cannot be read: an API that does not
 * serve the field yet, or any other failure. The purpose is the head's
 * description, never the page's reason to fail.
 */
export async function fetchNgoPurpose(cui: string, { signal }: Options = {}): Promise<NgoPurpose | null> {
  try {
    // Expected to fail until the server serves `purpose.text`: a breadcrumb, not a Sentry alert per profile.
    const data = await graphqlQuery<unknown>(NGO_PURPOSE_QUERY, { cui }, { operationName: 'NgoPurpose', auth: 'none', signal, expectFailure: true })
    return z.object({ ngoOrganizationProfile: z.object({ purpose: ngoPurposeSchema }).nullable() }).parse(data).ngoOrganizationProfile?.purpose ?? null
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}
