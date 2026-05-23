import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberPortretTab } from '@/features/parliament/components/member-portret-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/portret')({
  component: ParliamentMemberPortretRoutePage,
})

function ParliamentMemberPortretRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberPortretTab member={member} />}
    />
  )
}
