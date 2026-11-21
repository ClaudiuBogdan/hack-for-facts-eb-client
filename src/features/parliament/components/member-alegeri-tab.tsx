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
          <div className="border-l-[5px] border-l-parliament-muted px-5 py-5 sm:px-6">
            <p className="text-lg font-bold text-parliament-fg">
              {result.electionName}
            </p>
            <p className="mt-2 text-sm text-parliament-muted">
              Circumscripția {result.constituency}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-parliament-muted">Voturi obținute</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-parliament-fg">
                  {result.votesReceived.toLocaleString('ro-RO')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-parliament-muted">Procent</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-parliament-fg">
                  {result.votesSharePercent.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-sm text-parliament-muted">Rezultat</dt>
                <dd className="mt-1 text-base font-bold text-parliament-commons">
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
        // NOT "this member has no result" — nobody has one here yet. The
        // electoral data lives in the elections domain, which is not loaded or
        // served, so the API carries no `electionResult` field at all. Saying
        // "nu există" about a dataset we never queried would be a false claim.
        <div className="border-2 border-parliament-border bg-parliament-card px-5 py-6">
          <p className="text-base font-bold text-parliament-fg">
            Rezultatele electorale nu sunt încă integrate
          </p>
          <p className="mt-2 max-w-2xl text-base leading-7 text-parliament-muted">
            Datele despre alegeri (voturi obținute, procent, poziția pe listă) provin
            din setul de date electorale, care nu este încă publicat în platformă.
            Nu înseamnă că acest parlamentar nu are un rezultat electoral.
          </p>
        </div>
      )}
    </MemberProfileSectionHeader>
  )
}
