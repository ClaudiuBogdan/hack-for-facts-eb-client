/**
 * Translation primitives between the redesign GraphQL surface (DB-native shapes)
 * and the parliament UI's data model.
 *
 * The GraphQL layer speaks the production database's vocabulary:
 *   - chamber values `camera_deputatilor | senat | comun`
 *   - members keyed by `mandateKey` (e.g. `2:2024:12`)
 *   - groups carry `groupId = <slug>-<chamber>` and a `groupName` string
 *   - constituency is an uppercase, diacritic-bearing county name (`CLUJ`)
 *
 * The UI model speaks `camera | senat`, `memberId`, `groupId`, `judetSlug` /
 * `judetName`, and expects a group `color`. These helpers are the single place
 * that bridges the two so mappers/filters stay declarative. They are pure and
 * synchronous (no I/O), which lets the group-colour map stay a sync getter that
 * behaves identically in mock and live mode.
 */
import type { ParliamentChamber } from '@/schemas/parliament'
import { resolveGroupColor } from '@/features/parliament/lib/group-colors'

/** GraphQL chamber enum (DB-native). The UI never sees `comun`. */
export type GraphqlChamber = 'camera_deputatilor' | 'senat' | 'comun'

/** Latest legislature on the production DB (verified 2026-06-17: 472 members). */
export const LATEST_LEGISLATURE = '2024'

/** UI chamber (`camera`/`senat`) → GraphQL chamber. */
export function toGraphqlChamber(chamber: ParliamentChamber): GraphqlChamber {
  return chamber === 'camera' ? 'camera_deputatilor' : 'senat'
}

/**
 * GraphQL chamber → UI chamber. `comun` (joint sessions) collapses to `camera`
 * for display purposes — the UI has no joint-chamber surface and joint votes are
 * still rendered in the Camera column. Returns `null` for anything unexpected so
 * callers can drop the row rather than mislabel it.
 */
export function fromGraphqlChamber(
  chamber: string | null | undefined,
): ParliamentChamber | null {
  switch (chamber) {
    case 'camera_deputatilor':
    case 'comun':
      return 'camera'
    case 'senat':
      return 'senat'
    default:
      return null
  }
}

/** Fold diacritics + lowercase, used for both group and county slugs. */
export function foldSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Derive the UI `groupId` for a member from its `groupName` + chamber. The
 * server's `parliamentGroups.groupId` is exactly `foldSlug(name)-<chamber>`
 * (verified: `psd-camera_deputatilor`, `udmr-senat`), so we reproduce it here to
 * keep member.groupId joinable with the group list. Ballot/group-breakdown rows
 * sometimes carry a bare label (`neafiliat`); those still fold to a stable id.
 */
export function deriveGroupId(
  groupName: string | null | undefined,
  chamber: GraphqlChamber | null | undefined,
): string {
  const name = groupName?.trim() ? groupName : 'necunoscut'
  const slug = foldSlug(name) || 'necunoscut'
  return chamber ? `${slug}-${chamber}` : slug
}

/**
 * Group colour resolution lives in ONE place — `lib/group-colors.ts`
 * (`resolveGroupColor` + `GROUP_BRAND_COLORS`). These thin re-exports keep the
 * existing import sites working while delegating to that single source of truth;
 * do NOT reintroduce a palette here.
 */
export { PARLIAMENT_GROUP_FALLBACK_COLOR } from '@/features/parliament/lib/group-colors'

/** Colour for a group name (diacritic-insensitive). Delegates to the resolver. */
export function colorForGroupName(groupName: string | null | undefined): string {
  return resolveGroupColor({ name: groupName })
}

/**
 * Split a `mandateKey` (`<chamberCode>:<legislature>:<seq>`) into parts. Used
 * only as a fallback when richer member fields are absent; the chamber on the
 * key is a numeric code we do NOT trust over the explicit `chamber` field.
 */
export function parseMandateKey(mandateKey: string): {
  readonly legislature: string | null
} {
  const parts = mandateKey.split(':')
  return { legislature: parts.length >= 2 ? (parts[1] ?? null) : null }
}
