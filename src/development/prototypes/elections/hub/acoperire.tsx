import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HomeBand, HomeSectionNav, SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { familyPlural, officeLabel, roundLabel, scopeLabel } from '../shared/labels'
import { countElections, FAMILIES, isDisputedEvent, officePresence, roundsOf, type Edition, type ElectionEvent, type ScopeType } from '../shared/model'
import { BAND_GRID, CatalogFigures, ElectionsHero, ElectionsSearch, ElectionsSourceLine, HeroPanel, PROTOTYPE_HREF, Rows, sectionIndex, useFormat, type Row } from '../shared/parts'
import { DATA, ROUNDS_IN_USE, SHOWN_SCOPES, editionOffices, editionScopes, eventsOfFamily, roundMatrix, scopeMatrix, type FamilyChoice } from './model'
import { Dash, EventTitle, EventsBand, FamilyToggle, HubShell, Lede, Th, hubNotes, shortcuts } from './parts'

/**
 * `acoperire` — the front door as a coverage map: per election, which
 * offices, levels and rounds each edition reports. The source's own table
 * labels are shown as such, verbatim, never guessed into offices.
 */

const EVENTS_SHOWN = 5

function coverageNotes(): readonly ReactNode[] {
  return [
    <Trans key="shapes">
      Unele etichete de funcție sunt numele tabelului din sursă (de exemplu „local_result_tippv_1"), nu o funcție: sunt arătate ca atare, cu litere de cod, și nu sunt traduse.
    </Trans>,
    <Trans key="levels">
      Un nivel e tipul locului raportat: localitatea (cod SIRUTA), numerotarea proprie a sursei, județul (cu codurile fiecărei ediții, care nu se potrivesc între ediții),
      străinătatea și țara.
    </Trans>,
  ]
}

function scopeShort(scope: ScopeType): string {
  switch (scope) {
    case 'siruta':
      return t`L`
    case 'source_constituency':
      return t`N`
    case 'county':
      return t`J`
    case 'diaspora':
      return t`S`
    case 'national':
      return t`Ț`
    case 'chamber':
      return t`C`
  }
}

/** Five fixed cells, one per level, a filled one where the edition reports at it. */
function LevelDots({ scopes }: { readonly scopes: ReadonlySet<ScopeType> }) {
  return (
    <span
      className="inline-flex gap-px"
      role="img"
      aria-label={
        SHOWN_SCOPES.filter((scope) => scopes.has(scope))
          .map(scopeLabel)
          .join(', ') || t`niciun nivel`
      }
    >
      {SHOWN_SCOPES.map((scope) => (
        <span
          key={scope}
          title={scopeLabel(scope)}
          className={cn(
            'inline-flex size-6 items-center justify-center font-mono text-[0.625rem] uppercase',
            scopes.has(scope) ? 'bg-primary/15 text-foreground' : 'bg-muted/40 text-muted-foreground/40',
          )}
          aria-hidden="true"
        >
          {scopeShort(scope)}
        </span>
      ))}
    </span>
  )
}

/** An edition's offices in words, then the source's own labels, verbatim and said as such. */
function Offices({ edition }: { readonly edition: Edition }) {
  const offices = editionOffices(edition)
  const known = offices.filter((office) => office.label !== null)
  const shapes = offices.filter((office) => office.label === null)
  return (
    <span className="block min-w-0 text-sm">
      {known.length > 0 ? <span className="text-foreground">{known.map((office) => office.label).join(', ')}</span> : null}
      {shapes.length > 0 ? (
        <span className={cn('block text-xs text-muted-foreground', known.length > 0 && 'mt-0.5')}>
          <span className="font-mono">{shapes.map((office) => office.key).join(', ')}</span> <Trans>(etichetă din sursă)</Trans>
        </span>
      ) : null}
    </span>
  )
}

const EDITION_GRID = 'grid grid-cols-1 gap-x-4 gap-y-1.5 px-1 py-2.5 sm:grid-cols-[10.5rem_minmax(0,1fr)_7.75rem_8.5rem_4.5rem] sm:items-start'

function PhoneKey({ children }: { readonly children: ReactNode }) {
  return <MonoLabel className="mr-2 text-muted-foreground sm:hidden">{children}</MonoLabel>
}

function EditionRow({ event, edition }: { readonly event: ElectionEvent; readonly edition: Edition }) {
  const format = useFormat()
  const rounds = roundsOf(edition)
  return (
    <li>
      <a
        href={PROTOTYPE_HREF.election(event.key, edition.key)}
        className={cn(EDITION_GRID, 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none')}
      >
        <span className="min-w-0 break-all font-mono text-xs tabular-nums text-muted-foreground">{edition.key}</span>
        <span className="min-w-0">
          <PhoneKey>
            <Trans>Funcții</Trans>
          </PhoneKey>
          <Offices edition={edition} />
        </span>
        <span>
          <PhoneKey>
            <Trans>Niveluri</Trans>
          </PhoneKey>
          <LevelDots scopes={editionScopes(edition)} />
        </span>
        <span className="text-sm text-foreground">
          <PhoneKey>
            <Trans>Tururi</Trans>
          </PhoneKey>
          {rounds.map(roundLabel).join(', ')}
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground sm:text-right">
          <PhoneKey>
            <Trans>Rânduri</Trans>
          </PhoneKey>
          {format.n(edition.contests)}
        </span>
      </a>
    </li>
  )
}

function CoverageBand({ index }: { readonly index: string }) {
  const [family, setFamily] = useState<FamilyChoice>('toate')
  const [open, setOpen] = useState(false)
  const events = eventsOfFamily(DATA.events, family)
  const shown = open ? events : events.slice(0, EVENTS_SHOWN)
  const editions = events.reduce((sum, event) => sum + event.editions.length, 0)
  const elections = countElections(events)
  return (
    <HomeBand id="tipuri" labelledBy="elections-hub-coverage-title">
      <HubSectionHead
        titleId="elections-hub-coverage-title"
        index={index}
        title={<Trans>Ce raportează fiecare ediție</Trans>}
        lede={
          <Trans>
            {editions} ediții de date pentru {elections} alegeri: funcțiile, nivelurile la care sunt raportate (localitate, numerotarea sursei, județ, străinătate, țară) și
            tururile, așa cum le etichetează sursa. Un rând deschide ediția.
          </Trans>
        }
        aside={
          <FamilyToggle
            value={family}
            onChange={(next) => {
              setFamily(next)
              setOpen(false)
            }}
          />
        }
      />
      <div className="mt-8" data-reveal>
        <div className={cn(EDITION_GRID, 'hidden border-b border-border/70 py-2 sm:grid')} aria-hidden="true">
          <MonoLabel className="text-muted-foreground">
            <Trans>Ediția</Trans>
          </MonoLabel>
          <MonoLabel className="text-muted-foreground">
            <Trans>Funcții raportate</Trans>
          </MonoLabel>
          <MonoLabel className="text-muted-foreground">
            <Trans>Niveluri</Trans>
          </MonoLabel>
          <MonoLabel className="text-muted-foreground">
            <Trans>Tururi</Trans>
          </MonoLabel>
          <MonoLabel className="text-right text-muted-foreground">
            <Trans>Rânduri</Trans>
          </MonoLabel>
        </div>
        {shown.map((event) => (
          <section key={event.key} className="border-b border-border/70 py-3" aria-labelledby={`elections-hub-coverage-${event.key}`}>
            <h3 id={`elections-hub-coverage-${event.key}`} className="flex flex-wrap items-baseline justify-between gap-x-4 px-1 text-sm">
              <a href={PROTOTYPE_HREF.election(event.key)} className="font-semibold text-foreground underline-offset-4 hover:underline">
                <EventTitle event={event} />
              </a>
              <span className="text-xs tabular-nums text-muted-foreground">
                {event.editions.length === 1 ? <Trans>1 ediție</Trans> : <Trans>{event.editions.length} ediții, care nu se adună</Trans>}
              </span>
            </h3>
            <ul className="mt-1 divide-y divide-border/50">
              {event.editions.map((edition) => (
                <EditionRow key={edition.key} event={event} edition={edition} />
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {events.length > shown.length ? (
            <Trans>
              primele {shown.length} grupări din {events.length}
            </Trans>
          ) : (
            <Trans>toate cele {events.length} grupări</Trans>
          )}
          {events.some(isDisputedEvent) ? (
            <>
              {' · '}
              <Trans>✱ date din 2016, nu o alegere în plus</Trans>
            </>
          ) : null}
          {' · '}
          <Trans>L localitate, N numerotarea sursei, J județ, S străinătate, Ț țară</Trans>
        </p>
        {events.length > EVENTS_SHOWN ? (
          <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
            {open ? <Trans>Arată mai puține</Trans> : <Trans>Toate cele {events.length} grupări</Trans>}
          </button>
        ) : null}
      </div>
    </HomeBand>
  )
}

function OfficesBand({ index }: { readonly index: string }) {
  const format = useFormat()
  const presence = officePresence(DATA.events)
  const known = presence.filter((entry) => officeLabel(entry.office) !== null)
  const shapes = presence.filter((entry) => officeLabel(entry.office) === null)
  const top = Math.max(...presence.map((entry) => entry.events.length), 1)
  const row = (entry: (typeof presence)[number]): Row => {
    const first = entry.events[0]?.year
    const last = entry.events[entry.events.length - 1]?.year
    const families = [...new Set(entry.events.map((event) => event.family))].map(familyPlural).join(', ')
    const n = countElections(entry.events)
    return {
      key: entry.office,
      label: officeLabel(entry.office) ?? (
        <>
          <span className="font-mono text-xs">{entry.office}</span> <span className="text-xs text-muted-foreground">{t`(etichetă din sursă)`}</span>
        </>
      ),
      meta: first === last ? `${String(first)} · ${families}` : `${String(first)}–${String(last)} · ${families}`,
      value: n === 1 ? t`1 alegere` : t`${format.n(n)} alegeri`,
      fraction: n / top,
    }
  }
  return (
    <HomeBand id="functii" labelledBy="elections-hub-offices-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-offices-title"
            index={index}
            title={<Trans>Funcțiile raportate</Trans>}
            lede={
              <Trans>
                {known.length} funcții cunoscute și {shapes.length} etichete care sunt numele unui tabel din sursă, nu o funcție. Fiecare, cu numărul de alegeri în care apare și
                anii.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Funcții</Trans>
          </MonoLabel>
          <Rows className="mt-3" rows={known.map(row)} />
          <MonoLabel className="mt-8 block text-muted-foreground">
            <Trans>Etichete din sursă, nu funcții</Trans>
          </MonoLabel>
          <Rows className="mt-3" rows={shapes.map(row)} />
        </div>
      </div>
    </HomeBand>
  )
}

type Axis = 'niveluri' | 'tururi'

function MatrixTable({ axis }: { readonly axis: Axis }) {
  const format = useFormat()
  const scopes = scopeMatrix(DATA.events)
  const rounds = roundMatrix(DATA.events)
  const columns: readonly { readonly key: string; readonly label: string; readonly of: (family: (typeof FAMILIES)[number]) => number }[] =
    axis === 'niveluri'
      ? SHOWN_SCOPES.map((scope) => ({ key: scope, label: scopeLabel(scope), of: (family) => scopes.get(family)?.get(scope) ?? 0 }))
      : ROUNDS_IN_USE.map((round) => ({ key: round ?? 'null', label: roundLabel(round), of: (family) => rounds.get(family)?.get(round) ?? 0 }))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">{axis === 'niveluri' ? t`Ediții de date pe tip de alegere și nivel raportat` : t`Ediții de date pe tip de alegere și tur raportat`}</caption>
        <thead>
          <tr className="border-b border-border/70">
            <Th className="pr-4">
              <Trans>Tipul</Trans>
            </Th>
            {columns.map((column) => (
              <Th key={column.key} align="right" className="px-2">
                {column.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {FAMILIES.map((family) => (
            <tr key={family}>
              <th scope="row" className="py-2.5 pr-4 text-left font-medium text-foreground">
                {familyPlural(family)}
              </th>
              {columns.map((column) => {
                const value = column.of(family)
                return (
                  <td key={column.key} className="px-2 py-2.5 text-right tabular-nums">
                    {value === 0 ? <Dash label={t`nicio ediție`} /> : <span className="text-foreground">{format.n(value)}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LevelsBand({ index }: { readonly index: string }) {
  const [axis, setAxis] = useState<Axis>('niveluri')
  const scopes = scopeMatrix(DATA.events)
  const locality = FAMILIES.reduce((sum, family) => sum + (scopes.get(family)?.get('siruta') ?? 0), 0)
  const unreported = FAMILIES.reduce((sum, family) => sum + (roundMatrix(DATA.events).get(family)?.get(null) ?? 0), 0)
  return (
    <HomeBand id="niveluri" labelledBy="elections-hub-levels-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="elections-hub-levels-title"
            index={index}
            title={<Trans>Niveluri și tururi</Trans>}
            lede={
              <Trans>
                Câte ediții de date raportează la fiecare nivel și în fiecare tur, pe tip de alegere. {locality} ediții coboară până la localitate; {unreported} nu spun turul.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <IndicatorToggle
            label={t`Axa tabelului`}
            options={[
              { key: 'niveluri' as Axis, label: t`Niveluri` },
              { key: 'tururi' as Axis, label: t`Tururi` },
            ]}
            value={axis}
            onChange={setAxis}
          />
          <div className="mt-4">
            <MatrixTable axis={axis} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <Trans>Ediții de date, nu alegeri și nu rânduri; o ediție poate raporta la mai multe niveluri și în mai multe tururi.</Trans>
          </p>
        </div>
      </div>
    </HomeBand>
  )
}

/** Beside the headline: how many editions reach each level, with a toggle to the rounds. */
function LevelsPanel() {
  const [axis, setAxis] = useState<Axis>('niveluri')
  const format = useFormat()
  const scopes = scopeMatrix(DATA.events)
  const rounds = roundMatrix(DATA.events)
  const rows: readonly Row[] =
    axis === 'niveluri'
      ? SHOWN_SCOPES.map((scope) => ({ key: scope, label: scopeLabel(scope), value: FAMILIES.reduce((sum, family) => sum + (scopes.get(family)?.get(scope) ?? 0), 0) }))
      : ROUNDS_IN_USE.map((round) => ({
          key: round ?? 'null',
          label: roundLabel(round),
          value: FAMILIES.reduce((sum, family) => sum + (rounds.get(family)?.get(round) ?? 0), 0),
        }))
  const top = Math.max(...rows.map((row) => Number(row.value)), 1)
  return (
    <HeroPanel
      titleId="elections-hub-levels-panel-title"
      title={<Trans>Câte ediții raportează</Trans>}
      aside={
        <IndicatorToggle
          label={t`Pe ce`}
          options={[
            { key: 'niveluri' as Axis, label: t`Niveluri` },
            { key: 'tururi' as Axis, label: t`Tururi` },
          ]}
          value={axis}
          onChange={setAxis}
        />
      }
      footer={<Trans>Din {DATA.editions.length} de ediții de date; un rând la nivel de localitate e locul unde a raportat sursa, nu o cursă.</Trans>}
    >
      <Rows
        key={axis}
        className="mt-4"
        rows={rows.map((row) => {
          const n = Number(row.value)
          return { ...row, value: n === 1 ? t`1 ediție` : t`${format.n(n)} ediții`, fraction: n / top, muted: n === 0 }
        })}
      />
    </HeroPanel>
  )
}

export function HubAcoperire() {
  const sections = [
    { id: 'tipuri', label: t`Pe ediții` },
    { id: 'functii', label: t`Funcțiile` },
    { id: 'niveluri', label: t`Niveluri și tururi` },
    { id: 'alegeri', label: t`Pe alegeri` },
  ]
  return (
    <HubShell>
      <ElectionsHero
        idPrefix="elections-hub-acoperire"
        headline={
          <Trans>
            Ce e în date,
            <br />
            alegere cu alegere
          </Trans>
        }
        lede={<Lede after={<Trans>Pentru fiecare, funcțiile, nivelurile și tururile raportate.</Trans>} />}
        search={<ElectionsSearch events={DATA.events} />}
        shortcuts={shortcuts([{ key: 'coverage', label: <Trans>Pe ediții</Trans>, href: '#tipuri' }])}
        panel={<LevelsPanel />}
        source={<ElectionsSourceLine readAt={DATA.readAt} notes={hubNotes(coverageNotes())} />}
      />
      <HomeSectionNav title={t`Alegeri`} sections={sections} />
      <CatalogFigures data={DATA} links={{ events: 'alegeri', editions: 'tipuri', rows: 'niveluri', places: 'niveluri' }} />
      <CoverageBand index={sectionIndex(sections, 'tipuri')} />
      <OfficesBand index={sectionIndex(sections, 'functii')} />
      <LevelsBand index={sectionIndex(sections, 'niveluri')} />
      <EventsBand id="alegeri" index={sectionIndex(sections, 'alegeri')} titleId="elections-hub-events-title" />
    </HubShell>
  )
}
