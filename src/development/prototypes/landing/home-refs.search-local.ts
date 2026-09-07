import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
import type { EntitySearchNode } from '@/schemas/entities'
import { matchRanges } from './home-refs.search-highlight'

/**
 * A local stand-in for the entity search, for when the API is not running.
 *
 * The prototype harness is a `yarn dev` surface and the GraphQL server is a
 * separate repo, so the common case while working on this page is that every
 * search fails with `ERR_CONNECTION_REFUSED` and the dropdown can only ever be
 * seen in its error state. That makes the states this component was built for
 * — results, the match highlight, keyboard travel — impossible to look at.
 *
 * So the landing hands the hook this as a fallback. Three things keep it honest:
 *
 * 1. **It is passed in, never reached for.** The hook has no knowledge of it and
 *    no default; without a caller supplying one, a failed request is an error,
 *    which is what the shipped component must do.
 * 2. **The landing gates it on `import.meta.env.DEV`.** It cannot reach a
 *    build.
 * 3. **Results from it are labelled `local` all the way to the screen**, and the
 *    dropdown says so. Per DESIGN.md §Mock-First Contract, stand-in data is
 *    never allowed to look like served truth — and a search is the worst place
 *    to break that rule, because a short list of real-looking institutions with
 *    real CUIs is entirely credible.
 *
 * The set is `PREDEFINED_ENTITIES` — the same seven the "Începe de aici" panel
 * lists. Reusing it rather than writing fixtures means the names carry real
 * diacritics (`Timișoara`, `Iași`, `Sănătății`) and real CUIs, so the folded
 * matcher is exercised by the fallback exactly as it would be by the API.
 */

/** How many the fallback will return, matching the live limit. */
const LOCAL_LIMIT = 8

/**
 * Entities whose name or CUI contains the term, diacritics folded away.
 *
 * Matching runs through `matchRanges`, the same function that draws the marks,
 * so a row can never appear without a visible reason for being there.
 */
export function localEntityMatches(term: string): readonly EntitySearchNode[] {
  const query = term.trim()
  if (!query) return []

  return PREDEFINED_ENTITIES.filter(
    (entity) =>
      matchRanges(entity.name, query).length > 0 || matchRanges(entity.cui, query).length > 0,
  ).slice(0, LOCAL_LIMIT)
}
