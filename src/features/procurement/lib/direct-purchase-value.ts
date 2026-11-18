import type { DpLabel } from './direct-purchase-model'

/**
 * A direct purchase's money and its supplier's name as the direct-acquisition
 * serving contract (release 1) defines them — the data platform's
 * `docs/domains/public-contracts/reference/DIRECT_ACQUISITION_SERVING_CONTRACT.md`:
 *
 * - the value the portal reports, shown on every purchase and never summed;
 * - whether the purchase counts in totals, and when not, why (a code with its
 *   sentence in both languages, served by the API);
 * - the counted value, the only summable one: the reported value, or an
 *   approved exact correction with its rule's public sentence (served, never a
 *   client copy);
 * - under decision D6, a supplier's name only when the API serves one: any
 *   other supplier is a natural person, and nothing fills its name in.
 *
 * The mapping here is the page's honesty rule: a field combination the
 * contract does not allow (counted with no counted value, a correction on a
 * purchase not counted) is never shown as more than it supports.
 */

// ───────────────────────────────────────────────────────────── the value ──

/** The contract's reasons for leaving a purchase out of totals. */
export const NOT_COUNTED_CODES = [
  'not_accepted',
  'value_not_qualified',
  'reviewed_entry_error',
  'closing_value_missing',
  'detail_unusable',
  'state_disagrees',
  'finalization_day_disagrees',
  'value_disagrees',
] as const

export type DpNotCountedCode = (typeof NOT_COUNTED_CODES)[number]

/** Why a purchase is out of totals: the code (`other` for one this client does not know yet) and the API's sentence. */
export interface DpNotCounted {
  readonly code: DpNotCountedCode | 'other'
  readonly label: DpLabel
}

export type DpRuleEffect = 'correct' | 'exclude' | 'keep'

/** A value review rule applied to this purchase, with the public sentence a reader sees. */
export interface DpValueRule {
  readonly code: string
  readonly effect: DpRuleEffect | null
  readonly sentence: DpLabel
}

/** The money as the page reads it. Lei excluding VAT for the counted value; the reported value as the portal gives it. */
export type DpValue =
  /** Counted as reported. */
  | { readonly kind: 'counted'; readonly value: number; readonly reported: number | null; readonly symbolic: boolean }
  /** Counted at an approved exact correction: both values, and the rule (its sentence may not be published yet: then said). */
  | { readonly kind: 'corrected'; readonly value: number; readonly reported: number | null; readonly rule: DpValueRule | null }
  /** Left out of totals: the reported value (if any) is shown, never summed, with the reason and, after a review, the rule. */
  | { readonly kind: 'not-counted'; readonly reported: number | null; readonly reason: DpNotCounted; readonly rule: DpValueRule | null }

/** The contract's purchase money fields, as numbers and served labels (the API adapter parses the transport shape into this). */
export interface DpValueFields {
  readonly reportedValue: number | null
  readonly counted: boolean
  readonly countedValue: number | null
  readonly notCountedReason: { readonly code: string; readonly label: DpLabel } | null
  readonly valueCorrected: boolean
  readonly rule: { readonly code: string; readonly effect: string | null; readonly sentence: DpLabel } | null
  readonly symbolicPrice: boolean
}

const RULE_EFFECTS: ReadonlySet<string> = new Set<DpRuleEffect>(['correct', 'exclude', 'keep'])
const CODES: ReadonlySet<string> = new Set<string>(NOT_COUNTED_CODES)

function ruleOf(raw: DpValueFields['rule']): DpValueRule | null {
  if (!raw) return null
  return { code: raw.code, effect: raw.effect !== null && RULE_EFFECTS.has(raw.effect) ? (raw.effect as DpRuleEffect) : null, sentence: raw.sentence }
}

/**
 * The reason a purchase the contract leaves uncounted gives no reason for:
 * the page still says it is out of totals, never that it counts.
 */
const UNSTATED: DpNotCounted = { code: 'other', label: { ro: null, en: null } }

/**
 * The money as the page shows it. A purchase counts only when the API says so
 * and gives the counted value; a correction stands only on a counted
 * purchase, and always shows both values — with its rule's sentence, or said
 * to have none published yet, never passed off as counted as reported.
 */
export function valueOf(fields: DpValueFields): DpValue {
  const rule = ruleOf(fields.rule)
  if (fields.counted && fields.countedValue !== null) {
    if (fields.valueCorrected) return { kind: 'corrected', value: fields.countedValue, reported: fields.reportedValue, rule }
    return { kind: 'counted', value: fields.countedValue, reported: fields.reportedValue, symbolic: fields.symbolicPrice }
  }
  const raw = fields.notCountedReason
  const reason: DpNotCounted = raw ? { code: CODES.has(raw.code) ? (raw.code as DpNotCountedCode) : 'other', label: raw.label } : UNSTATED
  return { kind: 'not-counted', reported: fields.reportedValue, reason, rule }
}

/** The value a list or a sum may add: the counted value, else nothing. */
export function countedValueOf(value: DpValue): number | null {
  return value.kind === 'not-counted' ? null : value.value
}

/** The reported value when the page shows it apart from the counted one: always when not counted, when corrected, never when they are the same. */
export function reportedApartOf(value: DpValue): number | null {
  if (value.kind === 'counted') return value.reported !== null && value.reported !== value.value ? value.reported : null
  return value.reported
}

// ──────────────────────────────────────────────────────── the supplier (D6) ──

/**
 * A supplier as the API serves it under D6: a company with its name (and its
 * fiscal code when served), a natural person — no name, no code, no id —
 * whom the page never names from any other read, or none at all (the
 * purchase names no supplier).
 */
export type DpSupplierName =
  | { readonly kind: 'company'; readonly name: string; readonly cui: string | null }
  | { readonly kind: 'natural-person' }
  | { readonly kind: 'none' }

/**
 * The supplier from the API's party (`displayKind`: `authority | company |
 * natural_person`): named only when the API says it is a company and serves
 * a name. Anything else — a withheld name, another or unknown kind, an empty
 * name — is a natural person: a name the API did not give is never shown. No
 * party at all is no supplier named.
 */
export function supplierNameOf(party: { readonly displayKind: string | null; readonly name: string | null; readonly cui: string | null } | null): DpSupplierName {
  if (!party) return { kind: 'none' }
  const name = party.name?.trim()
  if (party.displayKind !== 'company' || !name) return { kind: 'natural-person' }
  return { kind: 'company', name, cui: party.cui?.trim() || null }
}
