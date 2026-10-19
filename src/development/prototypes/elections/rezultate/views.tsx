import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, Check, ChartLine, ChevronDown, Flag, LayoutGrid, Link2, Map as MapIcon, Vote, type LucideIcon } from 'lucide-react'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { ChoiceSelect } from '@/features/private-companies/components/analytics/analytics-choices'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import { useUatResults } from '../principal/model'
import { useEvolutionPanels } from '../componente-fable/evolutie'
import { galleryNotes } from '../componente-fable/gallery'
import { useMapPanels } from '../componente-fable/harti'
import { useRacePanels } from '../componente-fable/intreceri'
import { CountyScopeProvider, PartyFocusProvider, useInScope, type Panel } from '../componente-fable/kit'
import { useMandatePanels } from '../componente-fable/mandate'
import {
  byLine,
  continuityOf,
  countyName,
  DOMESTIC_TURNOUT_2020,
  EVOLUTION,
  isNamedLine,
  lineStyle,
  SUMMARY,
  sum,
  turnoutOf,
  useEvolutionUat,
  type Family,
  type Line,
  type PartyCount,
  type Turnout,
} from '../componente-fable/model'
import { useTurnoutPanels } from '../componente-fable/prezenta'
import { CaveatsMarker, useFormat } from '../shared/parts'

/**
 * The results analytics page in the platform's analytics language (the
 * companies, procurement and national-budget pages): the view's question as
 * the headline over one row of controls, a sticky bar of views, the view's
 * four figures, then the view as one page of sections under sticky links that
 * follow the scroll (the owner's call, 2026-10-19). Five views — the parties
 * over time, the mandates, the map, turnout, the mayoral races. The county is
 * the scope (a searchable list in the head and a removable phrase in the
 * headline); the party in focus follows the reader across the views.
 *
 * URL: `tip` (the view), `dupa` (a section to open at), `judet`, `partid`.
 */

// ─────────────────────────────────────────────────────────── the views ──

type ViewKey = 'partide' | 'mandate' | 'harta' | 'prezenta' | 'curse'

/** A section of a view: its URL word (`dupa`) and the panel it shows. */
interface TabSpec {
  readonly key: string
  readonly panel: string
}

const VIEWS: readonly { readonly key: ViewKey; readonly icon: LucideIcon; readonly tabs: readonly TabSpec[] }[] = [
  {
    key: 'partide',
    icon: ChartLine,
    tabs: [
      { key: 'timp', panel: 'lines' },
      { key: 'fise', panel: 'cards' },
      { key: 'castiguri', panel: 'gains' },
      { key: 'ponderi', panel: 'columns' },
      { key: 'clasament', panel: 'ranks' },
    ],
  },
  {
    key: 'mandate',
    icon: LayoutGrid,
    tabs: [
      { key: 'primarii', panel: 'waffle' },
      { key: 'alegeri', panel: 'waffles' },
      { key: 'consiliu', panel: 'hemicycle' },
      { key: 'judete', panel: 'counties' },
      { key: 'consilieri', panel: 'councillors' },
    ],
  },
  {
    key: 'harta',
    icon: MapIcon,
    tabs: [
      { key: 'putere', panel: 'strength' },
      { key: 'schimbare', panel: 'swing' },
      { key: 'primarii', panel: 'flips' },
      { key: 'fluxuri', panel: 'flows' },
      { key: 'prezenta', panel: 'turnout' },
      { key: 'diferente', panel: 'margins' },
    ],
  },
  {
    key: 'prezenta',
    icon: Vote,
    tabs: [
      { key: 'timp', panel: 'history' },
      { key: 'judete', panel: 'counties' },
      { key: 'localitati', panel: 'distribution' },
      { key: 'strainatate', panel: 'diaspora' },
      { key: 'tip', panel: 'kinds' },
    ],
  },
  {
    key: 'curse',
    icon: Flag,
    tabs: [
      { key: 'diferente', panel: 'margins' },
      { key: 'stranse', panel: 'closest' },
      { key: 'candidati', panel: 'candidates' },
      { key: 'tip', panel: 'kinds' },
    ],
  },
]

function viewLabel(view: ViewKey): string {
  switch (view) {
    case 'partide':
      return t`Partide`
    case 'mandate':
      return t`Mandate`
    case 'harta':
      return t`Hartă`
    case 'prezenta':
      return t`Prezență`
    case 'curse':
      return t`Curse`
  }
}

function tabLabel(view: ViewKey, tab: string, county: string | null): string {
  const key = `${view}/${tab}`
  switch (key) {
    case 'partide/timp':
      return t`În timp`
    case 'partide/fise':
      return t`Partid cu partid`
    case 'partide/castiguri':
      return t`Câștiguri și pierderi`
    case 'partide/ponderi':
      return t`Cum s-a împărțit`
    case 'partide/clasament':
      return t`Clasament`
    case 'mandate/primarii':
      return t`Primării`
    case 'mandate/alegeri':
      return t`2016, 2020, 2024`
    case 'mandate/consiliu':
      return county ? t`Consiliul județean` : t`Consiliile județene`
    case 'mandate/judete':
      return t`Județe`
    case 'mandate/consilieri':
      return t`Consilieri locali`
    case 'harta/putere':
      return t`Puterea partidelor`
    case 'harta/schimbare':
      return t`Schimbarea 2016–2020`
    case 'harta/primarii':
      return t`Primării schimbate`
    case 'harta/fluxuri':
      return t`De la cine la cine`
    case 'harta/prezenta':
      return t`Prezența`
    case 'harta/diferente':
      return t`Diferențe la primărie`
    case 'prezenta/timp':
      return t`Din 1992`
    case 'prezenta/judete':
      return t`Pe județe`
    case 'prezenta/localitati':
      return t`Pe localități`
    case 'prezenta/strainatate':
      return t`Străinătate`
    case 'prezenta/tip':
      return t`Oraș și sat`
    case 'curse/diferente':
      return t`Diferențe`
    case 'curse/stranse':
      return t`Cele mai strânse`
    case 'curse/candidati':
      return t`Candidați`
    case 'curse/tip':
      return t`Oraș și sat`
    default:
      return tab
  }
}

/** The headline of a view laid out in sections: the whole view's question. */
function viewQuestion(view: ViewKey): string {
  switch (view) {
    case 'partide':
      return t`Cum au evoluat partidele`
    case 'mandate':
      return t`Cine conduce primăriile și consiliile`
    case 'harta':
      return t`Cum a votat fiecare localitate`
    case 'prezenta':
      return t`Câți merg la vot`
    case 'curse':
      return t`Cât de strânse au fost alegerile pentru primărie`
  }
}

/** The headline: the tab's question, without its mark (the county phrase goes before it). */
function questionOf(view: ViewKey, tab: string, county: string | null): string {
  switch (`${view}/${tab}`) {
    case 'partide/timp':
      return t`Cum au evoluat partidele`
    case 'partide/fise':
      return t`Cum stă fiecare partid`
    case 'partide/castiguri':
      return t`Cine a câștigat și cine a pierdut`
    case 'partide/ponderi':
      return t`Cum s-au împărțit voturile și primăriile`
    case 'partide/clasament':
      return t`Cine a avut cele mai multe primării`
    case 'mandate/primarii':
      return t`Cine conduce primăriile`
    case 'mandate/alegeri':
      return t`Cum s-au schimbat primăriile din 2016`
    case 'mandate/consiliu':
      return county ? t`Cum arată consiliul județean` : t`Cum arată consiliile județene`
    case 'mandate/judete':
      return t`Ce partid conduce fiecare județ`
    case 'mandate/consilieri':
      return t`Cine are consilierii locali`
    case 'harta/putere':
      return t`Unde e puternic fiecare partid`
    case 'harta/schimbare':
      return t`Unde a câștigat și unde a pierdut fiecare partid`
    case 'harta/primarii':
      return t`Unde a trecut primăria la alt partid`
    case 'harta/fluxuri':
      return t`De la cine la cine au trecut primăriile`
    case 'harta/prezenta':
      return t`Unde a scăzut prezența`
    case 'harta/diferente':
      return t`Unde s-a decis primăria la mustață`
    case 'prezenta/timp':
      return t`Câți au votat din 1992 încoace`
    case 'prezenta/judete':
      return t`Cât votează fiecare județ`
    case 'prezenta/localitati':
      return t`Cât de diferit votează localitățile`
    case 'prezenta/strainatate':
      return t`Cât votează românii din străinătate`
    case 'prezenta/tip':
      return t`Se votează mai mult la oraș sau la sat`
    case 'curse/diferente':
      return t`Cât de strânse au fost alegerile pentru primărie`
    case 'curse/stranse':
      return t`Unde s-a decis primăria la câteva voturi`
    case 'curse/candidati':
      return t`Câți candidați au fost la o primărie`
    case 'curse/tip':
      return t`Unde e puternic fiecare partid, la oraș și la sat`
    default:
      return t`Rezultatele alegerilor`
  }
}

// ─────────────────────────────────────────────────────── the URL state ──

const FOCUS_LINES: readonly Family[] = ['psd', 'pnl', 'usr', 'aur', 'udmr', 'pmp', 'alde', 'pro']

/** The 41 counties with 2024 local rows, by name; București has none in that edition yet. */
const COUNTIES: readonly string[] = Object.keys(SUMMARY.local2024.mayors.mandates.byCounty).sort((a, b) => countyName(a).localeCompare(countyName(b), 'ro'))

interface PageState {
  readonly view: ViewKey
  readonly tab: TabSpec
  readonly county: string | null
  readonly focus: Family | null
}

interface Move {
  readonly tip?: ViewKey
  readonly dupa?: string
  readonly judet?: string | null
  readonly partid?: Family | null
}

function usePageState() {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const spec = VIEWS.find((view) => view.key === search.tip) ?? VIEWS[0]
  const view = spec?.key ?? 'partide'
  const tabs = spec?.tabs ?? []
  const tab = tabs.find((item) => item.key === search.dupa) ?? tabs[0] ?? { key: 'timp', panel: 'lines' }
  const state: PageState = {
    view,
    tab,
    county: COUNTIES.find((code) => code === search.judet) ?? null,
    focus: FOCUS_LINES.find((line) => line === search.partid) ?? null,
  }
  // Every key written, absent ones as undefined: the root's search merges over the page's (the router's merge trap).
  const move = (patch: Move) =>
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => {
        const nextView = patch.tip ?? state.view
        const nextTab = 'dupa' in patch ? patch.dupa : patch.tip && patch.tip !== state.view ? undefined : state.tab.key
        const firstTab = VIEWS.find((v) => v.key === nextView)?.tabs[0]?.key
        return {
          ...previous,
          tip: nextView === 'partide' ? undefined : nextView,
          dupa: nextTab === firstTab ? undefined : nextTab,
          judet: 'judet' in patch ? (patch.judet ?? undefined) : (state.county ?? undefined),
          partid: 'partid' in patch ? (patch.partid ?? undefined) : (state.focus ?? undefined),
        }
      },
      resetScroll: false,
    })
  return { state, move } as const
}

// ─────────────────────────────────────────────────────────── the head ──

/** A control in the row: quiet words, a 44 px target on a phone (as the companies head). */
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
/** A dropdown in the row: a bordered value beside the quiet controls. */
const CHOICE =
  'inline-flex h-9 w-auto items-center gap-2 rounded-none border border-foreground/25 bg-background px-3 text-sm shadow-none transition-colors hover:border-foreground/60'

/** The headline's room (the companies head's): the controls below it stay put as the question changes. */
const HEADLINE_ROOM = 'min-h-[min(6.12rem,24.5cqi)] sm:min-h-[min(6.12rem,8.98cqi)]'

function headlineSize(length: number): string {
  const phone = length <= 34 ? 'text-[length:min(2.5rem,10cqi)]' : length <= 66 ? 'text-[length:min(2rem,8cqi)]' : 'text-[length:min(1.5rem,6cqi)]'
  const wide = length <= 36 ? 'sm:text-[length:min(3.75rem,5.5cqi)]' : length <= 76 ? 'sm:text-[length:min(3rem,4.4cqi)]' : 'sm:text-[length:min(2.5rem,3.67cqi)]'
  return `${phone} ${wide}`
}

/** The county list: 41 names, so a search over a scrolling list (the filter-panel rule past eight values). */
function CountyMenu({
  county,
  open,
  onOpenChange,
  onChange,
}: {
  readonly county: string | null
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onChange: (code: string | null) => void
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className={CHOICE} aria-label={county ? t`Județul: ${countyName(county)}` : t`Județul: toată țara`}>
        <span className="text-muted-foreground">
          <Trans>Județul:</Trans>
        </span>
        <span className="font-semibold text-foreground">{county ? countyName(county) : t`toată țara`}</span>
        <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,18rem)] p-0">
        <Command>
          <CommandInput placeholder={t`Caută un județ`} />
          <CommandList className="max-h-72">
            <CommandEmpty>
              <Trans>Niciun județ cu acest nume.</Trans>
            </CommandEmpty>
            <CommandItem
              value={t`toată țara`}
              onSelect={() => {
                onChange(null)
                onOpenChange(false)
              }}
            >
              <Check className={cn('size-4', county === null ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
              {t`toată țara`}
            </CommandItem>
            {COUNTIES.map((code) => (
              <CommandItem
                key={code}
                value={countyName(code)}
                onSelect={() => {
                  onChange(code)
                  onOpenChange(false)
                }}
              >
                <Check className={cn('size-4', county === code ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                {countyName(code)}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function PartySelect({ focus, onChange }: { readonly focus: Family | null; readonly onChange: (line: Family | null) => void }) {
  return (
    <ChoiceSelect
      value={focus ?? 'toate'}
      groups={[{ options: [{ value: 'toate', label: t`toate` }, ...FOCUS_LINES.map((line) => ({ value: line, label: lineStyle(line).label }))] }]}
      onChange={(value) => onChange(FOCUS_LINES.find((line) => line === value) ?? null)}
      label={t`Partidul în atenție`}
      triggerClassName={cn(CHOICE, '[&>svg]:opacity-70')}
    >
      <span className="flex items-center gap-2 truncate">
        <span className="mr-0.5 text-muted-foreground">
          <Trans>Partidul:</Trans>
        </span>
        {focus ? <span className={cn('size-3 shrink-0 rounded-[2px]', lineStyle(focus).swatch)} aria-hidden="true" /> : null}
        <span className="font-semibold text-foreground">{focus ? lineStyle(focus).label : t`toate`}</span>
      </span>
    </ChoiceSelect>
  )
}

interface ReadyQuestion {
  readonly group: string
  readonly text: string
  readonly to: Move
}

function readyQuestions(): readonly ReadyQuestion[] {
  return [
    { group: t`Partide`, text: t`Cum a evoluat PSD la Cameră și în primării?`, to: { tip: 'partide', dupa: 'timp', partid: 'psd' } },
    { group: t`Mandate`, text: t`Cine conduce cele mai multe primării?`, to: { tip: 'mandate', dupa: 'primarii' } },
    { group: t`Hartă`, text: t`Unde a pierdut PSD între 2016 și 2020?`, to: { tip: 'harta', dupa: 'schimbare', partid: 'psd' } },
    { group: t`Hartă`, text: t`Unde e puternic AUR?`, to: { tip: 'harta', dupa: 'putere', partid: 'aur' } },
    { group: t`Hartă`, text: t`Unde a trecut primăria la alt partid?`, to: { tip: 'harta', dupa: 'primarii' } },
    { group: t`Mandate`, text: t`Ce partid conduce fiecare județ?`, to: { tip: 'mandate', dupa: 'judete' } },
    { group: t`Prezență`, text: t`Cât a scăzut prezența la parlamentare?`, to: { tip: 'prezenta', dupa: 'timp' } },
    { group: t`Prezență`, text: t`Cât a crescut votul din străinătate?`, to: { tip: 'prezenta', dupa: 'strainatate' } },
    { group: t`Curse`, text: t`Unde s-a decis primăria la câteva voturi?`, to: { tip: 'curse', dupa: 'stranse' } },
    { group: t`Curse`, text: t`Unde a fost un singur candidat?`, to: { tip: 'harta', dupa: 'diferente' } },
  ]
}

function QuestionsMenu({ onPick }: { readonly onPick: (move: Move) => void }) {
  const [open, setOpen] = useState(false)
  const questions = readyQuestions()
  const groups = [...new Set(questions.map((question) => question.group))]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={LINK}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(70vh,var(--radix-popover-content-available-height))] w-[min(92vw,22rem)] overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group} className="py-1">
            <MonoLabel className="block px-2 py-1 text-muted-foreground">{group}</MonoLabel>
            {questions
              .filter((question) => question.group === group)
              .map((question) => (
                <button
                  key={question.text}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    onPick(question.to)
                  }}
                  className="block min-h-9 w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {question.text}
                </button>
              ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // The clipboard exists only in a secure context (not over a plain-http dev address): then there is nothing to copy with.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button type="button" className={LINK} aria-label={copied ? t`Legătura a fost copiată` : t`Copiază legătura spre această vedere`} onClick={() => void copy()}>
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

function Head({ state, move }: { readonly state: PageState; readonly move: (patch: Move) => void }) {
  const format = useFormat()
  const [countyOpen, setCountyOpen] = useState(false)
  const question = viewQuestion(state.view)
  const place = state.county ? countyName(state.county) : null
  const plain = place ? t`${question} în ${place}?` : t`${question}?`
  return (
    <section className="relative border-b" aria-labelledby="results-analytics-title">
      <TwoLayerLattice idPrefix="results-analytics" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <a href="/development/elections/hub" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Alegeri`}</span>
            </a>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <p className="text-xs text-muted-foreground sm:text-sm">
            <Trans>Extras pe {format.day(EVOLUTION.readAt)} · BEC, AEP, ROAEP</Trans>
          </p>
        </div>
        <div className="mt-4 @container sm:mt-6">
          <div className={cn('flex flex-col justify-end', HEADLINE_ROOM)}>
            <h1
              id="results-analytics-title"
              aria-label={plain}
              className={cn(headlineSize(plain.length), 'text-balance break-words font-extrabold leading-[1.02] tracking-tighter text-foreground')}
            >
              {question}
              {place ? (
                <>
                  {' '}
                  <HeadlinePhrase text={t`în ${place}`} removeLabel={t`Scoate „${place}”`} onOpen={() => setCountyOpen(true)} onRemove={() => move({ judet: null })} />
                </>
              ) : null}
              ?
            </h1>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex flex-wrap items-center gap-2">
            <CountyMenu county={state.county} open={countyOpen} onOpenChange={setCountyOpen} onChange={(code) => move({ judet: code })} />
            <PartySelect focus={state.focus} onChange={(line) => move({ partid: line })} />
          </span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <QuestionsMenu onPick={move} />
            <CopyLink />
            <CaveatsMarker notes={galleryNotes()} />
          </span>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the bar ──

/** The sticky bar (the companies' mode bar): the question on the left from a wide screen, the five views with their marks on the right. */
function ViewBar({ state, move }: { readonly state: PageState; readonly move: (patch: Move) => void }) {
  const ref = useHeightVar('--bar-h')
  return (
    <nav ref={ref} aria-label={t`Vederile`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground lg:block lg:max-w-md">
          {state.county ? t`Rezultatele alegerilor, ${countyName(state.county)}` : t`Rezultatele alegerilor`}
        </span>
        <ol className="hide-scrollbar -mx-1 flex min-w-0 flex-1 gap-5 overflow-x-auto px-1 sm:gap-6 lg:flex-none lg:justify-end lg:ml-auto">
          {VIEWS.map(({ key, icon: Icon }) => {
            const active = state.view === key
            return (
              <li key={key} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    move({ tip: key })
                    // From deep in a view, the next one starts at its figures, not mid-page.
                    const figures = document.getElementById('results-figures')
                    if (figures && figures.getBoundingClientRect().top < 0) figures.scrollIntoView({ block: 'start' })
                  }}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 whitespace-nowrap border-b-2 text-sm leading-tight transition-colors',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active && 'text-primary')} aria-hidden="true" />
                  {viewLabel(key)}
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ──────────────────────────────────────────────────────── the figures ──

function spanLink(label: ReactNode, className: string) {
  return <span className={className}>{label}</span>
}

const pct1 = (value: number) => Math.round(1000 * value) / 10

/** The lines of a tally, largest first, „Alte partide" left out (it is not a party). */
function ranked(counts: readonly PartyCount[] | null | undefined): readonly (readonly [Line, number, number])[] {
  if (!counts) return []
  const whole = sum(counts)
  return [...byLine(counts)]
    .filter(([line]) => isNamedLine(line))
    .sort((a, b) => b[1] - a[1])
    .map(([line, n]) => [line, n, whole > 0 ? n / whole : 0] as const)
}

/** What the UAT rows say for the scope: races, flips and turnout change. Null while they load (or if they failed: `failed`). */
function useUatFacts() {
  const results = useUatResults()
  const evolution = useEvolutionUat()
  const scope = useInScope()
  const failed = results.isError || evolution.isError
  const facts = useMemo(() => {
    const r = results.data
    const e = evolution.data
    if (!r || !e || !scope.ready) return null
    let races = 0
    let close = 0
    let solo = 0
    let ties = 0
    let candidates = 0
    for (const [siruta, row] of Object.entries(r.local2024Mayors)) {
      if (!scope.has(siruta)) continue
      races++
      candidates += row[4]
      if (row[0] === '~tie') ties++
      else if (row[4] <= 1) solo++
      else if (row[2] < 50) close++
    }
    let compared = 0
    let changed = 0
    for (const [siruta, party] of Object.entries(e.mayors2016)) {
      if (!scope.has(siruta)) continue
      const row = r.local2024Mayors[siruta]
      if (!row || row[0] === '~tie') continue
      // The map's own rule: compared on the competitors, an independent twice neither kept nor changed.
      const continuity = continuityOf(party, row[0])
      if (continuity === 'independent' || continuity === 'alliance') continue
      compared++
      if (continuity === 'changed') changed++
    }
    let turnoutPairs = 0
    let turnoutFell = 0
    let reg16 = 0
    let vot16 = 0
    for (const [siruta, a] of Object.entries(e.turnout2016)) {
      if (!scope.has(siruta)) continue
      reg16 += a[0]
      vot16 += a[1]
      const b = e.turnout2020[siruta]
      const ta = turnoutOf(a)
      const tb = b ? turnoutOf(b) : null
      if (ta === null || tb === null) continue
      turnoutPairs++
      if (tb < ta) turnoutFell++
    }
    return { races, close, solo, ties, candidates, compared, changed, turnoutPairs, turnoutFell, turnout2016: reg16 > 0 ? vot16 / reg16 : null } as const
  }, [results.data, evolution.data, scope])
  return { facts, failed } as const
}

function Figures({ state }: { readonly state: PageState }) {
  const format = useFormat()
  const { facts: uat, failed } = useUatFacts()
  const county = state.county
  const local = SUMMARY.local2024
  const mayors = (county ? local.mayors.mandates.byCounty[county] : local.mayors.mandates.national) ?? []
  const chamber = county ? EVOLUTION.chamber['2020'].byCounty[county] : EVOLUTION.chamber['2020'].national
  const turnout = (pair: Turnout | undefined) => (pair ? turnoutOf(pair) : null)
  const percent = (key: string, value: number | null, label: ReactNode, note: ReactNode): HubFact | null =>
    value === null ? null : { key, value: pct1(value), digits: 1, unit: '%', label, note, link: spanLink }
  const count = (key: string, value: number | null | undefined, label: ReactNode, note: ReactNode): HubFact | null =>
    value === null || value === undefined ? null : { key, value, digits: 0, label, note, link: spanLink }
  const place = county ? countyName(county) : null

  let facts: readonly (HubFact | null)[] = []
  switch (state.view) {
    case 'partide': {
      const [c1, c2] = ranked(chamber)
      const [m1, m2] = ranked(mayors)
      facts = [
        c1 ? percent('c1', c1[2], <Trans>{lineStyle(c1[0]).label} la Cameră, 2020</Trans>, <Trans>primul partid, din voturi</Trans>) : null,
        c2 ? percent('c2', c2[2], <Trans>{lineStyle(c2[0]).label} la Cameră, 2020</Trans>, <Trans>al doilea</Trans>) : null,
        m1 ? count('m1', m1[1], <Trans>Primării {lineStyle(m1[0]).label}, 2024</Trans>, <Trans>din {format.n(sum(mayors))}</Trans>) : null,
        m2 ? count('m2', m2[1], <Trans>Primării {lineStyle(m2[0]).label}, 2024</Trans>, <Trans>al doilea</Trans>) : null,
      ]
      break
    }
    case 'mandate': {
      const council = (county ? local.countyCouncillors.byCounty[county] : local.countyCouncillors.national) ?? []
      const councillors = (county ? local.councillors.byCounty[county] : local.councillors.national) ?? []
      const [group] = ranked(council)
      const leaders = Object.values(local.mayors.mandates.byCounty).map((counts) => ranked(counts)[0]?.[0] ?? null)
      const [lead] = ranked(mayors)
      const counties = lead ? leaders.filter((line) => line === lead[0]).length : null
      facts = [
        count('mayors', sum(mayors), <Trans>Primării, 2024</Trans>, place ? <Trans>în {place}</Trans> : <Trans>fără București</Trans>),
        count(
          'council',
          sum(council),
          county ? <Trans>Mandate în consiliul județean</Trans> : <Trans>Consilieri județeni</Trans>,
          group ? (
            <Trans>
              cel mai mare grup: {lineStyle(group[0]).label}, {format.n(group[1])}
            </Trans>
          ) : null,
        ),
        count('local', sum(councillors), <Trans>Consilieri locali</Trans>, <Trans>mandate, 2024</Trans>),
        county
          ? lead
            ? count('lead', lead[1], <Trans>Primării {lineStyle(lead[0]).label}</Trans>, <Trans>primul partid în județ</Trans>)
            : null
          : lead && counties !== null
            ? count(
                'counties',
                counties,
                <Trans>Județe cu cele mai multe primării la {lineStyle(lead[0]).label}</Trans>,
                <Trans>din {format.n(leaders.length)}, fără București</Trans>,
              )
            : null,
      ]
      break
    }
    case 'harta':
      facts = uat
        ? [
            count('changed', uat.changed, <Trans>Primării trecute la alt partid</Trans>, <Trans>2016 → 2024, din {format.n(uat.compared)} comparabile</Trans>),
            count('kept', uat.compared - uat.changed, <Trans>Primării păstrate de același partid</Trans>, <Trans>2016 → 2024</Trans>),
            count('fell', uat.turnoutFell, <Trans>Localități unde prezența a scăzut</Trans>, <Trans>parlamentare 2016 → 2020, din {format.n(uat.turnoutPairs)}</Trans>),
            count('close', uat.close, <Trans>Primării decise la sub 5 puncte</Trans>, <Trans>2024</Trans>),
          ]
        : []
      break
    case 'prezenta': {
      const series = EVOLUTION.turnout.parliamentary
      const first = series[0]
      const last = series[series.length - 1]
      // Nationally the 2020 and 2019 figures count the voters abroad (as the official ones do); a county is compared with the country without them.
      const domestic = turnout(DOMESTIC_TURNOUT_2020)
      const parl = county ? turnout(SUMMARY.parliamentary2020.turnout.byCounty[county]) : last ? last[2] / last[1] : null
      const lastYear = county ? 2020 : (last?.[0] ?? 2020)
      facts = [
        percent(
          'parl',
          parl,
          <Trans>Prezența la parlamentare, {lastYear}</Trans>,
          county ? (
            domestic !== null ? (
              <Trans>{format.n(pct1(domestic))} % în țară, fără străinătate</Trans>
            ) : null
          ) : first ? (
            <Trans>
              cu străinătatea; {format.n(pct1(first[2] / first[1]))} % în {first[0]}
            </Trans>
          ) : (
            <Trans>cu străinătatea</Trans>
          ),
        ),
        percent('local', turnout(county ? local.turnout.byCounty[county] : local.turnout.national), <Trans>Prezența la locale, 2024</Trans>, <Trans>fără București</Trans>),
        percent(
          'pres',
          turnout(county ? SUMMARY.presidential2019.turnout.byCounty[county] : SUMMARY.presidential2019.turnout.national),
          <Trans>Prezența la prezidențiale, 2019</Trans>,
          county ? <Trans>turul raportat de ediție</Trans> : <Trans>cu străinătatea; turul raportat de ediție</Trans>,
        ),
        county
          ? uat
            ? percent('p16', uat.turnout2016, <Trans>Prezența la parlamentare, 2016</Trans>, <Trans>din localitățile județului</Trans>)
            : null
          : count('abroad', EVOLUTION.diasporaVoters['2020'], <Trans>Votanți în străinătate, 2020</Trans>, <Trans>{format.n(EVOLUTION.diasporaVoters['2008'])} în 2008</Trans>),
      ]
      break
    }
    case 'curse':
      facts = uat
        ? [
            count('close', uat.close, <Trans>Primării decise la sub 5 puncte</Trans>, <Trans>din {format.n(uat.races)} curse cu rând de vot, 2024</Trans>),
            count('solo', uat.solo, <Trans>Primării cu un singur candidat</Trans>, <Trans>2024</Trans>),
            count('ties', uat.ties, <Trans>Egalități la primărie</Trans>, <Trans>în voturile numărate</Trans>),
            uat.races > 0
              ? {
                  key: 'avg',
                  value: Math.round((10 * uat.candidates) / uat.races) / 10,
                  digits: 1,
                  label: <Trans>Candidați la o primărie, în medie</Trans>,
                  note: <Trans>2024</Trans>,
                  link: spanLink,
                }
              : null,
          ]
        : []
      break
  }
  const shown = facts.filter((fact): fact is HubFact => fact !== null)
  return (
    <section id="results-figures" className="border-b bg-muted/20" aria-label={t`Cifre-cheie`} style={{ scrollMarginTop: 'var(--bar-h, 0px)' }}>
      <RuledFrame>
        {shown.length > 0 ? (
          <HubFiguresBand facts={shown} locale={format.locale} />
        ) : failed ? (
          <p className="py-10 text-sm text-muted-foreground">
            <Trans>Cifrele pe localități nu s-au încărcat.</Trans>
          </p>
        ) : (
          <div className="h-36 animate-pulse bg-muted/30 sm:h-40" aria-hidden="true" />
        )}
      </RuledFrame>
    </section>
  )
}

// ──────────────────────────────────────────────────────── the answer ──

/** One answer's foot: its plain line, then its caveats behind the marker. */
function PanelFoot({ panel }: { readonly panel: Panel }) {
  const notes = panel.notes ?? []
  if (!panel.foot && notes.length === 0) return null
  return (
    <p className="mt-6 flex min-h-8 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
      <span>{panel.foot ?? <Trans>Despre date</Trans>}</span>
      {notes.length > 0 ? <CaveatsMarker notes={notes} /> : null}
    </p>
  )
}

/**
 * A ref that writes its element's height (in px) as a CSS variable on the
 * page root, and keeps it current as the element wraps or the fonts load.
 */
function useHeightVar(name: string) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const element = ref.current
    const root = element?.closest<HTMLElement>('[data-results-root]')
    if (!element || !root) return
    const write = () => root.style.setProperty(name, `${String(element.getBoundingClientRect().height)}px`)
    write()
    const observer = new ResizeObserver(write)
    observer.observe(element)
    return () => observer.disconnect()
  }, [name])
  return ref
}

/** Under both sticky bars: where a section's top counts as reached. */
function stickyOffset(): number {
  const root = document.querySelector<HTMLElement>('[data-results-root]')
  const read = (name: string) => Number.parseFloat(root ? getComputedStyle(root).getPropertyValue(name) : '') || 0
  return read('--bar-h') + read('--jump-h')
}

/**
 * The section being read: the last whose top has passed under the two sticky
 * bars (with a little room), or the last one once the page is scrolled to its
 * end (a short last section never reaches the line).
 */
function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const line = stickyOffset() + 24
      let current = ids[0]
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && top <= line) current = id
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = ids[ids.length - 1]
      setActive(current)
    }
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [ids])
  return active
}

/**
 * Mounts its content only once it nears the screen (a sections page holds up
 * to six maps: each builds its model and hit-test grid). The placeholder keeps
 * a map's height, so the page does not jump much as sections arrive.
 */
function Deferred({ children }: { readonly children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (shown || !element) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const observer = new IntersectionObserver((entries) => entries.some((entry) => entry.isIntersecting) && setShown(true), { rootMargin: '900px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [shown])
  return <div ref={ref}>{shown ? children : <div className="min-h-[34rem]" aria-hidden="true" />}</div>
}

/**
 * A view as one page: a sticky row of links to its sections (underlined as
 * the reader reaches each), then every answer under its own heading. A ready
 * question that names a section scrolls to it.
 */
function SectionsAnswer({ state, panels }: { readonly state: PageState; readonly panels: readonly Panel[] }) {
  const spec = VIEWS.find((view) => view.key === state.view)
  const tabs = useMemo(() => spec?.tabs ?? [], [spec])
  const ids = useMemo(() => tabs.map((tab) => `${state.view}-${tab.key}`), [tabs, state.view])
  const active = useActiveSection(ids)
  const navRef = useHeightVar('--jump-h')
  const asked = state.tab.key
  const first = tabs[0]?.key
  useEffect(() => {
    // Only a tab the address names (not the default first one): the page opens at its top otherwise.
    if (asked === first) return
    document.getElementById(`${state.view}-${asked}`)?.scrollIntoView({ block: 'start' })
  }, [asked, first, state.view])
  useEffect(() => {
    // On a phone the row scrolls sideways: keep the section being read in sight (sideways only — never the page).
    const nav = navRef.current
    const link = active ? nav?.querySelector<HTMLElement>(`[data-section="${active}"]`) : null
    if (nav && link) nav.scrollTo({ left: Math.max(0, link.offsetLeft - 16), behavior: 'smooth' })
  }, [active, navRef])
  return (
    <section className="border-b" aria-label={viewLabel(state.view)}>
      <RuledFrame className="py-10 sm:py-14">
        {/* Sticky under the view bar; the page root carries both heights (--bar-h, --jump-h) for the sections' scroll margin. */}
        <nav
          ref={navRef}
          aria-label={t`Secțiunile`}
          className="hide-scrollbar sticky z-10 -mx-4 flex gap-5 overflow-x-auto bg-background/90 px-4 shadow-[inset_0_-1px_0_hsl(var(--border))] backdrop-blur sm:mx-0 sm:px-0"
          style={{ top: 'var(--bar-h, 0px)' }}
        >
          {tabs.map((tab) => {
            const id = `${state.view}-${tab.key}`
            const current = id === active
            return (
              <a
                key={tab.key}
                href={`#${id}`}
                data-section={id}
                aria-current={current ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
                  // The keyboard follows the jump: the section's heading takes the focus (without a second scroll).
                  document.getElementById(`${id}-title`)?.focus({ preventScroll: true })
                }}
                className={cn(
                  'flex min-h-11 shrink-0 items-center border-b-2 transition-colors',
                  current ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tabLabel(state.view, tab.key, state.county)}
              </a>
            )
          })}
        </nav>
        <div className="divide-y divide-border/70">
          {tabs.map((tab, index) => {
            const panel = panels.find((item) => item.id === tab.panel)
            if (!panel) return null
            return (
              <section
                key={tab.key}
                id={`${state.view}-${tab.key}`}
                aria-labelledby={`${state.view}-${tab.key}-title`}
                className="py-12 first:pt-10 last:pb-0"
                style={{ scrollMarginTop: 'calc(var(--bar-h, 0px) + var(--jump-h, 0px) + 16px)' }}
              >
                <h2 id={`${state.view}-${tab.key}-title`} tabIndex={-1} className="text-xl font-semibold tracking-tight text-foreground focus:outline-none">
                  {tabLabel(state.view, tab.key, state.county)}
                </h2>
                {/* The section asks its own question; one the headline already asks is not repeated. */}
                {questionOf(state.view, tab.key, state.county) === viewQuestion(state.view) ? null : (
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{questionOf(state.view, tab.key, state.county)}?</p>
                )}
                {state.county && panel.scope === 'national' ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <Trans>Graficul e doar național: arată țara întreagă, nu județul ales.</Trans>
                  </p>
                ) : null}
                <div className="mt-6">{index === 0 ? panel.body : <Deferred>{panel.body}</Deferred>}</div>
                <PanelFoot panel={panel} />
              </section>
            )
          })}
        </div>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────────── the page ──

export function ResultsViews() {
  const { state, move } = usePageState()
  return (
    <CountyScopeProvider value={state.county}>
      <PartyFocusProvider value={{ value: state.focus, set: (line) => move({ partid: line }) }}>
        <ViewsBody state={state} move={move} />
      </PartyFocusProvider>
    </CountyScopeProvider>
  )
}

function ViewsBody({ state, move }: { readonly state: PageState; readonly move: (patch: Move) => void }) {
  const place = state.county ? countyName(state.county) : null
  useClientDocumentTitle(place ? t`Rezultatele alegerilor în ${place} · analize` : t`Rezultatele alegerilor · analize`)
  // Every view's panels from its own hook (hooks run on every render); only the view's are drawn.
  const panels: Readonly<Record<ViewKey, readonly Panel[]>> = {
    partide: useEvolutionPanels(),
    mandate: useMandatePanels(),
    harta: useMapPanels(),
    prezenta: useTurnoutPanels(),
    curse: useRacePanels(),
  }
  return (
    <div data-results-root className="relative w-full overflow-x-clip bg-background">
      <Head state={state} move={move} />
      <ViewBar state={state} move={move} />
      <Figures state={state} />
      <SectionsAnswer state={state} panels={panels[state.view]} />
    </div>
  )
}
