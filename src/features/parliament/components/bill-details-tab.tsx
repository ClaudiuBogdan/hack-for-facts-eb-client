import { Link } from '@tanstack/react-router'
import { ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { getParliamentVoteSummary } from '../api/parliament-api'
import {
  formatBillDate,
  formatBillUpdatedAt,
  getChamberLabel,
} from '../lib/formatting'
import {
  getBillLocationLabel,
  getBillTypeLabel,
} from '../lib/bill-profile-data'
import { billDetailCardClassName, billDetailSectionTitleClassName } from '../lib/bill-detail-theme'
import { AiSummaryCard } from './ai-summary-card'
import { ParliamentChamberMark } from './parliament-hub-panel'
import { VoteChamberVoteCard } from './vote-chamber-vote-card'
import {
  PARLIAMENT_CAMERA_GREEN,
  PARLIAMENT_SENAT_RED,
} from '../lib/hub-theme'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** Detalii tab — main bill overview matching UK Parliament Details layout */
export function BillDetailsTab({ bill }: Props) {
  const currentDocument = bill.documents[bill.documents.length - 1]
  const originColor =
    bill.originatingChamber === 'camera'
      ? PARLIAMENT_CAMERA_GREEN
      : PARLIAMENT_SENAT_RED
  const relatedVoteSummaries = bill.relatedVotes
    .map((vote) => getParliamentVoteSummary(vote.chamber, vote.voteId))
    .filter((vote): vote is NonNullable<typeof vote> => vote !== undefined)

  // AI summary shown only for meaningful bills (valueClass 'standard'); low_value
  // bills (minor/technical) hide the card to avoid noise.
  const ai = bill.aiMetadata
  const showAiSummary = bill.valueClass === 'standard' && ai

  return (
    <div className="space-y-10">
      {showAiSummary ? (
        <AiSummaryCard
          disclaimer={ai.disclaimer}
          model={ai.model}
          summary={ai.summary}
          loadedAt={ai.loadedAt}
          topic={ai.topic}
          domains={ai.domains}
          keywords={ai.keywords}
        />
      ) : null}

      <section>
        <h2 className={billDetailSectionTitleClassName}>Titlu lung</h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {bill.longTitle}
        </p>
        {bill.summary ? (
          <p className="mt-4 max-w-4xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {bill.summary}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className={billDetailSectionTitleClassName}>Stadiu curent</h2>
        <div className={cn(billDetailCardClassName, 'mt-4 grid gap-0 sm:grid-cols-2 lg:max-w-4xl')}>
          <div className="border-b border-[#b1b4b6] px-5 py-4 sm:border-b-0 sm:border-r dark:border-[var(--pnrr-border)]">
            <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              Etapa curentă
            </p>
            <p className="mt-2 text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {bill.currentStageLabel}
            </p>
            {bill.nextStageLabel ? (
              <p className="mt-3 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Următoarea etapă:{' '}
                <span className="font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {bill.nextStageLabel}
                </span>
              </p>
            ) : null}
          </div>
          <div className="px-5 py-4">
            <p className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              Localizare
            </p>
            <p className="mt-2 text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {getBillLocationLabel(bill.currentLocation)}
            </p>
            <p className="mt-3 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {getBillTypeLabel(bill.billType)} · Actualizat{' '}
              {formatBillUpdatedAt(bill.lastUpdatedAt)}
            </p>
          </div>
        </div>
        {bill.dossierBillIds.length > 1 ? (
          <p className="mt-3 max-w-4xl text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Acest proiect are înregistrări atât la Camera Deputaților, cât și la
            Senat; fișa reunește etapele, documentele și voturile ambelor
            înregistrări.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className={billDetailSectionTitleClassName}>Inițiator</h2>
        <div className={cn(billDetailCardClassName, 'mt-4 max-w-3xl')}>
          {bill.initiator.departmentName ? (
            <div className="flex items-center justify-between border-b border-[#b1b4b6] px-5 py-4 dark:border-[var(--pnrr-border)]">
              <span className="text-base font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                {bill.initiator.departmentName}
              </span>
              <ChevronRight className="h-5 w-5 text-[#505a5f]" aria-hidden />
            </div>
          ) : null}
          {bill.initiator.memberId && bill.initiator.memberName ? (
            <Link
              to="/parlament/membri/$memberId"
              params={{ memberId: bill.initiator.memberId }}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#f3f2f1] dark:hover:bg-[var(--pnrr-subtle)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f2f1] text-sm font-bold text-[#505a5f] dark:bg-[var(--pnrr-subtle)]">
                {bill.initiator.memberName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-base font-bold text-[#1d70b8] underline-offset-2 hover:underline">
                  {bill.initiator.memberName}
                </p>
                <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  Inițiator parlamentar
                </p>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      {currentDocument ? (
        <section>
          <h2 className={billDetailSectionTitleClassName}>Versiunea curentă a proiectului</h2>
          <div className={cn(billDetailCardClassName, 'mt-4 max-w-3xl overflow-hidden')}>
            <div className="flex flex-col gap-4 border-l-4 border-[#1d70b8] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-bold text-[#512178]">{currentDocument.label}</p>
                {currentDocument.versionLabel ? (
                  <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    {currentDocument.versionLabel}
                  </p>
                ) : null}
              </div>
              <Button
                asChild
                variant="outline"
                className="rounded-none border-2 border-[#1d70b8] text-[#1d70b8] hover:bg-[#1d70b8]/5"
              >
                <a href={currentDocument.url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Descarcă document
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#b1b4b6] px-5 py-3 dark:border-[var(--pnrr-border)]">
              {currentDocument.publishedAt ? (
                <p className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {formatBillDate(currentDocument.publishedAt)}
                </p>
              ) : (
                <span />
              )}
              {currentDocument.chamber ? (
                <div className="flex items-center gap-2">
                  <ParliamentChamberMark
                    color={
                      currentDocument.chamber === 'camera'
                        ? PARLIAMENT_CAMERA_GREEN
                        : PARLIAMENT_SENAT_RED
                    }
                    className="mt-0"
                  />
                  <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    {getChamberLabel(currentDocument.chamber)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ParliamentChamberMark color={originColor} className="mt-0" />
                  <span className="text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    {getChamberLabel(bill.originatingChamber)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {relatedVoteSummaries.length > 0 ? (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={billDetailSectionTitleClassName}>Voturi asociate</h2>
              <p className="mt-2 text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Divizările parlamentare legate de acest proiect.
              </p>
            </div>
            {bill.relatedVotes.length > 2 ? (
              <Link
                to="/parlament/proiecte/$billId/voturi"
                params={{ billId: bill.billId }}
                className="text-sm font-semibold text-[#1d70b8] underline underline-offset-2"
              >
                Vezi toate voturile
              </Link>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {relatedVoteSummaries.slice(0, 2).map((vote) => (
              <VoteChamberVoteCard key={`${vote.chamber}-${vote.voteId}`} vote={vote} />
            ))}
          </div>
          {bill.relatedVotes.length <= 2 ? (
            <Link
              to="/parlament/proiecte/$billId/voturi"
              params={{ billId: bill.billId }}
              className="mt-4 inline-block text-sm font-semibold text-[#1d70b8] underline underline-offset-2"
            >
              Detalii voturi
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
