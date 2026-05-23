import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentMember } from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import { useParliamentMemberProfile } from '../hooks/use-parliament-data'
import { memberDetailNoticeClassName } from '../lib/member-detail-theme'
import { MemberProfileSectionHeader } from './member-profile-section-header'

type Props = {
  readonly member: ParliamentMember
}

function getMemberInitials(member: ParliamentMember): string {
  return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase()
}

/** Official portrait tab */
export function MemberPortretTab({ member }: Props) {
  const { data, isLoading } = useParliamentMemberProfile(member.memberId)
  const memberName = formatMemberName(member.firstName, member.lastName)
  const portraitUrl = data?.officialPortraitUrl ?? member.photoUrl

  if (isLoading) {
    return <Skeleton className="h-96 w-full max-w-md rounded-none" />
  }

  return (
    <MemberProfileSectionHeader
      title="Portret oficial"
      intro={`Portretul oficial al ${memberName}, publicat de instituția parlamentară.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Portretul poate fi reutilizat cu menționarea sursei oficiale a camerei
          parlamentare.
        </p>
      </aside>

      {portraitUrl ? (
        <figure className="max-w-md border border-[#b1b4b6] bg-white p-4 dark:border-[var(--pnrr-border)]">
          <img
            src={portraitUrl}
            alt={`Portret oficial ${memberName}`}
            className="aspect-[3/4] w-full object-cover"
          />
          {data?.officialPortraitCaption ? (
            <figcaption className="mt-4 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {data.officialPortraitCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : (
        <div className="flex h-80 w-full max-w-md items-center justify-center border border-[#b1b4b6] bg-[#f3f2f1] dark:border-[var(--pnrr-border)]">
          <span className="text-5xl font-bold text-[#512178]">{getMemberInitials(member)}</span>
        </div>
      )}
    </MemberProfileSectionHeader>
  )
}
