/**
 * Document titles for the procurement profile pages.
 *
 * Shared because these pages now build their title twice: the route `head`
 * builds it on the SSR path, and the page rebuilds it in the browser once its
 * query resolves (client-side navigation no longer blocks on the loader, so
 * `head` has no name to work with there). Two copies of the format string
 * would drift.
 *
 * Each takes the translator of the request's language: the route's head
 * passes `translatorFor(locale)`, the page its `useLingui()` instance. The
 * record's own names stay as SEAP writes them; the page's words translate.
 */
import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'

function suffix(i18n: I18n): string {
  return `${i18n._(msg`Achiziții publice`)} — Transparenta.eu`
}

export function buildSupplierDocumentTitle(i18n: I18n, options: { readonly cui: string; readonly supplierName?: string | null }): string {
  const name = options.supplierName?.trim()
  const cui = options.cui
  return `${name || i18n._(msg`Furnizor CUI ${cui}`)} — ${suffix(i18n)}`
}

/** A purchase is named by what was bought and who bought it: „Aranjamente florale — Banca Națională a României — …". */
export function buildDirectPurchaseDocumentTitle(i18n: I18n, options: { readonly id: string; readonly title?: string | null; readonly authorityName?: string | null }): string {
  const title = options.title?.trim()
  const authority = options.authorityName?.trim()
  const id = options.id
  if (!title) return `${i18n._(msg`Achiziție directă ${id}`)} — ${suffix(i18n)}`
  return authority ? `${title} — ${authority} — ${suffix(i18n)}` : `${title} — ${suffix(i18n)}`
}

/** A procedure is named by what it was for and whose it is: „Autostrada Pașcani–Suceava, lotul 1 — CNAIR — …"; an untitled one by its notice's number, else the page's. */
export function buildProcedureDocumentTitle(
  i18n: I18n,
  options: { readonly id: string; readonly title?: string | null; readonly noticeNo?: string | null; readonly authorityName?: string | null },
): string {
  const noticeNo = options.noticeNo?.trim()
  const id = options.id
  const title = options.title?.trim() || (noticeNo ? i18n._(msg`Anunțul ${noticeNo}`) : i18n._(msg`Procedură ${id}`))
  const authority = options.authorityName?.trim()
  return authority ? `${title} — ${authority} — ${suffix(i18n)}` : `${title} — ${suffix(i18n)}`
}

/** A contract is named by what was awarded and who awarded it: „Pașcani–Suceava — CNAIR — …". */
export function buildContractDocumentTitle(i18n: I18n, options: { readonly id: string; readonly title?: string | null; readonly authorityName?: string | null }): string {
  const title = options.title?.trim()
  const authority = options.authorityName?.trim()
  const id = options.id
  if (!title) return `${i18n._(msg`Contract ${id}`)} — ${suffix(i18n)}`
  return authority ? `${title} — ${authority} — ${suffix(i18n)}` : `${title} — ${suffix(i18n)}`
}

/**
 * A contract award (PROC-KB0Z step 1) is named by what was awarded and, for an
 * authority, who awarded it; a person buyer's masked name never goes in a title.
 */
export function buildContractAwardDocumentTitle(i18n: I18n, options: { readonly title?: string | null; readonly authorityName?: string | null }): string {
  const title = options.title?.trim() || i18n._(msg`Contract atribuit`)
  const authority = options.authorityName?.trim()
  return authority ? `${title} — ${authority} — ${suffix(i18n)}` : `${title} — ${suffix(i18n)}`
}

/**
 * A winner's contract-award list (KB0Z) is named by the company the API names
 * from the firms' register; a masked or unnamed winner's list keeps a plain
 * title, never a masked name or a bare code.
 */
export function buildContractAwardWinnerDocumentTitle(i18n: I18n, options: { readonly companyName?: string | null }): string {
  const name = options.companyName?.trim()
  return name ? `${i18n._(msg`Contracte atribuite câștigate de ${name}`)} — ${suffix(i18n)}` : `${i18n._(msg`Contracte atribuite câștigate de o firmă`)} — ${suffix(i18n)}`
}

export function buildInstitutionDocumentTitle(i18n: I18n, options: { readonly cui: string; readonly authorityName?: string | null }): string {
  const name = options.authorityName?.trim()
  const cui = options.cui
  return `${name || i18n._(msg`Instituție CUI ${cui}`)} — ${suffix(i18n)}`
}
