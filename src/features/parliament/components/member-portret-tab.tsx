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
        // The old fallback dropped the member's INITIALS into a frame under the
        // heading "Portret oficial" — a placeholder presented as the thing it
        // stands in for. No official portrait is captured for any member yet (no
        // extraction lane, licensing unresolved), so say that instead.
        <div className="max-w-2xl border-2 border-[#b1b4b6] bg-white px-5 py-6 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
          <div className="flex items-start gap-4">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center border border-[#b1b4b6] bg-[#f3f2f1] text-xl font-bold text-[#512178] dark:border-[var(--pnrr-border)]"
              aria-hidden
            >
              {getMemberInitials(member)}
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                Portretul oficial nu este disponibil
              </p>
              <p className="mt-2 text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Platforma nu preia încă portretele publicate de Camera Deputaților și
                Senat. Inițialele de mai sus sunt un substitut vizual, nu portretul
                oficial al {memberName}.
              </p>
            </div>
          </div>
        </div>
      )}
    </MemberProfileSectionHeader>
  )
}
