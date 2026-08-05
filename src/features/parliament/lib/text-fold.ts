/**
 * The parliament feature's two diacritic folds.
 *
 * These two bodies used to exist in ten copies across `lib/`, `api/graphql/`
 * and `components/` (`fold`, `foldAgendaText`, `foldBill`, `foldSubject`,
 * `foldIdentity`, `toJudetSlug`, …). They are collapsed here.
 *
 * They are deliberately NOT the same fold and must not be merged:
 *
 *  - `foldText` strips only the combining marks in U+0300–U+036F.
 *  - `foldSlug` strips every code point carrying the Unicode `Diacritic`
 *    property — a different set that also covers SPACING marks such as `^`,
 *    `` ` `` and `´`. Inside a slug that is harmless (those characters would
 *    otherwise be rewritten to `-`), but applying it to free text would
 *    silently delete them from a search needle.
 *
 * Neither treats Romanian differently, which is the case that actually matters
 * here: `ă â î ș ț` AND the legacy cedilla spellings `ş ţ` that the chamber
 * sources mix decompose to combining marks present in BOTH sets. Proven in
 * `text-fold.test.ts`.
 *
 * `foldSlug` is also NOT `slugify` from `@/lib/utils`. That one deliberately
 * keeps diacritics (`slugify('Bucureşti') === 'bucure-ti'`) because it feeds a
 * different server slug contract; the two must stay separate.
 */

/** Strip diacritics and case, so "tanase" finds "Tănase". */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * Fold diacritics and non-alphanumerics to a stable slug — the identity key
 * for groups and counties.
 *
 * The server's `parliamentGroups.groupId` is exactly `foldSlug(name)-<chamber>`
 * (`psd-camera_deputatilor`, `udmr-senat`), so the output has to stay
 * byte-stable for member/group joins to keep working.
 */
export function foldSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
