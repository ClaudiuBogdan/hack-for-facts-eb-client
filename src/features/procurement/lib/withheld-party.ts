import { t } from '@lingui/core/macro'

/**
 * Decision D6 on every procurement surface that reads direct acquisitions:
 * a supplier is named only when the API serves it as a company. The API puts
 * every other supplier in one group under a reserved key — never a CUI, a
 * name or a per-person id — and the client never names it, links it, drills
 * into it or looks a name up for it.
 */

/** The reserved breakdown key for every supplier the API does not name. */
export const NATURAL_PERSON_KEY = 'natural_person'

export function isNaturalPersonKey(key: string | null | undefined): boolean {
  return key === NATURAL_PERSON_KEY
}

/** The keys a name may be looked up for: never the withheld group's. */
export function nameableKeys(keys: readonly string[]): readonly string[] {
  return keys.filter((key) => !isNaturalPersonKey(key))
}

/**
 * A direct acquisition's supplier is named only when the API serves it as a
 * company (`displayKind`); anything else — a natural person, no kind at all —
 * is withheld, whatever name or code came with it.
 */
export function isNamedDaSupplier(party: { readonly displayKind?: string | null } | null | undefined): boolean {
  return party?.displayKind === 'company'
}

/** The withheld group, as a ranking row names it: every supplier the platform does not name, together. */
export function naturalPersonsLabel(): string {
  return t`Persoane fizice`
}

/**
 * A direct-acquisition supplier bucket the page may name, link and look a
 * name up for: the API serves it as a company. Fail closed — no kind, or any
 * other kind, is not named (owner via root: D6 holds whatever the release
 * flag says, so a rollback never re-exposes a name).
 */
export function isNamedDaSupplierBucket(bucket: { readonly key: string | null; readonly displayKind?: string | null }): boolean {
  return bucket.key !== null && !isNaturalPersonKey(bucket.key) && bucket.displayKind === 'company'
}

/** A direct-acquisition supplier bucket the page does not name: the group, or one supplier the API did not serve as a company. */
export function unnamedSupplierLabel(key: string | null): string {
  return isNaturalPersonKey(key) ? naturalPersonsLabel() : t`Furnizor nenumit`
}
