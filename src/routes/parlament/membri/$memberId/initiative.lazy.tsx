import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberInitiativeTab } from '@/features/parliament/components/member-initiative-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/initiative')({
  component: ParliamentMemberInitiativeRoutePage,
})

function ParliamentMemberInitiativeRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberInitiativeTab member={member} />}
    />
  )
}
