import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { I18n } from '@lingui/core'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { CaveatsMarker } from '@/features/public-enterprises/components/hub/hub-parts'
import { HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import type { ElectionContest, ElectionEvent, ElectionOccurrence, ElectionResult, ElectionTally } from '@/schemas/elections-catalog'
import { useElectionContest, useElectionEvent, useElectionResult } from '../hooks/use-elections-catalog'
import { ballotDaysOf } from '../lib/election-days'
import {
  ElectionsBackLink,
  ElectionsFactList,
  ElectionsLoadError,
  ElectionsPageHead,
  ElectionsRecordMissing,
  ElectionsRefreshError,
  type ElectionsFact,
} from './catalog-parts'
import { contestNotes, mandatesByPhase, turnoutOf, votesOf } from './contest-figures'
import {
  allocationPhaseLabel,
  ballotDayKindLabel,
  buildContestDocumentTitle,
  competitorName,
  eventName,
  formatCount,
  formatIsoDate,
  formatPercent,
  formatPoints,
  officeLabel,
  placeName,
  placeTypeLabel,
  roundLabel,
} from './elections-catalog-text'

/**
 * `/alegeri/contest/$contestKey` — one contest: an office in a place on one
 * ballot day, then its figures at that place (party-level votes, mandates per
 * phase, turnout), with what to know about them behind one marker. The
 * contest is one read; its figures and its event are read once it is known,
 * and a failure of either leaves the contest standing with its own retry.
 * The first by votes is never called a winner.
 */
export function ElectionContestPage({
  contestKey,
  initialContest,
  initialResult,
  initialEvent,
}: {
  readonly contestKey: string
  readonly initialContest?: ElectionContest
  /** `null`: the server read found no figures for the contest's place. */
  readonly initialResult?: ElectionResult | null
  readonly initialEvent?: ElectionEvent
}) {
  const { i18n } = useLingui()
  const query = useElectionContest(contestKey, initialContest)
  const contest = query.data
  const eventQuery = useElectionEvent(contest?.eventKey ?? null, initialEvent)
  const event = eventQuery.data
  const day = event && contest ? (event.occurrences.find((entry) => entry.occurrenceKey === contest.occurrenceKey) ?? null) : null
  useClientDocumentTitle(
    contest ? buildContestDocumentTitle(i18n, { contestKey, place: placeName(i18n, contest.jurisdiction), office: officeLabel(i18n, contest.office) }) : null,
  )

  const refreshError = query.isRefetchError ? <ElectionsRefreshError className="mt-6" onRetry={() => void query.refetch()} /> : null

  if (contest === null) {
    return (
      <ElectionsRecordMissing title={<Trans>Scrutinul nu a fost găsit</Trans>} notice={refreshError}>
        <Trans>Nu există un scrutin cu cheia {contestKey}.</Trans>
      </ElectionsRecordMissing>
    )
  }

  return (
    <div className="bg-background">
      <ElectionsPageHead
        back={
          contest ? (
            <ElectionsBackLink electionKey={contest.eventKey} ballotDate={event && day && day !== ballotDaysOf(event)[0] ? day.ballotDate : undefined}>
              {event ? eventName(i18n, event) : <Trans>Alegerea {contest.eventKey}</Trans>}
            </ElectionsBackLink>
          ) : (
            <ElectionsBackLink>
              <Trans>Toate alegerile</Trans>
            </ElectionsBackLink>
          )
        }
        caption={contest ? officeLabel(i18n, contest.office) : <Trans>Scrutin</Trans>}
        // The key names the page while its read is pending or has failed.
        title={contest ? placeName(i18n, contest.jurisdiction) : contestKey}
      >
        {contest ? (
          <>
            {refreshError}
            <ElectionsFactList className="mt-8" facts={contestFacts(contest, day, eventQuery.isPending, i18n)} />
          </>
        ) : query.isError ? (
          <ElectionsLoadError onRetry={() => void query.refetch()}>
            <Trans>Datele scrutinului nu s-au încărcat.</Trans>
          </ElectionsLoadError>
        ) : (
          <HubPending rows={4} className="mt-8" />
        )}
      </ElectionsPageHead>

      {contest ? <ResultsBand contest={contest} initialResult={initialResult} /> : null}
    </div>
  )
}

function contestFacts(contest: ElectionContest, day: ElectionOccurrence | null, dayPending: boolean, i18n: I18n): readonly ElectionsFact[] {
  const place = contest.jurisdiction
  return [
    { label: <Trans>Funcție</Trans>, value: officeLabel(i18n, contest.office) },
    { label: <Trans>Tip de loc</Trans>, value: placeTypeLabel(i18n, place.placeType) },
    ...(place.placeType === 'uat'
      ? [
          // The territory reference may not hold a retired code: absent, never „not reported".
          { label: <Trans>Județ</Trans>, value: place.countyName, missing: <Trans>Nu e în date</Trans> },
          { label: <Trans>Cod SIRUTA</Trans>, value: place.sirutaCode, code: true, missing: <Trans>Nu e în date</Trans> },
        ]
      : []),
    {
      label: <Trans>Ziua de vot</Trans>,
      value: day ? (
        <>
          <time dateTime={day.ballotDate}>{formatIsoDate(i18n.locale, day.ballotDate)}</time>, {ballotDayKindLabel(i18n, day.kind)}
        </>
      ) : dayPending ? (
        <span className="text-muted-foreground">{t`Se încarcă`}</span>
      ) : (
        <span className="break-all font-mono text-xs">{contest.occurrenceKey}</span>
      ),
    },
    ...(day ? [{ label: <Trans>Tur</Trans>, value: roundLabel(i18n, day.round) }] : []),
    { label: <Trans>Stare</Trans>, value: contest.status === 'annulled' ? <Trans>Anulat</Trans> : <Trans>Ținut</Trans> },
    ...(contest.replacedBy !== null
      ? [
          {
            label: <Trans>Înlocuit de</Trans>,
            value: (
              <Link to="/alegeri/contest/$contestKey" params={{ contestKey: contest.replacedBy }} className="text-primary underline-offset-4 hover:underline">
                {contest.replacedBy}
              </Link>
            ),
            code: true,
          },
        ]
      : []),
    { label: <Trans>Cheia scrutinului</Trans>, value: contest.contestKey, code: true },
  ]
}

function ResultsBand({ contest, initialResult }: { readonly contest: ElectionContest; readonly initialResult?: ElectionResult | null }) {
  const { i18n } = useLingui()
  const query = useElectionResult(contest, initialResult)
  const result = query.data
  // Said only once the figures are read: a pending read has nothing to qualify yet.
  const notes = result === undefined ? [] : contestNotes(i18n, contest, result)

  return (
    <HomeBand id="rezultate" labelledBy="elections-results-title">
      <HubSectionHead
        titleId="elections-results-title"
        index={t`Rezultate`}
        title={<Trans>Voturile și prezența</Trans>}
        lede={<Trans>La nivel de partid, în locul scrutinului. Procentele sunt din voturile valabile ale aceluiași loc.</Trans>}
        aside={<CaveatsMarker notes={notes} />}
      />
      {/* A refresh that failed keeps the last answer, figures or none, under its notice. */}
      {result !== undefined && query.isRefetchError ? <ElectionsRefreshError className="mt-6" onRetry={() => void query.refetch()} /> : null}
      {result ? (
        <>
          <RaceLine race={result.race} />
          <VotesTable tallies={votesOf(result)} />
          <Mandates result={result} />
          <TurnoutFacts result={result} />
        </>
      ) : result === null ? (
        <p role="status" className="mt-6 border-y border-border/70 py-6 text-sm text-muted-foreground">
          <Trans>Locul scrutinului nu are cifre în date.</Trans>
        </p>
      ) : query.isError ? (
        <ElectionsLoadError onRetry={() => void query.refetch()}>
          <Trans>Cifrele scrutinului nu s-au încărcat.</Trans>
        </ElectionsLoadError>
      ) : (
        <HubPending rows={6} className="mt-6" />
      )}
    </HomeBand>
  )
}

/**
 * The gap between the first two by votes, or their tie, from the same read as
 * the votes below it; the API computes it only where the votes are
 * comparable, and gives no gap without a runner-up.
 */
function RaceLine({ race }: { readonly race: ElectionResult['race'] }) {
  const { i18n } = useLingui()
  if (!race) return null
  if (race.tied) {
    return (
      <p className="mt-6 text-sm text-foreground">
        <Trans>Egalitate la voturi între primii doi.</Trans>
      </p>
    )
  }
  if (race.marginVotes === null) return null
  const votes = formatCount(i18n.locale, race.marginVotes)
  const points = race.marginPoints === null ? null : formatPoints(i18n.locale, race.marginPoints)
  return (
    <p className="mt-6 text-sm text-foreground">
      {points === null ? (
        <Trans>Diferența dintre primii doi: {votes} voturi.</Trans>
      ) : (
        <Trans>
          Diferența dintre primii doi: {votes} voturi, {points} puncte procentuale.
        </Trans>
      )}
    </p>
  )
}

function SuspectMark({ tally }: { readonly tally: Pick<ElectionTally, 'status'> }) {
  if (tally.status !== 'SUSPECT') return null
  return (
    <span className="ml-2 text-xs text-amber-800 dark:text-amber-300">
      <Trans>defect cunoscut</Trans>
    </span>
  )
}

const CELL = 'px-1 py-2.5 align-baseline'

function VotesTable({ tallies }: { readonly tallies: readonly ElectionTally[] }) {
  const { i18n } = useLingui()
  if (tallies.length === 0) {
    return (
      <p className="mt-6 border-y border-border/70 py-6 text-sm text-muted-foreground">
        <Trans>Voturile nu sunt în date.</Trans>
      </p>
    )
  }
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[20rem] border-y border-border/70 text-sm">
        <caption className="sr-only">{t`Voturile, în ordinea din date`}</caption>
        <thead>
          <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
            <th scope="col" className={cn(CELL, 'font-medium')}>
              <Trans>Competitor</Trans>
            </th>
            <th scope="col" className={cn(CELL, 'text-right font-medium')}>
              <Trans>Voturi</Trans>
            </th>
            <th scope="col" className={cn(CELL, 'text-right font-medium')}>
              <Trans>Procent</Trans>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {tallies.map((tally, index) => (
            <tr key={index}>
              <th scope="row" className={cn(CELL, 'text-left font-normal', tally.competitor.label === null && 'text-muted-foreground')}>
                {competitorName(i18n, tally.competitor)}
                <SuspectMark tally={tally} />
              </th>
              <td className={cn(CELL, 'text-right tabular-nums')}>{formatCount(i18n.locale, tally.value)}</td>
              <td className={cn(CELL, 'text-right tabular-nums text-muted-foreground')}>
                {tally.share ? formatPercent(i18n.locale, tally.share.percent) : <span aria-label={t`Fără procent`}>–</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mandates per phase, each phase on its own: phases are never summed. Nothing when the data holds none (the notes say so). */
function Mandates({ result }: { readonly result: ElectionResult }) {
  const { i18n } = useLingui()
  const phases = mandatesByPhase(result)
  if (phases.length === 0) return null
  return (
    <div className="mt-6 space-y-3">
      {phases.map((group) => {
        const phase = allocationPhaseLabel(i18n, group.phase)
        return (
          <div key={group.phase} className="text-sm">
            <h3 className="text-xs font-semibold text-muted-foreground">
              <Trans>Mandate, {phase}</Trans>
            </h3>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {group.tallies.map((tally, index) => (
                <li key={index}>
                  <span className={cn(tally.competitor.label === null && 'text-muted-foreground')}>{competitorName(i18n, tally.competitor)}</span>{' '}
                  <span className="font-medium tabular-nums">{formatCount(i18n.locale, tally.value)}</span>
                  <SuspectMark tally={tally} />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function TurnoutFacts({ result }: { readonly result: ElectionResult }) {
  const { i18n } = useLingui()
  const figure = (measure: Parameters<typeof turnoutOf>[1]): ReactNode => {
    const found = turnoutOf(result, measure)
    if (!found) return null
    return (
      <>
        <span className="tabular-nums">{formatCount(i18n.locale, found.value)}</span>
        <SuspectMark tally={found} />
      </>
    )
  }
  const missing = <Trans>Nu e în date</Trans>
  const facts: readonly ElectionsFact[] = [
    { label: <Trans>Înscriși pe liste</Trans>, value: figure('registered'), missing },
    { label: <Trans>Au votat</Trans>, value: figure('voted'), missing },
    {
      label: <Trans>Prezență</Trans>,
      value: result.participation ? <span className="tabular-nums">{formatPercent(i18n.locale, result.participation.percent)}</span> : null,
      missing: <Trans>Nu se calculează din aceste cifre</Trans>,
    },
    { label: <Trans>Voturi valabile</Trans>, value: figure('valid'), missing },
    { label: <Trans>Voturi nule</Trans>, value: figure('invalid'), missing },
    { label: <Trans>Voturi albe</Trans>, value: figure('blank'), missing },
  ]
  return (
    <div className="mt-10">
      <h3 className="text-sm font-semibold text-foreground">
        <Trans>Prezența la vot</Trans>
      </h3>
      <ElectionsFactList className="mt-4" facts={facts} />
    </div>
  )
}
