import { z } from 'zod'
import { COMPANY_CAEN_REVISIONS } from './private-company-registry'

/**
 * The ANAF-ASSUMED main activity (`Company.mainActivity`, policy
 * `anaf-assumed-main-caen-v1`) and its history, as the client reads them.
 *
 * What it is: ANAF's fiscal CAEN token of the company, ASSUMED to be its main
 * activity — a product assumption, never a principal activity ONRC declared —
 * matched to the company's ONRC class keys of one edition (the latest matching
 * revision wins). The revision is the ONRC counterpart's: ANAF publishes none.
 * Dates are ANAF's requested status date and ONRC's edition date, each its
 * own; derivation and retrieval times are never legal effective dates.
 *
 * Enum values are the API's exact wire values. Each list is closed: a value
 * the client does not know fails the parse (a data error the profile says),
 * never read as a nearby one.
 */

export const COMPANY_MAIN_ACTIVITY_POLICY_V1 = 'anaf-assumed-main-caen-v1'
/** The policies this client reads; any other is unreadable (never reinterpreted). */
export const COMPANY_MAIN_ACTIVITY_POLICIES: ReadonlySet<string> = new Set([COMPANY_MAIN_ACTIVITY_POLICY_V1])

export const COMPANY_MAIN_ACTIVITY_AVAILABILITIES = ['ASSIGNED', 'NO_ASSIGNMENT', 'UNAVAILABLE'] as const
export const COMPANY_MAIN_ACTIVITY_ROLE_BASES = ['ANAF_ASSUMED_MAIN'] as const
export const COMPANY_MAIN_ACTIVITY_CURRENTNESS = ['CURRENT', 'PENDING_REFRESH', 'SOURCE_WITHDRAWN', 'ONRC_UNAVAILABLE'] as const
export const COMPANY_MAIN_ACTIVITY_STATUSES = [
  'RESOLVED',
  'RESOLVED_LATEST_REVISION',
  'NO_ONRC_MATCH',
  'UNRESOLVED_TOKEN_FORM',
  'TOKEN_PLACEHOLDER',
  'TOKEN_INVALID',
  'SOURCE_MISSING',
  'SOURCE_UNBOUND',
  'CORRECTED',
  'CORRECTION_WITHHELD',
] as const
export const COMPANY_MAIN_ACTIVITY_MATCH_BASES = ['EXACT', 'LEADING_ZERO_MATCH'] as const
export const COMPANY_MAIN_ACTIVITY_REVISION_BASES = ['UNIQUE_ONRC_MATCH', 'LATEST_MATCHING_ONRC_REVISION', 'REVIEWED_CORRECTION'] as const
export const COMPANY_MAIN_ACTIVITY_TOKEN_FORMS = ['FOUR_DIGIT', 'OTHER_DIGIT_FORM', 'ZERO_PLACEHOLDER', 'PLACEHOLDER_9999', 'INVALID', 'ABSENT'] as const
export const COMPANY_MAIN_ACTIVITY_JSON_TYPES = ['STRING', 'NUMBER', 'NULL', 'ABSENT', 'BOOLEAN', 'OBJECT', 'ARRAY'] as const
export const COMPANY_MAIN_ACTIVITY_EVIDENCE_CUSTODIES = ['ARCHIVED_EXCHANGE', 'RETAINED_CUSTODY', 'POINTER_BOUND_AT_DERIVATION', 'UNBOUND_AT_DERIVATION'] as const
/** The v3 form diagnoses the API serves (`v3Form`); any other value is null (the API nulls it, the client again). */
export const COMPANY_MAIN_ACTIVITY_V3_FORMS: ReadonlySet<string> = new Set(['four_digit', 'three_digit', 'short', 'missing', 'invalid', 'unbound', 'unqualified'])
export const COMPANY_MAIN_ACTIVITY_HISTORY_KINDS = ['OUTCOMES', 'EVIDENCE'] as const
export const COMPANY_MAIN_ACTIVITY_HISTORY_STATES = ['AVAILABLE', 'UNAVAILABLE'] as const

export type CompanyMainActivityAvailability = (typeof COMPANY_MAIN_ACTIVITY_AVAILABILITIES)[number]
export type CompanyMainActivityCurrentness = (typeof COMPANY_MAIN_ACTIVITY_CURRENTNESS)[number]
export type CompanyMainActivityStatus = (typeof COMPANY_MAIN_ACTIVITY_STATUSES)[number]
export type CompanyMainActivityMatchBasis = (typeof COMPANY_MAIN_ACTIVITY_MATCH_BASES)[number]
export type CompanyMainActivityRevisionBasis = (typeof COMPANY_MAIN_ACTIVITY_REVISION_BASES)[number]
export type CompanyMainActivityTokenForm = (typeof COMPANY_MAIN_ACTIVITY_TOKEN_FORMS)[number]
export type CompanyMainActivityEvidenceCustody = (typeof COMPANY_MAIN_ACTIVITY_EVIDENCE_CUSTODIES)[number]
export type CompanyMainActivityRoleBasis = (typeof COMPANY_MAIN_ACTIVITY_ROLE_BASES)[number]
export type CompanyMainActivityHistoryKind = (typeof COMPANY_MAIN_ACTIVITY_HISTORY_KINDS)[number]

/** The statuses that carry a selected exact ONRC class key (`resolved`); every other one carries none. */
export const COMPANY_MAIN_ACTIVITY_SELECTING_STATUSES: ReadonlySet<CompanyMainActivityStatus> = new Set(['RESOLVED', 'RESOLVED_LATEST_REVISION', 'CORRECTED'])

/** The provenance of one visible piece of ANAF evidence. */
interface EvidenceProvenance {
  readonly evidenceCustody: string | null
  readonly retrievedAt: string | null
  readonly sourceSnapshotId: string | null
  readonly sourceHash: string | null
  readonly statusDate: string | null
  readonly sourceUrl: string | null
  readonly rawCaptureId: string | null
  readonly rawCustodyId: string | null
  readonly originalToken: string | null
  readonly jsonType: string | null
}

/** The current read's token-derived fields, also null for the no-source shape. */
interface CurrentTokenFields {
  readonly tokenForm: string | null
  readonly canonicalDigits: string | null
  readonly assumedCode: string | null
  readonly v3Form: string | null
}

/**
 * The exact no-source shape: no source snapshot, and every other exposed
 * fiscal field null too — locators, dates, ids, custody, token and JSON type
 * (and the current read's form, digits, assumed code and v3 form). Never
 * judged from the outcome's status: SOURCE_MISSING also names a real fiscal
 * row with an absent token.
 */
function exactNoSource(anaf: EvidenceProvenance, current: CurrentTokenFields | null): boolean {
  const fields: readonly unknown[] = [
    anaf.sourceHash,
    anaf.statusDate,
    anaf.retrievedAt,
    anaf.sourceUrl,
    anaf.rawCaptureId,
    anaf.rawCustodyId,
    anaf.evidenceCustody,
    anaf.originalToken,
    anaf.jsonType,
    ...(current ? [current.tokenForm, current.canonicalDigits, current.assumedCode, current.v3Form] : []),
  ]
  return fields.every((value) => value === null)
}

/** Whether visible ANAF evidence holds together: without a source snapshot, exactly the no-source shape (a partial one fails). */
export function mainEvidenceCoherent(anaf: EvidenceProvenance, current: CurrentTokenFields | null = null): boolean {
  return anaf.sourceSnapshotId !== null || exactNoSource(anaf, current)
}

/** A policy this client reads; any other is unreadable. */
export function mainPolicyReadable(policy: string): boolean {
  return COMPANY_MAIN_ACTIVITY_POLICIES.has(policy)
}

/**
 * The current assignment's provenance holds together: a readable policy and
 * coherent visible ANAF evidence. A withdrawn source has no evidence to judge
 * (nothing hidden is rebuilt).
 */
export function mainActivityProvenanceReadable(activity: { readonly policy: string; readonly anaf: (EvidenceProvenance & CurrentTokenFields) | null }): boolean {
  if (!mainPolicyReadable(activity.policy)) return false
  return activity.anaf === null || mainEvidenceCoherent(activity.anaf, activity.anaf)
}

/**
 * ANAF's original token as the page may show it: only an economic-code digit
 * form — a JSON string or number whose ECMAScript-trimmed text is ASCII
 * digits with at most four significant digits (four-digit, leading-zero,
 * short and placeholder forms: „610", „0610", „000610", „9999", „0000"), 32
 * characters at most. Anything else (contact-like text, a phone-like number,
 * an object's or array's text, other digits than ASCII's) is null: its JSON
 * type and token form stay as the diagnostics. The API already serves only
 * these (`main_caen_public_token`); the client defends it again, so a token
 * failing it is never rendered whatever answered.
 */
export function publicAnafToken(token: string | null | undefined, jsonType: string | null | undefined): string | null {
  if (typeof token !== 'string' || (jsonType !== 'STRING' && jsonType !== 'NUMBER') || token.length > 32) return null
  const digits = token.trim()
  if (!/^[0-9]+$/u.test(digits)) return null
  return digits.replace(/^0+/u, '').length <= 4 ? token : null
}

/** Re-applies `publicAnafToken` to an ANAF object's `originalToken`, beside its own JSON type. */
function withPublicToken<T extends { readonly originalToken: string | null; readonly jsonType: string | null }>(anaf: T): T {
  const originalToken = publicAnafToken(anaf.originalToken, anaf.jsonType)
  return originalToken === anaf.originalToken ? anaf : { ...anaf, originalToken }
}

/**
 * The same, and the token's digits held to the same bound: the
 * leading-zero-free digits only when one to four ASCII digits, the assumed
 * code only when four — so no longer digit string (a phone-like number) is
 * kept from a token that is itself not shown.
 */
function withPublicTokenDigits<T extends { readonly originalToken: string | null; readonly jsonType: string | null; readonly canonicalDigits: string | null; readonly assumedCode: string | null }>(anaf: T): T {
  const canonicalDigits = anaf.canonicalDigits !== null && /^[0-9]{1,4}$/u.test(anaf.canonicalDigits) ? anaf.canonicalDigits : null
  const assumedCode = anaf.assumedCode !== null && /^[0-9]{4}$/u.test(anaf.assumedCode) ? anaf.assumedCode : null
  const shown = withPublicToken(anaf)
  return canonicalDigits === anaf.canonicalDigits && assumedCode === anaf.assumedCode ? shown : { ...shown, canonicalDigits, assumedCode }
}

/** The profile's ANAF evidence: its token and digits held to the public bound, its v3 form to the seven diagnoses. */
function withPublicEvidence<T extends { readonly originalToken: string | null; readonly jsonType: string | null; readonly canonicalDigits: string | null; readonly assumedCode: string | null; readonly v3Form: string | null }>(anaf: T): T {
  const shown = withPublicTokenDigits(anaf)
  return anaf.v3Form === null || COMPANY_MAIN_ACTIVITY_V3_FORMS.has(anaf.v3Form) ? shown : { ...shown, v3Form: null }
}

/** A BigInt id as the API serializes it (text); a JSON number is accepted and kept as its digits. */
const bigIntText = z.union([z.string().regex(/^-?\d+$/u), z.number().int()]).transform((value) => String(value))
const revisionZ = z.enum(COMPANY_CAEN_REVISIONS)
const classCodeZ = z.string().regex(/^\d{4}$/u)

/** The selected exact ONRC class key, its catalog label frozen when the outcome was derived. */
export const companyMainActivityKeySchema = z.object({
  revision: revisionZ,
  code: classCodeZ,
  label: z.string(),
  labelSource: z.literal('frozen_at_derivation'),
})
/** A matching ONRC class key; no label is served for a candidate. */
export const companyMainActivityCandidateKeySchema = z.object({ revision: revisionZ, code: classCodeZ })

export const companyMainActivityEditionSchema = z.object({
  editionId: bigIntText,
  /** ONRC's publication date of the edition (`YYYY-MM-DD`). */
  sourcePublishedAt: z.string().nullable(),
  /** The company's ONRC CAEN coverage in that edition (diagnostic). */
  caenCoverage: z.string().nullable(),
})

/**
 * ANAF's evidence of the current assignment; null as a whole under
 * `SOURCE_WITHDRAWN` and whenever `anafWithdrawn`. Its token-derived fields
 * (token, JSON type, form, digits, assumed code, v3 form) are null while the
 * interpretation is withheld; the fiscal source's dates, ids and custody may
 * stay.
 */
export const companyMainActivityAnafEvidenceSchema = z.object({
  /** The ANAF `cod_CAEN` token as written (`610`, `000610`); null unless a public digit form (`publicAnafToken`). */
  originalToken: z.string().nullable(),
  jsonType: z.enum(COMPANY_MAIN_ACTIVITY_JSON_TYPES).nullable(),
  tokenForm: z.enum(COMPANY_MAIN_ACTIVITY_TOKEN_FORMS).nullable(),
  /** Leading-zero-free digits; null when not a digit token. */
  canonicalDigits: z.string().nullable(),
  /** A bound FOUR_DIGIT token only; never a padded code. */
  assumedCode: z.string().nullable(),
  v3Form: z.string().nullable(),
  /** ANAF's requested fiscal-status date. Not a legal effective date. */
  statusDate: z.string().nullable(),
  /** The loader's retrieval time. Not a capture time, not a legal date. */
  retrievedAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  sourceSnapshotId: z.string().nullable(),
  sourceHash: z.string().nullable(),
  rawCaptureId: bigIntText.nullable(),
  rawCustodyId: bigIntText.nullable(),
  evidenceCustody: z.enum(COMPANY_MAIN_ACTIVITY_EVIDENCE_CUSTODIES).nullable(),
}).transform(withPublicEvidence)

export const companyMainActivitySchema = z.object({
  policy: z.string(),
  basis: z.enum(COMPANY_MAIN_ACTIVITY_ROLE_BASES),
  currentness: z.enum(COMPANY_MAIN_ACTIVITY_CURRENTNESS),
  /**
   * Null under `SOURCE_WITHDRAWN` / `ONRC_UNAVAILABLE`, and under
   * `PENDING_REFRESH` while the interpretation is withheld (no status, no key,
   * no candidates, no correction, no token-derived ANAF field) — a valid
   * state, never a malformed one.
   */
  status: z.enum(COMPANY_MAIN_ACTIVITY_STATUSES).nullable(),
  matchBasis: z.enum(COMPANY_MAIN_ACTIVITY_MATCH_BASES).nullable(),
  revisionBasis: z.enum(COMPANY_MAIN_ACTIVITY_REVISION_BASES).nullable(),
  /** Only RESOLVED, RESOLVED_LATEST_REVISION and CORRECTED. */
  resolved: companyMainActivityKeySchema.nullable(),
  /** Latest revision first; null when suppressed. */
  candidates: z.array(companyMainActivityCandidateKeySchema).nullable(),
  /** The reviewed correction applied (CORRECTED); no reviewer or reason text is served. */
  correctionId: bigIntText.nullable(),
  anaf: companyMainActivityAnafEvidenceSchema.nullable(),
  /**
   * The company's fiscal row is no longer public: `anaf` is null as a whole,
   * whatever `currentness` says, and nothing is said about an ANAF code.
   */
  anafWithdrawn: z.boolean(),
  /**
   * The served ANAF source is under an integrity hold (proved corrupt by an
   * authenticated contradiction): always PENDING_REFRESH with the
   * interpretation and every token-derived field null, no flag. Said as held
   * for integrity verification — never current. A pending answer with no
   * status and `integrityHeld: false` is a generic withheld interpretation:
   * no corruption is claimed from a null status.
   */
  integrityHeld: z.boolean(),
  /** Null under `ONRC_UNAVAILABLE`. */
  edition: companyMainActivityEditionSchema.nullable(),
  /** Derivation time of the outcome: never a legal date. */
  derivedAt: z.string(),
  /** Derivation time of the current evidence. */
  evidenceAt: z.string(),
  refreshedAt: z.string(),
  resolutionId: bigIntText,
  supportId: bigIntText,
  refreshId: bigIntText,
  contentEpoch: bigIntText,
  /** Opaque: content epoch + resolution + support + currentness + refresh + edition + the served row's visibility. Any change purges what was derived from main. */
  cacheKey: z.string().min(1),
})

/** `Company.mainActivity` as served. */
export const companyMainActivityReadSchema = z.object({
  availability: z.enum(COMPANY_MAIN_ACTIVITY_AVAILABILITIES),
  /** The API's fixed text for NO_ASSIGNMENT / UNAVAILABLE (not shown: the page words its own). */
  reason: z.string().nullable(),
  /** Set only when ASSIGNED. */
  activity: companyMainActivitySchema.nullable(),
})

export type CompanyMainActivityKey = z.infer<typeof companyMainActivityKeySchema>
export type CompanyMainActivityCandidateKey = z.infer<typeof companyMainActivityCandidateKeySchema>
export type CompanyMainActivityAnafEvidence = z.infer<typeof companyMainActivityAnafEvidenceSchema>
export type CompanyMainActivity = z.infer<typeof companyMainActivitySchema>
export type CompanyMainActivityRead = z.infer<typeof companyMainActivityReadSchema>

// ──────────────────────────────────────────────────────────── history ──

const outcomeAnafSchema = z
  .object({
    originalToken: z.string().nullable(),
    jsonType: z.enum(COMPANY_MAIN_ACTIVITY_JSON_TYPES).nullable(),
    tokenForm: z.enum(COMPANY_MAIN_ACTIVITY_TOKEN_FORMS).nullable(),
    canonicalDigits: z.string().nullable(),
    assumedCode: z.string().nullable(),
  })
  .transform(withPublicTokenDigits)

/** One derived outcome. `derivedAt` is a derivation time, never a legal effective date. */
export const companyMainActivityOutcomeSchema = z.object({
  resolutionId: bigIntText,
  previousResolutionId: bigIntText.nullable(),
  refreshId: bigIntText,
  reasons: z.array(z.string()),
  policy: z.string(),
  basis: z.enum(COMPANY_MAIN_ACTIVITY_ROLE_BASES),
  status: z.enum(COMPANY_MAIN_ACTIVITY_STATUSES).nullable(),
  revisionBasis: z.enum(COMPANY_MAIN_ACTIVITY_REVISION_BASES).nullable(),
  matchBasis: z.enum(COMPANY_MAIN_ACTIVITY_MATCH_BASES).nullable(),
  /**
   * Null when ANAF's source was withdrawn (`anafWithdrawn`). One row
   * withdrawn means ALL of the company's ANAF history is: the page hides
   * every row's ANAF fields and reads the profile again.
   */
  anaf: outcomeAnafSchema.nullable(),
  editionId: bigIntText.nullable(),
  candidates: z.array(companyMainActivityCandidateKeySchema).nullable(),
  resolved: companyMainActivityKeySchema.nullable(),
  correctionId: bigIntText.nullable(),
  derivedAt: z.string(),
  anafWithdrawn: z.boolean(),
  onrcWithdrawn: z.boolean(),
}).refine((outcome) => mainPolicyReadable(outcome.policy), { message: 'main activity outcome policy not readable' })

const evidenceAnafSchema = z.object({
  sourceSnapshotId: z.string().nullable(),
  sourceHash: z.string().nullable(),
  statusDate: z.string().nullable(),
  retrievedAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  rawCaptureId: bigIntText.nullable(),
  rawCustodyId: bigIntText.nullable(),
  evidenceCustody: z.enum(COMPANY_MAIN_ACTIVITY_EVIDENCE_CUSTODIES).nullable(),
  originalToken: z.string().nullable(),
  jsonType: z.enum(COMPANY_MAIN_ACTIVITY_JSON_TYPES).nullable(),
})
  .refine((anaf) => mainEvidenceCoherent(anaf), { message: 'main activity evidence provenance not coherent' })
  .transform(withPublicToken)

/** One source observation behind an outcome. `evidenceAt` is a derivation time. */
export const companyMainActivityEvidenceEntrySchema = z.object({
  supportId: bigIntText,
  previousSupportId: bigIntText.nullable(),
  resolutionId: bigIntText,
  refreshId: bigIntText,
  editionId: bigIntText.nullable(),
  anaf: evidenceAnafSchema.nullable(),
  caenCoverage: z.string().nullable(),
  evidenceAt: z.string(),
  anafWithdrawn: z.boolean(),
  onrcWithdrawn: z.boolean(),
})

export type CompanyMainActivityOutcome = z.infer<typeof companyMainActivityOutcomeSchema>
export type CompanyMainActivityEvidenceEntry = z.infer<typeof companyMainActivityEvidenceEntrySchema>

/** A history page after mapping: the API's page, its registry scope key, and its cursor only when another page exists. */
export interface CompanyMainActivityHistoryPage {
  readonly state: (typeof COMPANY_MAIN_ACTIVITY_HISTORY_STATES)[number]
  readonly kind: CompanyMainActivityHistoryKind
  readonly outcomes: readonly CompanyMainActivityOutcome[]
  readonly evidence: readonly CompanyMainActivityEvidenceEntry[]
  readonly nextCursor: string | null
  readonly scopeKey: string
}

/**
 * What a history read answered: a page; `not_public` when the CUI is no
 * public directory company (the root is null); `unsupported` when the API
 * predates the history root (it rejected the query at validation) — the page
 * then shows no history at all, never an inferred one.
 */
export type CompanyMainActivityHistoryResult =
  | { readonly status: 'page'; readonly page: CompanyMainActivityHistoryPage }
  | { readonly status: 'not_public' }
  | { readonly status: 'unsupported' }
