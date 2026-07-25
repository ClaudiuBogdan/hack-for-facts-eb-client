import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  getMemberDetailNavItems,
  type MemberDetailTab,
} from '../lib/member-detail-nav'
import { isParliamentMockEnabled } from '../lib/mock-mode'
import {
  memberDetailSidebarActiveLinkClassName,
  memberDetailSidebarColumnClassName,
  memberDetailSidebarLinkClassName,
  memberDetailSidebarNavClassName,
} from '../lib/member-detail-theme'

type Props = {
  readonly memberId: string
  readonly activeTab: MemberDetailTab
}

/** Left navigation for member profile sub-routes. */
export function MemberDetailSidebar({ memberId, activeTab }: Props) {
  // `alegeri` / `portret` have no live backing (see MEMBER_DETAIL_UNBACKED_TABS).
  // Keep them reachable if the reader is already on one, so the highlight and
  // the back button still work.
  const items = getMemberDetailNavItems({
    includeUnbacked: isParliamentMockEnabled() || activeTab === 'alegeri' || activeTab === 'portret',
  })

  return (
    <div className={cn(memberDetailSidebarColumnClassName, 'lg:sticky lg:top-0 lg:self-start')}>
      <nav aria-label="Secțiuni profil parlamentar" className={memberDetailSidebarNavClassName}>
        {items.map((item) => {
          const isActive = activeTab === item.id

          return (
            <Link
              key={item.id}
              to={item.to}
              params={{ memberId }}
              activeOptions={{ exact: item.id === 'overview' }}
              className={cn(
                memberDetailSidebarLinkClassName,
                isActive ? memberDetailSidebarActiveLinkClassName : '',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
