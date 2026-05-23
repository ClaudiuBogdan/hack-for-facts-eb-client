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

function getQuestionStatusLabel(status: 'raspuns' | 'in_asteptare'): string {
  return status === 'raspuns' ? 'Răspuns primit' : 'În așteptare'
}

/** Written questions and interpellations tab */
export function MemberIntrebariTab({ member }: Props) {
  const { data, isLoading } = useParliamentMemberProfile(member.memberId)
  const memberName = formatMemberName(member.firstName, member.lastName)

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  const questions = data?.writtenQuestions ?? []

  return (
    <MemberProfileSectionHeader
      title="Întrebări și interpelări"
      intro={`Întrebările și interpelările adresate de ${memberName} instituțiilor responsabile.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Statusul indică dacă a fost primit un răspuns oficial. Rezumatul
          răspunsului este afișat când este disponibil.
        </p>
      </aside>

      <div className="space-y-4">
        {questions.length > 0 ? (
          questions.map((entry) => (
            <MemberProfileActivityRow
              key={entry.questionId}
              title={entry.title}
              meta={`Depusă ${formatActivityDate(entry.submittedAt)} · ${getQuestionStatusLabel(entry.status)}${entry.answerSummary ? ` · ${entry.answerSummary}` : ''}`}
              trailing={
                <span
                  className={`rounded-none px-2 py-1 text-xs font-semibold ${
                    entry.status === 'raspuns'
                      ? 'bg-[#eef7f1] text-[#006435]'
                      : 'bg-[#f3f2f1] text-[#505a5f]'
                  }`}
                >
                  {getQuestionStatusLabel(entry.status)}
                </span>
              }
            />
          ))
        ) : (
          <p className="text-base leading-7 text-[#505a5f]">
            Nu există întrebări publicate pentru acest parlamentar.
          </p>
        )}
      </div>
    </MemberProfileSectionHeader>
  )
}
