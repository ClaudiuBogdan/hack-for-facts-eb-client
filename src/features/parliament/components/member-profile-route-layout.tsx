import { Outlet, useLocation } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentMember } from '../hooks/use-parliament-data'
import { resolveMemberDetailActiveTab } from '../lib/member-detail-nav'
import { MEMBER_DETAIL_SURFACE, memberDetailPageContainerClassName } from '../lib/member-detail-theme'
import { MemberProfileLayout } from './member-profile-layout'
import { ParliamentNotFoundPage } from './parliament-not-found-page'

type Props = {
  readonly memberId: string
}

/** Shared shell for member profile nested routes — renders child tab content via Outlet. */
export function MemberProfileRouteLayout({ memberId }: Props) {
  const { pathname } = useLocation()
  const activeTab = resolveMemberDetailActiveTab(pathname, memberId)
  const { data: member, isLoading } = useParliamentMember(memberId)

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: MEMBER_DETAIL_SURFACE }}>
        <div className={`${memberDetailPageContainerClassName} py-10`}>
          <Skeleton className="h-64 w-full rounded-none bg-white/70" />
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <ParliamentNotFoundPage
        breadcrumbLabel="Parlamentar negăsit"
        title="Parlamentarul nu a fost găsit"
        description="Nu am găsit profilul parlamentarului cerut. Verifică linkul sau revino la lista de membri."
        actions={[
          {
            label: 'Lista membrilor',
            to: '/parlament',
            search: { tab: 'grupuri' },
            variant: 'primary',
          },
          {
            label: 'Prezentare Parlament',
            to: '/parlament',
            search: { tab: 'prezentare' },
            variant: 'secondary',
          },
        ]}
      />
    )
  }

  return (
    <MemberProfileLayout member={member} activeTab={activeTab}>
      <Outlet />
    </MemberProfileLayout>
  )
}
