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
 * Static, diacritic-insensitive group → colour map. Group colour is UI
 * decoration derived from party identity, NOT data the API stores; keeping it
 * client-side lets `getParliamentGroupColorMap()` stay synchronous (the vote
 * detail route reads it at module scope). Keyed by the folded short name so
 * `PSD`, `psd`, `P.S.D.` all resolve. Unknown groups fall back to neutral grey.
 */
const GROUP_COLOR_BY_FOLDED_NAME: Readonly<Record<string, string>> = {
  psd: '#e4002b',
  pnl: '#f7d417',
  usr: '#0095da',
  aur: '#ffcc00',
  udmr: '#008542',
  pmp: '#702283',
  'pro-romania': '#1d4ed8',
  pace: '#2563eb',
  'sos-ro': '#7c3a06',
  upr: '#0ea5e9',
  minoritati: '#64748b',
  neafiliati: '#94a3b8',
  neafiliat: '#94a3b8',
  pumr: '#0f766e',
  'pumr-udmr': '#008542',
}

export const PARLIAMENT_GROUP_FALLBACK_COLOR = '#505a5f'

/** Colour for a group name (diacritic-insensitive); neutral grey if unknown. */
export function colorForGroupName(groupName: string | null | undefined): string {
  if (!groupName) return PARLIAMENT_GROUP_FALLBACK_COLOR
  const folded = foldSlug(groupName)
  return GROUP_COLOR_BY_FOLDED_NAME[folded] ?? PARLIAMENT_GROUP_FALLBACK_COLOR
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
