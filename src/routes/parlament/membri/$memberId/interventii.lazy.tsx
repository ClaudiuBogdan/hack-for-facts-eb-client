import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberInterventiiTab } from '@/features/parliament/components/member-interventii-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/interventii')({
  component: ParliamentMemberInterventiiRoutePage,
})

function ParliamentMemberInterventiiRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberInterventiiTab member={member} />}
    />
  )
}
