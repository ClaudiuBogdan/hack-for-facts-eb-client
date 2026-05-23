import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberIntrebariTab } from '@/features/parliament/components/member-intrebari-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/intrebari')({
  component: ParliamentMemberIntrebariRoutePage,
})

function ParliamentMemberIntrebariRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberIntrebariTab member={member} />}
    />
  )
}
