import { t } from '@lingui/core/macro'
import { markDaSupplierNamed } from '@/lib/da-supplier-name-mark'

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
  return named(party?.displayKind === 'company')
}

/** A decision to name a DA supplier: a server render that makes one is kept by no cache (`da-supplier-name-mark.ts`). */
function named(yes: boolean): boolean {
  if (yes) markDaSupplierNamed()
  return yes
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
  return named(bucket.key !== null && !isNaturalPersonKey(bucket.key) && bucket.displayKind === 'company')
}

/**
 * Where a page would rank direct purchases' suppliers while D6 is enforced
 * and the release is off: the API refuses them, and the page says so.
 */
export function daSuppliersUnavailableText(): string {
  return t`Firmele achizițiilor directe nu sunt disponibile acum: platforma le arată din nou odată cu datele noi ale achizițiilor directe.`
}

/**
 * A direct-purchase supplier bucket as the page may keep it: a company's as
 * served; any other's key replaced before it is cached or rendered — the
 * group keeps its reserved key, one unclassified supplier gets a neutral one
 * (`unnamed-3`), never its CUI.
 */
export function scrubDaSupplierBucket<B extends { readonly key: string | null; readonly displayKind?: string | null }>(bucket: B, index: number): B {
  if (bucket.key === null || isNamedDaSupplierBucket(bucket) || isNaturalPersonKey(bucket.key)) return bucket
  return { ...bucket, key: `unnamed-${index}` }
}

/**
 * A company supplier bucket's name (DA-009, PROC-B51G): the API's gated
 * `displayName` and nothing else. No other lookup names a DA supplier bucket:
 * the registry's own labels don't apply the DA name rule. A company whose name
 * the API doesn't serve (its code has no public registry name) is shown by its
 * code, said as missing from the registry, never as private (procurement-prod,
 * 22 November 2026).
 */
export function daCompanyBucketName(bucket: { readonly key: string | null; readonly displayName?: string | null }): string {
  const name = bucket.displayName?.trim()
  if (name) return name
  const code = bucket.key ?? ''
  return t`CUI ${code} (denumire indisponibilă în registrul firmelor)`
}

/** A direct-acquisition supplier bucket the page does not name: the group, or one supplier the API did not serve as a company. */
export function unnamedSupplierLabel(key: string | null): string {
  return isNaturalPersonKey(key) ? naturalPersonsLabel() : t`Furnizor nenumit`
}
