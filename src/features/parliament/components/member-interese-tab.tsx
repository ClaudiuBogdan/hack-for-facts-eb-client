import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentMember } from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import { useParliamentMemberProfile } from '../hooks/use-parliament-data'
import { memberDetailNoticeClassName } from '../lib/member-detail-theme'
import { MemberProfileActivityRow } from './member-profile-activity-row'
import { MemberProfileSectionHeader } from './member-profile-section-header'

type Props = {
  readonly member: ParliamentMember
}

function formatActivityDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate))
}

/** Registered interests tab */
export function MemberIntereseTab({ member }: Props) {
  const { data, isLoading } = useParliamentMemberProfile(member.memberId)
  const memberName = formatMemberName(member.firstName, member.lastName)

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  const declarations = data?.interestDeclarations ?? []

  return (
    <MemberProfileSectionHeader
      title="Declarații de interese"
      intro={`Declarațiile de interese publicate de ${memberName}, conform procedurilor camerei.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Declarațiile includ funcții, activități profesionale și alte situații
          relevante pentru transparența mandatului parlamentar.
        </p>
      </aside>

      <div className="space-y-4">
        {declarations.length > 0 ? (
          declarations.map((entry) => (
            <MemberProfileActivityRow
              key={entry.declarationId}
              title={entry.category}
              meta={`Înregistrată ${formatActivityDate(entry.registeredAt)} · ${entry.description}`}
            />
          ))
        ) : (
          <p className="text-base leading-7 text-[#505a5f]">
            Nu există declarații publicate pentru acest parlamentar.
          </p>
        )}
      </div>
    </MemberProfileSectionHeader>
  )
}
