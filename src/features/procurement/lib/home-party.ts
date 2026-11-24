import { tidyName, type HomeParty } from './home-model'
import { daSupplierLabel, daSupplierShown } from './withheld-party'

/** A party on a record row: its CUI and its name, tidied; the CUI when it has no name. */
export function partyOf(raw: { readonly cui: string | null; readonly name: string | null; readonly displayName: string | null }): HomeParty {
  const cui = raw.cui?.trim() || null
  return { cui, name: tidyName(raw.displayName ?? raw.name ?? cui ?? '—') }
}

/** A direct acquisition's supplier, D6 fail closed: said only as the API serves it (a company, a masked name, a code). */
export function daSupplierOf(raw: { readonly cui: string | null; readonly name: string | null; readonly displayName: string | null; readonly displayKind?: string | null }): HomeParty {
  const shown = daSupplierShown({ displayKind: raw.displayKind, name: raw.name, code: raw.cui })
  if (!shown) return { cui: null, name: '', withheld: true }
  return shown.kind === 'company' ? partyOf(raw) : { cui: shown.code, name: daSupplierLabel(shown) }
}
