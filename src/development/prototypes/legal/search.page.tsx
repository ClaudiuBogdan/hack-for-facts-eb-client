import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowRight, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SEARCH_FIELD_CLASS, SEARCH_ICON_CLASS, SEARCH_INPUT_CLASS } from '@/features/landing/components/search/search-field'
import { fetchLegalSearch, type LegalSearchFilter } from '@/features/legal/api/legal-search-api'
import { legalSearchFilterInput } from '@/features/legal/api/legal-search-api.live'
import { resolveLegalActs } from '@/features/legal/api/legal-resolve-api'
import { LegalStatusBadge } from '@/features/legal/components/legal-status-badge'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { LegislationSearchSnippet } from '@/features/legal/components/legislation-search-snippet'
import { LegalInfoNote } from '@/features/legal/components/hub/legislation-hub-chrome'
import { parseLegalCitationShape } from '@/features/legal/lib/legal-citation'
import { formatLegalDate, formatLegalNumber } from '@/features/legal/lib/legal-format'
import { legalActTypeLabel, legalIssuerLabel } from '@/features/legal/lib/legal-vocabulary'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { cn } from '@/lib/utils'
import { LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT, legalActStatusSchema } from '@/schemas/legal'
import { PROTOTYPE_MARKER } from './landing.lib'
import { ActiveFilters, FilterButton, FilterPanel, NO_FILTERS, isFiltered, searchArgs, usesSummaries, type SearchFilters } from './search.filters'

/**
 * `/legislation/search` redrawn in the landing's language (owner, 25 November 2026: prototype first). The same
 * two reads and the same honesty as the live page (`legislation-act-finder.tsx`): the search lane and the
 * resolver lane, a total said only when the server knows it, every server caveat verbatim, and a zero result
 * that never reads as „the law does not exist". What changes is the look: one title (the head's), the landing's
 * search field, the examples as a row of links, results as plain rows with their status, the notes behind one ⓘ,
 * the choice between several acts in a card. The query lives in the prototype's own state (the development route
 * keeps only `?v=`); the promoted page keeps it in the URL as today.
 */

/** Queries the page can answer today, each a measured hit (the live page's examples). */
const EXAMPLES = ['Legea 53/2003', 'Codul muncii', 'Codul fiscal', 'OUG 57/2019'] as const

/** Provision hits shown under one act (the server sends up to three). */
const SNIPPETS_PER_ACT = 3

/** The API's citation for a `doc` act, which names nothing („Doc nr. 41627"; LEG-PDYY). */
const BARE_DOC = /^Doc nr\.\s/u

/**
 * The titles of the same search's acts, asked for only when one of them is a bare „Doc nr." (prototype only: at
 * promotion `canonical { den title }` joins the search adapter's own query and this second read goes).
 */
const TITLES_QUERY = /* GraphQL */ `
  query LegislationSearchTitles($q: String!, $filter: LegalActsFilter, $includeHistorical: Boolean!, $limit: Int!) {
    legalSearch(q: $q, filter: $filter, includeHistorical: $includeHistorical, channel: auto, limit: $limit) {
      acts {
        act {
          actId
          canonical {
            den
            title
          }
        }
      }
    }
  }
`

type TitlesAnswer = { readonly legalSearch: { readonly acts: readonly { readonly act: { readonly actId: string | number; readonly canonical: { readonly den: string | null; readonly title: string | null } | null } }[] } }

function useDocTitles(q: string, historical: boolean, filter: LegalSearchFilter, wanted: boolean): ReadonlyMap<string, string> {
  const titles = useQuery({
    queryKey: ['legal', 'proto-search-titles', q, historical, filter],
    queryFn: ({ signal }) =>
      graphqlQuery<TitlesAnswer>(TITLES_QUERY, { q, filter: legalSearchFilterInput(filter), includeHistorical: historical, limit: 20 }, { operationName: 'legislationSearchTitles', auth: 'none', signal }),
    enabled: wanted,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const map = new Map<string, string>()
  for (const hit of titles.data?.legalSearch.acts ?? []) {
    // The Portal's name of the act („AMENDAMENTE din 8 decembrie 2006") before its short title („AMENDAMENT 08/12/2006").
    const title = (hit.act.canonical?.den || hit.act.canonical?.title)?.trim()
    if (title) map.set(String(hit.act.actId), title)
  }
  return map
}

/** A title in capitals („AMENDAMENTE din 20 mai 2011 la…") in sentence case; a title already mixed-case as it is. */
function sentenceCase(title: string): string {
  const letters = title.replace(/[^\p{L}]/gu, '')
  const upper = letters.replace(/[^\p{Lu}]/gu, '').length
  if (letters.length === 0 || upper / letters.length < 0.6) return title
  const lower = title.toLocaleLowerCase('ro')
  return lower.charAt(0).toLocaleUpperCase('ro') + lower.slice(1)
}

const TEXT_LINK = 'font-medium text-foreground underline-offset-4 hover:underline'
const MORE_LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'

export function SearchPagePrototype() {
  const { measuredAt, dataStatus } = useLegislationFrontier('corpus')
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <LegislationShell activeTab="cauta" measuredAt={measuredAt} dataStatus={dataStatus}>
        <SearchBody />
      </LegislationShell>
    </div>
  )
}

/** The search runs this long after the reader stops typing (owner, 25 November 2026: search as you type, no button). */
const TYPING_PAUSE_MS = 300
/** Fewer letters than this wait for Enter: „HG" alone would match half the corpus. */
const TYPED_MIN = 3

function SearchBody() {
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS)
  const [panel, setPanel] = useState(false)
  const [draft, setDraft] = useState('')
  const hasQuery = q.length > 0
  const run = (next: string) => {
    setDraft(next)
    setQ(next.trim())
  }
  // As the reader types: once they pause, from three letters; an emptied box clears the answer. Enter searches at
  // once, whatever the length. (Promoted, the query and the filters also go into the URL, replacing the entry.)
  useEffect(() => {
    const next = draft.trim()
    if (next === q || (next.length > 0 && next.length < TYPED_MIN)) return
    const timer = window.setTimeout(() => setQ(next), TYPING_PAUSE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, q])
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draft.trim().length > 0) run(draft)
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} role="search" aria-label={t`Caută în legislație`} className="max-w-3xl">
        <div className="flex items-start gap-2">
          {/* The landing's field lifts on focus because its answers open in a panel under it; here they are the page, so
              focus is the border alone. */}
          <div className={cn('relative min-w-0 flex-1', SEARCH_FIELD_CLASS, 'pr-10 focus-within:shadow-none')}>
            <Search aria-hidden="true" className={SEARCH_ICON_CLASS} />
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={t`Caută în legislație`}
              placeholder={t`Legea 53/2003, Codul muncii, OUG 57/2019`}
              className={SEARCH_INPUT_CLASS}
              enterKeyHint="search"
            />
            {draft.length > 0 ? (
              <button
                type="button"
                onClick={() => setDraft('')}
                aria-label={t`Golește căutarea`}
                className="absolute right-2 top-6 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {/* Beside the field (owner, 25 November 2026): the filters are part of the question. */}
          <FilterButton filters={filters} onOpen={() => setPanel(true)} />
        </div>
        {hasQuery ? null : (
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

      {hasQuery ? (
        <Answer q={q} filters={filters} onFilters={setFilters} onWiden={() => setFilters((was) => ({ ...was, stare: 'toate' }))} />
      ) : (
        <WhatToSearch onExample={run} />
      )}
      <FilterPanel filters={filters} onChange={setFilters} open={panel} onOpenChange={setPanel} />
    </div>
  )
}

/** Before a search: what the page finds, in two short columns, and its one limit behind the ⓘ. */
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

function Answer({
  q,
  filters,
  onFilters,
  onWiden,
}: {
  readonly q: string
  readonly filters: SearchFilters
  readonly onFilters: (next: SearchFilters) => void
  readonly onWiden: () => void
}) {
  const { i18n } = useLingui()
  const { filter, historical } = searchArgs(filters)
  const filtered = isFiltered(filters)
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
  const titles = useDocTitles(q, historical, filter, (search.data?.acts ?? []).some((hit) => BARE_DOC.test(hit.act.displayCitation)))
  // A bare „Doc nr." goes by its title once the title is known; until then (or without one) by the citation.
  const nameOf = (act: { readonly actId: string; readonly displayCitation: string }) => {
    const title = BARE_DOC.test(act.displayCitation) ? titles.get(act.actId) : undefined
    return title ? sentenceCase(title) : act.displayCitation
  }

  if (search.isPending) return <PendingRows />
  if (search.isError) {
    return (
      <section className="border-t pt-8">
        <p className="text-base text-foreground">{t`Nu am putut căuta în legislație.`}</p>
        <Button variant="outline" className="mt-4" onClick={() => void search.refetch()}>
          {t`Încearcă din nou`}
        </Button>
      </section>
    )
  }

  const result = search.data
  const acts = result.acts
  const resolveHits = resolve.data ?? []
  const textSearched = result.engine === 'opensearch'
  const verbatim = result.caveats.filter((caveat) => caveat !== LEGAL_SEMANTIC_UNAVAILABLE_CAVEAT)
  const empty = acts.length === 0
  // Several acts for one name is a choice the reader makes; one act on a zeroed search is a rescue.
  const choose = resolveHits.length >= 2 || (resolveHits.length > 0 && empty)
  const widen = filters.stare !== 'implicit' ? null : (
    <button type="button" onClick={onWiden} className={MORE_LINK}>
      {t`Caută și în actele abrogate sau ieșite din vigoare`}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </button>
  )
  const n = (value: number) => formatLegalNumber(value, i18n.locale)
  const count =
    result.actsTotal == null
      ? acts.length === 1
        ? t`O potrivire afișată`
        : t`${n(acts.length)} potriviri afișate`
      : result.totalsExhaustive
        ? result.actsTotal === 1
          ? t`O potrivire`
          : t`${n(result.actsTotal)} potriviri`
        : t`Cel puțin ${n(result.actsTotal)} potriviri`

  const notes: ReactNode = (
    <>
      <p>
        {textSearched
          ? t`Potriviri după cuvintele din numele, titlul și textul actelor. Căutarea după sens nu este încă disponibilă: o prevedere poate exista chiar dacă nu apare aici.`
          : t`Potriviri după numărul și denumirea actelor. Căutarea în textul legilor nu este încă disponibilă: o prevedere poate exista chiar dacă nu apare aici.`}
      </p>
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
        {result.degraded ? ` · ${t`răspuns degradat: o parte din căutare nu a rulat`}` : ''}
      </p>
    </>
  )

  return (
    <div className={cn('space-y-10 transition-opacity', search.isPlaceholderData && 'opacity-60')} aria-busy={search.isPlaceholderData}>
      {filtered ? (
        <div className="space-y-2">
          <ActiveFilters filters={filters} onChange={onFilters} />
          {usesSummaries(filters) ? <p className="text-xs text-muted-foreground">{t`Cu domeniul, categoria sau sancțiunile, actele fără rezumat nu apar.`}</p> : null}
        </div>
      ) : null}
      {choose ? <ChooseAct hits={resolveHits} several={resolveHits.length >= 2} /> : null}

      {empty ? (
        <section aria-labelledby="search-empty-title" className="border-t pt-8">
          {choose ? (
            <p id="search-empty-title" className="max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              {textSearched
                ? t`Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului. Căutarea după sens nu este încă disponibilă.`
                : t`Căutarea directă nu a găsit nimic: actele de mai sus sunt potriviri după denumirea sau numărul actului. Căutarea în textul legilor nu este încă disponibilă.`}
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
                {textSearched
                  ? t`Am căutat cuvintele în numele, titlul și textul actelor, dar nu și după sens: o prevedere formulată cu alte cuvinte nu apare.`
                  : t`Deocamdată căutarea găsește un act după numărul lui (de exemplu „Legea 53/2003") și după denumire (de exemplu „Codul muncii"). Căutarea după expresii din textul legilor, cum ar fi „concediu de odihnă", nu este încă disponibilă.`}
              </p>
            </>
          )}
          {filtered ? (
            <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
              {t`Filtrele alese pot fi motivul: scoate-le pe rând, de sus.`}
            </p>
          ) : null}
          {widen ? <div className="mt-4">{widen}</div> : null}
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
          <ol aria-label={t`Rezultate`} className="mt-6 divide-y border-y">
            {acts.map((hit) => (
              <li key={hit.act.actId} className="py-5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <Link to="/legislation/acts/$actId" params={{ actId: hit.act.actId }} className="line-clamp-2 max-w-[70ch] text-base font-semibold text-foreground underline-offset-4 hover:underline">
                    {nameOf(hit.act)}
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
