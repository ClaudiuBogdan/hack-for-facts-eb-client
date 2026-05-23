/** Bill detail tab navigation — synced to sub-routes under /parlament/proiecte/$billId */
export type BillDetailTab = 'detalii' | 'etape' | 'documente' | 'voturi'

type NavItem = {
  readonly id: BillDetailTab
  readonly label: string
  readonly to:
    | '/parlament/proiecte/$billId'
    | '/parlament/proiecte/$billId/etape'
    | '/parlament/proiecte/$billId/documente'
    | '/parlament/proiecte/$billId/voturi'
}

export const BILL_DETAIL_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'detalii',
    label: 'Detalii',
    to: '/parlament/proiecte/$billId',
  },
  {
    id: 'etape',
    label: 'Etape',
    to: '/parlament/proiecte/$billId/etape',
  },
  {
    id: 'documente',
    label: 'Documente',
    to: '/parlament/proiecte/$billId/documente',
  },
  {
    id: 'voturi',
    label: 'Voturi',
    to: '/parlament/proiecte/$billId/voturi',
  },
] as const

const BILL_DETAIL_TAB_IDS = new Set<BillDetailTab>(
  BILL_DETAIL_NAV_ITEMS.map((item) => item.id),
)

/** Resolve active bill detail tab from the current URL. */
export function resolveBillDetailActiveTab(
  pathname: string,
  billId: string,
): BillDetailTab {
  const basePath = `/parlament/proiecte/${billId}`

  if (pathname === basePath || pathname === `${basePath}/`) {
    return 'detalii'
  }

  const suffix = pathname.slice(basePath.length + 1).split('/')[0]
  if (BILL_DETAIL_TAB_IDS.has(suffix as BillDetailTab) && suffix !== 'detalii') {
    return suffix as BillDetailTab
  }

  return 'detalii'
}
