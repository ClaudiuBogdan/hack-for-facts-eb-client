import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeBand, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { eventTitle, familyPlural } from '../shared/labels'
import { catalogFacts, isDisputedEvent, type ElectionEvent } from '../shared/model'
import { BAND_GRID, PROTOTYPE_HREF, Rows, commonNotes, useFormat, type Row } from '../shared/parts'
import { DATA, FAMILY_CHOICES, RESULTS_SERVED, eventsOfFamily, latestEvent, type FamilyChoice } from './model'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/** The page's root: the reveal and count-up drivers the hubs share, stopped on unmount. */
export function HubShell({ children }: { readonly children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  useEffect(() => () => stopCounting(), [])
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />
      <SmearFilters />
      {children}
    </div>
  )
}

/** The head sentence (G2), computed from the catalog; a variant may add one phrase of its own after it. */
export function Lede({ after }: { readonly after?: ReactNode }) {
  const facts = catalogFacts(DATA)
  return (
    <>
      <Trans>
        Alegerile din România din {facts.firstYear} până în {facts.lastYear}, așa cum le-au publicat BEC, AEP și ROAEP: {facts.events} alegeri în {facts.editions} ediții de date.
      </Trans>
      {RESULTS_SERVED ? null : (
        <>
          {' '}
          <Trans>Rezultatele nu sunt încă publicate.</Trans>
        </>
      )}
      {after ? <> {after}</> : null}
    </>
  )
}

/** A plain link that wraps a row or a figure. */
export function hrefLink(href: string) {
  return function HrefLink(body: ReactNode, className: string) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    )
  }
}

/** The shortcuts every variant offers, with the variant's own first. */
export function shortcuts(own: readonly { readonly key: string; readonly label: ReactNode; readonly href: string }[]) {
  const latest = latestEvent(DATA.events)
  return [
    ...own,
    ...(latest ? [{ key: 'latest', label: eventTitle(latest), href: PROTOTYPE_HREF.election(latest.key) }] : []),
    { key: 'catalog', label: <Trans>Catalogul edițiilor</Trans>, href: '/alegeri' },
  ]
}

/** The notes of every variant, then its own (G5). */
export function hubNotes(own: readonly ReactNode[] = []): readonly ReactNode[] {
  return [...commonNotes(), ...own]
}

export function familyChoiceLabel(choice: FamilyChoice): string {
  return choice === 'toate' ? t`Toate` : familyPlural(choice)
}

/** The toggle over the families, „Toate" first. */
export function FamilyToggle({ value, onChange, className }: { readonly value: FamilyChoice; readonly onChange: (next: FamilyChoice) => void; readonly className?: string }) {
  return (
    <IndicatorToggle
      label={t`Tipul alegerilor`}
      options={FAMILY_CHOICES.map((key) => ({ key, label: familyChoiceLabel(key) }))}
      value={value}
      onChange={onChange}
      className={cn('grid-flow-row grid-cols-3', className)}
    />
  )
}

const EVENTS_SHOWN = 10

/** An event's title; the „2014" local event (E1) quoted and marked, so it never reads as an election of its own. */
export function EventTitle({ event }: { readonly event: ElectionEvent }) {
  if (!isDisputedEvent(event)) return <>{eventTitle(event)}</>
  return (
    <>
      {eventTitle(event).replace(String(event.year), `„${String(event.year)}”`)}
      <span className="ml-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true">
        ✱
      </span>
      <span className="sr-only"> {t`(date din 2016, numărate cu alegerile locale din 2016)`}</span>
    </>
  )
}

/** One event as a row: its title, its editions' keys as quiet mono, the number of editions at the right. */
export function eventRow(event: ElectionEvent, format: ReturnType<typeof useFormat>): Row {
  const n = event.editions.length
  return {
    key: event.key,
    label: <EventTitle event={event} />,
    meta: isDisputedEvent(event) ? (
      <>
        <Trans>date din 2016, după auditul datelor; numărate cu 2016</Trans> · <span className="font-mono">{event.editions.map((edition) => edition.key).join(' · ')}</span>
      </>
    ) : (
      <span className="font-mono">{event.editions.map((edition) => edition.key).join(' · ')}</span>
    ),
    value: n === 1 ? t`1 ediție` : t`${format.n(n)} ediții`,
    link: hrefLink(PROTOTYPE_HREF.election(event.key)),
  }
}

/**
 * „Pe alegeri": every event the platform groups, newest first, by family.
 * Each row opens the election page; the editions are named, never added.
 */
export function EventsBand({ id, index, titleId }: { readonly id: string; readonly index: string; readonly titleId: string }) {
  const [family, setFamily] = useState<FamilyChoice>('toate')
  const [open, setOpen] = useState(false)
  const format = useFormat()
  const facts = catalogFacts(DATA)
  const events = eventsOfFamily(DATA.events, family)
  const shown = open ? events : events.slice(0, EVENTS_SHOWN)
  const multi = events.filter((event) => event.editions.length > 1).length
  const folded = events.filter(isDisputedEvent).length
  return (
    <HomeBand id={id} labelledBy={titleId}>
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId={titleId}
            index={index}
            title={<Trans>Alegerile din date</Trans>}
            lede={
              <>
                <Trans>
                  {facts.events} alegeri, din {facts.firstYear} până în {facts.lastYear}; {facts.multiEdition} dintre ele au mai multe ediții de date, care se citesc una lângă
                  alta, nu adunate.
                </Trans>
                {facts.folded > 0 ? (
                  <>
                    {' '}
                    <Trans>Gruparea „locale 2014” (✱) ține datele din 2016 și nu e o alegere în plus.</Trans>
                  </>
                ) : null}
              </>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <FamilyToggle
            value={family}
            onChange={(next) => {
              setFamily(next)
              setOpen(false)
            }}
          />
          <Rows key={family} className="mt-4" rows={shown.map((event) => eventRow(event, format))} />
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">
            {events.length > shown.length ? (
              <Trans>
                primele {shown.length} din {events.length} grupări; {multi} cu mai multe ediții
              </Trans>
            ) : (
              <Trans>
                toate cele {events.length} grupări; {multi} cu mai multe ediții
              </Trans>
            )}
            {folded > 0 ? (
              <>
                {' · '}
                <Trans>✱ date din 2016, nu o alegere în plus</Trans>
              </>
            ) : null}
          </p>
          {events.length > EVENTS_SHOWN ? (
            <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
              {open ? <Trans>Arată mai puține</Trans> : <Trans>Toate cele {events.length} grupări</Trans>}
            </button>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}

/** A short table head cell in the hubs' mono. */
export function Th({ children, className, align = 'left' }: { readonly children: ReactNode; readonly className?: string; readonly align?: 'left' | 'right' | 'center' }) {
  return (
    <th scope="col" className={cn('py-2 font-normal', align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left', className)}>
      <MonoLabel className="text-muted-foreground">{children}</MonoLabel>
    </th>
  )
}

/** A value the data does not hold: a dash, said in words for a reader who cannot see it. */
export function Dash({ label }: { readonly label: string }) {
  return (
    <span className="text-muted-foreground/60" aria-label={label}>
      —
    </span>
  )
}
