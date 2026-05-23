import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  MEMBER_DETAIL_NAV_ITEMS,
  type MemberDetailTab,
} from '../lib/member-detail-nav'
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
  return (
    <div className={cn(memberDetailSidebarColumnClassName, 'lg:sticky lg:top-0 lg:self-start')}>
      <nav aria-label="Secțiuni profil parlamentar" className={memberDetailSidebarNavClassName}>
        {MEMBER_DETAIL_NAV_ITEMS.map((item) => {
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
