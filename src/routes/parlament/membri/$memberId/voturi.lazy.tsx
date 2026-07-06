import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberProfileTabPage } from '@/features/parliament/components/member-profile-tab-page'
import { MemberVotingTab } from '@/features/parliament/components/member-voting-tab'

export const Route = createLazyFileRoute('/parlament/membri/$memberId/voturi')({
  component: ParliamentMemberVoturiRoutePage,
})

function ParliamentMemberVoturiRoutePage() {
  const { memberId } = Route.useParams()
  const search = Route.useSearch()

  return (
    <MemberProfileTabPage
      memberId={memberId}
      render={(member) => <MemberVotingTab member={member} search={search} />}
    />
  )
}
