import { Link, useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentVotesSearch } from '@/schemas/parliament'
import { useParliamentVotes } from '../hooks/use-parliament-data'
import { getChamberLabel } from '../lib/formatting'
import { ParliamentChamberMark } from './parliament-hub-panel'
import { VoteChamberVoteCard } from './vote-chamber-vote-card'
import { VotesChamberSearchForm } from './votes-chamber-search-form'
import { VotesListPagination } from './votes-list-pagination'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'

const LIST_PAGE_SIZE = 10

type Props = {
  readonly search: ParliamentVotesSearch & { readonly chamber: 'camera' | 'senat' }
}

/** Dedicated chamber votes list — UK-style search, pagination, two-column grid */
export function VotesChamberListLayout({ search }: Props) {
  const navigate = useNavigate({ from: '/parlament/' })
  const listSearch = {
    ...search,
    page: search.page ?? 1,
    pageSize: search.pageSize ?? LIST_PAGE_SIZE,
  }
  const { data, isLoading } = useParliamentVotes(listSearch)

  const chamberColor =
    search.chamber === 'camera' ? PARLIAMENT_CAMERA_GREEN : PARLIAMENT_SENAT_RED
  const chamberLabel = getChamberLabel(search.chamber)

  const handleSearchChange = (next: ParliamentVotesSearch) => {
    void navigate({
      search: {
        ...next,
        tab: 'voturi',
        chamber: search.chamber,
        pageSize: next.pageSize ?? LIST_PAGE_SIZE,
      },
      replace: true,
    })
  }

  const handlePageChange = (page: number) => {
    void navigate({
      search: {
        ...listSearch,
        tab: 'voturi',
        page,
      },
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <Link
        to="/parlament"
        search={{ tab: 'voturi' }}
        className="inline-block text-sm font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]"
      >
        ← Toate camerele
      </Link>

      <header className="max-w-4xl">
        <h2 className="flex items-start gap-2.5 text-2xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-[1.75rem]">
          <ParliamentChamberMark color={chamberColor} className="mt-1" />
          <span>Voturi în {chamberLabel}</span>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Caută divizările după titlu, număr, interval de date sau rezultat.
        </p>
      </header>

      <VotesChamberSearchForm
        search={listSearch}
        chamberLabel={chamberLabel}
        onSearchChange={handleSearchChange}
      />

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-none" />
      ) : data && data.total > 0 ? (
        <div className="space-y-5">
          <VotesListPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={handlePageChange}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            {data.votes.map((vote) => (
              <VoteChamberVoteCard
                key={vote.voteId}
                vote={vote}
                divisionNumber={vote.divisionNumber}
              />
            ))}
          </div>

          {data.totalPages > 1 ? (
            <VotesListPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={handlePageChange}
            />
          ) : null}
        </div>
      ) : (
        <div className="border border-[#b1b4b6] bg-white px-5 py-10 text-center dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
          <p className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Niciun vot nu corespunde căutării
          </p>
          <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Încearcă un alt titlu, interval de date sau resetează filtrele.
          </p>
        </div>
      )}
    </div>
  )
}
