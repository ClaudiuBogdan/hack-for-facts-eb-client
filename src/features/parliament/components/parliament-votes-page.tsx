import type { ParliamentVotesSearch } from '@/schemas/parliament'
import { VotesListLayout } from './votes-list-layout'

type Props = {
  readonly search: ParliamentVotesSearch
}

/**
 * Votes tab content — the list, always.
 *
 * `?chamber=` narrows it (`camera`, `senat`, `comun` for the joint sittings);
 * absent or `all` spans the whole parliament, so the tab link, a shared URL and
 * a cross-chamber heatmap day all land on the same surface. The chamber panels
 * that used to stand in front of this list now open the Prezentare tab, where
 * they introduce the chambers instead of gating the corpus.
 */
export function ParliamentVotesContent({ search }: Props) {
  return <VotesListLayout search={search} />
}
