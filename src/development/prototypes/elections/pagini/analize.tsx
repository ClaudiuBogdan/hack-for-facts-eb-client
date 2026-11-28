import { useId, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Link2 } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { ROMANIA_COUNTIES, countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { CaveatsMarker, useFormat } from '../shared/parts'
import { total, useCountyCouncil, useElectionEvents, useLocalMandates, type LineCount, type LocalMandates } from './data'
import { Absent, CountyTiles, PROTOTYPE_MARKER, PhasePair, TabPending, Waffle, WayHome, useActiveSection } from './parts'
import { views, type TabSpec, type ViewKey, type ViewSpec } from './tabs'

/**
 * `/alegeri/analize` in two heads, the same live body under each (client-dev-polish, 2026-11-28: no owner decision
 * yet between the national budget's analysis head and legislation's; show both side by side):
 * - `buget`: the national budget's — the question as the headline over the lattice, the controls row under it with
 *   the one caveats marker, the pinned bar of the five views, each view's tabs as stacked sections under a jump row;
 * - `legislatie`: legislation's — the slim shell with the sibling pages pinned, the question as an h2, the views and
 *   the tabs as two rows of toggles, one tab's answer at a time.
 * Only the Mandate view draws (change 1, live from the API); every other tab says what it will draw and when.
 */

type Choice = { readonly view: ViewKey; readonly tab: string; readonly judet: string | null }

function useChoice(): readonly [Choice, (patch: Partial<Choice>) => void] {
  const [choice, setChoice] = useState<Choice>({ view: 'mandate', tab: 'primarii', judet: null })
  const set = (patch: Partial<Choice>) =>
    setChoice((was) => {
      const view = patch.view ?? was.view
      const tab = patch.tab ?? (patch.view && patch.view !== was.view ? (views().find((spec) => spec.key === view)?.tabs[0]?.key ?? '') : was.tab)
      return { view, tab, judet: patch.judet === undefined ? was.judet : patch.judet }
    })
  return [choice, set]
}

const specOf = (view: ViewKey) => views().find((spec) => spec.key === view) ?? (views()[0] as ViewSpec)
const COUNTIES = ROMANIA_COUNTIES.filter((county) => county.code !== 'B').slice().sort((a, b) => a.nameRo.localeCompare(b.nameRo, 'ro'))

// ───────────────────────────────────────────────────────────── shared pieces ──

/** The county as a phrase of the question, labelling the picker beside it; „în toată țara" when none is chosen. */
function CountyPhrase({ judet, pickerId }: { readonly judet: string | null; readonly pickerId: string }) {
  return (
    <label htmlFor={pickerId} className="cursor-pointer underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em]">
      {judet ? t`în județul ${countyNameRo(judet) ?? judet}` : t`în toată țara`}
    </label>
  )
}

function CountyPicker({ id, judet, onChange, className }: { readonly id: string; readonly judet: string | null; readonly onChange: (code: string | null) => void; readonly className?: string }) {
  return (
    <select
      id={id}
      value={judet ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      className={cn('h-9 rounded-md border bg-background px-2 text-sm text-foreground', className)}
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

function CopyLink() {
  return (
    <button
      type="button"
      className="inline-flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
      aria-label={t`Copiază adresa întrebării`}
      title={t`Copiază adresa întrebării`}
      onClick={() => void navigator.clipboard.writeText(window.location.href)}
    >
      <Link2 className="size-4" aria-hidden="true" />
    </button>
  )
}

function caveats(data: LocalMandates | undefined): readonly ReactNode[] {
  if (!data) return []
  return [
    ...(data.missing.length ? [t`Fără ${data.missing.map((code) => countyNameRo(code) ?? code).join(', ')}: nu e încă în date. Totalurile pe țară nu îl includ.`] : []),
    ...(data.suspect ? [t`Unele cifre au un defect cunoscut (contestații anulate); sunt marcate acolo unde apar.`] : []),
    t`Consiliile județene au două repartizări de mandate, arătate separat: nu se adună.`,
    t`Independenții sunt o singură linie, fără nume; numele de pe buletin rămân pe pagina fiecărei curse.`,
    t`Alianțele Dreapta Unită și PSD + PNL sunt linii proprii; celelalte alianțe și partidele mici sunt „Alte partide".`,
  ]
}

function useSourceDay(): string | null {
  const events = useElectionEvents()
  const format = useFormat()
  const at = events.data?.find((event) => event.eventKey === 'ro:local:2024')?.publication?.activatedAt
  return at ? format.day(at) : null
}

function SourcesLine({ className }: { readonly className?: string }) {
  const day = useSourceDay()
  return <p className={cn('text-sm text-muted-foreground', className)}>{day ? t`Surse: rezultatele oficiale, publicate în platformă pe ${day}.` : t`Surse: rezultatele oficiale.`}</p>
}

// ───────────────────────────────────────────────────────────── the Mandate view ──

type Scoped = { readonly mayors: readonly LineCount[] | null; readonly councillors: readonly LineCount[] | null; readonly first: readonly LineCount[] | null; readonly second: readonly LineCount[] | null; readonly pending: boolean }

function useScoped(judet: string | null): Scoped & { readonly data: LocalMandates | undefined; readonly error: boolean } {
  const mandates = useLocalMandates()
  const council = useCountyCouncil(judet)
  const data = mandates.data
  if (!judet) return { data, error: mandates.isError, pending: mandates.isPending, mayors: data?.mayors ?? null, councillors: data?.councillors ?? null, first: data?.countyCouncil.first ?? null, second: data?.countyCouncil.second ?? null }
  const county = data?.counties.find((row) => row.code === judet)
  return { data, error: mandates.isError || council.isError, pending: mandates.isPending || (judet !== 'B' && council.isPending), mayors: county?.mayors ?? null, councillors: county?.councillors ?? null, first: council.data?.first ?? null, second: council.data?.second ?? null }
}

function MandateFigures({ judet }: { readonly judet: string | null }) {
  const format = useFormat()
  const scoped = useScoped(judet)
  if (scoped.pending) return <div className="h-36 animate-pulse bg-muted/30" aria-hidden="true" />
  const link = (hash: string) => (label: ReactNode, className: string) => (
    <a href={`#mandate-${hash}`} className={className}>
      {label}
    </a>
  )
  const facts: HubFact[] = [
    { key: 'primari', value: total(scoped.mayors), digits: 0, label: t`Primari`, note: judet ? t`în județ` : t`fără București`, link: link('primarii') },
    { key: 'consilieri', value: total(scoped.councillors), digits: 0, label: t`Consilieri locali`, note: judet ? t`în județ` : t`fără București`, link: link('consilieri') },
    { key: 'cj', value: total(scoped.first), digits: 0, label: t`Consilieri județeni, prima repartizare`, note: t`a doua repartizare: ${format.n(total(scoped.second))}; nu se adună`, link: link('consiliu') },
    {
      key: 'judete',
      value: judet ? 1 : (scoped.data?.counties.filter((county) => county.mayors).length ?? 0),
      digits: 0,
      label: judet ? t`Județ` : t`Județe cu date`,
      note: judet ? (countyNameRo(judet) ?? judet) : t`București nu e încă în date`,
      link: link('judete'),
    },
  ]
  return <HubFiguresBand facts={facts} locale={format.locale} plain arrow />
}

function MandateTab({ tab, judet, onJudet }: { readonly tab: TabSpec; readonly judet: string | null; readonly onJudet: (code: string | null) => void }) {
  const scoped = useScoped(judet)
  if (scoped.pending) return <div className="h-48 animate-pulse bg-muted/30" aria-hidden="true" />
  if (scoped.error) return <Absent label={t`Nu am putut citi mandatele`}>{t`Reîncearcă peste câteva secunde.`}</Absent>
  switch (tab.key) {
    case 'primarii':
      return scoped.mayors ? <Waffle rows={scoped.mayors} per={judet ? 1 : 10} columns={judet ? 25 : 50} /> : <Absent label={t`Primarii`} />
    case 'consilieri':
      return scoped.councillors ? <Waffle rows={scoped.councillors} per={judet ? 10 : 100} columns={judet ? 30 : 50} /> : <Absent label={t`Consilierii locali`} />
    case 'consiliu':
      return judet === 'B' ? <Absent label={t`Consiliul General al Municipiului București`}>{t`Nu e încă în date.`}</Absent> : <PhasePair first={scoped.first} second={scoped.second} />
    case 'judete':
      return (
        <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
          <CountyTiles counties={new Map((scoped.data?.counties ?? []).map((county) => [county.code, county.mayors]))} chosen={judet} onChoose={(code) => onJudet(code === judet ? null : code)} />
          <p className="max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
            {t`Fiecare județ în culoarea liniei cu cele mai multe primării. Un județ fără date e punctat, la fel o egalitate. Alege un județ ca să vezi doar cifrele lui.`}
          </p>
        </div>
      )
    case 'alegeri':
      return (
        <div className="grid gap-6 lg:grid-cols-3">
          <Absent label="2016">{t`Localele din 2016 nu sunt încă în date.`}</Absent>
          <Absent label="2020">{t`Localele din 2020 nu sunt încă în date.`}</Absent>
          <div className="min-w-0">
            <p className="mb-3 text-sm font-medium">2024</p>
            {scoped.mayors ? <Waffle rows={scoped.mayors} per={judet ? 1 : 20} columns={25} /> : <Absent label="2024" />}
          </div>
        </div>
      )
    default:
      return null
  }
}

function TabBody({ view, tab, judet, onJudet }: { readonly view: ViewKey; readonly tab: TabSpec; readonly judet: string | null; readonly onJudet: (code: string | null) => void }) {
  if (view === 'mandate' && (tab.state === 'built' || tab.state === 'partly')) return <MandateTab tab={tab} judet={judet} onJudet={onJudet} />
  return <TabPending state={tab.state === 'built' ? 'later' : tab.state}>{tab.note}</TabPending>
}

const tabTitle = (view: ViewKey, tab: TabSpec) =>
  view === 'mandate'
    ? ({ primarii: t`Primăriile, pe partide`, alegeri: t`Primăriile, la ultimele trei alegeri locale`, consiliu: t`Consiliile județene, cele două repartizări`, judete: t`Cine are cele mai multe primării, pe județe`, consilieri: t`Consilierii locali, pe partide` }[tab.key] ?? tab.label)
    : tab.label

// ───────────────────────────────────────────────────────────── head A: the national budget's ──

export function AnalyticsBudgetHead() {
  const [choice, set] = useChoice()
  const spec = specOf(choice.view)
  const pickerId = useId()
  const notes = caveats(useLocalMandates().data)
  const ids = spec.tabs.map((tab) => `${spec.key}-${tab.key}`)
  const active = useActiveSection(ids)
  return (
    <div className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']" data-dev-marker={PROTOTYPE_MARKER}>
      <section className="relative border-b" aria-labelledby="alegeri-analize-titlu">
        <TwoLayerLattice idPrefix="alegeri-analize" />
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <CornerTicks />
          <WayHome trail={[{ label: t`Alegeri`, href: '/development/elections/pagini?v=principal' }, { label: t`Analize` }]} />
          <h1 id="alegeri-analize-titlu" className="mt-6 max-w-5xl text-[clamp(2rem,6vw,3.75rem)] font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8">
            {spec.question}
            {choice.view === 'mandate' || choice.view === 'curse' ? (
              <>
                , <CountyPhrase judet={choice.judet} pickerId={pickerId} />
              </>
            ) : null}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <CountyPicker id={pickerId} judet={choice.judet} onChange={(judet) => set({ judet })} />
            <CopyLink />
            {choice.view === 'mandate' && notes.length ? <CaveatsMarker notes={notes} /> : null}
          </div>
          <span className="absolute inset-x-0 top-full z-30 mt-px">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>

      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <nav aria-label={t`Vederile`}>
          <RuledFrame className="py-0">
            <ol className="grid grid-cols-5 sm:flex sm:gap-6">
              {views().map((view) => {
                const current = view.key === choice.view
                return (
                  <li key={view.key}>
                    <button
                      type="button"
                      aria-pressed={current}
                      onClick={() => set({ view: view.key })}
                      className={cn(
                        'flex h-full min-h-11 w-full flex-col items-center gap-1 border-b-2 py-2 text-center text-[0.6875rem] leading-tight transition-colors sm:w-auto sm:flex-row sm:gap-2 sm:py-0 sm:text-sm',
                        current ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <view.icon className={cn('size-4 shrink-0', current && 'text-primary')} aria-hidden="true" />
                      {view.label}
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
              {spec.tabs.map((tab) => {
                const id = `${spec.key}-${tab.key}`
                return (
                  <li key={tab.key} className="shrink-0">
                    <a
                      href={`#${id}`}
                      aria-current={active === id ? 'location' : undefined}
                      className={cn(
                        'relative inline-flex h-10 items-center gap-1.5 px-2.5 text-sm transition-colors hover:text-foreground',
                        'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0',
                        active === id ? 'text-foreground after:opacity-100' : 'text-muted-foreground',
                      )}
                    >
                      {tab.label}
                      {tab.state === 'waits' ? <span className="size-1.5 rounded-full border border-current" aria-label={t`încă nu e în date`} /> : null}
                    </a>
                  </li>
                )
              })}
            </ol>
          </RuledFrame>
        </nav>
      </div>

      {choice.view === 'mandate' ? (
        <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
          <RuledFrame>
            <MandateFigures judet={choice.judet} />
          </RuledFrame>
        </section>
      ) : null}

      {spec.tabs.map((tab) => (
        <section key={tab.key} id={`${spec.key}-${tab.key}`} className="scroll-mt-28 border-b" aria-labelledby={`${spec.key}-${tab.key}-titlu`}>
          <RuledFrame className="py-12 sm:py-16">
            <h2 id={`${spec.key}-${tab.key}-titlu`} className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {tabTitle(spec.key, tab)}
            </h2>
            <div className="mt-8">
              <TabBody view={spec.key} tab={tab} judet={choice.judet} onJudet={(judet) => set({ judet })} />
            </div>
          </RuledFrame>
        </section>
      ))}

      <footer className="border-b bg-muted/20">
        <RuledFrame className="py-6">
          <SourcesLine />
        </RuledFrame>
      </footer>
    </div>
  )
}

// ───────────────────────────────────────────────────────────── head B: legislation's ──

export function AnalyticsLegalShell() {
  const [choice, set] = useChoice()
  const spec = specOf(choice.view)
  const tab = spec.tabs.find((item) => item.key === choice.tab) ?? spec.tabs[0]
  const pickerId = useId()
  const notes = caveats(useLocalMandates().data)
  const day = useSourceDay()
  return (
    <div className="relative min-h-screen w-full min-w-0 overflow-x-clip bg-background [font-feature-settings:'ss03']" data-dev-marker={PROTOTYPE_MARKER}>
      <header className="relative border-b">
        <RuledFrame className="py-8 sm:py-10">
          <WayHome trail={[{ label: t`Alegeri`, href: '/development/elections/pagini?v=principal' }, { label: t`Analize` }]} />
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-4 sm:text-5xl">{t`Analiza alegerilor`}</h1>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{t`Partidele, mandatele, harta, prezența și cursele, din rezultatele oficiale.`}</p>
          <p className="mt-3 text-sm text-muted-foreground">{day ? t`Rezultatele oficiale · publicate pe ${day}` : t`Rezultatele oficiale`}</p>
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </header>

      <nav aria-label={t`Paginile alegerilor`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <RuledFrame className="overflow-x-auto py-0">
          <ul className="flex shrink-0 gap-5 sm:gap-6">
            {[
              { key: 'principal', label: t`Alegeri`, href: '/development/elections/pagini?v=principal' },
              { key: 'analize', label: t`Analize`, href: null },
              { key: 'loc', label: t`Localități`, href: '/development/elections/localitate' },
            ].map((page) => (
              <li key={page.key} className="shrink-0">
                {page.href ? (
                  <a href={page.href} className="relative inline-flex min-h-11 items-center whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {page.label}
                  </a>
                ) : (
                  <span aria-current="page" className="relative inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold text-foreground">
                    {page.label}
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden="true" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </RuledFrame>
      </nav>

      <RuledFrame className="py-8 sm:py-10">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-label={t`Întrebarea`}>
            <h2 className="max-w-[30ch] text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-4xl">
              {spec.question}
              {choice.view === 'mandate' || choice.view === 'curse' ? (
                <>
                  , <CountyPhrase judet={choice.judet} pickerId={pickerId} />
                </>
              ) : null}
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <CountyPicker id={pickerId} judet={choice.judet} onChange={(judet) => set({ judet })} />
              <CopyLink />
              {choice.view === 'mandate' && notes.length ? <CaveatsMarker notes={notes} /> : null}
            </div>
          </section>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t`Privește după`}</p>
              <IndicatorToggle<ViewKey>
                className="mt-2 grid-flow-row grid-cols-2 min-[400px]:grid-cols-3 lg:grid-cols-5"
                label={t`Privește după`}
                value={choice.view}
                onChange={(view) => set({ view })}
                options={views().map((view) => ({ key: view.key, label: view.label }))}
              />
            </div>
            <IndicatorToggle<string>
              className="grid-flow-row grid-cols-2 min-[400px]:grid-cols-3 lg:grid-cols-6"
              label={t`Secțiunea`}
              value={tab?.key ?? ''}
              onChange={(key) => set({ tab: key })}
              options={spec.tabs.map((item) => ({ key: item.key, label: item.state === 'waits' ? `${item.label} · ${t`încă nu`}` : item.label }))}
            />
          </div>
          {choice.view === 'mandate' ? (
            <div className="border-y">
              <MandateFigures judet={choice.judet} />
            </div>
          ) : null}
          {tab ? (
            <section aria-label={tab.label}>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">{tabTitle(spec.key, tab)}</h3>
              <div className="mt-6">
                <TabBody view={spec.key} tab={tab} judet={choice.judet} onJudet={(judet) => set({ judet })} />
              </div>
            </section>
          ) : null}
          <SourcesLine className="border-t pt-6" />
        </div>
      </RuledFrame>
    </div>
  )
}

/** The analytics prototype's address (the front door's bands and start cards link here). */
export const ANALYTICS_HREF = '/development/elections/pagini?v=analize-buget'
