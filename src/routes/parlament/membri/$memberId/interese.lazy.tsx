import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberIntereseTab } from '@/features/parliament/components/member-interese-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/interese')({
  component: ParliamentMemberIntereseRoutePage,
})

function ParliamentMemberIntereseRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberIntereseTab member={member} />}
    />
  )
}
