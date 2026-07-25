import { Outlet, useLocation } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentMember } from '../hooks/use-parliament-data'
import { resolveMemberDetailActiveTab } from '../lib/member-detail-nav'
import { MEMBER_DETAIL_SURFACE, memberDetailPageContainerClassName } from '../lib/member-detail-theme'
import { MemberProfileLayout } from './member-profile-layout'
import { ParliamentLoadErrorPage } from './parliament-load-error-page'
import { ParliamentNotFoundPage } from './parliament-not-found-page'

type Props = {
  readonly memberId: string
}

/** Shared shell for member profile nested routes — renders child tab content via Outlet. */
export function MemberProfileRouteLayout({ memberId }: Props) {
  const { pathname } = useLocation()
  const activeTab = resolveMemberDetailActiveTab(pathname)
  const { data: member, isLoading, isError, refetch } = useParliamentMember(memberId)

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: MEMBER_DETAIL_SURFACE }}>
        <div className={`${memberDetailPageContainerClassName} py-10`}>
          <Skeleton className="h-64 w-full rounded-none bg-white/70" />
        </div>
      </div>
    )
  }

  // The live blocker this sweep started from: an ancillary DB failure nulled the
  // member and this layout rendered "parlamentarul nu a fost găsit" for a sitting
  // senator. The server root no longer fans out, and a transport failure now
  // reads as what it is.
  if (isError) {
    return (
      <ParliamentLoadErrorPage
        breadcrumbLabel="Profil indisponibil"
        title="Profilul parlamentarului nu a putut fi încărcat"
        description="Serviciul de date nu a răspuns. Parlamentarul poate exista — reîncearcă în câteva momente."
        onRetry={() => void refetch()}
      />
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
