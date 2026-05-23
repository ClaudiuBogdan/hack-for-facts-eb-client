import { useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentBillsSearch } from '@/schemas/parliament'
import { useParliamentBills, useParliamentHub } from '../hooks/use-parliament-data'
import { BILL_DETAIL_INFO_BG } from '../lib/bill-detail-theme'
import { BillListCard } from './bill-list-card'
import { BillsSearchForm } from './bills-search-form'
import { VotesListPagination } from './votes-list-pagination'

const LIST_PAGE_SIZE = 10

type Props = {
  readonly search: ParliamentBillsSearch
}

/** Hub tab content — find and browse legislative bills */
export function ParliamentBillsContent({ search }: Props) {
  const navigate = useNavigate({ from: '/parlament/' })
  const { data: hub } = useParliamentHub()
  const listSearch = {
    ...search,
    tab: 'proiecte' as const,
    page: search.page ?? 1,
    pageSize: search.pageSize ?? LIST_PAGE_SIZE,
  }
  const { data, isLoading } = useParliamentBills(listSearch)

  const legislatureLabel = hub?.legislature.label ?? '2024–2028'

  const handleSearchChange = (next: ParliamentBillsSearch) => {
    void navigate({
      search: {
        ...next,
        tab: 'proiecte',
        pageSize: next.pageSize ?? LIST_PAGE_SIZE,
      },
      replace: true,
    })
  }

  const handlePageChange = (page: number) => {
    void navigate({
      search: {
        ...listSearch,
        page,
      },
      replace: true,
    })
  }

  return (
    <div className="space-y-6">
      <header className="max-w-4xl">
        <h2 className="text-2xl font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:text-[1.75rem]">
          Găsește un proiect de lege
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Caută proiecte de lege după titlu, tip, cameră sau etapă curentă din parcursul
          legislativ.
        </p>
      </header>

      <div
        className="border-l-4 px-5 py-4 text-sm leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]"
        style={{ backgroundColor: BILL_DETAIL_INFO_BG, borderColor: '#512178' }}
      >
        Pentru informații oficiale despre proiectele de lege, consultați{' '}
        <a
          href="https://www.cdep.ro/pls/legis/legis_pck.home"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          Camera Deputaților
        </a>{' '}
        și{' '}
        <a
          href="https://www.senat.ro/Legis/lista.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          Senatul României
        </a>
        .
      </div>

      <BillsSearchForm search={listSearch} onSearchChange={handleSearchChange} />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-none" />
          ))}
        </div>
      ) : (
        <>
          {data && data.total > 0 ? (
            <VotesListPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={handlePageChange}
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {data?.bills.map((bill) => (
              <BillListCard
                key={bill.billId}
                bill={bill}
                legislatureLabel={legislatureLabel}
              />
            ))}
          </div>

          {data && data.total === 0 ? (
            <p className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Nu am găsit proiecte de lege care să corespundă criteriilor selectate.
            </p>
          ) : null}

          {data && data.totalPages > 1 ? (
            <VotesListPagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={handlePageChange}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
