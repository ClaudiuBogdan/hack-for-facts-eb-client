import { useEffect, useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Link2, SlidersHorizontal } from 'lucide-react'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { Chip, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import type {
  LegalAnalyticsArgs,
  LegalAnalyticsHead,
  LegalAnalyticsLinks,
  LegalAnalyticsSummary,
} from '@/schemas/legal-analytics'
import { fetchLegalAnalytics, LEGAL_ANALYTICS_UNAVAILABLE } from '../../api/legal-analytics-api'
import { useLegalAnalytics } from '../../hooks/use-legislation-analytics'
import {
  FAMILY_LABEL,
  GROUP_LABEL,
  GROUP_ORDER,
  KIND_LABEL,
  LINK_KIND_LABEL,
  LINK_NOTE_LABEL,
  TYPE_BAND_LABEL,
  TYPE_LABEL,
  VERSIONS_LABEL,
} from '../../lib/analytics-labels'
import {
  API_ORDER,
  DATA_LENSES,
  DEFAULT_QUESTION,
  LENS_LABEL,
  LENSES,
  SOON_LENSES,
  apiLens,
  filterArgs,
  isDataLens,
  isFiltered,
  type DataLens,
  type Form,
  type Lens,
  type Order,
  type Question,
} from '../../lib/analytics-question'
import { fmt, pct } from '../../lib/analytics-format'
import { READING_SENTENCE } from '../../lib/analytics-notes-text'
import { labelOfKey, rankedOf, useQuestion } from '../../lib/analytics-view'
import { AnalyticsCaveats, AnalyticsProblem } from './analytics-notes'
import { CrossGrid, RankedTable, StackedYears } from './analytics-charts'

function fact(key: string, value: number, digits: number, unit: string, label: string, note: string, href: string): HubFact {
  return {
    key,
    value,
    digits,
    unit: unit || undefined,
    label,
    note,
    link: (children: ReactNode, className: string) => (
      <a href={href} className={className}>
        {children}
      </a>
    ),
  }
}

/** The firm rule-making share and the uncertain and unplaced remainders, from one summary. */
function rulesOf(s: LegalAnalyticsSummary) {
  const rules = s.felul.find((r) => r.key === 'rule-making')?.acts ?? 0
  return {
    main: s.total ? (rules / s.total) * 100 : 0,
    note: s.total
      ? t`${pct(s.uncertain / s.total)} încadrare nesigură · ${pct(s.unplaced / s.total)} neîncadrate · din ${fmt(s.total)}`
      : '',
  }
}

/**
 * Answers of one page must come from one layer: if two of them differ (a layer was published while the page
 * loaded), every analytics read is made again.
 */
function useOneLayer(layers: readonly (string | undefined)[]) {
  const client = useQueryClient()
  const known = layers.filter((l): l is string => l !== undefined)
  const mixed = new Set(known).size > 1
  useEffect(() => {
    if (mixed) void client.invalidateQueries({ queryKey: ['legal', 'analytics'] })
  }, [mixed, client])
}

/**
 * `/legislation/analytics` (design §4.2, §11): the question as the headline, the population, the lens, the answer,
 * the acts. Every figure is a count from the published insights layer; the page computes the shares.
 */
export function LegislationAnalysis({ unavailable = false }: { readonly unavailable?: boolean }) {
  const [q, move] = useQuestion()
  const [sheet, setSheet] = useState(false)
  const head = useLegalAnalytics('head', {})
  const base = filterArgs(q)
  const summary = useLegalAnalytics('summary', base)
  useOneLayer([head.data?.layer.layerId, summary.data?.layer.layerId])

  if (head.error) return <AnalyticsProblem error={head.error} />
  // refused on the server (503): the calm panel, on the server too, until a browser read succeeds
  if (unavailable && !head.data) return <AnalyticsProblem error={LEGAL_ANALYTICS_UNAVAILABLE} />
  const s = summary.data?.data
  const h = head.data?.data
  const population = q.populatie === 'stoc' ? t`legislația așa cum este` : t`ce s-a publicat`
  return (
    <div className="flex min-w-0 flex-col gap-12">
      <section aria-label={t`Întrebarea`}>
        <MonoLabel className="block text-primary">{t`Analiză`}</MonoLabel>
        <Headline q={q} move={move} onOpen={() => setSheet(true)} head={h} />
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <button type="button" onClick={() => setSheet(true)} className="font-medium text-foreground underline-offset-4 hover:underline">
            {t`+ Adaugă un filtru`}
          </button>
          <button type="button" onClick={() => setSheet(true)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t`Filtre`}
          </button>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={t`Copiază adresa întrebării`}
            title={t`Copiază adresa întrebării`}
            onClick={() => void navigator.clipboard.writeText(window.location.href)}
          >
            <Link2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <IndicatorToggle<'flux' | 'stoc'>
            label={t`Populația`}
            value={q.populatie}
            onChange={(populatie) => move({ ...q, populatie })}
            options={[
              { key: 'flux', label: t`Flux · ce s-a publicat` },
              { key: 'stoc', label: t`Stoc · legislația așa cum este` },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {h
              ? q.populatie === 'stoc'
                ? t`Actele care stabilesc reguli și stau singure, încadrate ferm: ${fmt(h.totals.inStock)} acte (definiție provizorie).`
                : t`Fiecare act publicat, la data lui: ${fmt(h.totals.acts)} acte.`
              : null}
          </p>
        </div>
      </section>
      {s ? (
        <HubFiguresBand
          locale="ro"
          facts={[
            fact('sel', s.total, 0, '', t`acte în selecție`, t`din ${fmt(s.population)} (${population})`, '#raspuns'),
            fact('reguli', rulesOf(s).main, 1, '%', t`stabilesc reguli (încadrate ferm)`, rulesOf(s).note, '#raspuns'),
            fact(
              'text',
              s.total ? (s.withText / s.total) * 100 : 0,
              1,
              '%',
              t`au text citibil în Portal`,
              t`${fmt(s.withText)} acte`,
              '#raspuns',
            ),
          ]}
        />
      ) : summary.error ? (
        <AnalyticsProblem error={summary.error} />
      ) : (
        <div className="h-28 animate-pulse bg-muted/40" aria-hidden="true" />
      )}
      <section id="raspuns" aria-label={t`Răspunsul`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <MonoLabel className="block text-muted-foreground">{t`Privește după`}</MonoLabel>
            <IndicatorToggle<Lens>
              className="mt-2 grid-flow-row grid-cols-2 min-[400px]:grid-cols-3 lg:grid-cols-7"
              label={t`Privește după`}
              value={q.vedere}
              onChange={(vedere) => move({ ...q, vedere })}
              options={LENSES.map((key) => ({
                key,
                label: SOON_LENSES.includes(key) ? `${LENS_LABEL[key]} · ${t`în curând`}` : LENS_LABEL[key],
              }))}
            />
          </div>
          {isDataLens(q.vedere) ? (
            <IndicatorToggle<Form>
              label={t`Forma răspunsului`}
              value={q.forma}
              onChange={(forma) => move({ ...q, forma })}
              options={[
                { key: 'clasament', label: t`Clasament` },
                { key: 'timp', label: t`În timp` },
                { key: 'grila', label: t`Grilă` },
              ]}
            />
          ) : null}
        </div>
        <div className="mt-6">
          <Answer q={q} move={move} base={base} head={h} />
        </div>
      </section>
      <ActsBand q={q} move={move} base={base} />
      <AnalyticsCaveats head={h} />
      {h ? <FilterSheet q={q} move={move} open={sheet} onOpenChange={setSheet} head={h} base={base} /> : null}
    </div>
  )
}

/** The headline: the question, each filter a phrase that opens the panel and whose ✕ drops it. */
function Headline({
  q,
  move,
  onOpen,
  head,
}: {
  readonly q: Question
  readonly move: (q: Question) => void
  readonly onOpen: () => void
  readonly head: LegalAnalyticsHead | undefined
}) {
  const typeText = q.tip.length ? q.tip.map((k) => TYPE_LABEL[k] ?? k).join(', ') : t`de orice tip`
  const min = head?.years.min ?? null
  const max = head?.years.max ?? null
  const yearText = q.an
    ? q.an.from === q.an.to
      ? t`din ${String(q.an.from)}`
      : t`din ${String(q.an.from)}–${String(q.an.to)}`
    : min !== null && max !== null
      ? t`din ${String(min)}–${String(max)}`
      : t`din orice an`
  const issuerText =
    q.emitent !== null
      ? t`de la ${q.emitent}`
      : q.familie !== null
        ? t`de la ${FAMILY_LABEL[q.familie] ?? q.familie}`
        : t`de la orice emitent`
  const felulText =
    q.felul === null
      ? t`de orice fel`
      : q.felul === 'uncertain'
        ? t`cu încadrare nesigură`
        : q.felul === 'unplaced'
          ? t`neîncadrate`
          : t`care ${GROUP_LABEL[q.felul] ?? KIND_LABEL[q.felul] ?? q.felul}`
  const dynText = q.dinamica === null ? null : t`cu ${VERSIONS_LABEL[q.dinamica] ?? ''}`
  const phrase = (text: string, set: boolean, clear: () => void) =>
    set ? (
      <HeadlinePhrase text={text} removeLabel={t`Scoate filtrul ${text}`} onOpen={onOpen} onRemove={clear} />
    ) : (
      <span
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen()
        }}
        className="cursor-pointer underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em]"
      >
        {text}
      </span>
    )
  return (
    <h2 className="mt-3 max-w-[30ch] text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-4xl">
      {t`Acte`} {phrase(typeText, q.tip.length > 0, () => move({ ...q, tip: [] }))},{' '}
      {phrase(yearText, q.an !== null, () => move({ ...q, an: null }))},{' '}
      {phrase(issuerText, q.emitent !== null || q.familie !== null, () => move({ ...q, emitent: null, familie: null }))},{' '}
      {phrase(felulText, q.felul !== null, () => move({ ...q, felul: null }))}
      {dynText ? <>, {phrase(dynText, true, () => move({ ...q, dinamica: null }))}</> : null}
      {', '}
      <span className="text-muted-foreground">{t`toate domeniile, toate temele`}</span>
    </h2>
  )
}

const COVERAGE: Readonly<Record<DataLens, () => string>> = {
  felul: () => READING_SENTENCE,
  emitent: () =>
    t`Emitenții sunt linii (denumiri succesive unite); la legi, ordonanțe și decrete emitentul e derivat din tip și dată.`,
  dinamica: () =>
    t`Versiuni listate de Portal: datele distincte la care Portalul a listat o versiune consolidată (neoficială).`,
  tip: () => t`Tipul normalizat al actului.`,
}

function Answer({
  q,
  move,
  base,
  head,
}: {
  readonly q: Question
  readonly move: (q: Question) => void
  readonly base: LegalAnalyticsArgs
  readonly head: LegalAnalyticsHead | undefined
}) {
  if (SOON_LENSES.includes(q.vedere)) {
    return (
      <div className="border border-dashed p-8 text-sm text-muted-foreground">
        {q.vedere === 'tema'
          ? t`Temele (grupări ale actelor după textul lor) intră aici după ce potrivirea pe tot corpusul e verificată. În curând.`
          : t`Domeniile intră aici după ce le măsurăm acoperirea pe corpusul nou. În curând.`}
      </div>
    )
  }
  if (q.vedere === 'legaturi') return <LinksView base={base} />
  if (!isDataLens(q.vedere)) return null
  if (q.forma === 'timp') return <SeriesAnswer q={q} base={base} />
  if (q.forma === 'grila') return <GridAnswer q={q} move={move} base={base} />
  return <RankAnswer q={q} move={move} base={base} head={head} />
}

function RankAnswer({
  q,
  move,
  base,
  head,
}: {
  readonly q: Question
  readonly move: (q: Question) => void
  readonly base: LegalAnalyticsArgs
  readonly head: LegalAnalyticsHead | undefined
}) {
  const vedere = q.vedere as DataLens
  const lens = apiLens(vedere, vedere === 'felul' && q.fin)
  const answer = useLegalAnalytics('breakdown', { ...base, lens, ...(vedere === 'emitent' && { limit: 50 }) })
  if (answer.error) return <AnalyticsProblem error={answer.error} />
  const b = answer.data?.data
  if (!b) return <div className="h-64 animate-pulse bg-muted/40" aria-hidden="true" />
  const rows = rankedOf(b.lens, b.rows, b.total)
  const kindCount = head ? Object.keys(head.values.felulKinds).length : 0
  return (
    <div>
      {vedere === 'felul' ? (
        <IndicatorToggle<'grupe' | 'feluri'>
          className="mb-4"
          label={t`Nivelul`}
          value={q.fin ? 'feluri' : 'grupe'}
          onChange={(v) => move({ ...q, fin: v === 'feluri' })}
          options={[
            { key: 'grupe', label: t`Grupe` },
            { key: 'feluri', label: kindCount ? t`Feluri (${String(kindCount)})` : t`Feluri` },
          ]}
        />
      ) : null}
      <RankedTable
        rows={rows}
        total={b.total}
        limit={vedere === 'emitent' ? 50 : 30}
        caption={LENS_LABEL[vedere]}
        denominator={COVERAGE[vedere]()}
        pickedKey={vedere === 'felul' ? q.felul : vedere === 'emitent' ? q.emitent : null}
        onPick={(key) => {
          if (vedere === 'felul') move({ ...q, felul: q.felul === key ? null : key })
          else if (vedere === 'tip') move({ ...q, tip: q.tip.length === 1 && q.tip[0] === key ? [] : [key] })
          else if (vedere === 'emitent' && key !== '') move({ ...q, emitent: q.emitent === key ? null : key })
          else if (vedere === 'dinamica') move({ ...q, dinamica: q.dinamica === Number(key) ? null : Number(key) })
        }}
      />
      {vedere === 'felul' ? <p className="mt-3 max-w-[80ch] text-sm text-foreground">{READING_SENTENCE}</p> : null}
    </div>
  )
}

function SeriesAnswer({ q, base }: { readonly q: Question; readonly base: LegalAnalyticsArgs }) {
  const vedere = q.vedere as DataLens
  const lens = apiLens(vedere, vedere === 'felul' && q.fin)
  const answer = useLegalAnalytics('series', { ...base, lens })
  if (answer.error) return <AnalyticsProblem error={answer.error} />
  const s = answer.data?.data
  if (!s) return <div className="h-64 animate-pulse bg-muted/40" aria-hidden="true" />
  return (
    <StackedYears
      years={s.years.map((y) => ({ year: y.year, values: y.acts }))}
      labels={[...s.keys.map((k) => labelOfKey(s.lens, k)), 'altele']}
      caption={t`acte pe an, după ${LENS_LABEL[vedere].toLowerCase()}`}
      footnote={s.unknownYear ? t`${fmt(s.unknownYear)} acte fără an nu sunt pe grafic.` : undefined}
    />
  )
}

function GridAnswer({
  q,
  move,
  base,
}: {
  readonly q: Question
  readonly move: (q: Question) => void
  readonly base: LegalAnalyticsArgs
}) {
  const vedere = q.vedere as DataLens
  const other = DATA_LENSES.filter((l) => l !== vedere)
  const cu = other.includes(q.cu) ? q.cu : (other[0] ?? 'tip')
  const answer = useLegalAnalytics('grid', { ...base, lens: apiLens(vedere), by: apiLens(cu) })
  const g = answer.data?.data
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MonoLabel className="text-muted-foreground">{t`încrucișat cu`}</MonoLabel>
        <IndicatorToggle<DataLens>
          label={t`A doua privire`}
          value={cu}
          onChange={(next) => move({ ...q, cu: next })}
          options={other.map((key) => ({ key, label: LENS_LABEL[key] }))}
        />
      </div>
      {answer.error ? (
        <AnalyticsProblem error={answer.error} />
      ) : g ? (
        <CrossGrid
          rows={rankedOf(g.lens, g.rows, g.total)}
          cols={[...g.cols.map((c) => labelOfKey(g.by, c.key)), 'altele']}
          cells={g.cells}
          rowCaption={LENS_LABEL[vedere]}
        />
      ) : (
        <div className="h-64 animate-pulse bg-muted/40" aria-hidden="true" />
      )}
    </div>
  )
}

const MATRIX_BANDS = ['legi_ordonante', 'hotarari', 'ordine', 'decizii', 'decrete', 'altele'] as const
const MATRIX_REST = ['code', 'ambiguous', 'outside_corpus', 'no_target_in_title'] as const

/** „Legături": who amends what, the most amended, the most named by a court; the link counts by kind. */
function LinksView({ base }: { readonly base: LegalAnalyticsArgs }) {
  const answer = useLegalAnalytics('links', base)
  if (answer.error) return <AnalyticsProblem error={answer.error} />
  const l = answer.data?.data
  if (!l) return <div className="h-64 animate-pulse bg-muted/40" aria-hidden="true" />
  const cell = (a: string, b: string) => l.amends.find((x) => x.sourceBand === a && x.target === b)?.links ?? 0
  const total = l.amends.reduce((s, x) => s + x.links, 0)
  const resolved = l.amends.filter((x) => (MATRIX_BANDS as readonly string[]).includes(x.target)).reduce((s, x) => s + x.links, 0)
  return (
    <div className="space-y-12">
      <div>
        <MonoLabel className="block text-muted-foreground">
          {t`cine modifică ce: actul care modifică (rând) × actul modificat (coloană)`}
        </MonoLabel>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr>
                <th />
                {[...MATRIX_BANDS, ...MATRIX_REST].map((c) => (
                  <th
                    key={c}
                    className={cn(
                      'px-1.5 py-2 text-right align-bottom font-normal',
                      (MATRIX_REST as readonly string[]).includes(c) && 'text-muted-foreground',
                    )}
                  >
                    <MonoLabel>{TYPE_BAND_LABEL[c] ?? LINK_NOTE_LABEL[c] ?? c}</MonoLabel>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_BANDS.map((a) => (
                <tr key={a} className="border-t">
                  <th className="py-1.5 pr-3 text-left font-normal">{TYPE_BAND_LABEL[a] ?? a}</th>
                  {[...MATRIX_BANDS, ...MATRIX_REST].map((b) => {
                    const n = cell(a, b)
                    const rest = (MATRIX_REST as readonly string[]).includes(b)
                    return (
                      <td
                        key={b}
                        className={cn(
                          'px-1.5 py-1.5 text-right tabular-nums',
                          rest ? 'text-muted-foreground' : n >= 1000 ? 'bg-primary/30' : n >= 200 ? 'bg-primary/15' : n > 0 ? 'bg-primary/5' : '',
                        )}
                      >
                        {n ? fmt(n) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {total
            ? t`${fmt(total)} acte care modifică, după titlu; ${fmt(resolved)} (${pct(resolved / total)}) legate de un singur act din corpus. Restul, în coloanele gri: un cod numit, o țintă cu același număr la mai mulți emitenți, o țintă care lipsește din corpus, sau niciun act numit în titlu. Legile și ordonanțele sunt o singură bandă.`
            : t`Niciun act care modifică în selecție.`}
        </p>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <LinkList
          title={t`Cele mai modificate`}
          note={t`De câte ori e numit ca țintă în titlul unui act care modifică.`}
          rows={l.topTargets.filter((x) => x.kind === 'amends')}
        />
        <LinkList
          title={t`Cele mai numite în decizii ale instanțelor`}
          note={t`Trimiteri din titlul deciziilor, nu efecte.`}
          rows={l.topTargets.filter((x) => x.kind === 'court_names')}
        />
      </div>
      <LinkCounts links={l} />
    </div>
  )
}

function LinkList({
  title,
  note,
  rows,
}: {
  readonly title: string
  readonly note: string
  readonly rows: LegalAnalyticsLinks['topTargets']
}) {
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">{title}</MonoLabel>
      <ol className="mt-3 divide-y border-y">
        {rows.slice(0, 15).map((r, j) => (
          <li key={r.target.actId}>
            <a
              href={`/legislation/acts/${r.target.actId}`}
              className="grid min-h-11 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 py-1.5 text-left text-sm hover:bg-muted/50"
            >
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{j + 1}</span>
              <span className="line-clamp-2">{r.target.title ?? r.target.citation}</span>
              <span className="tabular-nums">{fmt(r.links)}</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">{t`Primele ${String(Math.min(15, rows.length))}. ${note}`}</p>
    </div>
  )
}

/** The links by kind and what was found for each, with the days for the ordinance laws. */
export function LinkCounts({ links }: { readonly links: LegalAnalyticsLinks }) {
  const kinds = [...new Set(links.byKind.map((x) => x.kind))]
  return (
    <div>
      <MonoLabel className="block text-muted-foreground">{t`legături citite din titluri, după fel`}</MonoLabel>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>
              <MonoLabel>{t`legătura`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`act găsit`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`altfel`}</MonoLabel>
            </TableHead>
            <TableHead className="text-right">
              <MonoLabel>{t`zile (mediana)`}</MonoLabel>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kinds.map((k) => {
            const found = links.byKind.find((x) => x.kind === k && x.note === 'resolved')?.links ?? 0
            const other = links.byKind.filter((x) => x.kind === k && x.note !== 'resolved').reduce((s, x) => s + x.links, 0)
            const days = links.days.find((d) => d.kind === k)
            return (
              <TableRow key={k}>
                <TableCell className="py-1.5">{LINK_KIND_LABEL[k] ?? k}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{fmt(found)}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{fmt(other)}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{days?.median != null ? fmt(days.median) : '—'}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">
        {t`Zilele: de la prima publicare în Monitorul Oficial a actului numit la a actului care îl numește. Pentru promulgări nu sunt date: data decretului nu e în strat.`}
      </p>
    </div>
  )
}

/** The acts of the selection, ordered, each opening its act; more on demand. */
function ActsBand({
  q,
  move,
  base,
}: {
  readonly q: Question
  readonly move: (q: Question) => void
  readonly base: LegalAnalyticsArgs
}) {
  const args = { ...base, order: API_ORDER[q.ordine] }
  const pages = useInfiniteQuery({
    queryKey: ['legal', 'analytics', 'acts', args] as const,
    queryFn: ({ pageParam, signal }) =>
      fetchLegalAnalytics('acts', pageParam === null ? args : { ...args, cursor: pageParam }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.data.next,
    staleTime: 60 * 1000,
  })
  const first = pages.data?.pages[0]?.data
  const rows = pages.data?.pages.flatMap((p) => p.data.rows) ?? []
  const hidden = first?.hidden ?? 0
  return (
    <section id="acte" aria-label={t`Actele din selecție`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HubSectionHead
          index={t`Actele`}
          title={t`Actele din selecție`}
          lede={first ? t`${fmt(first.total)} acte în selecție, ordonate.` : t`Actele selecției, ordonate.`}
        />
        <IndicatorToggle<Order>
          label={t`Ordonează după`}
          value={q.ordine}
          onChange={(ordine) => move({ ...q, ordine })}
          options={[
            { key: 'modificari', label: t`Modificări` },
            { key: 'decizii', label: t`Decizii` },
            { key: 'versiuni', label: t`Versiuni` },
            { key: 'citari', label: t`Citări` },
            { key: 'an', label: t`An` },
          ]}
        />
      </div>
      {pages.error ? (
        <AnalyticsProblem error={pages.error} />
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>
                <MonoLabel>{t`act`}</MonoLabel>
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <MonoLabel>{t`felul`}</MonoLabel>
              </TableHead>
              <TableHead className="text-right">
                <MonoLabel>{t`modif.`}</MonoLabel>
              </TableHead>
              <TableHead className="text-right">
                <MonoLabel>{t`decizii`}</MonoLabel>
              </TableHead>
              <TableHead className="text-right">
                <MonoLabel>{t`vers.`}</MonoLabel>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.actId}>
                <TableCell className="py-1.5">
                  <a href={`/legislation/acts/${a.actId}`} className="line-clamp-2 underline-offset-4 hover:underline">
                    {a.title ?? a.citation}
                  </a>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {a.citation} · {TYPE_LABEL[a.type] ?? a.type} · {a.year ?? '—'} · {a.issuer ?? t`fără emitent`}
                  </span>
                </TableCell>
                <TableCell className="hidden py-1.5 text-sm text-muted-foreground sm:table-cell">
                  {a.guess ? (
                    <>
                      {t`încadrare nesigură`}
                      <span className="block text-xs">{t`probabil: ${KIND_LABEL[a.guess.kind] ?? a.guess.kind}`}</span>
                    </>
                  ) : (
                    (KIND_LABEL[a.kind] ?? a.kind)
                  )}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a.amended || '—'}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a.court || '—'}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{a.versions || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          {first ? t`${fmt(rows.length)} din ${fmt(first.total)} acte.` : null}{' '}
          {hidden ? t`${fmt(hidden)} acte ale selecției nu pot fi afișate (restricționate după calcul).` : null}
        </p>
        {pages.hasNextPage ? (
          <button
            type="button"
            className="min-h-11 border px-4 text-sm hover:bg-muted"
            disabled={pages.isFetchingNextPage}
            onClick={() => void pages.fetchNextPage()}
          >
            {t`Mai multe acte`}
          </button>
        ) : null}
      </div>
    </section>
  )
}

/** The whole filter set: from the right on a desktop, from the bottom on a phone. */
function FilterSheet({
  q,
  move,
  open,
  onOpenChange,
  head,
  base,
}: {
  readonly q: Question
  readonly move: (q: Question) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly head: LegalAnalyticsHead
  readonly base: LegalAnalyticsArgs
}) {
  const [issuerSearch, setIssuerSearch] = useState('')
  const min = head.years.min ?? 1800
  const max = head.years.max ?? new Date().getFullYear()
  const years = Array.from({ length: Math.max(0, max - min + 1) }, (_, j) => min + j)
  // the full lineage list (the head lists the first 300) only once someone searches
  const searching = open && issuerSearch.trim().length >= 2
  const allIssuers = useLegalAnalytics('breakdown', { ...base, lens: 'issuer', limit: 1000 }, searching)
  const needle = fold(issuerSearch)
  const issuers = (
    searching && allIssuers.data
      ? allIssuers.data.data.rows.flatMap((r) => (r.key === null ? [] : [{ lineage: r.key, acts: r.acts }]))
      : head.issuers.map((i) => ({ lineage: i.lineage, acts: i.acts }))
  )
    .filter((x) => needle === '' || fold(x.lineage).includes(needle))
    .slice(0, 60)
  const toggleType = (k: string) =>
    move({ ...q, tip: q.tip.includes(k) ? q.tip.filter((x) => x !== k) : [...q.tip, k].sort() })
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeClassName={SHEET_CLOSE} className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t`Filtre`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 divide-y">
          <Group title={t`Când`}>
            <Row label={t`De la`}>
              <select
                className="min-h-11 w-full border bg-background px-2 text-base sm:min-h-10 sm:text-sm"
                value={q.an?.from ?? min}
                onChange={(e) =>
                  move({ ...q, an: { from: Number(e.target.value), to: Math.max(Number(e.target.value), q.an?.to ?? max) } })
                }
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t`Până la`}>
              <select
                className="min-h-11 w-full border bg-background px-2 text-base sm:min-h-10 sm:text-sm"
                value={q.an?.to ?? max}
                onChange={(e) =>
                  move({ ...q, an: { from: Math.min(Number(e.target.value), q.an?.from ?? min), to: Number(e.target.value) } })
                }
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Row>
            <p className="text-xs text-muted-foreground">
              {t`O perioadă lasă deoparte actele fără an.`}
            </p>
          </Group>
          <Group title={t`Ce`}>
            <Row label={t`Tip`}>
              <div className="grid grid-cols-2 gap-1">
                {head.types.map((ty) =>
                  ty.key === null ? null : (
                    <button
                      key={ty.key}
                      type="button"
                      aria-pressed={q.tip.includes(ty.key)}
                      onClick={() => toggleType(ty.key ?? '')}
                      className={cn(
                        'flex min-h-11 items-center justify-between gap-2 border px-2 text-left text-sm sm:min-h-10',
                        q.tip.includes(ty.key) ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted',
                      )}
                    >
                      <span className="truncate">{TYPE_LABEL[ty.key] ?? ty.key}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{fmt(ty.acts)}</span>
                    </button>
                  ),
                )}
              </div>
            </Row>
            <Row label={t`Felul`}>
              <div className="grid gap-1">
                {GROUP_ORDER.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={q.felul === g}
                    onClick={() => move({ ...q, felul: q.felul === g ? null : g })}
                    className={cn(
                      'min-h-11 border px-2 text-left text-sm sm:min-h-10',
                      q.felul === g ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted',
                    )}
                  >
                    {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Versiuni`}>
              <div className="grid grid-cols-2 gap-1">
                {VERSIONS_LABEL.map((l, j) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={q.dinamica === j}
                    onClick={() => move({ ...q, dinamica: q.dinamica === j ? null : j })}
                    className={cn(
                      'min-h-11 border px-2 text-left text-sm sm:min-h-10',
                      q.dinamica === j ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted',
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Row>
          </Group>
          <Group title={t`Cine`}>
            <Row label={t`Familia`}>
              <div className="grid grid-cols-2 gap-1">
                {head.values.issuerFamilies.map((fam) => (
                  <button
                    key={fam}
                    type="button"
                    aria-pressed={q.familie === fam}
                    onClick={() => move({ ...q, familie: q.familie === fam ? null : fam })}
                    className={cn(
                      'min-h-11 border px-2 text-left text-sm sm:min-h-10',
                      q.familie === fam ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted',
                    )}
                  >
                    {FAMILY_LABEL[fam] ?? fam}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Emitent`}>
              {q.emitent !== null ? (
                <Chip label={q.emitent} onClear={() => move({ ...q, emitent: null })} />
              ) : (
                <>
                  <input
                    value={issuerSearch}
                    onChange={(e) => setIssuerSearch(e.target.value)}
                    placeholder={t`Caută un emitent`}
                    className="min-h-11 w-full border bg-background px-2.5 text-base sm:min-h-10 sm:text-sm"
                  />
                  <div className="max-h-72 overflow-y-auto border">
                    {issuers.map((x) => (
                      <button
                        key={x.lineage}
                        type="button"
                        onClick={() => move({ ...q, emitent: x.lineage })}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-2.5 text-left text-sm hover:bg-muted sm:min-h-10"
                      >
                        <span className="truncate">{x.lineage}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{fmt(x.acts)}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t`${fmt(head.issuerCount)} emitenți; caută unul după nume.`}
                  </p>
                </>
              )}
            </Row>
          </Group>
          <Group title={t`Despre ce`}>
            <p className="text-sm text-muted-foreground">{t`Domeniul și tema vin după potrivirea pe tot corpusul (în curând).`}</p>
          </Group>
        </div>
        {isFiltered(q) ? (
          <button
            type="button"
            onClick={() => move({ ...DEFAULT_QUESTION, populatie: q.populatie, vedere: q.vedere, forma: q.forma })}
            className="mt-6 min-h-11 w-full border text-sm hover:bg-muted"
          >
            {t`Scoate toate filtrele`}
          </button>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .trim()
