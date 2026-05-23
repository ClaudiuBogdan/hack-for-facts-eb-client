import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberOverviewTab } from '@/features/parliament/components/member-overview-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/')({
  component: ParliamentMemberOverviewRoutePage,
})

function ParliamentMemberOverviewRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberOverviewTab member={member} />}
    />
  )
}
