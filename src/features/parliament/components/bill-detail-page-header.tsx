import { Link } from '@tanstack/react-router'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { getChamberLabel } from '../lib/formatting'
import {
  BILL_DETAIL_BREADCRUMB_BG,
  billDetailPageContainerClassName,
  getBillDetailHeroColor,
} from '../lib/bill-detail-theme'
import { ParliamentChamberMark } from './parliament-hub-panel'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** UK bills.parliament.uk-style page header — brand, title, chamber badge, breadcrumb */
export function BillDetailPageHeader({ bill }: Props) {
  const chamberColor = getBillDetailHeroColor(bill.originatingChamber)
  const chamberLabel = getChamberLabel(bill.originatingChamber)

  return (
    <header className="text-white" style={{ backgroundColor: BILL_DETAIL_BREADCRUMB_BG }}>
      <div className={billDetailPageContainerClassName}>
        <div className="flex items-start justify-between gap-4 py-5 sm:py-6">
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight">Parlamentul României</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.75rem]">
              Proiecte legislative
            </h1>
          </div>
          <div
            className="flex shrink-0 items-center gap-2 border border-white/25 px-3 py-2"
            style={{ backgroundColor: chamberColor }}
          >
            <ParliamentChamberMark color="#ffffff" className="mt-0 bg-transparent ring-white/40" />
            <span className="text-sm font-semibold leading-none">{chamberLabel}</span>
          </div>
        </div>

        <nav
          className="border-t border-white/20 py-3 text-sm"
          aria-label="Breadcrumb"
        >
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link to="/parlament" search={{ tab: 'prezentare' }} className="hover:underline">
                Parlament
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li>
              <Link to="/parlament" search={{ tab: 'proiecte' }} className="hover:underline">
                Proiecte legislative
              </Link>
            </li>
            <li aria-hidden className="opacity-70">
              ›
            </li>
            <li className="font-semibold" aria-current="page">
              {bill.number}
            </li>
          </ol>
        </nav>
      </div>
    </header>
  )
}
