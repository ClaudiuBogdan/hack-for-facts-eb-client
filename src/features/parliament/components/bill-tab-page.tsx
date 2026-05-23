import type { ReactNode } from 'react'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { useParliamentBillDetail } from '../hooks/use-parliament-data'

type Props = {
  readonly billId: string
  readonly render: (bill: ParliamentBillDetail) => ReactNode
}

/** Renders a bill detail tab once the parent layout has loaded bill data. */
export function BillTabPage({ billId, render }: Props) {
  const { data: bill } = useParliamentBillDetail(billId)

  if (!bill) {
    return null
  }

  return render(bill)
}
