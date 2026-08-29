import { MemberVoteChoiceSchema } from '@/schemas/parliament'

/**
 * The tabs on a division's "Voturi individuale pe grup" section.
 *
 * The four recorded choices come from the schema itself rather than a hand-typed
 * copy, so a fifth choice can never appear on the page without a tab that can
 * address it. After them: the two honesty tabs (shown only when the division
 * actually has such positions) and the whole roll.
 */
export const VOTE_TABS = [
  ...MemberVoteChoiceSchema.options,
  'conflicting_choice',
  'unknown',
  'toate',
] as const

export type VoteTab = (typeof VOTE_TABS)[number]

/** What an unparameterised link shows, and where any bad value lands. */
export const DEFAULT_VOTE_TAB: VoteTab = 'pentru'

/** The whole roll — the one tab that mixes all four choices. */
export const ALL_CHOICES_TAB = 'toate' satisfies VoteTab

/**
 * Which positions are on screen is shareable state, so it lives in the URL.
 *
 * `alegere` is the word this codebase already uses for a vote choice in a
 * Parliament search object (the member-votes facet), and this route has no
 * competing `tab` meaning to collide with.
 */
export type VoteDetailSearch = {
  readonly alegere?: VoteTab
}

function isVoteTab(value: unknown): value is VoteTab {
  return (
    typeof value === 'string' && (VOTE_TABS as readonly string[]).includes(value)
  )
}

/**
 * Read the tab out of the URL.
 *
 * Tolerant by design, like every other Parliament search parse: a hand-edited,
 * stale or misspelled param drops the filter rather than throwing the page away,
 * and the section falls back to `pentru`. A value naming a tab this particular
 * division does not show (`conflicting_choice` on a division with no conflicts)
 * is kept here and resolved by the section's own effective-tab rule — the URL is
 * never rewritten, so there is no navigation loop.
 */
export function parseVoteDetailSearch(
  search: Record<string, unknown>,
): VoteDetailSearch {
  return isVoteTab(search.alegere) ? { alegere: search.alegere } : {}
}

/**
 * The next search object when the reader picks a tab.
 *
 * Spreads what was already there so an unrelated param survives the click, and
 * the DEFAULT tab leaves no param behind — the plain URL stays the canonical one
 * for the page.
 */
export function voteDetailSearchWithTab(
  previous: Record<string, unknown>,
  tab: VoteTab,
): Record<string, unknown> {
  const { alegere: _dropped, ...rest } = previous
  return tab === DEFAULT_VOTE_TAB ? rest : { ...rest, alegere: tab }
}
