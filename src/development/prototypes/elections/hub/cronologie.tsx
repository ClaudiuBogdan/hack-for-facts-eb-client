import { type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CalendarElection } from '../shared/calendar'
import { eventShort, eventTitle, familyPlural } from '../shared/labels'
import { FAMILIES, isDisputedEvent, type Family } from '../shared/model'
import { BAND_GRID, CatalogFigures, ElectionsHero, ElectionsSearch, ElectionsSourceLine, HeroPanel, PROTOTYPE_HREF, Rows, sectionIndex, useFormat, type Row } from '../shared/parts'
import { DATA, calendarRows, eventsOutsideCalendar, timelineColumns, type CellState, type TimelineColumn } from './model'
import { EventTitle, EventsBand, HubShell, Lede, hrefLink, hubNotes, shortcuts } from './parts'

/**
 * `cronologie` — the front door as a timeline: every election by year and
 * type, the editions that describe each, and the gaps between our calendar
 * and the data. The calendar is Transparenta.eu's (shared/calendar.ts), said
 * so on the page, until the API serves coverage (ask 12).
 */

const RECENT_ROWS = 6

function calendarNote(): ReactNode {
  return (
    <Trans key="calendar">
      Calendarul alegerilor (ce alegeri au avut loc, din 1990) e ținut de Transparenta.eu, nu vine din API, și e de confirmat cu sursele înainte de publicare. O alegere care
      lipsește „nu e în date"; nu înseamnă că nu a avut loc.
    </Trans>
  )
}

/** „Alegerile prezidențiale din 2024 (anulate)": the calendar's title for an election, instance said; `short` for a narrow panel. */
function calendarTitle(entry: CalendarElection, short = false): string {
  const title = short ? eventShort({ family: entry.family, year: entry.year, instance: null }) : eventTitle({ family: entry.family, year: entry.year, instance: null })
  switch (entry.instance) {
    case 'annulled':
      return t`${title} (anulate)`
    case 'rerun':
      return t`${title} (reluate)`
    default:
      return entry.count && entry.count > 1 ? t`${title} (${entry.count} în acel an)` : title
  }
}

/** The short family heads a phone's five columns can hold. */
function familyShort(family: Family): string {
  switch (family) {
    case 'local':
      return t`Loc.`
    case 'parliamentary':
      return t`Parl.`
    case 'presidential':
      return t`Prez.`
    case 'european':
      return t`Euro.`
    case 'referendum':
      return t`Ref.`
  }
}

function cellTitle(state: CellState, editions: number): string {
  switch (state) {
    case 'data':
      return editions === 1 ? t`în date: 1 ediție` : t`în date: ${editions} ediții`
    case 'outside':
      return t`în date (${editions} ediții), în afara calendarului nostru`
    case 'partial':
      return t`în date doar în parte (${editions} ediții)`
    case 'missing':
      return t`în calendarul nostru, nu în date`
    case 'none':
      return ''
  }
}

const CELL = 'flex h-9 min-w-9 items-center justify-center text-sm tabular-nums'

function Cell({ cell }: { readonly cell: TimelineColumn['cells'][number] }) {
  const editions = cell.events.reduce((sum, event) => sum + event.editions.length, 0)
  const event = cell.events[0]
  const title = cellTitle(cell.state, editions)
  if (cell.state === 'none') return <span className={CELL} aria-hidden="true" />
  if (cell.state === 'missing') {
    return (
      <span className={cn(CELL, 'border border-dashed border-border text-muted-foreground/70')} aria-label={title} title={title}>
        ·
      </span>
    )
  }
  if (!event) return null
  return (
    <a
      href={PROTOTYPE_HREF.election(event.key)}
      className={cn(
        CELL,
        'bg-primary/10 font-semibold text-foreground transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      aria-label={`${eventTitle(event)}: ${title}`}
      title={title}
    >
      {editions}
      {cell.state !== 'data' ? (
        <sup className="ml-px text-[0.6em] text-amber-700 dark:text-amber-400" aria-hidden="true">
          ✱
        </sup>
      ) : null}
    </a>
  )
}

/** Types across, years down (phone and tablet); years across, types down (desktop). Both server-rendered; one is shown. */
function TimelineGrid({ columns }: { readonly columns: readonly TimelineColumn[] }) {
  const caption = t`Alegerile pe ani și tipuri; în celulă, numărul de ediții de date`
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 pr-3 text-left font-normal" />
              {columns.map((column) => (
                <th key={column.year} scope="col" className="px-px py-1 text-center font-normal">
                  <MonoLabel className="tabular-nums text-muted-foreground">{String(column.year).slice(2)}</MonoLabel>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FAMILIES.map((family, rowIndex) => (
              <tr key={family}>
                <th scope="row" className="whitespace-nowrap py-px pr-3 text-left text-sm font-medium text-foreground">
                  {familyPlural(family)}
                </th>
                {columns.map((column) => (
                  <td key={column.year} className="p-px">
                    <Cell cell={column.cells[rowIndex]!} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1 flex justify-between" aria-hidden="true">
          <MonoLabel className="tabular-nums text-muted-foreground">{columns[0]?.year}</MonoLabel>
          <MonoLabel className="tabular-nums text-muted-foreground">{columns[columns.length - 1]?.year}</MonoLabel>
        </div>
      </div>
      <table className="w-full border-collapse lg:hidden">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className="py-1 pr-2 text-left font-normal" />
            {FAMILIES.map((family) => (
              <th key={family} scope="col" className="px-px py-1 text-center font-normal">
                <MonoLabel className="text-muted-foreground">
                  <abbr title={familyPlural(family)} className="no-underline">
                    {familyShort(family)}
                  </abbr>
                </MonoLabel>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.year}>
              <th scope="row" className="py-px pr-2 text-left text-sm font-medium tabular-nums text-foreground">
                {column.year}
              </th>
              {column.cells.map((cell) => (
                <td key={cell.family} className="p-px">
                  <Cell cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Legend() {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <li className="flex items-center gap-2">
        <span className="inline-flex h-5 w-6 items-center justify-center bg-primary/10 text-[0.65rem] font-semibold text-foreground" aria-hidden="true">
          2
        </span>
        <Trans>în date; cifra e numărul de ediții</Trans>
      </li>
      <li className="flex items-center gap-2">
        <span className="inline-flex h-5 w-6 items-center justify-center border border-dashed border-border" aria-hidden="true">
          ·
        </span>
        <Trans>în calendarul nostru, nu în date</Trans>
      </li>
      <li className="flex items-center gap-2">
        <span className="text-amber-700 dark:text-amber-400" aria-hidden="true">
          ✱
        </span>
        <Trans>în date, dar în afara calendarului nostru sau doar în parte</Trans>
      </li>
    </ul>
  )
}

function TimelineBand({ index }: { readonly index: string }) {
  const columns = timelineColumns(DATA.events)
  const rows = calendarRows(DATA.events)
  const expected = rows.reduce((sum, row) => sum + (row.count ?? 1), 0)
  const loaded = rows.reduce((sum, row) => sum + Math.min(row.events.length, row.count ?? 1), 0)
  const outside = eventsOutsideCalendar(DATA.events).length
  return (
    <HomeBand id="cronologie" labelledBy="elections-hub-timeline-title">
      <HubSectionHead
        titleId="elections-hub-timeline-title"
        index={index}
        title={<Trans>Alegerile, an de an</Trans>}
        lede={
          <Trans>
            Din cele {expected} de alegeri din calendarul nostru, {loaded} sunt în date și {expected - loaded} nu sunt; alte {outside} grupări din date nu sunt în calendar. O
            celulă deschide alegerea.
          </Trans>
        }
      />
      <div className="mt-10" data-reveal>
        <TimelineGrid columns={columns} />
        <Legend />
      </div>
    </HomeBand>
  )
}

function GapsBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const missing = calendarRows(DATA.events).filter((row) => row.events.length < (row.count ?? 1))
  const outside = eventsOutsideCalendar(DATA.events)
  const missingRows: readonly Row[] = missing.map((row) => ({
    key: `${row.family}-${String(row.year)}-${row.instance ?? ''}`,
    label: calendarTitle(row),
    meta:
      row.count && row.count > 1 ? (
        <Trans>
          {row.events.length} din {row.count} în date
        </Trans>
      ) : undefined,
    value: row.events.length > 0 ? <Trans>{(row.count ?? 1) - row.events.length} lipsă</Trans> : <Trans>nu e în date</Trans>,
    muted: true,
  }))
  const outsideRows: readonly Row[] = outside.map((event) => ({
    key: event.key,
    label: <EventTitle event={event} />,
    meta: isDisputedEvent(event) ? (
      <Trans>după auditul datelor, rezultate din 2016 (eticheta sursei păstrată)</Trans>
    ) : event.instance === 'partial' ? (
      <Trans>parțiale: doar primarul general al Bucureștiului</Trans>
    ) : (
      <Trans>în afara calendarului nostru</Trans>
    ),
    value: event.editions.length === 1 ? t`1 ediție` : t`${format.n(event.editions.length)} ediții`,
    link: hrefLink(PROTOTYPE_HREF.election(event.key)),
  }))
  return (
    <HomeBand id="lipsuri" labelledBy="elections-hub-gaps-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-gaps-title"
            index={index}
            title={<Trans>Ce nu e în date</Trans>}
            lede={
              <Trans>
                {missing.length} alegeri din calendarul Transparenta.eu lipsesc din date, în tot sau în parte, iar {outside.length} grupări din date nu sunt în calendar. Calendarul
                e al nostru, nu al API-ului.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>În calendarul nostru, nu în date</Trans>
          </MonoLabel>
          <Rows className="mt-3" rows={missingRows} />
          <MonoLabel className="mt-8 block text-muted-foreground">
            <Trans>În date, în afara calendarului nostru</Trans>
          </MonoLabel>
          <Rows className="mt-3" rows={outsideRows} />
        </div>
      </div>
    </HomeBand>
  )
}

/** The most recent elections of the calendar, the ones the data lacks said as such. */
function RecentPanel() {
  const format = useFormat()
  const rows = calendarRows(DATA.events).slice(0, RECENT_ROWS)
  return (
    <HeroPanel
      titleId="elections-hub-recent-title"
      title={<Trans>Cele mai recente alegeri</Trans>}
      footer={<Trans>Calendarul alegerilor e ținut de Transparenta.eu, nu de API.</Trans>}
    >
      <Rows
        className="mt-4"
        rows={rows.map((row): Row => {
          const event = row.events[0]
          const editions = row.events.reduce((sum, item) => sum + item.editions.length, 0)
          return {
            key: `${row.family}-${String(row.year)}-${row.instance ?? ''}`,
            label: calendarTitle(row, true),
            meta: event ? <span className="font-mono">{row.events.flatMap((item) => item.editions.map((edition) => edition.key)).join(' · ')}</span> : undefined,
            value: event ? (editions === 1 ? t`1 ediție` : t`${format.n(editions)} ediții`) : t`nu e în date`,
            muted: !event,
            link: event ? hrefLink(PROTOTYPE_HREF.election(event.key)) : undefined,
          }
        })}
      />
    </HeroPanel>
  )
}

export function HubCronologie() {
  const sections = [
    { id: 'cronologie', label: t`An de an` },
    { id: 'lipsuri', label: t`Ce lipsește` },
    { id: 'alegeri', label: t`Pe alegeri` },
  ]
  return (
    <HubShell>
      <ElectionsHero
        idPrefix="elections-hub-cronologie"
        headline={
          <Trans>
            Alegerile,
            <br />
            an de an
          </Trans>
        }
        lede={<Lede after={<Trans>Pe ani și pe tipuri, cu golurile spuse.</Trans>} />}
        search={<ElectionsSearch events={DATA.events} />}
        shortcuts={shortcuts([{ key: 'timeline', label: <Trans>An de an</Trans>, href: '#cronologie' }])}
        panel={<RecentPanel />}
        source={<ElectionsSourceLine readAt={DATA.readAt} notes={hubNotes([calendarNote()])} />}
      />
      <HomeSectionNav title={t`Alegeri`} sections={sections} />
      <CatalogFigures data={DATA} links={{ events: 'cronologie', editions: 'alegeri', rows: 'alegeri', places: 'alegeri' }} />
      <TimelineBand index={sectionIndex(sections, 'cronologie')} />
      <GapsBand index={sectionIndex(sections, 'lipsuri')} />
      <EventsBand id="alegeri" index={sectionIndex(sections, 'alegeri')} titleId="elections-hub-events-title" />
    </HubShell>
  )
}
