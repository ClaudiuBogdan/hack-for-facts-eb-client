import type { CSSProperties, ReactNode } from 'react'
import type { ParliamentMember } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import type { MemberDetailTab } from '../lib/member-detail-nav'
import {
  MEMBER_DETAIL_SIDEBAR_WIDTH,
  MEMBER_DETAIL_SURFACE,
  memberDetailBodyGridClassName,
  memberDetailBodyShellClassName,
  memberDetailContentPanelClassName,
  memberDetailPageContainerClassName,
  memberDetailSidebarColumnClassName,
} from '../lib/member-detail-theme'
import { MemberDetailBreadcrumb } from './member-detail-breadcrumb'
import { MemberDetailHero } from './member-detail-hero'
import { MemberDetailSidebar } from './member-detail-sidebar'

type Props = {
  readonly member: ParliamentMember
  readonly activeTab: MemberDetailTab
  readonly children: ReactNode
}

/** Full UK-style shell for member profile pages. */
export function MemberProfileLayout({ member, activeTab, children }: Props) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: MEMBER_DETAIL_SURFACE }}>
      <MemberDetailBreadcrumb member={member} activeTab={activeTab} />
      <MemberDetailHero member={member} />

      <div className={cn(memberDetailPageContainerClassName, 'pb-10 pt-6 lg:pt-8')}>
        <div
          className={cn(memberDetailBodyShellClassName, memberDetailBodyGridClassName)}
          style={{ '--member-detail-sidebar': MEMBER_DETAIL_SIDEBAR_WIDTH } as CSSProperties}
        >
          <aside className={memberDetailSidebarColumnClassName}>
            <MemberDetailSidebar memberId={member.memberId} activeTab={activeTab} />
          </aside>
          <main className={memberDetailContentPanelClassName}>{children}</main>
        </div>
      </div>
    </div>
  )
}
