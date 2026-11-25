import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { ArrowRight, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SEARCH_FIELD_CLASS, SEARCH_FIELD_KEYBOARD_CLASS, SEARCH_ICON_CLASS, SEARCH_INPUT_CLASS } from '@/features/landing/components/search/search-field'
import { cn } from '@/lib/utils'
import type { LegalFinderSearch } from '@/schemas/legal'
import { LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT, legalActStatusSchema } from '@/schemas/legal'
import { fetchLegalSearch } from '../api/legal-search-api'
import { resolveLegalActs } from '../api/legal-resolve-api'
import { parseLegalCitationShape } from '../lib/legal-citation'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legalActTypeLabel, legalIssuerLabel } from '../lib/legal-vocabulary'
import { isSearchFiltered, readSearchFilters, searchArgs, searchHitName, searchOfFilters, usesSummaries, type SearchFilters } from '../lib/search-filters'
import { LegalInfoNote } from './hub/legislation-hub-chrome'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationActiveFilters, LegislationFilterButton, LegislationFilterPanel } from './legislation-search-filters'
import { LegislationSearchSnippet } from './legislation-search-snippet'

/** Queries the page can answer today, each a measured hit. */
const EXAMPLES = ['Legea 53/2003', 'Codul muncii', 'Codul fiscal', 'OUG 57/2019'] as const

/** Provision hits shown under one act (the server sends up to three). */
const SNIPPETS_PER_ACT = 3

/** The search runs this long after the reader stops typing (owner, 25 November 2026: search as you type). */
const TYPING_PAUSE_MS = 300
/** Fewer letters than this wait for Enter: „HG" alone would match half the corpus. */
const TYPED_MIN = 3

const MORE_LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const TEXT_LINK = 'font-medium text-foreground underline-offset-4 hover:underline'

type Props = {
  readonly search: LegalFinderSearch
}

/**
 * `/legislation/search` (promoted 25 November 2026 from the prototype `development/prototypes/legal/search`): a
 * citation and name finder that says plainly what it does not search.
 *
 * The question lives in the address: `q`, then the filters (`lib/search-filters.ts`). It is asked as the reader
 * types (after a pause, from three letters; Enter at once), each step replacing the history entry; a filter is a
 * new entry. The last answer stays, faded, while the next is read.
 *
 * Two lanes per query: `legalSearch` and `legalResolve(dim: "act")`, whose job is ambiguity („codul fiscal" names
 * two acts and the reader picks) and rescue (a citation the status gate hid). The honesty kept from the first
 * finder: `actsTotal: null` is said as unknown, never 0; every server caveat but the English sentinel is shown
 * verbatim; the engine is named and decides the copy (on `opensearch` words in the acts' text match, so only
 * meaning search is said to be missing; on `postgres` text search too); a query that finds nothing never reads as
 * „the law does not exist"; a degraded answer says so in the open.
 */
export function LegislationActFinder({ search }: Props) {
  const navigate = useNavigate()
  const q = search.q?.trim() ?? ''
  const filters = readSearchFilters(search)
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

  /**
   * The query alone, written over the address as the router holds it when the navigation runs: the filters are
   * whatever is there then, never a copy taken when the reader began to type (astra-client-8).
   */
  const sendQuery = (next: string, options: { readonly replace: boolean }) => {
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

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} role="search" aria-label={t`Caută în legislație`} className="max-w-3xl">
        <div className="flex items-start gap-2">
          <SearchField draft={draft} onDraft={setDraft} />
          {/* Beside the field (owner, 25 November 2026): the filters are part of the question. */}
          <LegislationFilterButton ref={filterButton} filters={filters} onOpen={() => setPanel(true)} />
        </div>
        {q.length > 0 ? null : (
          <nav aria-label={t`Exemple`} className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="basis-full text-sm text-muted-foreground sm:basis-auto">{t`Încearcă`}</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => run(example)} className="inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0">
                {example}
              </button>
            ))}
          </nav>
        )}
      </form>

      {q.length > 0 ? <Answer q={q} filters={filters} onFilters={setFilters} /> : <WhatToSearch onExample={run} />}
      <LegislationFilterPanel filters={filters} onChange={setFilters} open={panel} onOpenChange={setPanel} returnFocus={() => filterButton.current?.focus()} />
    </div>
  )
}

/**
 * The landing's field without its lift on focus (its answers open in a panel under it; here they are the page),
 * so focus is its border; the ring is drawn for the keyboard only, as on the landing.
 */
function SearchField({ draft, onDraft }: { readonly draft: string; readonly onDraft: (value: string) => void }) {
  const pointer = useRef(false)
  const [keyboard, setKeyboard] = useState(false)
  return (
    <div className={cn('relative min-w-0 flex-1', SEARCH_FIELD_CLASS, 'pr-10 focus-within:shadow-none', keyboard && SEARCH_FIELD_KEYBOARD_CLASS)}>
      <Search aria-hidden="true" className={SEARCH_ICON_CLASS} />
      <input
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
        placeholder={t`Legea 53/2003, Codul muncii, OUG 57/2019`}
        className={SEARCH_INPUT_CLASS}
        enterKeyHint="search"
      />
      {draft.length > 0 ? (
        <button
          type="button"
          onClick={() => onDraft('')}
          aria-label={t`Golește căutarea`}
          className="absolute right-2 top-6 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}

/** Before a search: what the page finds, in two short columns, and its limits behind the ⓘ. */
function WhatToSearch({ onExample }: { readonly onExample: (example: string) => void }) {
  const example = (text: string) => (
    <button type="button" onClick={() => onExample(text)} className={TEXT_LINK}>
      {text}
    </button>
  )
  return (
    <section aria-labelledby="search-what-title" className="border-t pt-8">
      <div className="flex items-center gap-1">
        <h2 id="search-what-title" className="text-2xl font-semibold tracking-tight text-foreground">
          {t`Ce găsești aici`}
        </h2>
        <LegalInfoNote label={t`Ce nu găsești încă`}>
          <p>{t`Căutarea după sens nu este încă disponibilă, iar căutarea în textul legilor depinde de motorul care răspunde: rezultatele spun care a fost.`}</p>
          <p>{t`Dacă o căutare nu găsește nimic, asta nu înseamnă că prevederea nu există în legislație.`}</p>
        </LegalInfoNote>
      </div>
      <dl className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-foreground">{t`Un act după numărul lui`}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {example('Legea 53/2003')}, {example('OUG 57/2019')}, {example('HG 1/2016')}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">{t`Un act după denumirea lui`}</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {example('Codul muncii')}, {example('Codul fiscal')}, {example('Codul administrativ')}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function Answer({ q, filters, onFilters }: { readonly q: string; readonly filters: SearchFilters; readonly onFilters: (next: SearchFilters) => void }) {
  const { i18n } = useLingui()
  const { filter, historical } = searchArgs(filters)
  const filtered = isSearchFiltered(filters)
  const search = useQuery({
    queryKey: ['legal', 'finder-search', q, historical, filter],
    queryFn: ({ signal }) => fetchLegalSearch(q, { historical, filter, signal }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    // While the next answer is read, the last one stays (faded): typing does not flash the page empty.
    placeholderData: keepPreviousData,
  })
  // The resolver lane is auxiliary: no retry, and its failure is silence.
  const resolve = useQuery({
    queryKey: ['legal', 'finder-resolve', q],
    queryFn: ({ signal }) => resolveLegalActs(q, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  if (search.isPending) return <PendingRows />
  if (search.isError) {
    return (
      <section className="border-t pt-8">
        <p className="text-base text-foreground">{t`Nu am putut căuta în legislație.`}</p>
        <Button variant="outline" className="mt-4" disabled={search.isFetching} onClick={() => void search.refetch()}>
          {t`Încearcă din nou`}
        </Button>
      </section>
    )
  }

  const result = search.data
  const stale = search.isPlaceholderData
  const acts = result.acts
  // What the copy may claim (astra-client-8): the OpenSearch engine, whole, searched the acts' text; the Postgres
  // path only numbers and names; a degraded OpenSearch answer lost a leg it does not name (often only the meaning
  // one), so it claims neither.
  const reach: 'text' | 'names' | 'partial' = result.engine === 'opensearch' ? (result.degraded ? 'partial' : 'text') : 'names'
  const semanticUnavailable = result.caveats.includes(LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  // Every other caveat is shown verbatim: the sentinel alone is a machine marker, said in our words.
  const verbatim = result.caveats.filter((caveat) => caveat !== LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  const empty = acts.length === 0
  const resolveHits = resolve.data ?? []
  // Several acts for one name is a choice the reader makes; one act on a zeroed search is a rescue. Never over the
  // last query's faded answer: the resolver already answers the new one.
  // The resolver knows no filter: under one its act may be the very act the filter left out (F3), so no card then.
  const unfiltered = Object.keys(filter).length === 0
  const choose = !stale && unfiltered && (resolveHits.length >= 2 || (resolveHits.length > 0 && empty))
  const widen =
    filters.stare !== 'implicit' ? null : (
      <button type="button" onClick={() => onFilters({ ...filters, stare: 'toate' })} className={MORE_LINK}>
        {t`Caută și în actele abrogate sau ieșite din vigoare`}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </button>
    )
  const n = (value: number) => formatLegalNumber(value, i18n.locale)
  // Romanian counts take „de" from twenty on („20 de potriviri"): the plural's „other" form.
  const count =
    result.actsTotal == null
      ? plural(acts.length, { one: 'O potrivire afișată', few: '# potriviri afișate', other: '# de potriviri afișate' })
      : result.totalsExhaustive
        ? plural(result.actsTotal, { one: 'O potrivire', few: '# potriviri', other: '# de potriviri' })
        : plural(result.actsTotal, { one: 'Cel puțin o potrivire', few: 'Cel puțin # potriviri', other: 'Cel puțin # de potriviri' })

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
  // Under an answer with no rows, the way to the engine, the caveats and what was searched.
  const how = (
    <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
      {t`Cum s-a căutat`}
      <LegalInfoNote label={t`Cum se caută`}>{notes}</LegalInfoNote>
    </div>
  )

  return (
    <div className={cn('space-y-10 transition-opacity', stale && 'opacity-60')} aria-busy={stale}>
      {filtered ? (
        <div className="space-y-2">
          <LegislationActiveFilters filters={filters} onChange={onFilters} />
          {usesSummaries(filters) ? (
            <p className="text-xs text-muted-foreground">{t`Domeniul, categoria și sancțiunile vin din rezumate făcute automat: actele fără rezumat nu apar.`}</p>
          ) : null}
        </div>
      ) : null}
      {choose ? <ChooseAct hits={resolveHits} several={resolveHits.length >= 2} /> : null}

      {empty && stale ? (
        // The last query's empty answer, faded: its sentence would speak of a query no longer asked (F2).
        <section className="border-t pt-8" aria-busy="true">
          <p className="text-base text-muted-foreground">{t`Se caută…`}</p>
        </section>
      ) : empty && result.unhydratedHits > 0 ? (
        // The engine matched acts it could not load: an answer, not an absence.
        <section aria-labelledby="search-empty-title" className="border-t pt-8">
          <h2 id="search-empty-title" className="text-2xl font-semibold tracking-tight text-foreground">
            {t`Am găsit potriviri, dar nu le-am putut afișa`}
          </h2>
          {/* „potriviri": the count can be of provisions, not only acts */}
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{t`Serverul a găsit potriviri pentru această căutare, dar nu le-a putut încărca acum. Încearcă din nou peste puțin timp.`}</p>
          {degraded ? <div className="mt-3">{degraded}</div> : null}
          <Button variant="outline" className="mt-4" disabled={search.isFetching} onClick={() => void search.refetch()}>
            {t`Încearcă din nou`}
          </Button>
          {how}
        </section>
      ) : empty ? (
        <section aria-labelledby="search-empty-title" className="border-t pt-8">
          {choose ? (
            <p id="search-empty-title" className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              {reach === 'text'
                ? t`Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului. Căutarea după sens nu este încă disponibilă.`
                : reach === 'names'
                  ? t`Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului. Căutarea în textul legilor nu este încă disponibilă.`
                  : t`Căutarea directă nu a găsit nimic, iar o parte din ea nu a rulat: actele de mai sus sunt potriviri după denumirea sau numărul actului.`}
            </p>
          ) : parseLegalCitationShape(q) !== null ? (
            <>
              <h2 id="search-empty-title" className="text-2xl font-semibold tracking-tight text-foreground">
                {t`Niciun act găsit pentru citarea „${q}"`}
              </h2>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {t`Actele abrogate sau ieșite din vigoare nu sunt incluse implicit. Verifică și numărul și anul actului, de exemplu „Legea 53/2003".`}
              </p>
            </>
          ) : (
            <>
              {/* The page's contract: a phrase that finds nothing never reads as „the law does not exist". */}
              <h2 id="search-empty-title" className="max-w-[40ch] text-2xl font-semibold tracking-tight text-foreground">
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
      ) : (
        <section aria-labelledby="search-results-title" className="border-t pt-8">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div className="flex items-center gap-1">
              <h2 id="search-results-title" className="text-2xl font-semibold tracking-tight text-foreground">
                {count}
              </h2>
              <LegalInfoNote label={t`Cum se caută`}>{notes}</LegalInfoNote>
            </div>
            {widen}
          </div>
          {degraded ? <div className="mt-2">{degraded}</div> : null}
          <ol aria-label={t`Rezultate`} className="mt-6 divide-y border-y">
            {acts.map((hit) => (
              <li key={hit.act.actId} className="py-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <Link to="/legislation/acts/$actId" params={{ actId: hit.act.actId }} className="line-clamp-2 max-w-[70ch] text-base font-semibold text-foreground underline-offset-4 hover:underline">
                    {searchHitName(hit)}
                  </Link>
                  <LegalStatusBadge status={hit.act.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[
                    // „Doc" says nothing about the act: its kind is left out rather than named so.
                    hit.act.actType === 'doc' ? null : legalActTypeLabel(hit.act.actType),
                    hit.act.actYear !== null ? String(hit.act.actYear) : null,
                    hit.act.issuerSlug !== null ? legalIssuerLabel(hit.act.issuerSlug) : null,
                    hit.act.inDegree !== null && hit.act.inDegree > 0 ? t`citat de ${n(hit.act.inDegree)} ori` : null,
                  ]
                    .filter((part) => part !== null)
                    .join(' · ')}
                </p>
                {hit.description !== null ? <p className="mt-2 line-clamp-2 max-w-[80ch] text-sm leading-relaxed text-foreground/85">{hit.description}</p> : null}
                <div className="mt-2 space-y-2">
                  {result.sections
                    .filter((section) => section.actId === hit.act.actId)
                    .slice(0, SNIPPETS_PER_ACT)
                    .map((section, index) => (
                      <LegislationSearchSnippet key={`${section.documentId}-${index}`} hit={section} />
                    ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

/** The resolver's acts for a name that means several, or the one act a zeroed search missed: the reader picks. */
function ChooseAct({ hits, several }: { readonly hits: readonly { readonly value: string; readonly label: string; readonly hint: string | null }[]; readonly several: boolean }) {
  return (
    <section aria-labelledby="search-choose-title" className="max-w-3xl border bg-background p-5 shadow-sm sm:p-6">
      <h2 id="search-choose-title" className="text-sm font-semibold text-foreground">
        {several ? t`Mai multe acte poartă acest nume: alege actul` : t`Un act corespunde acestei căutări`}
      </h2>
      <ul aria-label={t`Acte identificate`} className="mt-3 divide-y">
        {hits.map((hit) => {
          const status = legalActStatusSchema.safeParse(hit.hint)
          return (
            <li key={`${hit.value}-${hit.label}`}>
              <Link to="/legislation/acts/$actId" params={{ actId: hit.value }} className="group flex min-h-11 items-center justify-between gap-4 py-2.5">
                <span className="min-w-0 truncate text-base font-medium text-foreground group-hover:underline group-hover:underline-offset-4">{hit.label}</span>
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
    <section className="border-t pt-8" aria-busy="true" aria-label={t`Se caută`}>
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-6 divide-y border-y">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2 py-5">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </div>
    </section>
  )
}
