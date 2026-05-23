/** Member profile sidebar section ids — synced to sub-routes under /parlament/membri/$memberId */
export type MemberDetailTab =
  | 'contact'
  | 'overview'
  | 'voturi'
  | 'interventii'
  | 'intrebari'
  | 'interese'
  | 'alegeri'
  | 'portret'

type NavItem = {
  readonly id: MemberDetailTab
  readonly label: string
  readonly to:
    | '/parlament/membri/$memberId'
    | '/parlament/membri/$memberId/contact'
    | '/parlament/membri/$memberId/voturi'
    | '/parlament/membri/$memberId/interventii'
    | '/parlament/membri/$memberId/intrebari'
    | '/parlament/membri/$memberId/interese'
    | '/parlament/membri/$memberId/alegeri'
    | '/parlament/membri/$memberId/portret'
}

/** UK Parliament–style member profile navigation (Romanian labels) */
export const MEMBER_DETAIL_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'contact',
    label: 'Informații de contact',
    to: '/parlament/membri/$memberId/contact',
  },
  {
    id: 'overview',
    label: 'Carieră parlamentară',
    to: '/parlament/membri/$memberId',
  },
  {
    id: 'voturi',
    label: 'Istoric voturi',
    to: '/parlament/membri/$memberId/voturi',
  },
  {
    id: 'interventii',
    label: 'Intervenții în plen',
    to: '/parlament/membri/$memberId/interventii',
  },
  {
    id: 'intrebari',
    label: 'Întrebări și interpelări',
    to: '/parlament/membri/$memberId/intrebari',
  },
  {
    id: 'interese',
    label: 'Declarații de interese',
    to: '/parlament/membri/$memberId/interese',
  },
  {
    id: 'alegeri',
    label: 'Rezultatul alegerilor',
    to: '/parlament/membri/$memberId/alegeri',
  },
  {
    id: 'portret',
    label: 'Portret oficial',
    to: '/parlament/membri/$memberId/portret',
  },
] as const

export const MEMBER_DETAIL_TAB_LABELS: Record<MemberDetailTab, string> = {
  contact: 'Informații de contact',
  overview: 'Carieră parlamentară',
  voturi: 'Istoric voturi',
  interventii: 'Intervenții în plen',
  intrebari: 'Întrebări și interpelări',
  interese: 'Declarații de interese',
  alegeri: 'Rezultatul alegerilor',
  portret: 'Portret oficial',
}

export function getMemberDetailNavItem(tab: MemberDetailTab): NavItem {
  const item = MEMBER_DETAIL_NAV_ITEMS.find((entry) => entry.id === tab)
  if (!item) {
    throw new Error(`Unknown member detail tab: ${tab}`)
  }
  return item
}

const MEMBER_DETAIL_TAB_IDS = new Set<MemberDetailTab>(
  MEMBER_DETAIL_NAV_ITEMS.map((item) => item.id),
)

/** Resolve the active sidebar tab from the current member profile URL. */
export function resolveMemberDetailActiveTab(
  pathname: string,
  memberId: string,
): MemberDetailTab {
  const basePath = `/parlament/membri/${memberId}`

  if (pathname === basePath || pathname === `${basePath}/`) {
    return 'overview'
  }

  const suffix = pathname.slice(basePath.length + 1).split('/')[0]
  if (MEMBER_DETAIL_TAB_IDS.has(suffix as MemberDetailTab) && suffix !== 'overview') {
    return suffix as MemberDetailTab
  }

  return 'overview'
}
