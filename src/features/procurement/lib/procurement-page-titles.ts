/**
 * Document titles for the procurement profile pages.
 *
 * Shared because these pages now build their title twice: the route `head`
 * builds it on the SSR path, and the page rebuilds it in the browser once its
 * query resolves (client-side navigation no longer blocks on the loader, so
 * `head` has no name to work with there). Two copies of the format string
 * would drift.
 */
const PROCUREMENT_TITLE_SUFFIX = 'Achiziții publice — Transparenta.eu'

export function buildSupplierDocumentTitle(options: { readonly cui: string; readonly supplierName?: string | null }): string {
  const name = options.supplierName?.trim()
  return `${name || `Furnizor CUI ${options.cui}`} — ${PROCUREMENT_TITLE_SUFFIX}`
}

/** A purchase is named by what was bought and who bought it: „Aranjamente florale — Banca Națională a României — …". */
export function buildDirectPurchaseDocumentTitle(options: { readonly id: string; readonly title?: string | null; readonly authorityName?: string | null }): string {
  const title = options.title?.trim()
  const authority = options.authorityName?.trim()
  if (!title) return `Achiziție directă ${options.id} — ${PROCUREMENT_TITLE_SUFFIX}`
  return authority ? `${title} — ${authority} — ${PROCUREMENT_TITLE_SUFFIX}` : `${title} — ${PROCUREMENT_TITLE_SUFFIX}`
}

/** A procedure is named by what it was for and whose it is: „Autostrada Pașcani–Suceava, lotul 1 — CNAIR — …"; an untitled one by its notice's number, else the page's. */
export function buildProcedureDocumentTitle(options: { readonly id: string; readonly title?: string | null; readonly noticeNo?: string | null; readonly authorityName?: string | null }): string {
  const noticeNo = options.noticeNo?.trim()
  const title = options.title?.trim() || (noticeNo ? `Anunțul ${noticeNo}` : `Procedură ${options.id}`)
  const authority = options.authorityName?.trim()
  return authority ? `${title} — ${authority} — ${PROCUREMENT_TITLE_SUFFIX}` : `${title} — ${PROCUREMENT_TITLE_SUFFIX}`
}

/** A contract is named by what was awarded and who awarded it: „Pașcani–Suceava — CNAIR — …". */
export function buildContractDocumentTitle(options: { readonly id: string; readonly title?: string | null; readonly authorityName?: string | null }): string {
  const title = options.title?.trim()
  const authority = options.authorityName?.trim()
  if (!title) return `Contract ${options.id} — ${PROCUREMENT_TITLE_SUFFIX}`
  return authority ? `${title} — ${authority} — ${PROCUREMENT_TITLE_SUFFIX}` : `${title} — ${PROCUREMENT_TITLE_SUFFIX}`
}

export function buildInstitutionDocumentTitle(options: {
  readonly cui: string
  readonly authorityName?: string | null
}): string {
  const name = options.authorityName?.trim()
  return `${name || `Instituție CUI ${options.cui}`} — ${PROCUREMENT_TITLE_SUFFIX}`
}
