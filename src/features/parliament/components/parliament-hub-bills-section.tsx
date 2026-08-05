import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentBills } from '../hooks/use-parliament-data'
import { BillListCard } from './bill-list-card'
import { ParliamentHubBillActivity } from './parliament-hub-bill-activity'
import { ParliamentHubSection } from './parliament-hub-section'
import { ParliamentInlineLoadError } from './parliament-load-error-page'

const HUB_BILLS_PAGE_SIZE = 4

/**
 * Recent legislative bills preview on the Parlament hub.
 *
 * Same shape as the Voturi card: the list leads with WHAT is moving through the
 * chambers, and the footer closes with WHEN — a year of legislative volume per
 * day, then the way into the full list. The footer button is the only link to
 * the bills page; the header used to carry a "Toate proiectele" link saying the
 * same thing.
 */
export function ParliamentHubBillsSection() {
  const { data, isLoading, isError, refetch } = useParliamentBills({
    tab: 'proiecte',
    page: 1,
    pageSize: HUB_BILLS_PAGE_SIZE,
  })

  return (
    <ParliamentHubSection
      id="parliament-hub-bills-heading"
      title="Proiecte de lege"
      description="Proiecte recente din parcursul legislativ al Camerei Deputaților și Senatului."
      bodyClassName="px-0 pb-0 pt-0"
    >
      {isLoading ? (
        <div className="space-y-4 p-5 sm:p-6">
          {Array.from({ length: HUB_BILLS_PAGE_SIZE }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-none" />
          ))}
        </div>
      ) : /* A failed read is not "Parliament has no draft laws". Guarded on
             `!data` so a failed background refetch keeps the listed bills. */
      isError && !data ? (
        <div className="p-5 sm:p-6">
          <ParliamentInlineLoadError
            title={t`Proiectele de lege nu au putut fi încărcate`}
            description={t`O eroare de citire nu înseamnă că nu există proiecte de lege în lucru. Reîncercați; dacă problema persistă, sursa poate fi temporar indisponibilă.`}
            onRetry={() => void refetch()}
          />
        </div>
      ) : data && data.bills.length > 0 ? (
        // Hairline rules between rows, exactly as the Voturi card lists its
        // votes — the bills used to arrive as bordered cards stacked inside an
        // already-bordered section.
        <div className="divide-y divide-[var(--pnrr-border)]/20">
          {data.bills.map((bill) => (
            <BillListCard key={bill.billId} bill={bill} />
          ))}
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-[var(--pnrr-muted)] sm:px-6">
          <Trans>Nu există proiecte de lege disponibile.</Trans>
        </p>
      )}
      <div className="border-t-2 border-[var(--pnrr-border)] p-5 sm:p-6">
        <ParliamentHubBillActivity />
      </div>
    </ParliamentHubSection>
  )
}
