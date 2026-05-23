import { createLazyFileRoute } from '@tanstack/react-router'
import { MemberProfileRouteLayout } from '@/features/parliament/components/member-profile-route-layout'

export const Route = createLazyFileRoute('/parlament/membri/$memberId')({
  component: ParliamentMemberRouteLayoutPage,
})

function ParliamentMemberRouteLayoutPage() {
  const { memberId } = Route.useParams()
  return <MemberProfileRouteLayout memberId={memberId} />
}
