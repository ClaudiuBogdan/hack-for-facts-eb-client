/**
 * The one visual contract every parliament LIST surface follows — voturi,
 * proiecte, grupuri, comisii, stenograme, ordinea de zi.
 *
 * Before this, each of the six tabs carried its own header: two heading sizes,
 * two weights, a chamber mark on one and a blue rule on another, descriptions
 * from zero to three lines, and the result count rendered four different ways
 * in four different places. The tabs are the same kind of surface — a titled
 * list you search and filter — so they are given the same skeleton:
 *
 *   title → description → optional "despre aceste date" disclosure
 *   → one control row (search · sort · filters) → active-filter chips
 *   → rule → results
 *   → footer rule → count on the left, pagination on the right
 *
 * The count lives in the FOOTER, never above the list: it is a fact about the
 * rows, and a paragraph about the rows placed before them is a paragraph the
 * reader has to get past to reach what they came for.
 */

/** Tab title. `h2` — the shell already owns the page's `h1`. */
export const parliamentListTitleClassName =
  'text-2xl font-bold leading-snug text-[#0b0c0c] sm:text-[1.75rem] dark:text-[var(--pnrr-fg)]'

/** One or two lines under the title. Longer than that belongs in the disclosure. */
export const parliamentListIntroClassName =
  'mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]'

/** The hairline that closes the header and the one that opens the footer. */
export const parliamentListRuleClassName =
  'border-[#b1b4b6] dark:border-[var(--pnrr-border)]'

/** Muted small print — the footer count, the pager's position. */
export const parliamentListMutedClassName =
  'text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]'

/** Emphasis inside muted small print, for the numbers themselves. */
export const parliamentListStrongClassName =
  'font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

/**
 * A capped total, said as what it is.
 *
 * Several parliament reads cap `total` at 10.000 and flag it as an estimate.
 * Printing that as "10.000" would assert a number the source never reached, so
 * an estimated total is always prefixed rather than rounded or hidden.
 */
export function formatParliamentTotal(
  total: number,
  estimated: boolean = false,
): string {
  const formatted = total.toLocaleString('ro-RO')
  return estimated ? `peste ${formatted}` : formatted
}

/**
 * The Romanian counted-noun rule: 1 takes the singular, 2–19 the bare plural,
 * and everything from 20 up (and every round hundred) the `de` particle —
 * 1 vot · 10 voturi · 20 de voturi · 1.284 de proiecte.
 *
 * A footer that reads "10.000 voturi" on one tab and "20 de comisii" on the
 * next is the same kind of drift this surface is meant to end, so the six
 * counts are built from one rule rather than six hand-written strings.
 */
export function countedNoun(
  count: number,
  singular: string,
  plural: string,
): string {
  if (count === 1) return singular
  const lastTwo = Math.abs(count) % 100
  return lastTwo === 0 || lastTwo >= 20 ? `de ${plural}` : plural
}
