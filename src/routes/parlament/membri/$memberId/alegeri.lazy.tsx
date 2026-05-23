import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberAlegeriTab } from '@/features/parliament/components/member-alegeri-tab'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/alegeri')({
  component: ParliamentMemberAlegeriRoutePage,
})

function ParliamentMemberAlegeriRoutePage() {
  const { memberId } = Route.useParams()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberAlegeriTab member={member} />}
    />
  )
}
