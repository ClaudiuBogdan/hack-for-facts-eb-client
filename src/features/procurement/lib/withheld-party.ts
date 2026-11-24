import { t } from '@lingui/core/macro'
import { markDaSupplierNamed } from '@/lib/da-supplier-name-mark'

/**
 * Decision D6 on every procurement surface that reads direct acquisitions:
 * a supplier is shown only as the API serves it. The API puts every supplier
 * it withholds in one group under a reserved key — never a CUI, a name or a
 * per-person id — and the client never names it, links it, drills into it or
 * looks a name up for it.
 *
 * Step 2 (owner, 24 November 2026: `20261124-name-suppliers-by-registry-legal-form-and-mask-persons`):
 * a sole trader or a person the registry does not show as a legal person is
 * served with a partly masked name (`person_masked`), and a supplier the API
 * names by no one its code alone (`code_only`); both with their code. The
 * client shows the API's name as given and never derives or unmasks one.
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

/**
 * A direct-purchase supplier as the page may show it (DA-009 step 2), from the
 * API's kind, its name and its code: a company by its registry name, or by
 * its code when the registry has none; a masked person by the masked name the
 * API gives; one the API does not name by its code alone. Null — withheld,
 * nothing shown — for a natural person, a missing code, and any kind the
 * client does not know (fail closed: a code under an unknown kind is not
 * known to be shown).
 */
export type DaSupplierShown =
  | { readonly kind: 'company'; readonly name: string | null; readonly code: string | null }
  | { readonly kind: 'masked'; readonly name: string; readonly code: string }
  | { readonly kind: 'code'; readonly code: string }

export function daSupplierShown(party: { readonly displayKind?: string | null; readonly name?: string | null; readonly code?: string | null } | null | undefined): DaSupplierShown | null {
  if (!party || isNaturalPersonKey(party.code)) return null
  const code = party.code?.trim() || null
  const name = party.name?.trim() || null
  const shown: DaSupplierShown | null = !code
    ? // A company named without a code (SEAP gave none) is named, as ever; no one else is shown without one.
      party.displayKind === 'company' && name
      ? { kind: 'company', name, code: null }
      : null
    : party.displayKind === 'company'
      ? { kind: 'company', name, code }
      : party.displayKind === 'person_masked'
        ? name
          ? { kind: 'masked', name, code }
          : { kind: 'code', code }
        : party.displayKind === 'code_only'
          ? { kind: 'code', code }
          : null
  // A name or a code shown is a decision a later publish can withdraw: the render that carries it is kept by no cache.
  return named(shown !== null) ? shown : null
}

/** As a ranking or a sentence says it: a company's name, or its code where the registry has none; a masked name with its code; a code alone. */
export function daSupplierLabel(shown: DaSupplierShown): string {
  if (shown.kind === 'code') {
    const code = shown.code
    return t`CUI ${code} (nume nepublicat)`
  }
  if (shown.kind === 'masked') {
    const { name, code } = shown
    return t`${name} (CUI ${code})`
  }
  return daCompanyBucketName({ key: shown.code, displayName: shown.name })
}

/** A direct-purchase supplier bucket the page may show (its label, its code, a link to it): `daSupplierShown` on the bucket. */
export function isShownDaSupplierBucket(bucket: { readonly key: string | null; readonly displayKind?: string | null; readonly displayName?: string | null }): boolean {
  return bucket.key !== null && daSupplierShown({ displayKind: bucket.displayKind, name: bucket.displayName, code: bucket.key }) !== null
}

/** Where the page writes a shown supplier's code beside its name: the name of one the API does not name. */
export function unpublishedNameText(): string {
  return t`Nume nepublicat`
}

/** A shown supplier bucket's label (`daSupplierLabel`); the unnamed label for any other. */
export function daSupplierBucketName(bucket: { readonly key: string | null; readonly displayKind?: string | null; readonly displayName?: string | null }): string {
  const shown = bucket.key === null ? null : daSupplierShown({ displayKind: bucket.displayKind, name: bucket.displayName, code: bucket.key })
  return shown ? daSupplierLabel(shown) : unnamedSupplierLabel(bucket.key)
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
 * Where a page would rank direct purchases' suppliers while D6 is enforced
 * and the release is off: the API refuses them, and the page says so.
 */
export function daSuppliersUnavailableText(): string {
  return t`Firmele achizițiilor directe nu sunt disponibile acum: platforma le arată din nou odată cu datele noi ale achizițiilor directe.`
}

/**
 * A direct-purchase supplier bucket as the page may keep it, before it is
 * cached, serialised or rendered: a company's, or a masked person's, as
 * served; a code alone with no name beside it; the group, and the unknown
 * bucket, with no name; any other supplier's key replaced by a neutral one
 * (`unnamed-3`) and its name dropped — never its CUI, nor a name the API
 * served under a kind the client does not know.
 */
export function scrubDaSupplierBucket<B extends { readonly key: string | null; readonly displayKind?: string | null; readonly displayName?: string | null }>(bucket: B, index: number): B {
  const withheldGroup = bucket.key === null || isNaturalPersonKey(bucket.key)
  const shown = withheldGroup ? null : daSupplierShown({ displayKind: bucket.displayKind, name: bucket.displayName, code: bucket.key })
  if (shown && shown.kind !== 'code') return bucket
  const unnamed = bucket.displayName == null ? bucket : ({ ...bucket, displayName: null } as B)
  return shown || withheldGroup ? unnamed : { ...unnamed, key: `unnamed-${index}` }
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

/** A direct-acquisition supplier bucket the page does not show: the group, or one supplier the API did not serve as shown. */
export function unnamedSupplierLabel(key: string | null): string {
  return isNaturalPersonKey(key) ? naturalPersonsLabel() : t`Furnizor nenumit`
}
