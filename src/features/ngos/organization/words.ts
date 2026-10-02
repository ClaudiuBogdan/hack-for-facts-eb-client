import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { formatNgoChange } from '@/features/ngos/hub/ngo-format'
import type { NgoIdentityMethod, NgoOrganization, NgoStatement } from './api'
import { displayNgoName, keyFigures, latestStatement, needsReview, resultOf, yearSeries, type RegistryStatus } from './model'

/**
 * What the profile says in words and figures before any component draws it:
 * the organisation's name, its form, status and CUI link as the reader reads
 * them, and the four figures of its latest statement.
 */

/** Says a message: the page's active language by default; the head passes its request's translator. */
type Translate = (descriptor: MessageDescriptor) => string
const active: Translate = (descriptor) => i18n._(descriptor)

/** The organisation's name as the page says it: the registry's, mended; a withheld one said as withheld. */
/**
 * The registry's purpose as the page shows it: its text where it is
 * `available` and says something; null for a blank cell, coverage not
 * loaded or observations that disagree — none of which is „no purpose".
 */
export function purposeText(organization: Pick<NgoOrganization, 'purpose'>): string | null {
  const { availability, text } = organization.purpose
  return availability === 'available' ? text?.trim() || null : null
}

/** What the registry hid: the kinds its masking names, and any other it may add. */
export type MaskKind = 'person' | 'location' | 'organization' | 'facility' | 'other'

/** A purpose's text, cut where the registry masked a name, a place, an organisation: plain text and the masks between it. */
export type PurposeSegment = { readonly text: string } | { readonly mask: MaskKind; readonly token: string }

const MASK = /<([A-Z][A-Z0-9_]*)>/gu

/**
 * The masks the registry's texts carry, by name (numbered or not): the four
 * seen in the purposes, and the other personal-data kinds such masking
 * names. Any other capitals in angle brackets („<ONG>", „<<SPERANTA>>") are
 * the registry's own words and stay text.
 */
const MASK_KINDS: Readonly<Record<string, MaskKind>> = {
  PERSON: 'person',
  LOCATION: 'location',
  ORGANIZATION: 'organization',
  FACILITY: 'facility',
  EMAIL_ADDRESS: 'other',
  PHONE_NUMBER: 'other',
  DATE_TIME: 'other',
  NRP: 'other',
  URL: 'other',
  IBAN_CODE: 'other',
}

/**
 * The purpose as the registry published it, its masks apart: „Ocrotirea
 * <PERSON> din <LOCATION>" is the text „Ocrotirea ", a person, „ din ", a
 * place. A mask is read by its name without a number (`<PERSON_1>` is a
 * person); a name that is no mask stays text. Nothing is dropped: joined
 * again, the segments are the text.
 */
export function purposeSegments(text: string): readonly PurposeSegment[] {
  const segments: PurposeSegment[] = []
  let at = 0
  for (const match of text.matchAll(MASK)) {
    const kind = MASK_KINDS[(match[1] ?? '').replace(/_?\d+$/u, '')]
    if (!kind) continue
    const index = match.index ?? 0
    if (index > at) segments.push({ text: text.slice(at, index) })
    segments.push({ mask: kind, token: match[0] })
    at = index + match[0].length
  }
  if (at < text.length) segments.push({ text: text.slice(at) })
  return segments
}

/** Whether the registry masked part of the text. */
export function isMasked(text: string): boolean {
  return purposeSegments(text).some((segment) => 'mask' in segment)
}

export function organizationName(organization: Pick<NgoOrganization, 'name' | 'registryRecords'>, translate: Translate = active): string {
  const name = organization.name ?? organization.registryRecords.find((record) => !record.nameWithheld)?.name ?? null
  return name ? displayNgoName(name) : translate(msg`Nume nepublicat`)
}

export function useNumberLocale(): 'ro' | 'en' {
  const { i18n } = useLingui()
  return i18n.locale === 'en' ? 'en' : 'ro'
}

const CATEGORY: Readonly<Record<string, MessageDescriptor>> = {
  association: msg`Asociație`,
  foundation: msg`Fundație`,
  federation: msg`Federație`,
  religious_association: msg`Asociație religioasă`,
  foreign_legal_person: msg`Persoană juridică străină`,
}

export function categoryLabel(category: string | null, translate: Translate = active): string {
  return translate((category ? CATEGORY[category] : undefined) ?? msg`Organizație`)
}

const STATUS: Readonly<Record<RegistryStatus, () => string>> = {
  registered: () => t`Înregistrată`,
  dissolved: () => t`Dizolvată`,
  inLiquidation: () => t`În lichidare`,
  deregistered: () => t`Radiată`,
  unknown: () => t`Stare necunoscută`,
}

export function statusLabel(status: RegistryStatus): string {
  return STATUS[status]()
}

const IDENTITY: Readonly<Record<NgoIdentityMethod, () => { readonly short: string; readonly long: string }>> = {
  registry_cui: () => ({ short: t`CUI declarat în registru`, long: t`Registrul național ONG declară acest CUI pentru organizație.` }),
  registry_cui_fiscal_agreement: () => ({
    // A match, not a verification: the server calls it corroboration, and no method is a legal check.
    short: t`CUI declarat în registru, același nume la ANAF`,
    long: t`Registrul declară acest CUI, iar la ANAF CUI-ul poartă același nume.`,
  }),
  fiscal_exact_name_county: () => ({
    short: t`CUI dedus din nume și județ`,
    long: t`Registrul nu declară un CUI. La ANAF, un singur CUI are exact numele și județul organizației; platforma l-a legat de ea.`,
  }),
  document_registration_bridge: () => ({
    short: t`CUI legat printr-un document publicat`,
    long: t`Registrul nu declară un CUI; un document publicat leagă înregistrarea din registru de acest CUI.`,
  }),
}

export function identityText(method: NgoIdentityMethod) {
  return IDENTITY[method]()
}

export interface ProfileFacts {
  readonly year: number
  readonly revenue: number | null
  readonly expenses: number | null
  readonly result: number | null
  readonly change: string | null
  readonly previousYear: number
  readonly previousFiled: boolean
  readonly filed: number
  readonly span: readonly [number, number] | null
  /** The server flags this year's statement for review: its revenue is to verify (never a confirmed error). */
  readonly review: boolean
  /** The year before's statement, the base of `change`, is flagged for review. */
  readonly previousReview: boolean
}

export function profileFacts(statements: readonly NgoStatement[]): ProfileFacts | null {
  const statement = latestStatement(statements)
  if (!statement) return null
  const figures = keyFigures(statement)
  const series = yearSeries(statements)
  const previous = series.find((point) => point.year === statement.fiscalYear - 1)
  return {
    year: statement.fiscalYear,
    revenue: figures.revenue?.value ?? null,
    expenses: figures.expenses?.value ?? null,
    result: resultOf(statement),
    change: figures.revenue?.value != null ? formatNgoChange(previous?.revenue ?? null, figures.revenue.value) : null,
    previousYear: statement.fiscalYear - 1,
    previousFiled: Boolean(previous?.statement),
    filed: statements.length,
    span: series.length > 0 ? [series[0]!.year, series[series.length - 1]!.year] : null,
    // Each flag the server's, on the very statement the figure comes from: the latest, and the year before for the change.
    review: needsReview(statement),
    previousReview: needsReview(previous?.statement ?? null),
  }
}
