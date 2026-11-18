import { t } from '@lingui/core/macro'
import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { labelText, leiExact } from './direct-purchase-text'
import type { DpNotCounted, DpSupplierName, DpValue, DpValueRule } from './direct-purchase-value'

/**
 * What the page says about a direct purchase's money and its supplier under
 * the serving contract (release 1). The reasons and the rules' sentences are
 * the API's, in the page's language; the client only frames them.
 */

/** The label over the page's figure: the counted value is lei excluding VAT; a value out of totals is the portal's, as reported. */
export function valueFigureLabel(value: DpValue): string {
  if (value.kind === 'corrected') return t`Valoarea corectată, fără TVA`
  return value.kind === 'counted' ? t`Valoarea, fără TVA` : t`Valoarea raportată în SEAP`
}

/** The figure itself: the counted value, else the reported one, else a dash. */
export function valueFigure(value: DpValue): string {
  if (value.kind !== 'not-counted') return leiExact(value.value)
  return value.reported !== null ? leiExact(value.reported) : '—'
}

/** In totals or not, in one short line. */
export function inTotalsText(value: DpValue): string {
  if (value.kind === 'corrected') return t`Intră în totaluri cu valoarea corectată.`
  return value.kind === 'counted' ? t`Intră în totaluri.` : t`Nu intră în totaluri.`
}

/** Why it is out of totals, as the API says it; null when the API gives no sentence. */
export function notCountedText(reason: DpNotCounted): string | null {
  return labelText(reason.label)?.trim() || null
}

/** The rule's public sentence in the page's language. */
export function ruleText(rule: DpValueRule): string | null {
  return labelText(rule.sentence)?.trim() || null
}

/** A corrected purchase's two values: what SEAP reports and what is counted. */
export function correctionText(value: Extract<DpValue, { kind: 'corrected' }>): string {
  const counted = leiExact(value.value)
  if (value.reported === null) return t`Numărăm ${counted}.`
  const reported = leiExact(value.reported)
  return t`SEAP raportează ${reported}; numărăm ${counted}.`
}

/** A counted value of 0 or one ban: counted, said. */
export function symbolicText(): string {
  return t`Valoare simbolică: o numărăm, dar o semnalăm.`
}

/** A purchase the portal no longer lists. */
export function notListedText(): string {
  return t`Portalul nu mai listează această achiziție.`
}

/** The supplier's name as the page writes it: a company's, as its own page names it; any other supplier is a natural person, never named. */
export function supplierNameText(supplier: DpSupplierName): string {
  if (supplier.kind === 'company') return displayCompanyName(supplier.name)
  return supplier.kind === 'natural-person' ? t`Persoană fizică` : t`Furnizor neindicat în SEAP`
}
