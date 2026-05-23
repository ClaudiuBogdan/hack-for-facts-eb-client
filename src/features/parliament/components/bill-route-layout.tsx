import { Outlet, useLocation } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentBillDetail } from '../hooks/use-parliament-data'
import { resolveBillDetailActiveTab } from '../lib/bill-detail-nav'
import { BILL_DETAIL_SURFACE, billDetailPageContainerClassName } from '../lib/bill-detail-theme'
import { BillProfileLayout } from './bill-profile-layout'
import { ParliamentNotFoundPage } from './parliament-not-found-page'

type Props = {
  readonly billId: string
}

/** Shared shell for bill detail nested routes — renders child tab content via Outlet. */
export function BillRouteLayout({ billId }: Props) {
  const { pathname } = useLocation()
  const activeTab = resolveBillDetailActiveTab(pathname, billId)
  const { data: bill, isLoading } = useParliamentBillDetail(billId)

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: BILL_DETAIL_SURFACE }}>
        <div className={`${billDetailPageContainerClassName} py-10`}>
          <Skeleton className="h-64 w-full rounded-none bg-white/70" />
        </div>
      </div>
    )
  }

  if (!bill) {
    return (
      <ParliamentNotFoundPage
        breadcrumbLabel="Proiect negăsit"
        title="Proiectul de lege nu a fost găsit"
        description="Nu am găsit proiectul legislativ cerut. Verifică linkul sau revino la lista de proiecte."
        actions={[
          {
            label: 'Lista proiectelor',
            to: '/parlament',
            search: { tab: 'proiecte' },
            variant: 'primary',
          },
          {
            label: 'Prezentare Parlament',
            to: '/parlament',
            search: { tab: 'prezentare' },
            variant: 'secondary',
          },
        ]}
      />
    )
  }

  return (
    <BillProfileLayout bill={bill} activeTab={activeTab}>
      <Outlet />
    </BillProfileLayout>
  )
}
