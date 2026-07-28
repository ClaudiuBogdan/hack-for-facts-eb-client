import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { BillStagesTab } from '@/features/parliament/components/bill-stages-tab'
import { BillTabPage } from '@/features/parliament/components/bill-tab-page'
import { DEFAULT_BILL_STAGES_VIEW } from '@/features/parliament/lib/bill-stages-view'

export const Route = createLazyFileRoute('/parlament/proiecte/$billId/etape')({
  component: ParliamentBillEtapeRoutePage,
})

function ParliamentBillEtapeRoutePage() {
  const { billId } = Route.useParams()
  const { vedere } = Route.useSearch()
  const navigate = useNavigate({ from: '/parlament/proiecte/$billId/etape' })

  return (
    <BillTabPage
      billId={billId}
      render={(bill) => (
        <BillStagesTab
          bill={bill}
          view={vedere ?? DEFAULT_BILL_STAGES_VIEW}
          onViewChange={(view) => {
            void navigate({
              // The default reading leaves no param behind, so the plain URL
              // stays the canonical one for the page.
              search: view === DEFAULT_BILL_STAGES_VIEW ? {} : { vedere: view },
              replace: true,
            })
          }}
        />
      )}
    />
  )
}
