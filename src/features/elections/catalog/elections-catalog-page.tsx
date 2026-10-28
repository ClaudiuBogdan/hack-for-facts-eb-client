import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
import type { ElectionEvent, ElectionEventPage, ElectionsCatalogSearch } from '@/schemas/elections-catalog'
import { useElectionEvents } from '../hooks/use-elections-catalog'
import { ballotDaysOf } from '../lib/election-days'
import { ElectionsCount, ElectionsListBody, ElectionsPageHead, ROW_CLASS, ROW_LINK_CLASS } from './catalog-parts'
import { ballotDayKindLabel, eventName, formatIsoDate } from './elections-catalog-text'

/**
 * `/alegeri` — the elections with published figures, one row per event, in
 * the API's order (by key), each with its ballot days. The API filters
 * events by nothing, so the page offers no filter; the total is the API's own.
 */

const BAND_ID = 'alegeri'

export function ElectionsCatalogPage({
  search,
  onSearchChange,
  initialPage,
}: {
  readonly search: ElectionsCatalogSearch
  readonly onSearchChange: (next: ElectionsCatalogSearch) => void
  readonly initialPage?: ElectionEventPage
}) {
  const query = useElectionEvents(search, initialPage)
  useWarmRouteCode('/alegeri/$electionKey')
  const data = query.data
  const page = search.pagina ?? 1
  const goToPage = (next: number) => {
    onSearchChange({ ...search, pagina: next > 1 ? next : undefined })
    document.getElementById(BAND_ID)?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="bg-background">
      <ElectionsPageHead caption={<Trans>Alegeri / România</Trans>} title={<Trans>Alegeri</Trans>}>
        <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
          <Trans>Alegerile cu rezultate publicate pe platformă, la nivel de partid: fiecare cu zilele ei de vot și scrutinele lor.</Trans>
        </p>
      </ElectionsPageHead>

      <HomeBand id={BAND_ID} labelledBy="elections-catalog-title">
        <HubSectionHead
          titleId="elections-catalog-title"
          index={t`Alegeri`}
          title={<Trans>Alegerile din date</Trans>}
          lede={<Trans>Fiecare alegere cu zilele ei de vot. Un balotaj sau un vot repetat este o zi de vot a aceleiași alegeri.</Trans>}
          // A failed read has no count to hold a place for: the list says it failed.
          aside={
            !data && query.isError ? null : (
              <ElectionsCount pending={!data || query.isPlaceholderData}>{data ? eventCount(data.total) : null}</ElectionsCount>
            )
          }
        />

        <ElectionsListBody
          query={query}
          page={page}
          label={t`Alegeri`}
          loadingLabel={t`Se încarcă alegerile`}
          loadError={<Trans>Lista alegerilor nu s-a încărcat.</Trans>}
          emptyTitle={t`Nu există încă alegeri cu rezultate publicate.`}
          onPageChange={goToPage}
          renderItem={(event) => <EventRow key={event.eventKey} event={event} />}
        />
      </HomeBand>
    </div>
  )
}

/** The API's exact total of events, never a sum of pages. */
function eventCount(total: number): string {
  return plural(total, { one: '# alegere', few: '# alegeri', other: '# de alegeri' })
}

/** One event: its name is the link; its ballot days under it, each with its kind and, when annulled, said so. */
function EventRow({ event }: { readonly event: ElectionEvent }) {
  const { i18n } = useLingui()
  return (
    <li className={ROW_CLASS}>
      <div className="min-w-0">
        <Link
          to="/alegeri/$electionKey"
          params={{ electionKey: event.eventKey }}
          search={{ data: undefined, functie: undefined, arie: undefined, judet: undefined, pagina: undefined }}
          className={cn(ROW_LINK_CLASS, 'break-words')}
        >
          {eventName(i18n, event)}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {ballotDaysOf(event).map((day, index) => (
            <Fragment key={day.occurrenceKey}>
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <span>
                <time dateTime={day.ballotDate}>{formatIsoDate(i18n.locale, day.ballotDate)}</time>, {ballotDayKindLabel(i18n, day.kind)}
                {day.status === 'annulled' ? (
                  <>
                    , <Trans>anulat</Trans>
                  </>
                ) : null}
              </span>
            </Fragment>
          ))}
        </p>
      </div>
      {/* The key is what a reader copies; above the row's link so it stays selectable. */}
      <span className="relative z-10 shrink-0 select-text break-all font-mono text-xs text-muted-foreground sm:text-right">{event.eventKey}</span>
    </li>
  )
}
