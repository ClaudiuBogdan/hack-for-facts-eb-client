import { Link } from '@tanstack/react-router'
import type { ParliamentMember } from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import { MEMBER_DETAIL_TAB_LABELS, type MemberDetailTab } from '../lib/member-detail-nav'
import {
  MEMBER_DETAIL_BREADCRUMB_BG,
  memberDetailPageContainerClassName,
} from '../lib/member-detail-theme'

type Props = {
  readonly member: ParliamentMember
  readonly activeTab: MemberDetailTab
}

/** UK Parliament breadcrumb band for member detail pages. */
export function MemberDetailBreadcrumb({ member, activeTab }: Props) {
  const memberName = formatMemberName(member.firstName, member.lastName)

  return (
    <nav
      className="py-3 text-sm text-white"
      style={{ backgroundColor: MEMBER_DETAIL_BREADCRUMB_BG }}
      aria-label="Breadcrumb"
    >
      <div className={memberDetailPageContainerClassName}>
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
            <Link to="/parlament" search={{ tab: 'membri' }} className="hover:underline">
              Membri
            </Link>
          </li>
          <li aria-hidden className="opacity-70">
            ›
          </li>
          <li>
            <Link
              to="/parlament/membri/$memberId"
              params={{ memberId: member.memberId }}
              className="hover:underline"
            >
              {memberName}
            </Link>
          </li>
          <li aria-hidden className="opacity-70">
            ›
          </li>
          <li className="font-semibold" aria-current="page">
            {MEMBER_DETAIL_TAB_LABELS[activeTab]}
          </li>
        </ol>
      </div>
    </nav>
  )
}
