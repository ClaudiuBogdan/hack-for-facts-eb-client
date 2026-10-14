import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'

/**
 * `ngoOrganizationProfile(cui)` — the NGO profile's one source (server
 * `src/modules/ngos/shell/graphql/organization-schema.ts`), read in two
 * requests that fail apart:
 *
 * - the profile: identity, registry, the registry's purpose („Scop"), ANAF,
 *   the four official lists of services and accreditations joined by CUI,
 *   and the statements' years only;
 * - the statements, every year's (1–20), each in its own dictionary.
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

/**
 * The registry's „Scop", exactly as published (trimmed at the ends; line
 * breaks, quotes and its masking — `<PERSON>`, `<LOCATION>`… — kept), shown
 * as plain text. `available` with a null text is a blank source cell;
 * `not_loaded` is missing coverage, never „no purpose"; `not_released` is
 * observations that disagree (`conflicts` then holds `purpose`).
 */
export const ngoPurposeSchema = z.object({ availability, text: z.string().nullable() })

/**
 * The edition of an official list the profile is joined to by CUI: the date
 * the API carries for it (`sourceDeclaredDate`), where it carries one. Null
 * is a date the API does not carry, not an undated source (the ministry's
 * lists are dated by their publisher); then only the import time is known,
 * which is not the edition's date. Neither says a licence or a certificate is
 * still valid.
 */
const listSnapshotSchema = z.object({ sourceUrl: z.string(), sourceDeclaredDate: z.string().nullable(), importedAt: z.string() })
export type NgoListSnapshot = z.infer<typeof listSnapshotSchema>

/**
 * One of the four official lists: `available` with `[]` is not listed in
 * that edition; `not_loaded` (snapshot and data null) is no coverage — a
 * profile without a CUI has nothing to join — never „none". A list this
 * client cannot read drops the list, never the profile.
 */
const listSection = <T extends z.ZodType>(item: T) =>
  z
    .object({ availability, snapshot: listSnapshotSchema.nullable(), data: z.array(item).nullable() })
    .catch({ availability: 'not_loaded' as const, snapshot: null, data: null })

/**
 * A licensed social service. A protective or unclassified one (`countyOnly`:
 * shelters, residential child protection, or a type the list does not name)
 * is published with its county only: its name and locality are dropped here
 * even if a response carried them.
 */
const socialServiceSchema = z
  .object({
    serviceType: z.string().nullable(),
    serviceCode: z.string().nullable(),
    serviceName: z.string().nullable(),
    county: z.string().nullable(),
    locality: z.string().nullable(),
    capacity: z.number().int().nullable(),
    licenseNumber: z.string().nullable(),
    licensedOn: z.string().nullable(),
    countyOnly: z.boolean(),
  })
  .transform((service) => (service.countyOnly ? { ...service, serviceName: null, locality: null } : service))
export type NgoSocialService = z.infer<typeof socialServiceSchema>

const accreditationSchema = z.object({ certificateNumber: z.string().nullable(), decisionNumber: z.string().nullable() })
/** RUEIS: `status` is the published edition's (`RETRAS`, `EXPIRAT`…), not a live check. */
const enterpriseCertificateSchema = z.object({
  certificateNumber: z.string().nullable(),
  certificateDate: z.string().nullable(),
  validUntil: z.string().nullable(),
  status: z.string().nullable(),
})
const employmentAccreditationSchema = z.object({ certificateNumber: z.string().nullable(), issuedOn: z.string().nullable() })

export const ngoOrganizationSchema = z.object({
  /** Null on a profile read by registry number where the platform admits no CUI: then the CUI-keyed sections are `not_loaded`. */
  cui: z.string().nullable(),
  identity: z.object({ cui: z.string(), method: identityMethod }).nullable(),
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
  // An availability this client does not know yet drops the purpose, never the profile.
  purpose: ngoPurposeSchema.catch({ availability: 'not_loaded', text: null }),
  socialServices: listSection(socialServiceSchema),
  socialServiceAccreditations: listSection(accreditationSchema),
  socialEnterpriseCertificates: listSection(enterpriseCertificateSchema),
  employmentServiceAccreditations: listSection(employmentAccreditationSchema),
})
export type NgoOrganization = z.infer<typeof ngoOrganizationSchema>

const indicatorSchema = z.object({ code: z.string(), label: z.string(), value: z.string().nullable() })

/**
 * The server's review of a statement's revenue (`ngo-revenue-v1`): `suspected`
 * true is a signal to verify, never a confirmed error; false is no matching
 * rule, not a certificate; null, a dictionary the rules do not cover. Each
 * reason is a rule that matched (`IMPLAUSIBLE_REVENUE`: I38 above 1 bn lei;
 * `REVENUE_EQUALS_FIXED_ASSETS`: a positive I38 equal to a positive I1). The
 * values themselves stay as published.
 */
const qualitySchema = z.object({
  ruleVersion: z.string().nullable(),
  assessment: z.string(),
  suspected: z.boolean().nullable(),
  reasons: z.array(z.object({ code: z.string(), detail: z.string().nullable() })),
})
export const ngoStatementSchema = z.object({
  fiscalYear: z.number().int(),
  sourceUrl: z.string().url(),
  dictionaryUrl: z.string().url(),
  indicators: z.array(indicatorSchema),
  // A review the client cannot read drops the review, never the statement.
  quality: qualitySchema.nullable().catch(null),
})
export type NgoStatement = z.infer<typeof ngoStatementSchema>
export type NgoIndicator = z.infer<typeof indicatorSchema>

/** The statements' read, which fails apart from the profile's: a failure is said, never shown as „none". */
export type NgoStatementsRead = { readonly status: 'ready'; readonly statements: readonly NgoStatement[] } | { readonly status: 'failed' }

const LIST_SNAPSHOT = 'snapshot { sourceUrl sourceDeclaredDate importedAt }'
const PROFILE_FIELDS = `
    cui identity { cui method } registryNumber name category legalForm county locality sourceRegistryStatus
    sourceReportsPublicUtility sourceRegistrationDate conflicts
    snapshot { sourceUrl capturedAt refreshOverdue }
    registryRecords { id name nameWithheld }
    anafRegistration { availability data { registrationStateText registrationDate queryDate } }
    fiscal { availability data { vatPayer declaredFiscallyInactive mainCaenCode queryDate } }
    financials { availability fiscalYears }
    purpose { availability text }
    socialServices { availability ${LIST_SNAPSHOT}
      data { serviceType serviceCode serviceName county locality capacity licenseNumber licensedOn countyOnly } }
    socialServiceAccreditations { availability ${LIST_SNAPSHOT} data { certificateNumber decisionNumber } }
    socialEnterpriseCertificates { availability ${LIST_SNAPSHOT} data { certificateNumber certificateDate validUntil status } }
    employmentServiceAccreditations { availability ${LIST_SNAPSHOT} data { certificateNumber issuedOn } }`

export const NGO_ORGANIZATION_QUERY = `query NgoOrganization($cui: CUI!) {
  ngoOrganizationProfile(cui: $cui) {${PROFILE_FIELDS}
  }
}`

/**
 * `ngoRegistryProfile(registryNumber)` — the same profile read by the
 * registry's literal number: null for one the current export does not hold;
 * `resolved` with one profile; `ambiguous` with every candidate, of which the
 * client never picks one.
 */
export const NGO_REGISTRY_PROFILE_QUERY = `query NgoRegistryProfile($registryNumber: String!) {
  ngoRegistryProfile(registryNumber: $registryNumber) {
    status
    profiles {${PROFILE_FIELDS}
    }
  }
}`

export const NGO_STATEMENTS_QUERY = `query NgoStatements($cui: CUI!) {
  ngoOrganizationProfile(cui: $cui) {
    financials { statements { fiscalYear sourceUrl dictionaryUrl indicators { code label value } quality { ruleVersion assessment suspected reasons { code detail } } } }
  }
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

export type NgoRegistryProfileRead =
  | { readonly status: 'resolved'; readonly organization: NgoOrganization }
  | { readonly status: 'ambiguous'; readonly candidates: readonly NgoOrganization[] }

const registryProfileSchema = z.object({
  // A status this client does not know yet is a choice for the reader, never one profile picked for them.
  ngoRegistryProfile: z.object({ status: z.enum(['resolved', 'ambiguous']).catch('ambiguous'), profiles: z.array(ngoOrganizationSchema) }).nullable(),
})

/** The profile a registry number names, the candidates where it names several, or null where the current export does not hold it. */
export async function fetchNgoRegistryProfile(registryNumber: string, { signal }: Options = {}): Promise<NgoRegistryProfileRead | null> {
  const data = await graphqlQuery<unknown>(NGO_REGISTRY_PROFILE_QUERY, { registryNumber }, { operationName: 'NgoRegistryProfile', auth: 'none', signal })
  const read = registryProfileSchema.parse(data).ngoRegistryProfile
  if (read === null || read.profiles.length === 0) return null
  const [only] = read.profiles
  // One profile is the answer only when the server says so; anything else is a choice the reader makes.
  if (read.status === 'resolved' && read.profiles.length === 1 && only) return { status: 'resolved', organization: only }
  return { status: 'ambiguous', candidates: read.profiles }
}
