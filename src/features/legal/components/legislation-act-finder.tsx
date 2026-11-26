import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { ArrowRight, LoaderCircle, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SEARCH_FIELD_CLASS, SEARCH_FIELD_KEYBOARD_CLASS, SEARCH_INPUT_CLASS } from '@/features/landing/components/search/search-field'
import { cn } from '@/lib/utils'
import type { LegalActStatus, LegalFinderSearch, LegalResolveHit, LegalSearchActHit, LegalSearchResultData } from '@/schemas/legal'
import { LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT, legalActStatusSchema } from '@/schemas/legal'
import { fetchLegalSearch } from '../api/legal-search-api'
import { resolveLegalActs } from '../api/legal-resolve-api'
import { labelCarriesCitation, parseLegalCitationShape } from '../lib/legal-citation'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legalIssuerLabel } from '../lib/legal-vocabulary'
import { isSearchFiltered, readSearchFilters, searchArgs, searchHitName, searchOfFilters, usesSummaries, type SearchFilters } from '../lib/search-filters'
import { groupProvisions, markWords, questionWords, type ProvisionGroup } from '../lib/search-marks'
import { LegalInfoNote } from './hub/legislation-hub-chrome'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationActiveFilters, LegislationFilterButton, LegislationFilterPanel } from './legislation-search-filters'
import { LegislationSearchProvision } from './legislation-search-provision'

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

type Props = {
  readonly search: LegalFinderSearch
  /**
   * The language the address asks for (`?lang=`), if it asks for one: a pre-hydration Enter carries it, so the page
   * the browser loads speaks the same language (the cookie carries the rest).
   */
  readonly lang?: 'ro' | 'en' | null
}

/**
 * `/legislation/search`: a citation, name and text finder that says plainly what it searched.
 *
 * Round 2 (owner, 26 November 2026; promoted from the prototype `development/prototypes/legal/search`, variant
 * `registru`), over round 1's reads and sentences:
 *
 * 1. The question leads: a larger field with the filters beside it; „/" brings the cursor to it.
 * 2. A citation that names one act is answered with that act, in the hubs' card, before any list. Only the
 *    resolver decides this (exactly one act, no filter narrowing the search): a relevance score never does, and
 *    names get no such answer until the resolver knows them (LEG-6JCT).
 * 3. The list is a register: the year in a rail, the act, its citations at the right. The question's words are in
 *    bold where they appear in a name or a description.
 * 4. A matched provision links to that provision in the act's text, its fragments gathered under one label.
 * 5. Before a question the page shows three ways to ask, once.
 * 6. What was searched is said beside the count; the rest is behind the ⓘ.
 *
 * The question lives in the address: `q`, then the filters (`lib/search-filters.ts`). It is asked as the reader
 * types (after a pause, from three letters; Enter at once), each step replacing the history entry; a filter is a
 * new entry. The last answer stays, faded, while the next is read.
 *
 * Two lanes per query: `legalSearch` and `legalResolve(dim: "act")`, whose job is the lead (a citation's one act),
 * ambiguity (one citation, several acts: the reader picks) and rescue (a citation the status gate hid). The
 * honesty kept from the first finder: `actsTotal: null` is said as unknown, never 0; every server caveat but the
 * English sentinel is shown verbatim; the engine is named and decides the copy (on `opensearch` words in the
 * acts' text match, so only meaning search is said to be missing; on `postgres` text search too); a query that
 * finds nothing never reads as „the law does not exist"; a degraded answer says so in the open.
 *
 * Left out on purpose (the legislation session, 26 November 2026): `entryIntoForce` (the date of whichever form
 * was canonical, not the act's), `amendedAfterPublication` (references, not amending acts), any promise of an
 * act's text (6,174 public acts serve none), and the summaries' domains (one question's acts share them).
 */
export function LegislationActFinder({ search: address, lang = null }: Props) {
  const navigate = useNavigate()
  const q = address.q?.trim() ?? ''
  const filters = readSearchFilters(address)
  const [panel, setPanel] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)

  // The box mirrors the address (back and forward, a shared link), but only where it says something else: while
  // the reader types, the address follows the box, not the other way. A query the page itself sent is not mirrored
  // back when it lands, so keys typed while it travelled stay (review astra-client-7, F1b); the mark lives only
  // until the next query lands, whichever it is, so a send that never landed (Back pressed first) cannot stop a
  // later one from being mirrored (astra-client-8).
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

  // The typing pause's timer, held so Enter, an example and a step through history can stop it (review
  // astra-client-11): a query sent by Enter is not sent again by the pause, and a Back that lands on an entry with
  // the same query (a filter undone) is not overwritten by keys typed before it.
  const typing = useRef<number | null>(null)
  const stopTyping = () => {
    if (typing.current !== null) window.clearTimeout(typing.current)
    typing.current = null
  }
  useEffect(() => {
    const onTraverse = () => {
      stopTyping()
      sent.current = null
    }
    window.addEventListener('popstate', onTraverse)
    return () => window.removeEventListener('popstate', onTraverse)
  }, [])

  /**
   * The query alone, written over the address as the router holds it when the navigation runs: the filters are
   * whatever is there then, never a copy taken when the reader began to type (astra-client-8).
   */
  const sendQuery = (next: string, options: { readonly replace: boolean }) => {
    stopTyping()
    // Already on its way: the navigation that carries it has not landed yet.
    if (sent.current !== null && next === sent.current) return
    if (next !== q) sent.current = next
    void navigate({
      to: '/legislation/search',
      search: (previous: LegalFinderSearch) => ({ ...previous, q: next.length > 0 ? next : undefined }),
      replace: options.replace,
      resetScroll: false,
    })
  }
  /** The filters, chosen by the reader: every filter key named, the query as it stands. */
  const setFilters = (next: SearchFilters) => {
    void navigate({
      to: '/legislation/search',
      search: { q: q.length > 0 ? q : undefined, ...searchOfFilters(next) },
      replace: false,
      resetScroll: false,
    })
  }

  // As the reader types: once they pause, from three letters; an emptied box clears the answer.
  useEffect(() => {
    const next = draft.trim()
    if (next === q || (next.length > 0 && next.length < TYPED_MIN)) return
    const timer = window.setTimeout(() => {
      typing.current = null
      sendQuery(next, { replace: true })
    }, TYPING_PAUSE_MS)
    typing.current = timer
    return () => {
      window.clearTimeout(timer)
      if (typing.current === timer) typing.current = null
    }
    // `sendQuery` is rebuilt each render and reads nothing captured but `q`; the pause restarts when the box changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, q])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    stopTyping()
    const next = draft.trim()
    if (next.length > 0 && next !== q) sendQuery(next, { replace: true })
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
    // While the next answer is read, the last one stays (faded): typing does not flash the page empty.
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
  return (
    <div className="max-w-4xl">
      {/* `action`, the field's `name`, the filters and the address's language as hidden fields are for a reader who
          presses Enter before the page has hydrated: the browser then asks for `?q=…` with them itself, and the
          server renders the page with the question in the box; the answer is read once the scripts run
          (SEARCH-001). Hydrated, `onSubmit` takes over. */}
      <form onSubmit={onSubmit} action="/legislation/search" method="get" role="search" aria-label={t`Caută în legislație`}>
        {Object.entries(searchOfFilters(filters)).map(([key, value]) => (value === undefined ? null : <input key={key} type="hidden" name={key} value={String(value)} />))}
        {lang !== null ? <input type="hidden" name="lang" value={lang} /> : null}
        <div className="flex items-start gap-2">
          <Field draft={draft} onDraft={setDraft} busy={asked && search.isFetching} />
          {/* Beside the field (owner, 25 November 2026): the filters are part of the question. */}
          <LegislationFilterButton ref={filterButton} filters={filters} onOpen={() => setPanel(true)} />
        </div>
      </form>
      {/* The filters on, and where the summary-based ones come from, are said under the form whatever the answer's
          state: before a question, while it is read, after an error (review astra-client-11). */}
      {isSearchFiltered(filters) ? (
        <div className="mt-4 space-y-2">
          <LegislationActiveFilters filters={filters} onChange={setFilters} />
          {usesSummaries(filters) ? (
            <p className="text-xs text-muted-foreground">{t`Domeniul, categoria și sancțiunile vin din rezumate făcute automat: actele fără rezumat nu apar.`}</p>
          ) : null}
        </div>
      ) : null}
      <div className="mt-8">
        {asked ? (
          <Answer q={q} filters={filters} onFilters={setFilters} search={search} resolveHits={resolve.data ?? []} resolving={resolve.isPending && waited !== q} />
        ) : (
          <Ways onExample={run} />
        )}
      </div>
      <LegislationFilterPanel
        filters={filters}
        onChange={setFilters}
        open={panel}
        onOpenChange={setPanel}
        returnFocus={() => filterButton.current?.focus()}
        asked={asked}
      />
    </div>
  )
}

/**
 * The landing's field a size up, without its lift on focus (its answers open in a panel under it; here they are the
 * page). „/" anywhere on the page brings the cursor to it. The ring is drawn for the keyboard only.
 *
 * What a reader typed before the page hydrated is taken up once (SEARCH-001): React hydrates an input without
 * writing its value and fires no change event, so the text would sit in the box and never be searched.
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
      // A key pressed inside a dialog (the filters, an ⓘ) stays there: the field behind it is not where the reader
      // is. Only the key's own place counts: the cookie notice is a dialog that stands on the page without the focus.
      if (target instanceof Element && target.closest('[role="dialog"]') !== null) return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    const typedBefore = input.current?.value ?? ''
    if (typedBefore !== draft) onDraft(typedBefore)
    // once, as the page hydrates: after that the box is React's
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        name="q"
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
  const citation = parseLegalCitationShape(q)
  // What the copy may claim: the OpenSearch engine, whole, searched the acts' text; the Postgres path only numbers
  // and names; a degraded OpenSearch answer lost a leg it does not name, so it claims neither.
  const reach: 'text' | 'names' | 'partial' = result.engine === 'opensearch' ? (result.degraded ? 'partial' : 'text') : 'names'
  const semanticUnavailable = result.caveats.includes(LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  const verbatim = result.caveats.filter((caveat) => caveat !== LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  // The resolver answers the new question while the last answer is still shown: its acts lead only a current answer
  // that no filter narrows. One act is the answer; several are a choice the reader makes.
  const named = !stale && !narrowed ? resolveHits : []
  // „Actul cu acest număr" only for a citation, and only for the act that carries its number and year: the resolver
  // also matches names by substring, and a name's one candidate is not the answer (review astra-client-11). Names
  // keep the engine's order.
  const only = named.length === 1 ? (named[0] ?? null) : null
  const lead = only !== null && citation !== null && labelCarriesCitation(only.label, citation) ? only : null
  // Several acts under one citation: when the list holds them all, the list is the choice and one sentence says
  // so; the card is for the acts the list does not show.
  const several = named.length >= 2
  const choose = several && named.some((one) => !acts.some((hit) => hit.act.actId === one.value))
  const leadHit = lead === null ? null : (acts.find((hit) => hit.act.actId === lead.value) ?? null)
  const rest = lead === null ? acts : acts.filter((hit) => hit.act.actId !== lead.value)
  // The provisions that matched, by act. The engine sends act and provision hits apart: a provision is drawn under
  // its act wherever that act is (the card included), and one whose act is in no row gets a row of its own, so an
  // answer of provisions alone is not said to be empty (review astra-client-11).
  const provisionsOf = (actId: string) => groupProvisions(result.sections.filter((section) => section.actId === actId))
  const placed = new Set([...acts.map((hit) => hit.act.actId), ...(lead === null ? [] : [lead.value])])
  const loose = [...new Set(result.sections.map((section) => section.actId))]
    .filter((actId) => !placed.has(actId))
    .map((actId) => ({ actId, citation: result.sections.find((section) => section.actId === actId && section.actCitation)?.actCitation ?? null, provisions: provisionsOf(actId) }))
    .filter((one) => one.provisions.length > 0)
  const leadProvisions = lead === null ? 0 : provisionsOf(lead.value).length
  const empty = acts.length === 0 && loose.length === 0 && leadProvisions === 0
  const rows = rest.length + loose.length
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
      : result.actsTotal == null || acts.length === 0
        ? plural(rows, { one: 'O potrivire afișată', few: '# potriviri afișate', other: '# de potriviri afișate' })
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
  const row = (hit: LegalSearchActHit) => <ActRow key={hit.act.actId} hit={hit} words={words} provisions={provisionsOf(hit.act.actId)} />

  return (
    <div className={cn('space-y-8 transition-opacity', stale && 'opacity-80')} aria-busy={stale}>
      {lead !== null ? <LeadAct lead={lead} hit={leadHit} provisions={provisionsOf(lead.value)} /> : null}
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
              <h2 id="search-empty-title" className="text-xl font-semibold tracking-tight text-foreground wrap-anywhere">
                {t`Niciun act găsit pentru citarea „${q}"`}
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {t`Actele abrogate sau ieșite din vigoare nu sunt incluse implicit. Verifică și numărul și anul actului, de exemplu „Legea 98/2016".`}
              </p>
            </>
          ) : (
            <>
              {/* The page's contract: a phrase that finds nothing never reads as „the law does not exist". */}
              <h2 id="search-empty-title" className="max-w-[40ch] text-xl font-semibold tracking-tight text-foreground wrap-anywhere">
                {t`Niciun act pentru „${q}", dar asta nu înseamnă că prevederea nu există`}
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {reach === 'text'
                  ? t`Am căutat cuvintele în numele, titlul și textul actelor, dar nu și după sens: o prevedere formulată cu alte cuvinte nu apare.`
                  : reach === 'names'
                    ? t`Deocamdată căutarea găsește un act după numărul lui (de exemplu „Legea 98/2016") și după denumire (de exemplu „Codul civil"). Căutarea după expresii din textul legilor, cum ar fi „concediu de odihnă", nu este încă disponibilă.`
                    : t`O parte din căutare nu a rulat, iar căutarea după sens nu este încă disponibilă: o prevedere formulată cu alte cuvinte poate lipsi de aici.`}
              </p>
            </>
          )}
          {filtered ? <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{t`Filtrele alese pot fi motivul: scoate-le pe rând.`}</p> : null}
          {degraded ? <div className="mt-3">{degraded}</div> : null}
          {widen ? <div className="mt-4">{widen}</div> : null}
          {how}
        </section>
      ) : rows === 0 ? (
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
          {several && !choose && citation !== null ? <p className="mt-3 text-sm text-muted-foreground">{t`Mai multe acte poartă acest număr: emitentul le deosebește.`}</p> : null}
          {degraded ? <div className="mt-3">{degraded}</div> : null}
          <ol aria-label={t`Rezultate`} className="divide-y border-b">
            {rest.map(row)}
            {loose.map((one) => (
              <ProvisionsRow key={one.actId} actId={one.actId} citation={one.citation} provisions={one.provisions} />
            ))}
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
              <LegislationSearchProvision key={group.key} actId={hit.act.actId} group={group} />
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

/** A row for an act the engine matched only by its provisions: the act, then the provisions under it. */
function ProvisionsRow({ actId, citation, provisions }: { readonly actId: string; readonly citation: string | null; readonly provisions: readonly ProvisionGroup[] }) {
  return (
    <li className={cn('py-5', ROW_GRID)}>
      <span className="hidden sm:block" aria-hidden="true" />
      <div className="min-w-0">
        <Link to="/legislation/acts/$actId" params={{ actId }} className="line-clamp-2 text-lg font-medium leading-snug text-foreground underline-offset-4 hover:underline">
          {citation ?? t`Actul ${actId}`}
        </Link>
        <div className="mt-3 space-y-3">
          {provisions.map((group) => (
            <LegislationSearchProvision key={group.key} actId={actId} group={group} />
          ))}
        </div>
      </div>
    </li>
  )
}

/**
 * The act a citation names, as the answer: its name and status, one sentence, its facts, the way in. With no search
 * hit behind it (the status gate hid the act) it is the resolver's name and status alone.
 */
function LeadAct({ lead, hit, provisions }: { readonly lead: LegalResolveHit; readonly hit: LegalSearchActHit | null; readonly provisions: readonly ProvisionGroup[] }) {
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
      {provisions.length > 0 ? (
        <div className="mt-4 space-y-3">
          {provisions.map((group) => (
            <LegislationSearchProvision key={group.key} actId={lead.value} group={group} />
          ))}
        </div>
      ) : null}
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
