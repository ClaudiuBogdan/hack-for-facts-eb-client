import { t } from '@lingui/core/macro'
import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { labelText } from './direct-purchase-text'
import type { DpWithheldText } from './direct-purchase-model'
import type { DpNotCounted, DpSupplierName, DpValue, DpValueRule } from './direct-purchase-value'

/**
 * What the page says about a direct purchase's money and its supplier under
 * the serving contract (release 1). The reasons and the rules' sentences are
 * the API's, in the page's language; the client only frames them.
 *
 * Amounts keep the decimals the source wrote (a line of 1,845 is not 1,85).
 * Only a counted value is said in lei: the release confirms a reported
 * value's currency and VAT basis only when it counts it.
 */

const NBSP = '\u00a0'

/** The decimals an amount was written with, to six: none, or at least two, as money is read. */
function digitsOf(value: number): number {
  const written = (String(value).split('.')[1] ?? '').length
  return written === 0 ? 0 : Math.min(6, Math.max(2, written))
}

/** An amount as the source wrote it, in lei when its currency is confirmed: „3.150 lei", „1.680.000". */
export function amountText(value: number, inLei: boolean): string {
  const figure = formatHubNumber(value, { digits: digitsOf(value) })
  return inLei ? `${figure}${NBSP}lei` : figure
}

/** A counted amount: confirmed lei, excluding VAT. */
function lei(value: number): string {
  return amountText(value, true)
}

/** The label over the page's figure: the counted value is lei excluding VAT; a value out of totals is the portal's, as reported. */
export function valueFigureLabel(value: DpValue): string {
  if (value.kind === 'corrected') return t`Valoarea corectată, fără TVA`
  return value.kind === 'counted' ? t`Valoarea, fără TVA` : t`Valoarea raportată în SEAP`
}

/** The figure itself: the counted value in lei, else the reported one as written (its currency unconfirmed), else a dash. */
export function valueFigure(value: DpValue): string {
  if (value.kind !== 'not-counted') return lei(value.value)
  return value.reported !== null ? amountText(value.reported, false) : '—'
}

/** Under a value out of totals: its currency and VAT basis are not confirmed. */
export function unconfirmedBasisText(): string {
  return t`Moneda și TVA-ul acestei valori nu sunt confirmate.`
}

/** A value SEAP reports apart from the counted one, as written: „SEAP raportează 3.150.000." */
export function reportedApartText(reported: number): string {
  const figure = amountText(reported, false)
  return t`SEAP raportează ${figure}.`
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
export function ruleText(rule: DpValueRule | null): string | null {
  return rule ? labelText(rule.sentence)?.trim() || null : null
}

/** A correction's rule sentence, or — none published yet — that it has none, never silence. */
export function correctionRuleText(value: Extract<DpValue, { kind: 'corrected' }>): string {
  return ruleText(value.rule) ?? t`Regula după care am corectat valoarea nu are încă o descriere publică.`
}

/** A corrected purchase's two values: what SEAP reports, as written, and what is counted, in lei. */
export function correctionText(value: Extract<DpValue, { kind: 'corrected' }>): string {
  const counted = lei(value.value)
  if (value.reported === null) return t`Numărăm ${counted}.`
  const reported = amountText(value.reported, false)
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

/**
 * Which of the institution's words wait for their privacy review — only those
 * withheld, named — and that the rest is public; null when none is withheld.
 */
export function withheldTextNotice(withheld: DpWithheldText): string | null {
  const fields = [withheld.title ? t`titlul` : null, withheld.description ? t`descrierea` : null, withheld.lines ? t`denumirile sau unitățile produselor` : null].filter(
    (field): field is string => field !== null,
  )
  if (fields.length === 0) return null
  const last = fields[fields.length - 1]!
  const and = t`și`
  const list = fields.length === 1 ? last : `${fields.slice(0, -1).join(', ')} ${and} ${last}`
  const lead = t`Textul scris de instituție (${list}) nu e afișat încă: așteaptă verificarea datelor personale.`
  const title = withheld.title ? t`Titlul de mai sus e categoria achiziției.` : null
  return [lead, title, t`Cantitățile, prețurile și valorile sunt publice.`].filter(Boolean).join(' ')
}
