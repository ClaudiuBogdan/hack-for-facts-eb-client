import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentMember } from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import { useParliamentMemberProfile } from '../hooks/use-parliament-data'
import {
  memberDetailCareerCardClassName,
  memberDetailCareerCardFooterClassName,
  memberDetailNoticeClassName,
} from '../lib/member-detail-theme'
import { MemberProfileChamberBadge } from './member-profile-card'
import { MemberProfileSectionHeader } from './member-profile-section-header'

type Props = {
  readonly member: ParliamentMember
}

function formatElectionDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate))
}

/** Last election result tab */
export function MemberAlegeriTab({ member }: Props) {
  const { data, isLoading } = useParliamentMemberProfile(member.memberId)
  const memberName = formatMemberName(member.firstName, member.lastName)
  const result = data?.electionResult

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  return (
    <MemberProfileSectionHeader
      title="Rezultatul alegerilor"
      intro={`Rezultatul electoral care a dus la mandatul actual al ${memberName}.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Procentele și numărul de voturi reflectă rezultatul din circumscripția
          în care candidatul a concurat.
        </p>
      </aside>

      {result ? (
        <div className={memberDetailCareerCardClassName}>
          <div className="border-l-[5px] border-l-[#3d434a] px-5 py-5 sm:px-6">
            <p className="text-lg font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {result.electionName}
            </p>
            <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Circumscripția {result.constituency}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-[#505a5f]">Voturi obținute</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-[#0b0c0c]">
                  {result.votesReceived.toLocaleString('ro-RO')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[#505a5f]">Procent</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-[#0b0c0c]">
                  {result.votesSharePercent.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[#505a5f]">Rezultat</dt>
                <dd className="mt-1 text-base font-bold text-[#006435]">
                  {result.elected ? 'Ales' : 'Neales'}
                </dd>
              </div>
            </dl>
          </div>
          <div className={memberDetailCareerCardFooterClassName}>
            <span>{formatElectionDate(result.electionDate)}</span>
            <MemberProfileChamberBadge chamber={member.chamber} />
          </div>
        </div>
      ) : (
        <p className="text-base leading-7 text-[#505a5f]">
          Nu există un rezultat electoral publicat pentru acest parlamentar.
        </p>
      )}
    </MemberProfileSectionHeader>
  )
}
