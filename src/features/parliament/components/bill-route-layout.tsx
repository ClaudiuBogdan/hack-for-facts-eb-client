import { Outlet, useLocation } from '@tanstack/react-router'
import { useParliamentBillDetail } from '../hooks/use-parliament-data'
import { resolveBillDetailActiveTab } from '../lib/bill-detail-nav'
import { BillDetailSkeleton } from './bill-detail-skeleton'
import { BillProfileLayout } from './bill-profile-layout'
import { ParliamentLoadErrorPage } from './parliament-load-error-page'
import { ParliamentNotFoundPage } from './parliament-not-found-page'

type Props = {
  readonly billId: string
}

/** Shared shell for bill detail nested routes — renders child tab content via Outlet. */
export function BillRouteLayout({ billId }: Props) {
  const { pathname } = useLocation()
  const activeTab = resolveBillDetailActiveTab(pathname)
  const { data: bill, isLoading, isError, refetch } = useParliamentBillDetail(billId)

  if (isLoading) {
    return <BillDetailSkeleton billId={billId} activeTab={activeTab} />
  }

  // A FAILED READ is not a missing bill — say so, and keep a retry available.
  if (isError) {
    return (
      <ParliamentLoadErrorPage
        breadcrumbLabel="Proiect indisponibil"
        title="Proiectul de lege nu a putut fi încărcat"
        description="Serviciul de date nu a răspuns. Proiectul poate exista — reîncearcă în câteva momente."
        onRetry={() => void refetch()}
      />
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
