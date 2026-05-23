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

/** Spoken contributions tab */
export function MemberInterventiiTab({ member }: Props) {
  const { data, isLoading } = useParliamentMemberProfile(member.memberId)
  const memberName = formatMemberName(member.firstName, member.lastName)

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  const contributions = data?.spokenContributions ?? []

  return (
    <MemberProfileSectionHeader
      title="Intervenții în plen"
      intro={`Intervențiile înregistrate ale ${memberName} în dezbaterile plenului.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Rezultatele includ titlul dezbaterii și data intervenției. Pentru
          transcrieri complete, consultați site-ul oficial al camerei.
        </p>
      </aside>

      <div className="space-y-4">
        {contributions.length > 0 ? (
          contributions.map((entry) => (
            <MemberProfileActivityRow
              key={entry.contributionId}
              title={entry.title}
              meta={`${formatActivityDate(entry.heldAt)}${entry.summary ? ` · ${entry.summary}` : ''}`}
            />
          ))
        ) : (
          <p className="text-base leading-7 text-[#505a5f]">
            Nu există intervenții publicate pentru acest parlamentar.
          </p>
        )}
      </div>
    </MemberProfileSectionHeader>
  )
}
