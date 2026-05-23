import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberContactTab } from '@/features/parliament/components/member-contact-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/contact')({
  component: ParliamentMemberContactRoutePage,
})

function ParliamentMemberContactRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberContactTab member={member} />}
    />
  )
}
