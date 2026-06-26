import { t } from '@lingui/core/macro'
import type { PublicEnterpriseProfileTab } from '@/schemas/public-enterprise'

/**
 * Profile tab ids plus metadata. Each tab records whether its lane is
 * deploy-gated, and the scraper dataset id that backs its data status, so the
 * UI can show honest "gated/sample" states instead of faking live details.
 */
export type PublicEnterpriseTabConfig = {
  readonly id: PublicEnterpriseProfileTab
  readonly label: string
  readonly gated: boolean
  readonly statusDatasetId: string
}

export const PUBLIC_ENTERPRISE_TAB_IDS: readonly PublicEnterpriseProfileTab[] = [
  'profil',
  'indicatori',
  'autoritate',
  'guvernanta',
  'sanctiuni',
  'bursa',
  'ajutor-de-stat',
  'relatii',
] as const

const TAB_CONFIG: Record<PublicEnterpriseProfileTab, Omit<PublicEnterpriseTabConfig, 'label'>> = {
  profil: { id: 'profil', gated: false, statusDatasetId: 'soe-amepip' },
  indicatori: { id: 'indicatori', gated: false, statusDatasetId: 'soe-amepip' },
  autoritate: { id: 'autoritate', gated: true, statusDatasetId: 'soe-controlling-authority' },
  guvernanta: { id: 'guvernanta', gated: true, statusDatasetId: 'soe-governance-docs' },
  sanctiuni: { id: 'sanctiuni', gated: true, statusDatasetId: 'soe-sanctions' },
  bursa: { id: 'bursa', gated: true, statusDatasetId: 'soe-bvb-market' },
  'ajutor-de-stat': { id: 'ajutor-de-stat', gated: true, statusDatasetId: 'soe-regas-state-aid' },
  relatii: { id: 'relatii', gated: false, statusDatasetId: 'soe-amepip' },
}

export function getPublicEnterpriseTabLabel(
  tab: PublicEnterpriseProfileTab,
): string {
  switch (tab) {
    case 'profil':
      return t`Profil`
    case 'indicatori':
      return t`Indicatori`
    case 'autoritate':
      return t`Autoritate`
    case 'guvernanta':
      return t`Guvernanță`
    case 'sanctiuni':
      return t`Sancțiuni`
    case 'bursa':
      return t`Bursă`
    case 'ajutor-de-stat':
      return t`Ajutor de stat`
    case 'relatii':
      return t`Relații`
    default: {
      const exhaustive: never = tab
      return exhaustive
    }
  }
}

export function getPublicEnterpriseTabs(): readonly PublicEnterpriseTabConfig[] {
  return PUBLIC_ENTERPRISE_TAB_IDS.map((id) => ({
    ...TAB_CONFIG[id],
    label: getPublicEnterpriseTabLabel(id),
  }))
}

export function getPublicEnterpriseTabConfig(
  tab: PublicEnterpriseProfileTab,
): PublicEnterpriseTabConfig {
  return {
    ...TAB_CONFIG[tab],
    label: getPublicEnterpriseTabLabel(tab),
  }
}

export function isPublicEnterpriseTabGated(
  tab: PublicEnterpriseProfileTab,
): boolean {
  return TAB_CONFIG[tab].gated
}

export function getPublicEnterpriseTabStatusDatasetId(
  tab: PublicEnterpriseProfileTab,
): string {
  return TAB_CONFIG[tab].statusDatasetId
}
