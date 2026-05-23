import type { ReactNode } from 'react'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import type { BillDetailTab } from '../lib/bill-detail-nav'
import {
  BILL_DETAIL_SURFACE,
  billDetailCardClassName,
  billDetailPageContainerClassName,
} from '../lib/bill-detail-theme'
import { BillDetailHero } from './bill-detail-hero'
import { BillDetailPageHeader } from './bill-detail-page-header'
import { BillDetailTabNav } from './bill-detail-tab-nav'

type Props = {
  readonly bill: ParliamentBillDetail
  readonly activeTab: BillDetailTab
  readonly children: ReactNode
}

/** Full shell for bill detail pages — UK bills.parliament.uk layout */
export function BillProfileLayout({ bill, activeTab, children }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: BILL_DETAIL_SURFACE }}>
      <BillDetailPageHeader bill={bill} />
      <BillDetailHero bill={bill} />

      <div className={cn(billDetailPageContainerClassName, 'pb-10 pt-6')}>
        <div className={billDetailCardClassName}>
          <BillDetailTabNav billId={bill.billId} activeTab={activeTab} />
          <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
