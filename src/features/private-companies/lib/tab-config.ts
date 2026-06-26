import { t } from '@lingui/core/macro'
import {
  Briefcase,
  Landmark,
  LayoutDashboard,
  LineChart,
  MapPin,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { PrivateCompanyViewTab } from '@/schemas/private-company'

export type PrivateCompanyTabConfig = {
  readonly id: PrivateCompanyViewTab
  readonly label: string
  readonly icon: LucideIcon
}

export const PRIVATE_COMPANY_TAB_IDS: readonly PrivateCompanyViewTab[] = [
  'summary',
  'activity',
  'achizitii',
  'governance',
  'financials',
  'location',
] as const

const PRIVATE_COMPANY_TAB_ICONS: Record<PrivateCompanyViewTab, LucideIcon> = {
  summary: LayoutDashboard,
  activity: Briefcase,
  achizitii: Landmark,
  governance: Users,
  financials: LineChart,
  location: MapPin,
}

export function getPrivateCompanyTabs(): readonly PrivateCompanyTabConfig[] {
  return PRIVATE_COMPANY_TAB_IDS.map((id) => ({
    id,
    label: getPrivateCompanyTabLabel(id),
    icon: PRIVATE_COMPANY_TAB_ICONS[id],
  }))
}

export function getPrivateCompanyTabLabel(tab: PrivateCompanyViewTab): string {
  switch (tab) {
    case 'summary':
      return t`Summary`
    case 'activity':
      return t`Activity`
    case 'achizitii':
      return t`Achiziții publice`
    case 'governance':
      return t`Governance`
    case 'financials':
      return t`Financials`
    case 'location':
      return t`Location`
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}
