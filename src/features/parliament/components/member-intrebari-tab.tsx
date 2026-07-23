import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles } from 'lucide-react'
import type { ParliamentMember } from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import { useParliamentMemberProfile } from '../hooks/use-parliament-data'
import { memberDetailNoticeClassName } from '../lib/member-detail-theme'
import { AiSummaryCard } from './ai-summary-card'
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

function getQuestionStatusLabel(
  status: 'raspuns' | 'fara_raspuns_inregistrat',
): string {
  return status === 'raspuns' ? 'Răspuns primit' : 'Fără răspuns înregistrat'
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
          Statusul indică dacă un răspuns oficial este înregistrat în sursa
          parlamentară. Lipsa unui răspuns înregistrat nu înseamnă neapărat că
          nu s-a răspuns. Rezumatul răspunsului este afișat când este
          disponibil.
        </p>
      </aside>

      <div className="space-y-4">
        {questions.length > 0 ? (
          questions.map((entry) => (
            <div key={entry.questionId} className="space-y-3">
              <MemberProfileActivityRow
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
              {entry.aiMetadata ? (
                <details className="group border border-[#512178]/30 bg-[#faf9ff] dark:bg-[var(--pnrr-card)]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[#512178] marker:content-none">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Rezumat generat de AI
                  </summary>
                  <div className="border-t border-[#512178]/15 p-1">
                    <AiSummaryCard
                      className="border-0 border-l-0 bg-transparent p-4 dark:bg-transparent"
                      disclaimer={entry.aiMetadata.disclaimer}
                      model={entry.aiMetadata.model}
                      summary={entry.aiMetadata.summary}
                      loadedAt={entry.aiMetadata.loadedAt}
                      topic={entry.aiMetadata.urgency}
                      domains={entry.aiMetadata.policyDomains}
                      keywords={[...entry.aiMetadata.issueTypes, ...entry.aiMetadata.keywords]}
                    />
                  </div>
                </details>
              ) : null}
            </div>
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
