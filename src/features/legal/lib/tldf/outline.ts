/**
 * The outline grammar ranks — the client copy of the server's
 * `core/outline.ts` constants. Depth is ALWAYS this fixed rank, never parsed
 * from a path string (`unmarked:N` keys carry no hierarchy).
 */

export const OUTLINE_HEADING_KINDS = [
  'carte',
  'parte',
  'titlu',
  'capitol',
  'subcapitol',
  'sectiune',
  'articol',
  'anexa',
  'apendice',
] as const

export type OutlineHeadingKind = (typeof OUTLINE_HEADING_KINDS)[number]

/** Fixed presentation depth per kind; anexa/apendice restart shallow. */
export const OUTLINE_DEPTH_RANK: Readonly<Record<OutlineHeadingKind, number>> = {
  carte: 1,
  parte: 2,
  titlu: 3,
  capitol: 4,
  subcapitol: 5,
  sectiune: 6,
  articol: 7,
  anexa: 1,
  apendice: 2,
}

export function isOutlineHeadingKind(kind: string): kind is OutlineHeadingKind {
  return (OUTLINE_HEADING_KINDS as readonly string[]).includes(kind)
}
