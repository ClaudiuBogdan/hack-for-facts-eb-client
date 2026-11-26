import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { ArrowRight, LoaderCircle, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SEARCH_FIELD_CLASS, SEARCH_FIELD_KEYBOARD_CLASS, SEARCH_INPUT_CLASS } from '@/features/landing/components/search/search-field'
import { fetchLegalSearch } from '@/features/legal/api/legal-search-api'
import { resolveLegalActs } from '@/features/legal/api/legal-resolve-api'
import { LegalInfoNote } from '@/features/legal/components/hub/legislation-hub-chrome'
import { LegalStatusBadge } from '@/features/legal/components/legal-status-badge'
import { LegislationActiveFilters, LegislationFilterPanel } from '@/features/legal/components/legislation-search-filters'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'
import { parseLegalCitationShape } from '@/features/legal/lib/legal-citation'
import { formatLegalDate, formatLegalNumber } from '@/features/legal/lib/legal-format'
import { isConsolidationVersion, portalConsolidationNote } from '@/features/legal/lib/legal-versions'
import { legalIssuerLabel } from '@/features/legal/lib/legal-vocabulary'
import { groupProvisions, markWords, questionWords, type ProvisionGroup } from '@/features/legal/lib/search-marks'
import { activeFilterCount, isSearchFiltered, readSearchFilters, searchArgs, searchHitName, searchOfFilters, usesSummaries, type SearchFilters } from '@/features/legal/lib/search-filters'
import { cn } from '@/lib/utils'
import { LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT, legalActStatusSchema, type LegalActStatus, type LegalResolveHit, type LegalSearchActHit, type LegalSearchResultData } from '@/schemas/legal'
import { PROTOTYPE_MARKER } from './landing.lib'
import { SearchHeadShell } from './search.r2.head'

/**
 * `/legislation/search`, round 2 (owner, 26 November 2026: „polish and redesign"). The same reads, filters and
 * sentences as the live page (`legislation-act-finder.tsx`); what changes is what the eye meets first.
 *
 * 1. The question leads: a larger field, the filters beside it, „/" brings the cursor to it.
 * 2. A citation that names one act is answered with that act, in the hub's card, before any list. Only the
 *    resolver decides this (exactly one act, no filter on): a relevance score never does.
 * 3. The list is a register: the year in a rail, the act, its citations at the right. The question's words are
 *    set in bold where they appear in a name or a description.
 * 4. A matched provision is a link to that provision in the act's text, its fragments gathered under one label.
 * 5. The empty page shows three ways to ask, once, in place of „what you find here".
 * 6. What was searched is said beside the count; the rest stays behind the ⓘ. A zero answer keeps its sentence.
 * 7. The status is a small shape and its name in plain text, not a tinted badge (since moved into
 *    `LegalStatusBadge`, for every legislation page).
 *
 * The question and the filters live in the address (`?q=`, then the live page's filter keys), so every state has
 * a link. Promoted to `/legislation/search` on 26 November 2026 (`legislation-act-finder.tsx`); kept as the record
 * of the design. Its pure parts (`lib/search-marks.ts`) and the provisions' paths (`nodePath`, in the search
 * adapter's query) now live in the feature, and this page reads them from there.
 *
 * Left out on purpose (the legislation session, 26 November 2026): `entryIntoForce` (the date of whichever form
 * was canonical, not the act's), `amendedAfterPublication` (references, not amending acts), any promise of an
 * act's text (6,174 public acts serve none), and the summaries' domains (one question's acts share them).
 */

/** Three ways to ask, each example a measured hit on the dev API (26 November 2026). */
const WAYS = [
  ['Legea 287/2009', 'OUG 57/2019', 'Legea 98/2016'],
  ['Codul civil', 'Codul administrativ', 'Legea achizițiilor publice'],
  ['concediu de odihnă', 'achiziții publice', 'salariul minim'],
] as const

/** The search runs this long after the reader stops typing. */
const TYPING_PAUSE_MS = 300
/** Fewer letters than this wait for Enter. */
const TYPED_MIN = 3
/** How long a citation's answer waits for the resolver before the list is drawn without it. */
const LEAD_WAIT_MS = 1000
const MORE_LINK = 'inline-flex min-h-11 items-center gap-1.5 text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0'
/** The hubs' hero card: solid, with a light shadow off the lattice. */
const CARD = 'border bg-background p-5 shadow-sm sm:p-6'
/** The register's columns: the year, the act, its citations. */
const ROW_GRID = 'sm:grid sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-x-5 lg:grid-cols-[3.5rem_minmax(0,1fr)_5.5rem]'

/** The page in the legislation pages' own head: the title, its sentence and the sources, the pinned row, then the field and the answer. */
export function SearchRoundTwo() {
  const { measuredAt, dataStatus } = useLegislationFrontier('corpus')
  const page = useSearchPage()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <LegislationShell activeTab="cauta" measuredAt={measuredAt} dataStatus={dataStatus}>
        <div className="max-w-4xl">
          {page.field}
          <div className="mt-8">{page.answer}</div>
        </div>
        {page.panel}
      </LegislationShell>
    </div>
  )
}

/** The same page with the field in a shorter head of its own (`search.r2.head.tsx`): the question is the head. */
export function SearchRoundTwoHead() {
  const { measuredAt, dataStatus } = useLegislationFrontier('corpus')
  const page = useSearchPage()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <SearchHeadShell field={page.field} measuredAt={measuredAt} dataStatus={dataStatus}>
        <div className="max-w-4xl">{page.answer}</div>
        {page.panel}
      </SearchHeadShell>
    </div>
  )
}

/** The address's `q`: the router reads „2003" back as a number. */
const queryOf = (raw: unknown): string => (typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '')

/** The page's three parts, for a frame to place: the search form, the answer under it, and the filters' panel. */
function useSearchPage(): { readonly field: ReactNode; readonly answer: ReactNode; readonly panel: ReactNode } {
  const address = useSearch({ strict: false }) as Record<string, unknown>
  const navigate = useNavigate()
  const q = queryOf(address['q'])
  const filters = readSearchFilters(address)
  const [panel, setPanel] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)

  // The box mirrors the address only where the address says something else, as on the live page.
  const [draft, setDraft] = useState(q)
  const typed = useRef(draft)
  typed.current = draft
  const sent = useRef<string | null>(null)
  useEffect(() => {
    const own = sent.current
    sent.current = null
    if (own !== null && q === own) return
    if (typed.current.trim() !== q) setDraft(q)
  }, [q])

  const sendQuery = (next: string, options: { readonly replace: boolean }) => {
    if (next !== q) sent.current = next
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, q: next.length > 0 ? next : undefined }),
      replace: options.replace,
      resetScroll: false,
    })
  }
  const setFilters = (next: SearchFilters) => {
    void navigate({
      to: '.',
      search: (previous: Record<string, unknown>) => ({ ...previous, ...searchOfFilters(next) }),
      replace: false,
      resetScroll: false,
    })
  }

  useEffect(() => {
    const next = draft.trim()
    if (next === q || (next.length > 0 && next.length < TYPED_MIN)) return
    const timer = window.setTimeout(() => sendQuery(next, { replace: true }), TYPING_PAUSE_MS)
    return () => window.clearTimeout(timer)
    // `sendQuery` is rebuilt each render and reads nothing captured but `q`; the pause restarts when the box changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, q])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next = draft.trim()
    if (next.length > 0) sendQuery(next, { replace: true })
  }
  const run = (example: string) => {
    setDraft(example)
    sendQuery(example, { replace: false })
  }

  const { filter, historical } = searchArgs(filters)
  const asked = q.length > 0
  const search = useQuery({
    queryKey: ['legal', 'finder-search', q, historical, filter],
    queryFn: ({ signal }) => fetchLegalSearch(q, { historical, filter, signal }),
    enabled: asked,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  })
  // The resolver lane is auxiliary: no retry, and its failure is silence.
  const resolve = useQuery({
    queryKey: ['legal', 'finder-resolve', q],
    queryFn: ({ signal }) => resolveLegalActs(q, { signal }),
    enabled: asked,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  // The resolver is waited for only so long: past it, the answer is drawn and a late act still takes its place.
  const [waited, setWaited] = useState<string | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(q), LEAD_WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [q])
  return {
    field: (
      <form onSubmit={onSubmit} role="search" aria-label={t`Caută în legislație`}>
        <div className="flex items-start gap-2">
          <Field draft={draft} onDraft={setDraft} busy={asked && search.isFetching} />
          <FilterButton ref={filterButton} filters={filters} onOpen={() => setPanel(true)} />
        </div>
      </form>
    ),
    answer: asked ? (
      <Answer q={q} filters={filters} onFilters={setFilters} search={search} resolveHits={resolve.data ?? []} resolving={resolve.isPending && waited !== q} />
    ) : (
      <Ways onExample={run} />
    ),
    panel: <LegislationFilterPanel filters={filters} onChange={setFilters} open={panel} onOpenChange={setPanel} returnFocus={() => filterButton.current?.focus()} />,
  }
}

/**
 * The landing's field a size up, without its lift on focus (its answers open in a panel under it; here they are the
 * page). „/" anywhere on the page brings the cursor to it. The ring is drawn for the keyboard only.
 */
function Field({ draft, onDraft, busy }: { readonly draft: string; readonly onDraft: (value: string) => void; readonly busy: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const pointer = useRef(false)
  const [keyboard, setKeyboard] = useState(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div
      className={cn(
        'relative min-w-0 flex-1',
        SEARCH_FIELD_CLASS,
        'pl-11 focus-within:shadow-none sm:min-h-14 sm:pl-12',
        // Room for the clear button, or from `md` for the „/" hint; an empty box on a phone keeps its width for the placeholder.
        draft.length > 0 ? 'pr-12' : 'pr-4 md:pr-12',
        keyboard && SEARCH_FIELD_KEYBOARD_CLASS,
      )}
    >
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-6 size-4 -translate-y-1/2 text-muted-foreground sm:left-4 sm:top-7 sm:size-5" />
      <input
        ref={input}
        value={draft}
        onChange={(event) => onDraft(event.target.value)}
        onPointerDown={() => {
          pointer.current = true
        }}
        onFocus={() => {
          setKeyboard(!pointer.current)
          pointer.current = false
        }}
        onBlur={() => setKeyboard(false)}
        aria-label={t`Caută în legislație`}
        placeholder={t`Număr, nume sau cuvinte`}
        className={cn(SEARCH_INPUT_CLASS, 'sm:h-9 sm:text-lg md:text-lg')}
        enterKeyHint="search"
      />
      <div className="absolute right-2 top-6 flex -translate-y-1/2 items-center gap-1 sm:right-3 sm:top-7">
        {busy ? <LoaderCircle className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" /> : null}
        {draft.length > 0 ? (
          <button type="button" onClick={() => onDraft('')} aria-label={t`Golește căutarea`} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground">
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <kbd aria-hidden="true" className="hidden h-6 min-w-6 items-center justify-center rounded-sm border bg-muted px-1.5 font-mono text-xs text-muted-foreground md:inline-flex">
            /
          </kbd>
        )}
      </div>
    </div>
  )
}

/**
 * The filters' button, as tall as the field. From `sm` it has no box at rest (owner, 26 November 2026: „the problem
 * is the border"): the icon and the word beside the field, a box on hover and for the keyboard, and a tinted box
 * while a filter is on, so that state is seen without hovering. On a phone it is the icon alone and keeps its box,
 * which is what says it can be pressed.
 */
function FilterButton({ filters, onOpen, ref }: { readonly filters: SearchFilters; readonly onOpen: () => void; readonly ref?: Ref<HTMLButtonElement> }) {
  const on = activeFilterCount(filters)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={on > 0 ? t`Filtre, ${on} active` : t`Filtre`}
      className={cn(
        'inline-flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-lg border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 sm:h-14 sm:px-4',
        on > 0 ? 'border-primary/50 bg-primary/5' : 'sm:border-transparent sm:bg-transparent sm:hover:border-input sm:hover:bg-card sm:focus-visible:border-input',
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{on > 0 ? t`Filtre (${on})` : t`Filtre`}</span>
      {on > 0 ? <span className="text-xs tabular-nums sm:hidden">{on}</span> : null}
    </button>
  )
}

/** Before a question: three ways to ask, each with questions that answer. */
function Ways({ onExample }: { readonly onExample: (example: string) => void }) {
  const titles = [t`După număr`, t`După nume`, t`După cuvinte din text`]
  return (
    <section aria-labelledby="search-ways-title">
      <h2 id="search-ways-title" className="sr-only">
        {t`Ce poți căuta`}
      </h2>
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
        {WAYS.map((examples, index) => (
          <div key={examples[0]}>
            <dt className="flex min-h-6 items-center gap-1 text-sm text-muted-foreground">
              {titles[index]}
              {index === 2 ? (
                <LegalInfoNote label={t`Ce nu găsești încă`}>
                  <p>{t`Căutarea după sens nu este încă disponibilă, iar căutarea în textul legilor depinde de motorul care răspunde: rezultatele spun care a fost.`}</p>
                  <p>{t`Dacă o căutare nu găsește nimic, asta nu înseamnă că prevederea nu există în legislație.`}</p>
                </LegalInfoNote>
              ) : null}
            </dt>
            <dd className="mt-1 flex flex-wrap gap-x-5 sm:mt-2 sm:block">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => onExample(example)}
                  className="flex min-h-11 items-center text-left text-base font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0 sm:py-1"
                >
                  {example}
                </button>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** A text with the question's words in bold. */
function Marked({ text, words }: { readonly text: string; readonly words: readonly string[] }) {
  return (
    <>
      {markWords(text, words).map((part, index) =>
        part.hit ? (
          <b key={index} className="font-semibold text-foreground">
            {part.text}
          </b>
        ) : (
          // plain text, not an element: the link's name is then read as one run, spaces kept
          <Fragment key={index}>{part.text}</Fragment>
        ),
      )}
    </>
  )
}

/** Romanian counts take „de" from twenty on: the plural's „other" form. */
const citedText = (value: number, shown: string) => plural(value, { one: 'citat o dată', few: `citat de ${shown} ori`, other: `citat de ${shown} de ori` })

function Answer({
  q,
  filters,
  onFilters,
  search,
  resolveHits,
  resolving,
}: {
  readonly q: string
  readonly filters: SearchFilters
  readonly onFilters: (next: SearchFilters) => void
  readonly search: { readonly data: LegalSearchResultData | undefined; readonly isPending: boolean; readonly isError: boolean; readonly isFetching: boolean; readonly isPlaceholderData: boolean; readonly refetch: () => unknown }
  readonly resolveHits: readonly LegalResolveHit[]
  /** The resolver has not answered this question yet, and is still waited for. */
  readonly resolving: boolean
}) {
  const { i18n } = useLingui()
  const filtered = isSearchFiltered(filters)

  if (search.isError) {
    return (
      <section>
        <p className="text-base text-foreground">{t`Nu am putut căuta în legislație.`}</p>
        <Button variant="outline" className="mt-4" disabled={search.isFetching} onClick={() => void search.refetch()}>
          {t`Încearcă din nou`}
        </Button>
      </section>
    )
  }
  // The resolver knows no filter: under one that narrows, its act may be the very act the filter left out. Widening
  // to repealed acts narrows nothing.
  const narrowed = Object.keys(searchArgs(filters).filter).length > 0
  const stale = search.isPlaceholderData
  // A citation's answer waits for the resolver, so its act is not drawn as a row and then moved into the card.
  const awaitsLead = !narrowed && !stale && resolving && parseLegalCitationShape(q) !== null
  if (search.isPending || search.data === undefined || awaitsLead) return <PendingRows />

  const result = search.data
  const acts = result.acts
  const words = questionWords(q)
  // What the copy may claim: the OpenSearch engine, whole, searched the acts' text; the Postgres path only numbers
  // and names; a degraded OpenSearch answer lost a leg it does not name, so it claims neither.
  const reach: 'text' | 'names' | 'partial' = result.engine === 'opensearch' ? (result.degraded ? 'partial' : 'text') : 'names'
  const semanticUnavailable = result.caveats.includes(LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  const verbatim = result.caveats.filter((caveat) => caveat !== LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  const empty = acts.length === 0
  // The resolver answers the new question while the last answer is still shown: its acts lead only a current answer
  // that no filter narrows. One act is the answer; several are a choice the reader makes.
  const named = !stale && !narrowed ? resolveHits : []
  const lead = named.length === 1 ? (named[0] ?? null) : null
  // Several acts under one citation: when the list holds them all, the list is the choice and one sentence says
  // so; the card is for the acts the list does not show.
  const several = named.length >= 2
  const choose = several && named.some((one) => !acts.some((hit) => hit.act.actId === one.value))
  const leadHit = lead === null ? null : (acts.find((hit) => hit.act.actId === lead.value) ?? null)
  const rest = lead === null ? acts : acts.filter((hit) => hit.act.actId !== lead.value)
  const widen =
    filters.stare !== 'implicit' ? null : (
      <button type="button" onClick={() => onFilters({ ...filters, stare: 'toate' })} className={MORE_LINK}>
        {t`Caută și în actele abrogate sau ieșite din vigoare`}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    )
  const count =
    lead !== null
      ? t`Alte potriviri`
      : result.actsTotal == null
        ? plural(acts.length, { one: 'O potrivire afișată', few: '# potriviri afișate', other: '# de potriviri afișate' })
        : result.totalsExhaustive
          ? plural(result.actsTotal, { one: 'O potrivire', few: '# potriviri', other: '# de potriviri' })
          : plural(result.actsTotal, { one: 'Cel puțin o potrivire', few: 'Cel puțin # potriviri', other: 'Cel puțin # de potriviri' })
  // What was searched, in a few words beside the count; the whole sentence is behind the ⓘ.
  const searched = reach === 'text' ? t`în numele, titlul și textul actelor` : reach === 'names' ? t`după numărul și denumirea actelor` : t`căutare parțială`

  const notes: ReactNode = (
    <>
      {reach === 'partial' ? (
        <p>{t`O parte din căutare nu a rulat, iar căutarea după sens nu este încă disponibilă: o prevedere poate exista chiar dacă nu apare aici.`}</p>
      ) : semanticUnavailable ? (
        <p>
          {reach === 'text'
            ? t`Potriviri după cuvintele din numele, titlul și textul actelor. Căutarea după sens nu este încă disponibilă: o prevedere poate exista chiar dacă nu apare aici.`
            : t`Potriviri după numărul și denumirea actelor. Căutarea în textul legilor nu este încă disponibilă: o prevedere poate exista chiar dacă nu apare aici.`}
        </p>
      ) : null}
      {result.actsTotal == null && acts.length > 0 ? <p>{t`Numărul total de potriviri nu este cunoscut: sunt afișate cele mai potrivite.`}</p> : null}
      <p>{t`Descrierile actelor vin din rezumate făcute automat.`}</p>
      {verbatim.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4" aria-label={t`Precizări de la server`}>
          {verbatim.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs">
        {t`Motor de căutare: ${result.engine}`}
        {result.asOf !== null ? ` · ${t`index din ${formatLegalDate(result.asOf, i18n.locale)}`}` : ''}
      </p>
    </>
  )
  // A degraded answer is said where it is read, not only behind the ⓘ.
  const degraded = result.degraded ? <p className="text-sm text-muted-foreground">{t`Răspuns parțial: o parte din căutare nu a rulat.`}</p> : null
  const how = (
    <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
      {t`Cum s-a căutat`}
      <LegalInfoNote label={t`Cum se caută`}>{notes}</LegalInfoNote>
    </div>
  )
  const row = (hit: LegalSearchActHit) => (
    <ActRow key={hit.act.actId} hit={hit} words={words} provisions={groupProvisions(result.sections.filter((section) => section.actId === hit.act.actId))} />
  )

  return (
    <div className={cn('space-y-8 transition-opacity', stale && 'opacity-80')} aria-busy={stale}>
      {filtered ? (
        <div className="space-y-2">
          <LegislationActiveFilters filters={filters} onChange={onFilters} />
          {usesSummaries(filters) ? (
            <p className="text-xs text-muted-foreground">{t`Domeniul, categoria și sancțiunile vin din rezumate făcute automat: actele fără rezumat nu apar.`}</p>
          ) : null}
        </div>
      ) : null}

      {lead !== null ? <LeadAct lead={lead} hit={leadHit} /> : null}
      {choose ? <ChooseAct hits={named} /> : null}

      {empty && stale ? (
        // The last question's empty answer, faded: its sentence would speak of a question no longer asked.
        <p className="text-base text-muted-foreground" aria-busy="true">{t`Se caută…`}</p>
      ) : empty && result.unhydratedHits > 0 ? (
        // The engine matched acts it could not load: an answer, not an absence.
        <section aria-labelledby="search-empty-title">
          <h2 id="search-empty-title" className="text-xl font-semibold tracking-tight text-foreground">
            {t`Am găsit potriviri, dar nu le-am putut afișa`}
          </h2>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{t`Serverul a găsit potriviri pentru această căutare, dar nu le-a putut încărca acum. Încearcă din nou peste puțin timp.`}</p>
          {degraded ? <div className="mt-3">{degraded}</div> : null}
          <Button variant="outline" className="mt-4" disabled={search.isFetching} onClick={() => void search.refetch()}>
            {t`Încearcă din nou`}
          </Button>
          {how}
        </section>
      ) : empty ? (
        <section aria-labelledby="search-empty-title">
          {lead !== null || choose ? (
            <p id="search-empty-title" className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              {reach === 'text'
                ? t`Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului. Căutarea după sens nu este încă disponibilă.`
                : reach === 'names'
                  ? t`Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului. Căutarea în textul legilor nu este încă disponibilă.`
                  : t`Căutarea directă nu a găsit nimic, iar o parte din ea nu a rulat: actele de mai sus sunt potriviri după denumirea sau numărul actului.`}
            </p>
          ) : parseLegalCitationShape(q) !== null ? (
            <>
              <h2 id="search-empty-title" className="text-xl font-semibold tracking-tight text-foreground">
                {t`Niciun act găsit pentru citarea „${q}"`}
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {t`Actele abrogate sau ieșite din vigoare nu sunt incluse implicit. Verifică și numărul și anul actului, de exemplu „Legea 53/2003".`}
              </p>
            </>
          ) : (
            <>
              {/* The page's contract: a phrase that finds nothing never reads as „the law does not exist". */}
              <h2 id="search-empty-title" className="max-w-[40ch] text-xl font-semibold tracking-tight text-foreground">
                {t`Niciun act pentru „${q}", dar asta nu înseamnă că prevederea nu există`}
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {reach === 'text'
                  ? t`Am căutat cuvintele în numele, titlul și textul actelor, dar nu și după sens: o prevedere formulată cu alte cuvinte nu apare.`
                  : reach === 'names'
                    ? t`Deocamdată căutarea găsește un act după numărul lui (de exemplu „Legea 53/2003") și după denumire (de exemplu „Codul muncii"). Căutarea după expresii din textul legilor, cum ar fi „concediu de odihnă", nu este încă disponibilă.`
                    : t`O parte din căutare nu a rulat, iar căutarea după sens nu este încă disponibilă: o prevedere formulată cu alte cuvinte poate lipsi de aici.`}
              </p>
            </>
          )}
          {filtered ? <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{t`Filtrele alese pot fi motivul: scoate-le pe rând.`}</p> : null}
          {degraded ? <div className="mt-3">{degraded}</div> : null}
          {widen ? <div className="mt-4">{widen}</div> : null}
          {how}
        </section>
      ) : rest.length === 0 ? (
        // The act above is the whole answer.
        <div>
          {degraded}
          {how}
        </div>
      ) : (
        <section aria-labelledby="search-results-title">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 border-b pb-3">
            <div className="flex flex-wrap items-center gap-x-2">
              <h2 id="search-results-title" className="text-base font-semibold text-foreground">
                {count}
              </h2>
              <span className="text-sm text-muted-foreground">{searched}</span>
              <LegalInfoNote label={t`Cum se caută`}>{notes}</LegalInfoNote>
            </div>
            {widen}
          </div>
          {several && !choose ? <p className="mt-3 text-sm text-muted-foreground">{t`Mai multe acte poartă acest număr: emitentul le deosebește.`}</p> : null}
          {degraded ? <div className="mt-3">{degraded}</div> : null}
          <ol aria-label={t`Rezultate`} className="divide-y border-b">
            {rest.map(row)}
          </ol>
        </section>
      )}
    </div>
  )
}

/** The quiet line under an act: who issued it and, where the citations' column is not drawn, how often other acts cite it. */
function ActFacts({ hit, cited }: { readonly hit: LegalSearchActHit; readonly cited: 'below-lg' | 'never' }) {
  const { i18n } = useLingui()
  const inDegree = hit.act.inDegree ?? 0
  const issuer = hit.act.issuerSlug !== null ? legalIssuerLabel(hit.act.issuerSlug) : null
  const citations = cited === 'below-lg' && inDegree > 0 ? citedText(inDegree, formatLegalNumber(inDegree, i18n.locale)) : null
  if (issuer === null && citations === null) return null
  return (
    <p className={cn('mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs leading-5 text-muted-foreground', issuer === null && 'lg:hidden')}>
      {issuer !== null ? <span>{issuer}</span> : null}
      {citations !== null ? <span className="lg:hidden">{citations}</span> : null}
    </p>
  )
}

/** A row of the register: the year, the act (its name, status, one sentence, its facts, the provisions that matched), its citations. */
function ActRow({ hit, words, provisions }: { readonly hit: LegalSearchActHit; readonly words: readonly string[]; readonly provisions: readonly ProvisionGroup[] }) {
  const { i18n } = useLingui()
  const inDegree = hit.act.inDegree ?? 0
  return (
    <li className={cn('py-5', ROW_GRID)}>
      <p className="hidden pt-1 text-sm tabular-nums text-muted-foreground sm:block">{hit.act.actYear ?? ''}</p>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Link to="/legislation/acts/$actId" params={{ actId: hit.act.actId }} className="line-clamp-2 text-lg font-medium leading-snug text-foreground underline-offset-4 hover:underline">
            <Marked text={searchHitName(hit)} words={words} />
          </Link>
          <LegalStatusBadge status={hit.act.status} />
        </div>
        {hit.description !== null ? (
          <p className="mt-1.5 line-clamp-2 max-w-[75ch] text-sm leading-relaxed text-muted-foreground">
            <Marked text={hit.description} words={words} />
          </p>
        ) : null}
        <ActFacts hit={hit} cited="below-lg" />
        {provisions.length > 0 ? (
          <div className="mt-3 space-y-3">
            {provisions.map((group) => (
              <Provision key={group.key} actId={hit.act.actId} group={group} />
            ))}
          </div>
        ) : null}
      </div>
      {/* The same figure as the facts' „citat de…" below `lg`: read once by a screen reader. */}
      <p className="hidden pt-1 text-right lg:block" aria-hidden={inDegree > 0 ? undefined : true}>
        {inDegree > 0 ? (
          <>
            <span className="block text-sm font-semibold tabular-nums text-foreground">{formatLegalNumber(inDegree, i18n.locale)}</span>
            <span className="block text-xs text-muted-foreground">{plural(inDegree, { one: 'citare', few: 'citări', other: 'de citări' })}</span>
          </>
        ) : null}
      </p>
    </li>
  )
}

/** The engine's fragment as text: `<em>…</em>` marks the matched words; every other character is printed literally. */
function highlighted(snippet: string) {
  return snippet.split(/(<em>.*?<\/em>)/g).map((part, index) => {
    const match = /^<em>(.*)<\/em>$/.exec(part)
    return match ? (
      <mark key={index} className="bg-[var(--pnrr-warning-bg)] text-inherit">
        {match[1]}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  })
}

/** A fragment without the provision's own label at its head: the label is the link above it. */
const withoutLabel = (fragment: string, label: string | null) => (label !== null && fragment.startsWith(label) ? fragment.slice(label.length).trimStart() : fragment)

/**
 * A provision that matched: its label, a link to that provision in the act's text, then the fragments. A fragment
 * from a consolidation carries the Portal's note (LEG-X3AV), as on the live page.
 */
function Provision({ actId, group }: { readonly actId: string; readonly group: ProvisionGroup }) {
  const { i18n } = useLingui()
  const served = group.servedForm
  const version = served === null ? null : { versionKind: served.versionKind ?? '', caveat: served.caveat ?? null, portalLabelRaw: served.portalLabelRaw ?? null, portalLabelDate: served.portalLabelDate ?? null }
  const consolidation = version !== null && isConsolidationVersion(version)
  const note = consolidation && version !== null ? portalConsolidationNote(version, (value) => formatLegalDate(value, i18n.locale)) : null
  const label = group.label ?? t`Prevedere`
  return (
    <div className="border-l-2 border-border pl-3">
      {group.nodePath !== null ? (
        <Link
          to="/legislation/acts/$actId"
          params={{ actId }}
          search={{ doc: group.documentId, nod: group.nodePath }}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
        >
          {label}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      ) : (
        <p className="text-xs font-medium text-foreground">{label}</p>
      )}
      {group.fragments.map((fragment) => (
        <p key={fragment} className="mt-1 line-clamp-3 max-w-[75ch] text-sm leading-6 text-foreground/90">
          „{highlighted(withoutLabel(fragment, group.label))}”
        </p>
      ))}
      {consolidation ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {note !== null ? t`Dintr-o formă consolidată neoficială, cu caracter informativ. Portalul Legislativ indică „${note}”.` : t`Dintr-o formă consolidată neoficială, cu caracter informativ.`}
        </p>
      ) : null}
    </div>
  )
}

/**
 * The act a citation names, as the answer: its name and status, one sentence, its facts, the way in. With no search
 * hit behind it (the status gate hid the act) it is the resolver's name and status alone.
 */
function LeadAct({ lead, hit }: { readonly lead: LegalResolveHit; readonly hit: LegalSearchActHit | null }) {
  const { i18n } = useLingui()
  const hinted = legalActStatusSchema.safeParse(lead.hint)
  const status: LegalActStatus | null = hit !== null ? hit.act.status : hinted.success ? hinted.data : null
  const inDegree = hit?.act.inDegree ?? 0
  return (
    <section aria-labelledby="search-lead-title" className={CARD}>
      <p className="text-sm text-muted-foreground">{t`Actul cu acest număr`}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="search-lead-title" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {hit !== null ? searchHitName(hit) : lead.label}
        </h2>
        <LegalStatusBadge status={status} className="text-base" />
      </div>
      {hit !== null && hit.description !== null ? <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-muted-foreground">{hit.description}</p> : null}
      {hit !== null ? <ActFacts hit={hit} cited="never" /> : null}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button asChild>
          <Link to="/legislation/acts/$actId" params={{ actId: lead.value }}>
            {t`Deschide actul`}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
        {inDegree > 0 ? <p className="text-sm text-muted-foreground">{citedText(inDegree, formatLegalNumber(inDegree, i18n.locale))}</p> : null}
      </div>
    </section>
  )
}

/** Several acts under one citation or name: the reader picks. */
function ChooseAct({ hits }: { readonly hits: readonly LegalResolveHit[] }) {
  return (
    <section aria-labelledby="search-choose-title" className={CARD}>
      <h2 id="search-choose-title" className="text-sm font-semibold text-foreground">
        {t`Mai multe acte poartă acest nume: alege actul`}
      </h2>
      <ul aria-label={t`Acte identificate`} className="mt-3 divide-y divide-border/70 border-y border-border/70">
        {hits.map((hit) => {
          const status = legalActStatusSchema.safeParse(hit.hint)
          return (
            <li key={`${hit.value}-${hit.label}`}>
              <Link to="/legislation/acts/$actId" params={{ actId: hit.value }} className="group flex min-h-11 items-center justify-between gap-4 py-2.5 transition-colors hover:bg-muted/40">
                <span className="min-w-0 text-base font-medium text-foreground group-hover:underline group-hover:underline-offset-4 sm:truncate">{hit.label}</span>
                {status.success ? <LegalStatusBadge status={status.data} /> : hit.hint !== null ? <span className="shrink-0 text-xs text-muted-foreground">{hit.hint}</span> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PendingRows() {
  return (
    <section aria-busy="true" aria-label={t`Se caută`}>
      <div className="border-b pb-3">
        <div className="h-6 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="divide-y border-b">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={cn('py-5', ROW_GRID)}>
            <div className="hidden pt-1 sm:block">
              <div className="h-4 w-10 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-56 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
