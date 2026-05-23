import type { ReactNode } from 'react'
import type { ParliamentMember } from '@/schemas/parliament'
import { useParliamentMember } from '../hooks/use-parliament-data'

type Props = {
  readonly memberId: string
  readonly render: (member: ParliamentMember) => ReactNode
}

/** Renders a member profile tab once the parent layout has loaded member data. */
export function MemberProfileTabPage({ memberId, render }: Props) {
  const { data: member } = useParliamentMember(memberId)

  if (!member) {
    return null
  }

  return render(member)
}
