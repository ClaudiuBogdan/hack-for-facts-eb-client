import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentBills } from '../hooks/use-parliament-data'
import { parliamentHubLinkClassName } from '../lib/hub-theme'
import { BillListCard } from './bill-list-card'
import { ParliamentHubSection } from './parliament-hub-section'

const HUB_BILLS_PAGE_SIZE = 4

/** Recent legislative bills preview on the Parlament hub */
export function ParliamentHubBillsSection() {
  const { data, isLoading } = useParliamentBills({
    tab: 'proiecte',
    page: 1,
    pageSize: HUB_BILLS_PAGE_SIZE,
  })

  return (
    <ParliamentHubSection
      id="parliament-hub-bills-heading"
      title="Proiecte de lege"
      description="Proiecte recente din parcursul legislativ al Camerei Deputaților și Senatului."
      action={
        <Link
          to="/parlament"
          search={{ tab: 'proiecte' }}
          className={parliamentHubLinkClassName}
        >
          Toate proiectele
        </Link>
      }
      bodyClassName="space-y-4 p-5 sm:p-6"
    >
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: HUB_BILLS_PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-none" />
          ))}
        </div>
      ) : data && data.bills.length > 0 ? (
        <div className="space-y-4">
          {data.bills.map((bill) => (
            <BillListCard key={bill.billId} bill={bill} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--pnrr-muted)]">
          Nu există proiecte de lege disponibile.
        </p>
      )}
    </ParliamentHubSection>
  )
}
