import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { NotesMarker, ShareIcon } from '@/features/national-budget/analytics/components/analytics-parts'
import { ROMANIA_COUNTIES, countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { ELECTIONS_ANALYTICS_DEFAULT_VIEW, type ElectionsAnalyticsSearch, type ElectionsAnalyticsView } from '@/schemas/elections-search'
import { useElectionEvents } from '../../hooks/use-elections-catalog'
import { useLocalMandates } from '../hooks/use-elections-analytics'
import { sectionId, viewSpec, viewSpecs, type SectionSpec } from '../lib/analytics-views'
import type { LocalMandates } from '../lib/mandates'
import { useAnalyticsFormat } from '../lib/analytics-format'
import { SectionPending } from './analytics-charts'
import { mandateNotes } from '../lib/mandate-notes'
import { MandateFigures, MandateSection, type SectionLink } from './mandate-view'

/**
 * `/alegeri/analize` in the national budget's analysis head (owner,
 * 2026-11-28): the question as the headline over the lattice, a row of
 * controls under it with the one notes marker, a pinned bar of the five
 * views, and each view's sections stacked under a jump row. Every section is
 * listed from the first release; one not drawn yet says what it will draw.
 * The address holds the view, the section and the county.
 */

const PHRASE = 'cursor-pointer underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
const SEP = (
  <span aria-hidden="true" className="mx-2 text-muted-foreground/50">
    /
  </span>
)
/** The views that read a county: the others answer for the country, and the head says nothing of one. */
const COUNTY_VIEWS: readonly ElectionsAnalyticsView[] = ['mandate']
const COUNTIES = [...ROMANIA_COUNTIES].sort((a, b) => a.nameRo.localeCompare(b.nameRo, 'ro'))

/** The way site-wide keys travel: the language only. */
const siteKeys = (previous: Record<string, unknown>) => (typeof previous.lang === 'string' ? { lang: previous.lang } : {})

/** The section a reader is in: a line a quarter of the way down the screen (the national budget's rule). */
function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join(' ')
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setActive((was) => (entry.isIntersecting ? entry.target.id : was === entry.target.id ? null : was))
      },
      { rootMargin: '-25% 0px -74% 0px' },
    )
    for (const id of key.split(' ')) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}

const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ block: 'start' })

/** The day the local elections' figures were published on the platform: the sources line's only date. */
function SourcesLine() {
  const events = useElectionEvents({})
  const { locale } = useAnalyticsFormat()
  const at = events.data?.items.find((event) => event.eventKey === 'ro:local:2024')?.publication?.activatedAt
  // In the reader's language, dated in Romania's zone: the same on the server and in any browser.
  const day = at ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' }).format(new Date(at)) : null
  return <p className="text-sm text-muted-foreground">{day ? t`Surse: rezultatele oficiale, publicate în platformă pe ${day}.` : t`Surse: rezultatele oficiale.`}</p>
}

function CountyPicker({ id, judet, onChange }: { readonly id: string; readonly judet: string | undefined; readonly onChange: (code: string | undefined) => void }) {
  return (
    <select
      id={id}
      value={judet ?? ''}
      onChange={(event) => onChange(event.target.value || undefined)}
      className="h-11 rounded-md border bg-background px-2 text-base text-foreground sm:h-9 sm:text-sm"
      aria-label={t`Județul`}
    >
      <option value="">{t`Toată țara`}</option>
      {COUNTIES.map((county) => (
        <option key={county.code} value={county.code}>
          {county.nameRo}
        </option>
      ))}
    </select>
  )
}

function Head({
  view,
  judet,
  notes,
  onJudet,
}: {
  readonly view: ElectionsAnalyticsView
  readonly judet: string | undefined
  readonly notes: { readonly alerts: readonly string[]; readonly facts: readonly string[] } | null
  readonly onJudet: (code: string | undefined) => void
}) {
  const pickerId = useId()
  const spec = viewSpec(view)
  const byCounty = COUNTY_VIEWS.includes(view)
  return (
    <section className="relative border-b" aria-labelledby="alegeri-analize-titlu">
      <TwoLayerLattice idPrefix="alegeri-analize" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <nav aria-label={t`Ești aici`} className="text-sm text-muted-foreground">
          <Link to="/" search={siteKeys as never} className="-my-3 inline-block py-3 transition-colors hover:text-foreground">
            {t`Acasă`}
          </Link>
          {SEP}
          <Link to="/alegeri" search={siteKeys as never} className="-my-3 inline-block py-3 transition-colors hover:text-foreground">
            {t`Alegeri`}
          </Link>
          {SEP}
          <span className="text-foreground">{t`Analize`}</span>
        </nav>
        <h1 id="alegeri-analize-titlu" className="mt-6 max-w-5xl text-[clamp(2rem,6vw,3.75rem)] font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8">
          {spec.question}
          {byCounty ? (
            <>
              ,{' '}
              <label htmlFor={pickerId} className={PHRASE}>
                {judet === 'B' ? t`în București` : judet ? t`în județul ${countyNameRo(judet) ?? judet}` : t`în toată țara`}
              </label>
            </>
          ) : null}
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          {byCounty ? <CountyPicker id={pickerId} judet={judet} onChange={onJudet} /> : null}
          <ShareIcon className={cn(LINK, 'size-11 justify-center sm:size-auto')} />
          {notes ? <NotesMarker alerts={notes.alerts} facts={notes.facts} /> : null}
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

function Bar({
  view,
  search,
  active,
  onView,
  onSection,
}: {
  readonly view: ElectionsAnalyticsView
  readonly search: ElectionsAnalyticsSearch
  readonly active: string | null
  readonly onView: (view: ElectionsAnalyticsView) => void
  readonly onSection: (section: string) => void
}) {
  const spec = viewSpec(view)
  // Under the sidebar (z-40), which widens over the page on hover.
  return (
    <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <nav aria-label={t`Ce citești`}>
        <RuledFrame className="py-0">
          <ol className="grid grid-cols-5 sm:flex sm:gap-6">
            {viewSpecs().map((item) => {
              const current = item.key === view
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    aria-pressed={current}
                    onClick={() => onView(item.key)}
                    className={cn(
                      'flex h-full min-h-11 w-full flex-col items-center gap-1 border-b-2 py-2 text-center text-[0.6875rem] leading-tight transition-colors sm:w-auto sm:flex-row sm:gap-2 sm:py-0 sm:text-sm',
                      current ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <item.icon className={cn('size-4 shrink-0', current && 'text-primary')} aria-hidden="true" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </RuledFrame>
      </nav>
      <nav aria-label={t`Secțiunile vederii`} className="border-t">
        <RuledFrame className="py-0">
          <ol className="-mx-2.5 flex overflow-x-auto">
            {spec.sections.map((section) => {
              const id = sectionId(view, section.key)
              return (
                <li key={section.key} className="shrink-0">
                  <SectionLinkTo
                    search={search}
                    section={section.key}
                    onSection={onSection}
                    current={active === id}
                    className={cn(
                      'relative inline-flex h-10 items-center gap-1.5 px-2.5 text-sm transition-colors hover:text-foreground',
                      'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0',
                      active === id ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                    )}
                  >
                    {section.label}
                  </SectionLinkTo>
                </li>
              )
            })}
          </ol>
        </RuledFrame>
      </nav>
    </div>
  )
}

/**
 * A link to a section of the current view: the address with every page key and `dupa` set to it, so the link
 * shared or opened in a new tab lands on the section; the page scrolls by `dupa` alone (no hash beside it).
 */
function SectionLinkTo({
  search,
  section,
  onSection,
  current = false,
  className,
  children,
}: {
  readonly search: ElectionsAnalyticsSearch
  readonly section: string
  readonly onSection: (section: string) => void
  readonly current?: boolean
  readonly className: string
  readonly children: ReactNode
}) {
  return (
    <Link
      to="/alegeri/analize"
      search={((previous: Record<string, unknown>) => ({ ...previous, tip: search.tip, judet: search.judet, dupa: section })) as never}
      replace
      resetScroll={false}
      onClick={() => onSection(section)}
      aria-current={current ? 'location' : undefined}
      className={className}
    >
      {children}
    </Link>
  )
}

function SectionBody({
  view,
  section,
  judet,
  initial,
  onJudet,
}: {
  readonly view: ElectionsAnalyticsView
  readonly section: SectionSpec
  readonly judet: string | undefined
  readonly initial: LocalMandates | undefined
  readonly onJudet: (code: string | undefined) => void
}) {
  if (section.state !== 'drawn') return <SectionPending state={section.state}>{section.note}</SectionPending>
  const body: ReactNode = view === 'mandate' ? <MandateSection section={section.key} judet={judet} initial={initial} onJudet={onJudet} /> : null
  return (
    <>
      {body}
      {section.note ? <p className="mt-4 text-sm text-muted-foreground">{section.note}</p> : null}
    </>
  )
}

export function ElectionsAnalyticsPage({
  search,
  onSearchChange,
  initialMandates,
}: {
  readonly search: ElectionsAnalyticsSearch
  readonly onSearchChange: (next: ElectionsAnalyticsSearch) => void
  readonly initialMandates?: LocalMandates
}) {
  const view = search.tip ?? ELECTIONS_ANALYTICS_DEFAULT_VIEW
  const judet = COUNTY_VIEWS.includes(view) ? search.judet : undefined
  const spec = viewSpec(view)
  const mandates = useLocalMandates(initialMandates)
  const active = useActiveSection(spec.sections.map((section) => sectionId(view, section.key)))
  const onJudet = (code: string | undefined) => onSearchChange({ ...search, judet: code })

  // A shared address names its section: the page opens on it, once the sections are laid out.
  const { dupa } = search
  useEffect(() => {
    if (dupa) scrollToSection(sectionId(view, dupa))
  }, [view, dupa])
  // The same section again: the address doesn't change, so the page scrolls here.
  const onSection = (section: string) => {
    if (section === dupa) scrollToSection(sectionId(view, section))
  }
  const sectionLink: SectionLink = (section) =>
    function FigureLink(label: ReactNode, className: string) {
      return (
        <SectionLinkTo search={search} section={section} onSection={onSection} className={className}>
          {label}
        </SectionLinkTo>
      )
    }

  return (
    <div className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <Head view={view} judet={judet} notes={view === 'mandate' ? mandateNotes(mandates.data) : null} onJudet={onJudet} />
      <Bar view={view} search={search} active={active} onView={(next) => onSearchChange({ tip: next, dupa: undefined, judet: search.judet })} onSection={onSection} />
      {view === 'mandate' ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <MandateFigures judet={judet} initial={initialMandates} sectionLink={sectionLink} />
          </RuledFrame>
        </section>
      ) : null}
      {spec.sections.map((section) => {
        const id = sectionId(view, section.key)
        return (
          <section key={id} id={id} className="scroll-mt-28 border-b" aria-labelledby={`${id}-titlu`}>
            <RuledFrame className="py-12 sm:py-16">
              <h2 id={`${id}-titlu`} className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {section.title}
              </h2>
              <div className="mt-8">
                <SectionBody view={view} section={section} judet={judet} initial={initialMandates} onJudet={onJudet} />
              </div>
            </RuledFrame>
          </section>
        )
      })}
      <footer className="bg-muted/20">
        <RuledFrame className="py-6">
          <SourcesLine />
        </RuledFrame>
      </footer>
    </div>
  )
}
