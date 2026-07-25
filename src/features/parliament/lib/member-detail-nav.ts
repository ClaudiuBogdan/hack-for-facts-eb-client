/** Member profile sidebar section ids — synced to sub-routes under /parlament/membri/$memberId */
export type MemberDetailTab =
  | 'contact'
  | 'overview'
  | 'voturi'
  | 'initiative'
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
    | '/parlament/membri/$memberId/initiative'
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
    id: 'initiative',
    label: 'Inițiative legislative',
    to: '/parlament/membri/$memberId/initiative',
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
  initiative: 'Inițiative legislative',
  interventii: 'Intervenții în plen',
  intrebari: 'Întrebări și interpelări',
  interese: 'Declarații de interese',
  alegeri: 'Rezultatul alegerilor',
  portret: 'Portret oficial',
}

/**
 * Tabs with NO live backing.
 *
 * - `alegeri`: the electoral result (votes received, share, list position) lives
 *   in the elections domain, which is not loaded or served yet — the server has
 *   no `member.electionResult` field at all.
 * - `portret`: no official portrait is captured (no extraction lane, and the
 *   licensing question is open), so the tab rendered the member's INITIALS in a
 *   frame under the heading "Portret oficial".
 *
 * Both are hidden from the profile navigation on live data and kept for mock
 * mode, where the fixtures do carry them. Direct URLs still resolve — the tabs
 * themselves say plainly that the dataset is not integrated yet.
 */
export const MEMBER_DETAIL_UNBACKED_TABS: ReadonlySet<MemberDetailTab> = new Set([
  'alegeri',
  'portret',
])

/** The nav items to render: the unbacked tabs are dropped unless mocks supply them. */
export function getMemberDetailNavItems(options: {
  readonly includeUnbacked: boolean
}): readonly NavItem[] {
  if (options.includeUnbacked) return MEMBER_DETAIL_NAV_ITEMS
  return MEMBER_DETAIL_NAV_ITEMS.filter((item) => !MEMBER_DETAIL_UNBACKED_TABS.has(item.id))
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

/**
 * Resolve the active sidebar tab from the current member profile URL.
 *
 * Matches on the DECODED last path segment: mandate keys contain colons, so
 * the router pathname carries them percent-encoded (`1%3A2024%3A1`) — any
 * comparison against the decoded `$memberId` param prefix silently fails and
 * pins the highlight on the overview tab. Mandate keys (`<chamber>:<year>:<n>`)
 * can never collide with a tab id, so the overview route (memberId last) falls
 * through correctly.
 */
export function resolveMemberDetailActiveTab(pathname: string): MemberDetailTab {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1] ?? ''
  let decoded = last
  try {
    decoded = decodeURIComponent(last)
  } catch {
    // malformed escape sequence — fall back to the raw segment
  }
  if (MEMBER_DETAIL_TAB_IDS.has(decoded as MemberDetailTab)) {
    return decoded as MemberDetailTab
  }
  return 'overview'
}
