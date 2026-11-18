import { tidyName, type HomeParty } from './home-model'
import { isNamedDaSupplier } from './withheld-party'

/** A party on a record row: its CUI and its name, tidied; the CUI when it has no name. */
export function partyOf(raw: { readonly cui: string | null; readonly name: string | null; readonly displayName: string | null }): HomeParty {
  const cui = raw.cui?.trim() || null
  return { cui, name: tidyName(raw.displayName ?? raw.name ?? cui ?? '—') }
}

/** A direct acquisition's supplier, D6 fail closed: named only when the API serves it as a company. */
export function daSupplierOf(raw: { readonly cui: string | null; readonly name: string | null; readonly displayName: string | null; readonly displayKind?: string | null }): HomeParty {
  return isNamedDaSupplier(raw) ? partyOf(raw) : { cui: null, name: '', withheld: true }
}
