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

/**
 * Resolve the active bill detail tab from the current URL.
 *
 * The bill id takes NO part in the comparison. `useLocation().pathname` is
 * percent-encoded while the route param is decoded, so a Senate key such as
 * `senat:385-2018` (`senat%3A385-2018` in the path) never matched a base path
 * built from the param, and every tab on those bills read as "Detalii". Only
 * the segment that follows the id decides — and that segment is a literal
 * route name, never encoded.
 */
export function resolveBillDetailActiveTab(pathname: string): BillDetailTab {
  const segments = pathname.split('/').filter(Boolean)
  const billsIndex = segments.indexOf('proiecte')
  // …/proiecte/<id>/<tab>
  const suffix = billsIndex === -1 ? undefined : segments[billsIndex + 2]

  if (
    suffix !== undefined &&
    BILL_DETAIL_TAB_IDS.has(suffix as BillDetailTab) &&
    suffix !== 'detalii'
  ) {
    return suffix as BillDetailTab
  }

  return 'detalii'
}
