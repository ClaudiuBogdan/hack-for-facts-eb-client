import type { ParliamentVotesSearch } from '@/schemas/parliament'
import { VotesChamberListLayout } from './votes-chamber-list-layout'
import { VotesOverviewLayout } from './votes-overview-layout'

type Props = {
  readonly search: ParliamentVotesSearch
}

/** Votes tab content — overview or chamber list via ?chamber= */
export function ParliamentVotesContent({ search }: Props) {
  const chamber = search.chamber

  if (chamber === 'camera' || chamber === 'senat') {
    return <VotesChamberListLayout search={{ ...search, chamber }} />
  }

  return <VotesOverviewLayout />
}
