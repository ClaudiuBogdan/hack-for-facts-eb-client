import { Link } from '@tanstack/react-router'
import type { ParliamentVoteDetail } from '@/schemas/parliament'
import { exportVoteDetailAsCsv, getVoteDivisionNumber } from '../api/parliament-api'
import { downloadCsv } from '../lib/formatting'
import { cn } from '@/lib/utils'
import { VOTE_DETAIL_SURFACE, voteDetailCardClassName, voteDetailPageContainerClassName } from '../lib/vote-detail-theme'
import { VoteDetailBreadcrumb } from './vote-detail-breadcrumb'
import { VoteDetailHero } from './vote-detail-hero'
import { VoteIndividualVotesSection } from './vote-individual-votes-section'
import { VotePartyChart } from './vote-party-chart'

type Props = {
  readonly detail: ParliamentVoteDetail
  readonly groupColors: Readonly<Record<string, string>>
  readonly memberJudete: Readonly<Record<string, string>>
}

/** UK Parliament division detail page */
export function VoteDetailContent({ detail, groupColors, memberJudete }: Props) {
  const divisionNumber = getVoteDivisionNumber(detail.voteId) ?? 1

  return (
    <div className="min-h-screen" style={{ backgroundColor: VOTE_DETAIL_SURFACE }}>
      <VoteDetailBreadcrumb
        chamber={detail.chamber}
        divisionLabel={`Divizare ${divisionNumber}`}
      />

      <VoteDetailHero detail={detail} divisionNumber={divisionNumber} />

      <div className={cn(voteDetailPageContainerClassName, 'pb-8 pt-6')}>
        {detail.relatedBillId ? (
          <div className="mb-6 border border-[#b1b4b6] bg-white px-5 py-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
            <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Vot asociat proiectului de lege
            </p>
            <Link
              to="/parlament/proiecte/$billId"
              params={{ billId: detail.relatedBillId }}
              className="mt-1 inline-block text-base font-bold text-[#1d70b8] underline underline-offset-2 hover:text-[#1d70b8]/80"
            >
              Vezi proiectul de lege
            </Link>
          </div>
        ) : null}

        <section className={cn(voteDetailCardClassName, 'overflow-visible')}>
          <VotePartyChart
            embedded
            groups={detail.groupBreakdown}
            groupColors={groupColors}
            pentruTotal={detail.tally.pentru}
            impotrivaTotal={detail.tally.impotriva}
            onDownloadResults={() => {
              downloadCsv(`${detail.voteId}.csv`, exportVoteDetailAsCsv(detail))
            }}
          />

          <div
            className="border-t border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            role="separator"
            aria-hidden
          />

          <VoteIndividualVotesSection
            embedded
            detail={detail}
            groupColors={groupColors}
            memberJudete={memberJudete}
          />
        </section>
      </div>
    </div>
  )
}
