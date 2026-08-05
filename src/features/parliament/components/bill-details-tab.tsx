import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ChevronRight, Download, ExternalLink } from 'lucide-react'
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
import {
  getDecisionChamberLabel,
  getInitiatorClassificationLabel,
  getInitiatorMethodExplanation,
  getLastEventSourceNote,
  getLawCharacterLabel,
  getUrgencyLabel,
} from '../lib/bill-source-facts'
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

/**
 * One procedural fact, with the sentence that says what it MEANS.
 *
 * "Cameră decizională" and "caracter organic" are terms of art: printed bare
 * they are only legible to someone who already knows the Constitution, which is
 * the opposite of the point. The gloss is fixed explanatory text, not data.
 *
 * The rules are computed by the caller, not by `odd:`/`last:` variants, because
 * the cell COUNT is dynamic (1 to 4 — each fact appears only when the source
 * stated it). `last:border-b-0` alone leaves the final ROW half-ruled whenever
 * the count is even: the left cell keeps a bottom border its right-hand
 * neighbour has already dropped.
 */
function BillProcedureFact({
  term,
  detail,
  className,
  children,
}: {
  readonly term: string
  readonly detail: string
  readonly className?: string
  readonly children: ReactNode
}) {
  return (
    <div
      className={cn(
        'border-[#b1b4b6] px-5 py-4 dark:border-[var(--pnrr-border)]',
        className,
      )}
    >
      <dt className="text-sm font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {term}
      </dt>
      <dd className="mt-2 text-base text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {children}
      </dd>
      <dd className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {detail}
      </dd>
    </div>
  )
}

/** Detalii tab — main bill overview matching UK Parliament Details layout */
export function BillDetailsTab({ bill }: Props) {
  const currentDocument = bill.documents[bill.documents.length - 1]
  const originColor =
    bill.originatingChamber === 'camera'
      ? PARLIAMENT_CAMERA_GREEN
      : PARLIAMENT_SENAT_RED
  // Keep each summary PAIRED with its edge role: the cards all carry the bill's
  // own title, so the role and the chamber are the only things that tell a
  // procedural division apart from the final vote.
  const relatedVoteCards = bill.relatedVotes.flatMap((vote) => {
    const summary = getParliamentVoteSummary(vote.chamber, vote.voteId)
    return summary ? [{ summary, linkRole: vote.linkRole }] : []
  })

  // AI summary shown only for meaningful bills (valueClass 'standard'); low_value
  // bills (minor/technical) hide the card to avoid noise.
  const ai = bill.aiMetadata
  const showAiSummary = bill.valueClass === 'standard' && ai

  const lastEventSourceNote = getLastEventSourceNote(bill.lastEventSource)

  // Built as data so the section can be gated on what will ACTUALLY render and
  // the rules can be computed from the real count. A bill whose only procedural
  // value is one of the 11 welded decision-chamber strings produces an empty
  // list here and gets no section — an empty bordered card is worse than none.
  const decisionChamberLabel = getDecisionChamberLabel(
    bill.procedure.decisionChamber,
  )
  const lawCharacterLabel = getLawCharacterLabel(bill.procedure.lawCharacter)
  const procedureFacts: {
    term: string
    detail: string
    value: string
  }[] = [
    decisionChamberLabel
      ? {
          term: 'Cameră decizională',
          detail: 'Camera al cărei vot este definitiv (art. 75 din Constituție).',
          value: decisionChamberLabel,
        }
      : undefined,
    lawCharacterLabel
      ? {
          term: 'Caracter',
          detail: 'Majoritatea necesară pentru adoptare.',
          value: lawCharacterLabel,
        }
      : undefined,
    // Rendered ONLY when the source said something, and it says "Nu" out loud
    // for the 16,051 bills marked ordinary. The hero's chip cannot do that: a
    // missing chip and a stated "no" look identical, which is precisely the
    // confusion a tri-state must not create.
    bill.procedure.urgency !== undefined
      ? {
          term: 'Procedură de urgență',
          detail: 'Termene scurtate față de procedura obișnuită.',
          value: getUrgencyLabel(bill.procedure.urgency),
        }
      : undefined,
    bill.procedure.constitutionalRegime
      ? {
          term: 'Cadru constituțional',
          detail: 'Textul constituțional după care se desfășoară procedura.',
          value: bill.procedure.constitutionalRegime,
        }
      : undefined,
  ].filter((fact) => fact !== undefined)

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

      {/*
        NO "Titlu lung" section. `longTitle` is mapped as `raw.title ?? title` —
        the very field the hero prints a few centimetres above — so the section
        restated the heading verbatim on every bill. If the source ever gains a
        genuinely separate long title, this is where it goes back.
      */}
      {/*
        The bill's OWN account of what it does, as the source printed it — the
        only prose about a bill beyond its title, and on just 1,007 of 41,990
        bills. It is headed rather than dropped in bare, because unlabelled prose
        under a title reads as our summary of the bill instead of the source's.
      */}
      {bill.objectOfRegulation ? (
        <section>
          <h2 className={billDetailSectionTitleClassName}>Obiectul reglementării</h2>
          <p className="mt-4 max-w-4xl whitespace-pre-line text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {bill.objectOfRegulation}
          </p>
        </section>
      ) : null}

      {bill.summary ? (
        <p className="max-w-4xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {bill.summary}
        </p>
      ) : null}

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
            {/* WHAT the last move was. The status string above is the source's
                standing label; this is the event that produced the date the
                page keeps showing, and without it "Actualizat" is a date with
                nothing attached to it. */}
            {bill.lastEventDescription ? (
              <p className="mt-3 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Ultima mișcare:{' '}
                <span className="font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {bill.lastEventDescription}
                </span>
              </p>
            ) : null}
            {lastEventSourceNote ? (
              <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {lastEventSourceNote}
              </p>
            ) : null}
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
            {/* The other end of the timeline. Held since acquisition on 20,747
                bills and never shown until now; with the update date it bounds
                how long the bill has actually been in play. */}
            {bill.firstEventAt ? (
              <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Prima etapă: {formatBillDate(bill.firstEventAt)}
              </p>
            ) : null}
          </div>
        </div>
        {bill.dossierBillIds.length > 1 ? (
          <p className="mt-3 max-w-4xl text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Acest proiect are înregistrări atât la Camera Deputaților, cât și la
            Senat; fișa reunește etapele, documentele și voturile ambelor
            înregistrări.
          </p>
        ) : null}
        {/* The card states where the bill stands; this is the way to how it got
            there. Without it the reader has to work out that "Etape" is the tab
            that expands the one fact they just read. */}
        <Link
          to="/parlament/proiecte/$billId/etape"
          params={{ billId: bill.billId }}
          className="mt-4 inline-flex items-center gap-1 text-base font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#003078]"
        >
          Vezi toate etapele parcursului
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
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
          {/*
            A parliamentary bill whose initiators we could not resolve to member
            rows (1,244 live bills) would otherwise render an EMPTY card, and
            before this it printed "Guvernul României" — the wrong actor.

            The wording blames US, not the source, because that is what was
            measured: the bill HAS an initiators list (it is what the server
            classified from), and what failed is our linking of those names to
            member profiles. "The source does not allow us to identify them"
            would be an unproven claim about the source.
          */}
          {!bill.initiator.departmentName && !bill.initiator.memberName ? (
            <p className="px-5 py-4 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Nu am putut lega inițiatorii acestui proiect de fișele de parlamentar
              din baza noastră.
            </p>
          ) : null}
        </div>
        {/*
          OUR classification, never presented as a source statement, and always
          with the rule that produced it — the initiators list is on this same
          page, so the reader can check the conclusion against its evidence.

          NO confidence badge: `initiatorClassification.confidence` is constant
          'high' on all 19,284 classified bills, because the only rules in use
          are deterministic. A badge would imply a gradation that does not exist,
          and an unnecessary caveat teaches readers to ignore the necessary ones.
        */}
        {bill.initiatorClassification ? (
          <p className="mt-3 max-w-3xl text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Clasificare proprie (nu o mențiune a Parlamentului):{' '}
            <span className="font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {getInitiatorClassificationLabel(bill.initiatorClassification)}
            </span>
            {getInitiatorMethodExplanation(bill.initiatorClassification.method)
              ? ` — ${getInitiatorMethodExplanation(bill.initiatorClassification.method)}`
              : '.'}
          </p>
        ) : null}
      </section>

      {procedureFacts.length > 0 ? (
        <section>
          <h2 className={billDetailSectionTitleClassName}>Procedură legislativă</h2>
          <dl
            className={cn(
              billDetailCardClassName,
              'mt-4 grid gap-0 sm:grid-cols-2 lg:max-w-4xl',
            )}
          >
            {procedureFacts.map((fact, index) => (
              <BillProcedureFact
                key={fact.term}
                term={fact.term}
                detail={fact.detail}
                className={cn(
                  // ONE COLUMN (below sm): a rule under every cell but the last.
                  index < procedureFacts.length - 1 && 'border-b',
                  // TWO COLUMNS (sm+): the last ROW takes no bottom rule, since
                  // the card already draws the outer border. Only one cell can
                  // need the override — the left-hand cell of a full final row,
                  // i.e. index n-2 when n is even. That case is exactly what
                  // `last:border-b-0` cannot express, and it is why these rules
                  // are computed from the real cell count instead: the count is
                  // dynamic (1 to 4, each fact appearing only if the source
                  // stated it), so a static variant half-rules the final row on
                  // every bill with an even number of facts.
                  procedureFacts.length % 2 === 0 &&
                    index === procedureFacts.length - 2 &&
                    'sm:border-b-0',
                  // Vertical rule only where a right-hand neighbour exists.
                  index % 2 === 0 &&
                    index < procedureFacts.length - 1 &&
                    'sm:border-r',
                )}
              >
                {fact.value}
              </BillProcedureFact>
            ))}
          </dl>
        </section>
      ) : null}

      {/*
        Provenance: where the data came from, what other registers call this
        bill, and when we last read it.

        The section is gated on ANY of those three, not on the links alone. It
        used to be nested inside `sourceLinks.length > 0`, which hid the
        identifiers and the capture date from every bill whose four source URLs
        happen to be null — bill 4353 is a live example, links all absent and a
        capture timestamp present. Provenance is exactly what a reader needs
        MOST on a bill we cannot link out to.
      */}
      {bill.sourceLinks.length > 0 ||
      bill.senateCod ||
      bill.governmentRegistration ||
      bill.sourceCapturedAt ? (
        <section>
          <h2 className={billDetailSectionTitleClassName}>Surse oficiale</h2>
          {bill.sourceLinks.length > 0 ? (
            <>
              <p className="mt-2 max-w-3xl text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Paginile oficiale de pe care au fost preluate datele de mai sus.
              </p>
              <ul className="mt-4 space-y-2">
                {bill.sourceLinks.map((link) => (
                  <li key={link.key}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-base font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#003078]"
                    >
                      {link.label}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 max-w-3xl text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Sursa nu a înregistrat o pagină publică pentru acest proiect.
            </p>
          )}
          {/*
            Identifiers other systems know this bill by. They are for
            cross-referencing against senat.ro and the Government's own
            registers, so they sit with the links rather than in the hero, where
            they would compete with the bill's own number.
          */}
          {bill.senateCod || bill.governmentRegistration ? (
            <p className="mt-4 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {[
                bill.senateCod ? `Cod Senat: ${bill.senateCod}` : undefined,
                bill.governmentRegistration
                  ? `Înregistrare la Guvern: ${bill.governmentRegistration}`
                  : undefined,
              ]
                .filter((part) => part !== undefined)
                .join(' · ')}
            </p>
          ) : null}
          {/*
            OUR capture time, said as ours. It is max(updated_at) over the raw
            tables, and 34,224 of 41,990 bills share a single backfill stamp —
            so it is emphatically not "when the chamber last touched the bill",
            and is never labelled as though it were.
          */}
          {bill.sourceCapturedAt ? (
            <p className="mt-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Datele au fost preluate de noi la{' '}
              {formatBillDate(bill.sourceCapturedAt)}.
            </p>
          ) : null}
        </section>
      ) : null}

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

      {relatedVoteCards.length > 0 ? (
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
            {relatedVoteCards.slice(0, 2).map(({ summary, linkRole }) => (
              <VoteChamberVoteCard
                key={`${summary.chamber}-${summary.voteId}`}
                vote={summary}
                billContext={{ linkRole }}
              />
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
