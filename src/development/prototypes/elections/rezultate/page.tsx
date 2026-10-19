import type { ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { ChoiceSelect } from '@/features/private-companies/components/analytics/analytics-choices'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import { useEvolutionPanels } from '../componente-fable/evolutie'
import { galleryNotes } from '../componente-fable/gallery'
import { useMapPanels } from '../componente-fable/harti'
import { useRacePanels } from '../componente-fable/intreceri'
import { CountyScopeProvider, Option, PartyFocusProvider, pick, useCountyScope, type Panel } from '../componente-fable/kit'
import { useMandatePanels } from '../componente-fable/mandate'
import { countyName, DOMESTIC_TURNOUT_2020, EVOLUTION, lineOf, lineStyle, SUMMARY, sum, turnoutOf, type Family, type Turnout } from '../componente-fable/model'
import { useTurnoutPanels } from '../componente-fable/prezenta'
import { CaveatsMarker, useFormat } from '../shared/parts'

/**
 * The results analytics page: the gallery's charts in five sections under one
 * head — the figures, a sticky bar with the sections and the party in focus,
 * then each section's panels. The map section is one map with its modes as
 * tabs. URL state: `partid` (the focus), `harta` (the map mode).
 */

const SECTIONS = ['partide', 'mandate', 'harta', 'prezenta', 'curse'] as const
type Section = (typeof SECTIONS)[number]

const FOCUS_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'aur', 'udmr', 'pmp', 'alde', 'pro']
const MAP_MODES = ['strength', 'swing', 'flips', 'turnout', 'margins'] as const
type MapMode = (typeof MAP_MODES)[number]

const ALL = 'toate'

function sectionTitle(section: Section): string {
  switch (section) {
    case 'partide':
      return t`Partidele în timp`
    case 'mandate':
      return t`Mandatele`
    case 'harta':
      return t`Harta`
    case 'prezenta':
      return t`Prezența la vot`
    case 'curse':
      return t`Cursele pentru primărie`
  }
}

function mapModeLabel(mode: MapMode): string {
  switch (mode) {
    case 'strength':
      return t`Puterea unui partid`
    case 'swing':
      return t`Schimbarea 2016–2020`
    case 'flips':
      return t`Primării păstrate sau schimbate`
    case 'turnout':
      return t`Prezența`
    case 'margins':
      return t`Diferențele la primărie`
  }
}

/** The page's URL state; an absent key is its default. */
function usePageState() {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const focus = FOCUS_LINES.find((line) => line === search.partid) ?? null
  const mode = MAP_MODES.find((m) => m === search.harta) ?? 'strength'
  const county = COUNTIES.find((code) => code === search.judet) ?? null
  const move = (patch: { readonly partid?: Family | null; readonly harta?: MapMode; readonly judet?: string | null }) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({
        ...previous,
        ...('partid' in patch ? { partid: patch.partid ?? undefined } : {}),
        ...('harta' in patch ? { harta: patch.harta === 'strength' ? undefined : patch.harta } : {}),
        ...('judet' in patch ? { judet: patch.judet ?? undefined } : {}),
      }),
      resetScroll: false,
      replace: true,
    })
  return { focus, mode, county, move } as const
}

/**
 * The counties the filter offers: the 41 with 2024 local rows, by name.
 * București is not offered yet: the 2024 local edition has no rows for it.
 */
const COUNTIES: readonly string[] = Object.keys(SUMMARY.local2024.mayors.mandates.byCounty).sort((a, b) => countyName(a).localeCompare(countyName(b), 'ro'))

function spanLink(label: ReactNode, className: string) {
  return <span className={className}>{label}</span>
}

/** Turnout as a percentage with one decimal, or null when the source has no pair. */
function turnoutPct(pair: Turnout | undefined): number | null {
  const v = pair ? turnoutOf(pair) : null
  return v === null ? null : Math.round(1000 * v) / 10
}

function CountyFigures({ county }: { readonly county: string }) {
  const format = useFormat()
  const local = SUMMARY.local2024
  const mayors = local.mayors.mandates.byCounty[county] ?? []
  const council = local.countyCouncillors.byCounty[county] ?? []
  const [leader] = [...mayors].sort((a, b) => b[1] - a[1])
  const [group] = [...council].sort((a, b) => b[1] - a[1])
  const localTurnout = turnoutPct(local.turnout.byCounty[county])
  const parlTurnout = turnoutPct(SUMMARY.parliamentary2020.turnout.byCounty[county])
  const facts: HubFact[] = [
    {
      key: 'mayors',
      value: sum(mayors),
      digits: 0,
      label: <Trans>Primării, 2024</Trans>,
      note: leader ? (
        <Trans>
          cele mai multe la {lineStyle(lineOf(leader[0])).label}: {format.n(leader[1])}
        </Trans>
      ) : (
        <Trans>nu e în date</Trans>
      ),
      link: spanLink,
    },
    {
      key: 'council',
      value: sum(council),
      digits: 0,
      label: <Trans>Mandate în consiliul județean, 2024</Trans>,
      note: group ? (
        <Trans>
          cel mai mare grup: {lineStyle(lineOf(group[0])).label}, {format.n(group[1])}
        </Trans>
      ) : (
        <Trans>nu e în date</Trans>
      ),
      link: spanLink,
    },
    ...(localTurnout !== null
      ? [
          {
            key: 'local',
            value: localTurnout,
            digits: 1,
            unit: '%',
            label: <Trans>Prezența la locale, 2024</Trans>,
            note: <Trans>{format.n(turnoutPct(local.turnout.national) ?? 0)} % în țară, fără București; neverificat</Trans>,
            link: spanLink,
          },
        ]
      : []),
    ...(parlTurnout !== null
      ? [
          {
            key: 'parl',
            value: parlTurnout,
            digits: 1,
            unit: '%',
            label: <Trans>Prezența la parlamentare, 2020</Trans>,
            note: <Trans>{format.n(turnoutPct(DOMESTIC_TURNOUT_2020) ?? 0)} % în țară, fără străinătate; neverificat</Trans>,
            link: spanLink,
          },
        ]
      : []),
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={format.locale} />
      </RuledFrame>
    </section>
  )
}

function Figures() {
  const format = useFormat()
  const mayors = SUMMARY.local2024.mayors.mandates.national
  const [leader] = [...mayors].sort((a, b) => b[1] - a[1])
  const parliamentary = EVOLUTION.turnout.parliamentary
  const first = parliamentary[0]
  const last = parliamentary[parliamentary.length - 1]
  const facts: HubFact[] = [
    {
      key: 'mayors',
      value: sum(mayors),
      digits: 0,
      label: <Trans>Primării, 2024</Trans>,
      note: leader ? (
        <Trans>
          fără București; cele mai multe la {lineStyle(lineOf(leader[0])).label}: {format.n(leader[1])}
        </Trans>
      ) : (
        <Trans>fără București</Trans>
      ),
      link: spanLink,
    },
    {
      key: 'county',
      value: sum(SUMMARY.local2024.countyCouncillors.national),
      digits: 0,
      label: <Trans>Consilieri județeni, 2024</Trans>,
      note: <Trans>în 41 de consilii, fără Capitală; nu se votează împreună</Trans>,
      link: spanLink,
    },
    ...(first && last
      ? [
          {
            key: 'turnout',
            value: Math.round((1000 * last[2]) / last[1]) / 10,
            digits: 1,
            unit: '%',
            label: <Trans>Prezența la parlamentare, {last[0]}</Trans>,
            note: (
              <Trans>
                {format.n(Math.round((1000 * first[2]) / first[1]) / 10)} % în {first[0]}; neverificat în sursă
              </Trans>
            ),
            link: spanLink,
          },
        ]
      : []),
    {
      key: 'abroad',
      value: EVOLUTION.diasporaVoters['2020'],
      digits: 0,
      label: <Trans>Votanți în străinătate, parlamentare 2020</Trans>,
      note: <Trans>{format.n(EVOLUTION.diasporaVoters['2008'])} în 2008</Trans>,
      link: spanLink,
    },
  ]
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={format.locale} />
      </RuledFrame>
    </section>
  )
}

function StickyBar({
  focus,
  onFocus,
  county,
  onCounty,
}: {
  readonly focus: Family | null
  readonly onFocus: (line: Family | null) => void
  readonly county: string | null
  readonly onCounty: (code: string | null) => void
}) {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <RuledFrame className="flex items-center gap-x-3 py-2 md:gap-x-6 md:py-2.5">
        <nav aria-label={t`Secțiunile paginii`} className="-mx-1 hidden min-w-0 flex-1 gap-1 overflow-x-auto md:flex">
          {SECTIONS.map((section) => (
            <a
              key={section}
              href={`#${section}`}
              className="shrink-0 rounded-sm px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {sectionTitle(section)}
            </a>
          ))}
        </nav>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground md:flex-none">
          <span className="sr-only lg:not-sr-only">
            <Trans>Județul</Trans>
          </span>
          <ChoiceSelect
            value={county ?? ALL}
            groups={[{ options: [{ value: ALL, label: t`toată țara` }, ...COUNTIES.map((code) => ({ value: code, label: countyName(code) }))] }]}
            onChange={(value) => onCounty(COUNTIES.find((code) => code === value) ?? null)}
            label={t`Județul`}
            triggerClassName="h-9 w-full rounded-none border-foreground/25 font-semibold shadow-none hover:border-foreground/60 md:w-auto md:min-w-[9rem]"
          />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground md:flex-none">
          <span className="sr-only lg:not-sr-only">
            <Trans>Partidul în atenție</Trans>
          </span>
          <ChoiceSelect
            value={focus ?? ALL}
            groups={[{ options: [{ value: ALL, label: t`toate` }, ...FOCUS_LINES.map((line) => ({ value: line, label: lineStyle(line).label }))] }]}
            onChange={(value) => onFocus(FOCUS_LINES.find((line) => line === value) ?? null)}
            label={t`Partidul în atenție`}
            triggerClassName="h-9 w-full rounded-none border-foreground/25 font-semibold shadow-none hover:border-foreground/60 md:w-auto md:min-w-[8rem]"
          >
            <span className="flex items-center gap-2 truncate">
              {focus ? <span className={cn('size-3 shrink-0 rounded-[2px]', lineStyle(focus).swatch)} aria-hidden="true" /> : null}
              {focus ? lineStyle(focus).label : t`toate`}
            </span>
          </ChoiceSelect>
        </label>
      </RuledFrame>
    </div>
  )
}

/** One section: its heading, then its rows of panels (a row of two sits side by side from `xl`). */
function SectionBlock({ section, rows, lede }: { readonly section: Section; readonly rows: readonly (readonly Panel[])[]; readonly lede?: ReactNode }) {
  const county = useCountyScope()
  const badge = (panel: Panel) =>
    county === null || !panel.scope || panel.scope === 'county' ? null : (
      <MonoLabel className="rounded-sm border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
        {panel.scope === 'national' ? t`național · fără cifre pe județ` : t`toate județele · ${countyName(county)} evidențiat`}
      </MonoLabel>
    )
  return (
    <section id={section} aria-labelledby={`${section}-title`} className="scroll-mt-20">
      <MonoLabel className="block text-primary">{String(SECTIONS.indexOf(section) + 1).padStart(2, '0')}</MonoLabel>
      <h2 id={`${section}-title`} className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        {sectionTitle(section)}
      </h2>
      {lede ? <div className="mt-4">{lede}</div> : null}
      <div className="mt-8 space-y-14">
        {rows.map((row) => (
          <div key={row.map((p) => p.id).join('+')} className={cn('grid grid-cols-1 gap-x-12 gap-y-14', row.length > 1 && 'xl:grid-cols-2')}>
            {row.map((panel) => (
              <Option key={panel.id} title={panel.title} question={panel.question} foot={panel.foot} notes={panel.notes} badge={badge(panel)}>
                {panel.body}
              </Option>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function rowsOf(panels: readonly Panel[], layout: readonly (readonly string[])[]): readonly (readonly Panel[])[] {
  return layout.map((ids) => pick(panels, ids)).filter((row) => row.length > 0)
}

export function ResultsAnalytics() {
  const state = usePageState()
  const { focus, county, move } = state
  return (
    <CountyScopeProvider value={county}>
      <PartyFocusProvider value={{ value: focus, set: (line) => move({ partid: line }) }}>
        <ResultsBody state={state} />
      </PartyFocusProvider>
    </CountyScopeProvider>
  )
}

function ResultsBody({ state }: { readonly state: ReturnType<typeof usePageState> }) {
  const { focus, mode, county, move } = state
  useClientDocumentTitle(county ? t`Rezultatele alegerilor în ${countyName(county)} · analize` : t`Rezultatele alegerilor · analize`)
  const format = useFormat()
  const evolution = useEvolutionPanels()
  const mandates = useMandatePanels()
  const maps = useMapPanels()
  const turnout = useTurnoutPanels()
  const races = useRacePanels()
  const mapRows = mode === 'flips' ? [['flips'], ['flows']] : [[mode]]
  return (
    <div className="w-full bg-background">
      <header className="border-b bg-muted/20">
        <RuledFrame className="py-8 sm:py-10">
          <MonoLabel className="block text-primary">
            <Trans>Alegeri · analize</Trans>
          </MonoLabel>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {county ? <Trans>Rezultatele alegerilor în {countyName(county)}</Trans> : <Trans>Rezultatele alegerilor</Trans>}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
            <span>
              <Trans>Sursa: BEC, AEP și ROAEP, din baza de date Transparenta.eu, extras pe {format.day(EVOLUTION.readAt)}</Trans>
            </span>
            <CaveatsMarker notes={galleryNotes()} />
          </p>
        </RuledFrame>
      </header>
      {county ? <CountyFigures county={county} /> : <Figures />}
      <StickyBar focus={focus} onFocus={(line) => move({ partid: line })} county={county} onCounty={(code) => move({ judet: code })} />
      <RuledFrame className="space-y-24 py-12 sm:py-16">
        <SectionBlock section="partide" rows={rowsOf(evolution, [['lines'], ['cards'], ['gains'], ['columns'], ['ranks']])} />
        <SectionBlock section="mandate" rows={rowsOf(mandates, [['waffle', 'hemicycle'], ['waffles'], ['counties'], ['councillors']])} />
        <SectionBlock
          section="harta"
          lede={
            <>
              {/* Five long labels do not fit a phone's toggle: a list there, the toggle from `md`. */}
              <div className="md:hidden">
                <ChoiceSelect
                  value={mode}
                  groups={[{ options: MAP_MODES.map((key) => ({ value: key, label: mapModeLabel(key) })) }]}
                  onChange={(value) => move({ harta: MAP_MODES.find((key) => key === value) ?? 'strength' })}
                  label={t`Ce arată harta`}
                  triggerClassName="h-10 w-full rounded-none border-foreground/25 font-semibold shadow-none"
                />
              </div>
              <IndicatorToggle
                className="hidden sm:hidden md:flex"
                label={t`Ce arată harta`}
                options={MAP_MODES.map((key) => ({ key, label: mapModeLabel(key) }))}
                value={mode}
                onChange={(key) => move({ harta: key })}
              />
            </>
          }
          rows={rowsOf(maps, mapRows)}
        />
        <SectionBlock section="prezenta" rows={rowsOf(turnout, [['history'], ['counties'], ['distribution', 'kinds'], ['diaspora']])} />
        <SectionBlock section="curse" rows={rowsOf(races, [['margins'], ['closest', 'candidates'], ['kinds']])} />
      </RuledFrame>
    </div>
  )
}
