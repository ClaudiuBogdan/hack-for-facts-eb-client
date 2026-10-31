import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { I18n } from '@lingui/core'
import { selectTriggerClassName } from '@/components/ui/select'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { CaveatsMarker } from '@/features/public-enterprises/components/hub/hub-parts'
import { HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import {
  ELECTION_PLACE_TYPES,
  parseElectionContestsSearch,
  type ElectionContest,
  type ElectionContestPage,
  type ElectionContestsSearch,
  type ElectionEvent,
  type ElectionOccurrence,
  type ElectionRace,
} from '@/schemas/elections-catalog'
import { useElectionContests, useElectionEvent } from '../hooks/use-elections-catalog'
import { ballotDaysOf, selectBallotDay } from '../lib/election-days'
import {
  CompetitorName,
  ElectionsBackLink,
  ElectionsCount,
  ElectionsFactList,
  ElectionsFilterForm,
  type ElectionsFact,
  ElectionsListBody,
  ElectionsLoadError,
  ElectionsPageHead,
  ElectionsRecordMissing,
  ElectionsRefreshError,
  FILTER_FIELD_CLASS,
  FILTER_LABEL_CLASS,
  ROW_CLASS,
  ROW_LINK_CLASS,
} from './catalog-parts'
import {
  ballotDayKindLabel,
  buildEventDocumentTitle,
  eventName,
  familyLabel,
  formatCount,
  formatIsoDate,
  formatPercent,
  officeLabel,
  placeName,
  placeTypeLabel,
} from './elections-catalog-text'

/**
 * `/alegeri/$electionKey` — one election event: its facts, its ballot days,
 * and the chosen day's contests, a page at a time in the API's order,
 * filtered by office, place type and county. The event and the day's
 * contests are two reads, the second once the first names the day: a list
 * that fails leaves the event standing, with its own retry.
 */

const BAND_ID = 'scrutine'

export function ElectionEditionPage({
  electionKey,
  search,
  onSearchChange,
  initialEvent,
  initialContests,
}: {
  readonly electionKey: string
  readonly search: ElectionContestsSearch
  readonly onSearchChange: (next: ElectionContestsSearch) => void
  readonly initialEvent?: ElectionEvent
  /** The server's first contests, with the day they were read for. */
  readonly initialContests?: { readonly occurrenceKey: string; readonly page: ElectionContestPage }
}) {
  const { i18n } = useLingui()
  const query = useElectionEvent(electionKey, initialEvent)
  const event = query.data
  useClientDocumentTitle(event ? buildEventDocumentTitle(i18n, { eventKey: electionKey, event }) : null)
  useWarmRouteCode('/alegeri/contest/$contestKey')

  const refreshError = query.isRefetchError ? <ElectionsRefreshError className="mt-6" onRetry={() => void query.refetch()} /> : null

  if (event === null) {
    return (
      <ElectionsRecordMissing title={<Trans>Alegerea nu a fost găsită</Trans>} notice={refreshError}>
        <Trans>Nu există o alegere cu rezultate publicate sub cheia {electionKey}.</Trans>
      </ElectionsRecordMissing>
    )
  }

  return (
    <div className="bg-background">
      <ElectionsPageHead
        back={
          <ElectionsBackLink>
            <Trans>Toate alegerile</Trans>
          </ElectionsBackLink>
        }
        caption={<Trans>Alegere</Trans>}
        // The key names the page while its read is pending or has failed.
        title={event ? eventName(i18n, event) : electionKey}
      >
        {event ? (
          <>
            {refreshError}
            <ElectionsFactList className="mt-8" facts={eventFacts(event, i18n)} />
          </>
        ) : query.isError ? (
          <ElectionsLoadError onRetry={() => void query.refetch()}>
            <Trans>Datele alegerii nu s-au încărcat.</Trans>
          </ElectionsLoadError>
        ) : (
          <HubPending rows={3} className="mt-8" />
        )}
      </ElectionsPageHead>

      {event ? (
        <ContestsBand electionKey={electionKey} event={event} search={search} onSearchChange={onSearchChange} initialContests={initialContests} />
      ) : null}
    </div>
  )
}

function eventFacts(event: ElectionEvent, i18n: I18n): readonly ElectionsFact[] {
  return [
    { label: <Trans>Tip</Trans>, value: familyLabel(i18n, event.family) },
    { label: <Trans>An</Trans>, value: String(event.year) },
    {
      label: <Trans>Cifre publicate pe platformă</Trans>,
      value: <time dateTime={event.publication.activatedAt}>{formatIsoDate(i18n.locale, event.publication.activatedAt)}</time>,
    },
    { label: <Trans>Cheia alegerii</Trans>, value: event.eventKey, code: true },
  ]
}

function ContestsBand({
  electionKey,
  event,
  search,
  onSearchChange,
  initialContests,
}: {
  readonly electionKey: string
  readonly event: ElectionEvent
  readonly search: ElectionContestsSearch
  readonly onSearchChange: (next: ElectionContestsSearch) => void
  readonly initialContests?: { readonly occurrenceKey: string; readonly page: ElectionContestPage }
}) {
  const day = selectBallotDay(event, search.data)
  const occurrenceKey = day?.occurrenceKey ?? null
  // The server's list seeds this day's query only.
  const seed = initialContests && initialContests.occurrenceKey === occurrenceKey ? initialContests.page : undefined
  const query = useElectionContests(occurrenceKey, search, seed)
  const data = query.data
  const page = search.pagina ?? 1
  const filtered = search.functie !== undefined || search.arie !== undefined || search.judet !== undefined
  const goToPage = (next: number) => {
    onSearchChange({ ...search, pagina: next > 1 ? next : undefined })
    document.getElementById(BAND_ID)?.scrollIntoView({ block: 'start' })
  }

  return (
    <HomeBand id={BAND_ID} labelledBy="elections-contests-title">
      <HubSectionHead
        titleId="elections-contests-title"
        index={t`Scrutine`}
        title={<Trans>Scrutinele alegerii</Trans>}
        lede={<Trans>Fiecare scrutin al zilei de vot alese: o funcție într-un loc, cu primul la voturi. Primul la voturi nu este un mandat.</Trans>}
        // A failed read, or a day the event does not have, has no count to hold a place for.
        aside={
          !day || (!data && query.isError) ? null : (
            <div className="flex items-center gap-3">
              <ElectionsCount pending={!data || query.isPlaceholderData}>{data ? contestCount(data.total) : null}</ElectionsCount>
              {data && !query.isPlaceholderData ? <CaveatsMarker notes={listNotes(data.items)} /> : null}
            </div>
          )
        }
      />

      <BallotDays electionKey={electionKey} event={event} selected={day} />

      {day ? (
        <>
          <ContestFilters
            key={JSON.stringify([day.occurrenceKey, search.functie ?? null, search.arie ?? null, search.judet ?? null])}
            day={day}
            search={search}
            onApply={(next) => onSearchChange(next)}
          />

          <ElectionsListBody
            query={query}
            page={page}
            label={t`Scrutinele zilei de vot`}
            loadingLabel={t`Se încarcă scrutinele`}
            loadError={<Trans>Lista scrutinelor nu s-a încărcat.</Trans>}
            emptyTitle={filtered ? t`Niciun scrutin al zilei nu corespunde filtrelor.` : t`Ziua de vot nu are scrutine în date.`}
            onPageChange={goToPage}
            renderItem={(contest) => <ContestRow key={contest.contestKey} contest={contest} />}
          />
        </>
      ) : (
        <p role="status" className="mt-6 border-y border-border/70 py-6 text-sm text-muted-foreground">
          {search.data !== undefined ? <Trans>Alegerea nu are o zi de vot la data {search.data}.</Trans> : <Trans>Alegerea nu are zile de vot în date.</Trans>}
        </p>
      )}
    </HomeBand>
  )
}

/** The API's exact total of the day's contests for the filters, never a sum of pages. */
function contestCount(total: number): string {
  return plural(total, { one: '# scrutin', few: '# scrutine', other: '# de scrutine' })
}

/** The event's ballot days as links: choosing one starts its list from the first page, without filters. */
function BallotDays({ electionKey, event, selected }: { readonly electionKey: string; readonly event: ElectionEvent; readonly selected: ElectionOccurrence | null }) {
  const { i18n } = useLingui()
  const days = ballotDaysOf(event)
  const first = days[0]
  return (
    <nav aria-label={t`Zilele de vot`} className="mt-8">
      <ul className="flex flex-wrap gap-2">
        {days.map((day) => {
          const current = day.occurrenceKey === selected?.occurrenceKey
          return (
            <li key={day.occurrenceKey}>
              <Link
                to="/alegeri/$electionKey"
                params={{ electionKey }}
                // The first day is the address without a date.
                search={{ data: day === first ? undefined : day.ballotDate, functie: undefined, arie: undefined, judet: undefined, pagina: undefined }}
                resetScroll={false}
                // Active only on an exact address: the first day's date-free link must not match a later day's.
                activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 flex-col justify-center rounded-md border px-3 py-1.5 text-left text-sm transition-colors sm:min-h-0',
                  current ? 'border-foreground bg-foreground text-background' : 'border-border text-foreground hover:bg-muted/60',
                )}
              >
                <time dateTime={day.ballotDate} className="font-medium">
                  {formatIsoDate(i18n.locale, day.ballotDate)}
                </time>
                <span className={cn('text-xs', current ? 'text-background/80' : 'text-muted-foreground')}>
                  {ballotDayKindLabel(i18n, day.kind)}
                  {day.status === 'annulled' ? (
                    <>
                      , <Trans>anulat</Trans>
                    </>
                  ) : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** The office, place type and county as one form; applying starts the list again from its first page. */
function ContestFilters({
  day,
  search,
  onApply,
}: {
  readonly day: ElectionOccurrence
  readonly search: ElectionContestsSearch
  readonly onApply: (next: ElectionContestsSearch) => void
}) {
  const { i18n } = useLingui()
  const [office, setOffice] = useState(search.functie ?? '')
  const [placeType, setPlaceType] = useState<string>(search.arie ?? '')
  const [county, setCounty] = useState(search.judet ?? '')
  // The day's own offices, with their counts; an office in the address the day does not list is offered too, and sent as it is.
  const offices: readonly { readonly office: string; readonly contests: number | null }[] =
    search.functie === undefined || day.offices.some((entry) => entry.office === search.functie)
      ? day.offices
      : [...day.offices, { office: search.functie, contests: null }]

  return (
    <ElectionsFilterForm
      label={t`Filtrează scrutinele`}
      active={search.functie !== undefined || search.arie !== undefined || search.judet !== undefined}
      onApply={() =>
        onApply(
          // Through the address's own parser; the day stays the one chosen.
          parseElectionContestsSearch({
            data: search.data,
            functie: office === '' ? undefined : office,
            arie: placeType === '' ? undefined : placeType,
            judet: county === '' ? undefined : county,
          }),
        )
      }
      onClear={() => onApply(parseElectionContestsSearch({ data: search.data }))}
    >
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-office" className={FILTER_LABEL_CLASS}>
          <Trans>Funcție</Trans>
        </label>
        <select
          id="elections-filter-office"
          value={office}
          onChange={(event) => setOffice(event.target.value)}
          className={cn(selectTriggerClassName, 'text-base md:text-sm')}
        >
          <option value="">{t`Oricare`}</option>
          {offices.map((entry) => (
            <option key={entry.office} value={entry.office}>
              {entry.contests === null ? officeLabel(i18n, entry.office) : `${officeLabel(i18n, entry.office)} (${formatCount(i18n.locale, String(entry.contests))})`}
            </option>
          ))}
        </select>
      </div>
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-place-type" className={FILTER_LABEL_CLASS}>
          <Trans>Tip de loc</Trans>
        </label>
        <select
          id="elections-filter-place-type"
          value={placeType}
          onChange={(event) => setPlaceType(event.target.value)}
          className={cn(selectTriggerClassName, 'text-base md:text-sm')}
        >
          <option value="">{t`Oricare`}</option>
          {ELECTION_PLACE_TYPES.map((value) => (
            <option key={value} value={value}>
              {placeTypeLabel(i18n, value)}
            </option>
          ))}
        </select>
      </div>
      <div className={FILTER_FIELD_CLASS}>
        <label htmlFor="elections-filter-county" className={FILTER_LABEL_CLASS}>
          <Trans>Județ</Trans>
        </label>
        <select
          id="elections-filter-county"
          value={county}
          onChange={(event) => setCounty(event.target.value)}
          className={cn(selectTriggerClassName, 'text-base md:text-sm')}
        >
          <option value="">{t`Oricare`}</option>
          {ROMANIA_COUNTIES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.nameRo}
            </option>
          ))}
        </select>
      </div>
    </ElectionsFilterForm>
  )
}

/** One contest: its place is the link; the office, the county and an annulment under it; the first by votes at the right. */
function ContestRow({ contest }: { readonly contest: ElectionContest }) {
  const { i18n } = useLingui()
  const place = contest.jurisdiction
  const details = [
    officeLabel(i18n, contest.office),
    // A county's own name is the link already.
    place.placeType === 'county' ? null : place.countyName,
    contest.status === 'annulled' ? t`anulat` : null,
    contest.replacedBy !== null ? t`înlocuit` : null,
  ].filter((value): value is string => value !== null)
  return (
    <li className={ROW_CLASS}>
      <div className="min-w-0">
        <Link to="/alegeri/contest/$contestKey" params={{ contestKey: contest.contestKey }} className={cn(ROW_LINK_CLASS, 'break-words')}>
          {placeName(i18n, place)}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">{details.join(' · ')}</p>
      </div>
      <RaceSummary contest={contest} />
    </li>
  )
}

/**
 * The leader by votes and their share, or the tie; never a winner. The API
 * computes a race only where the place's vote tallies count the same voters
 * and none is suspect, so a contest without one may still have votes: it is
 * said as not computed, never as no votes. A race's own qualifications
 * (partial, not final, flagged) are marked on its row.
 */
function RaceSummary({ contest }: { readonly contest: ElectionContest }) {
  const { i18n } = useLingui()
  const race = contest.race
  const className = 'shrink-0 text-xs text-muted-foreground sm:max-w-[45%] sm:text-right'
  if (race === null) {
    return (
      <span className={className}>
        <Trans>Primul la voturi: necalculat</Trans>
      </span>
    )
  }
  const marks = raceMarks(race)
  const mark = marks.length > 0 ? <span className="text-amber-800 dark:text-amber-300"> · {marks.join(', ')}</span> : null
  if (race.tied) {
    return (
      <span className={className}>
        <Trans>Egalitate la voturi între primii doi</Trans>
        {mark}
      </span>
    )
  }
  const share = race.leader.share ? formatPercent(i18n.locale, race.leader.share.percent) : null
  return (
    <span className={className}>
      <Trans>Primul la voturi:</Trans>{' '}
      <span className="text-foreground">
        <CompetitorName competitor={race.leader.competitor} />
      </span>
      {share ? <span className="tabular-nums">, {share}</span> : null}
      {mark}
    </span>
  )
}

/** What qualifies one race, in a word each; an unchecked race is said once for the list, behind its marker. */
function raceMarks(race: ElectionRace): readonly string[] {
  return [
    race.geographicCompleteness === 'partial' ? t`incomplet` : null,
    race.finality === 'provisional' ? t`provizoriu` : null,
    race.finality === 'unknown' ? t`finalitate necunoscută` : null,
    race.issues.length > 0 ? t`cu semnalări` : null,
  ].filter((value): value is string => value !== null)
}

/** The notes behind the list's one marker, said of the rows on screen. */
function listNotes(contests: readonly ElectionContest[]): readonly string[] {
  return [
    contests.some((contest) => contest.race?.status === 'UNCHECKED')
      ? t`Unele clasamente nu au un total publicat separat cu care să fie comparate.`
      : null,
    contests.some((contest) => contest.race === null)
      ? t`„Necalculat": locul nu are voturi în date, sau voturile lui nu numără aceiași votanți ori au un defect cunoscut.`
      : null,
    contests.some((contest) => contest.race !== null && raceMarks(contest.race).length > 0)
      ? t`Un clasament incomplet, provizoriu sau cu semnalări e marcat pe rândul lui; detaliile sunt pe pagina scrutinului.`
      : null,
  ].filter((value): value is string => value !== null)
}
