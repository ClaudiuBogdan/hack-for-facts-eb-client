import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { BILL_DETAIL_NAV_ITEMS, type BillDetailTab } from '../lib/bill-detail-nav'
import {
  billDetailTabActiveClassName,
  billDetailTabInactiveClassName,
  billDetailTabLinkClassName,
  PARLIAMENT_ACTION_BLUE,
} from '../lib/bill-detail-theme'

type Props = {
  readonly billId: string
  readonly activeTab: BillDetailTab
}

/** Horizontal tab navigation for bill detail sub-routes */
export function BillDetailTabNav({ billId, activeTab }: Props) {
  return (
    <nav
      aria-label="Secțiuni proiect de lege"
      className="flex min-w-0 items-end gap-1 overflow-x-auto border-b border-[#b1b4b6] px-4 hide-scrollbar dark:border-[var(--pnrr-border)] sm:px-6 lg:px-8"
    >
      {BILL_DETAIL_NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id

        return (
          <Link
            key={item.id}
            to={item.to}
            params={{ billId }}
            activeOptions={{ exact: item.id === 'detalii' }}
            className={cn(
              billDetailTabLinkClassName,
              'relative',
              isActive ? billDetailTabActiveClassName : billDetailTabInactiveClassName,
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
            <span
              className={cn(
                'absolute bottom-0 left-0 right-0 h-[3px] transition-opacity',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
              style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
              aria-hidden
            />
          </Link>
        )
      })}
    </nav>
  )
}
