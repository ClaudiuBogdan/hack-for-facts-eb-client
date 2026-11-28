import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { fetchRecentChangesCount, fetchRecentChangesPage } from '../../api/legal-changes-api'
import { CHANGE_KINDS } from '../../lib/legal-changes-blocks'
import { useLegalAnalytics } from '../../hooks/use-legislation-analytics'
import { fmt, pctOf } from '../../lib/analytics-format'
import { GROUP_LABEL, labelOf } from '../../lib/analytics-labels'
import { readingSentence } from '../../lib/analytics-notes-text'
import { labelOfKey } from '../../lib/analytics-view'
import { formatLegalDate, localIsoDate } from '../../lib/legal-format'
import { legalEventKindLabel } from '../../lib/legal-vocabulary'
import { StackedYears } from '../analytics/analytics-charts'
import {
  CHANGES_SHOWN,
  CHANGES_WINDOW_DAYS,
  ISSUERS_SHOWN,
  LEGAL_HUB_SERVER_READS,
  LINK_KINDS,
  YEARS_FROM,
  analysisSearch,
  changesWindow,
  linkCounts,
  yearsChart,
  type LinkKind,
} from './legislation-hub-lib'
import { Band, BandNote, BarRows, CAPTION_CLASS, Figure, MORE_LINK_CLASS, PendingBar, PendingRows, TwoColumns, type BarRow } from './legislation-hub-parts'

/**
 * The legislation hub's sections, drawn as the companies hub draws its own (owner, 25 November 2026): no
 * running numbers, each titled by its data, one sentence with the rest behind its ⓘ, the list or chart across
 * the band (a list in two columns from a wide screen). What the figures need to be read right stays in the
 * open: the Felul reading and what is counted apart, what the years chart leaves out, the share's total.
 *
 * Each reads through the feature's own hooks and modules, keeps a skeleton its own size while it loads, and
 * says in one line when its read failed; the rest of the page stays. The summary, the issuers and the years
 * arrive rendered by the server; the changes and the links are read in the browser.
 */

/** A day as a list writes it („25 sept. 2026"): the source's civil date, never the viewer's timezone. */
function shortDay(value: string, locale: string): string {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed)
}

/** An act id the act page reads: the server's decimal id. A row with anything else is shown without a link. */
const ACT_ID = /^\d+$/u

/** A list's frame: rules between the rows, the band's border above and below. */
const LIST_CLASS = 'divide-y divide-border/70 border-y border-border/70'

// ───────────────────────────────────────────────────── changes ──

type ChangeRow = Awaited<ReturnType<typeof fetchRecentChangesPage>>['items'][number]

/**
 * The newest changes to existing acts already in force, and how many came into force in the last thirty days (today
 * and the twenty-nine before it). New laws and approved ordinances are left out, as on the Modificări page (owner,
 * 28 November 2026: "Same rule now"). The count is its own read (the server scans for it), so its failure leaves the list.
 * When the newest change is older than the window the count is zero by construction: the sentence says the
 * date instead.
 */
export function ChangesBand() {
  const { i18n } = useLingui()
  const { since, until } = changesWindow(localIsoDate())
  const feed = useQuery({
    queryKey: ['legal', 'landing', 'changes', CHANGE_KINDS, until] as const,
    queryFn: ({ signal }) => fetchRecentChangesPage({ kinds: CHANGE_KINDS, until }, { first: CHANGES_SHOWN, signal }),
    staleTime: 5 * 60 * 1000,
  })
  const count = useQuery({
    queryKey: ['legal', 'landing', 'changes-count', CHANGE_KINDS, since, until] as const,
    queryFn: ({ signal }) => fetchRecentChangesCount({ kinds: CHANGE_KINDS, since, until }, { signal }),
    staleTime: 5 * 60 * 1000,
  })
  const rows = feed.data?.items ?? []
  const newest = rows.find((row) => row.effectiveDate !== null)?.effectiveDate ?? null
  const inWindow = count.data ?? null
  let lede: ReactNode
  if (inWindow !== null && inWindow > 0) {
    lede = (
      <>
        <Trans>În ultimele {CHANGES_WINDOW_DAYS} de zile</Trans>{' '}
        {plural(inWindow, { one: 'a intrat în vigoare', other: 'au intrat în vigoare' })} <Figure>{fmt(inWindow)}</Figure>{' '}
        {plural(inWindow, { one: 'modificare înregistrată.', few: 'modificări înregistrate.', other: 'de modificări înregistrate.' })}
      </>
    )
  } else if (newest !== null) {
    lede =
      inWindow === 0 ? (
        <Trans>
          Cea mai recentă modificare înregistrată a intrat în vigoare pe <Figure>{formatLegalDate(newest, i18n.locale)}</Figure>; în ultimele{' '}
          {CHANGES_WINDOW_DAYS} de zile nu e înregistrată niciuna.
        </Trans>
      ) : (
        <Trans>
          Cea mai recentă modificare înregistrată a intrat în vigoare pe <Figure>{formatLegalDate(newest, i18n.locale)}</Figure>.
        </Trans>
      )
  } else if (feed.isPending || count.isPending) {
    lede = <PendingBar className="w-4/5" />
  } else {
    lede = <Trans>Modificările, abrogările și republicările, după data intrării în vigoare.</Trans>
  }
  const line = (row: ChangeRow) => (
    <>
      <span className="whitespace-nowrap pl-1 text-xs tabular-nums text-muted-foreground">{row.effectiveDate ? shortDay(row.effectiveDate, i18n.locale) : '—'}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{row.displayCitation}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {legalEventKindLabel(row.eventKind)}
          {row.sourceAct ? ` ${t`prin`} ${row.sourceAct.displayCitation}` : null}
        </span>
      </span>
    </>
  )
  const rowClass = 'grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2'
  return (
    <Band
      id="schimbari"
      title={<Trans>Ultimele modificări</Trans>}
      lede={lede}
      infoLabel={t`Despre modificări`}
      info={<p>{t`Ce act s-a schimbat, prin ce act și de când. Data e cea a intrării în vigoare, așa cum o înregistrează sursa. Legile noi și ordonanțele aprobate sunt pe pagina Modificări, în fila lor.`}</p>}
    >
      {feed.error ? (
        <BandNote error={feed.error} onRetry={() => void feed.refetch()} />
      ) : feed.data ? (
        <div data-testid="legal-hub-changes">
          <TwoColumns
            items={rows}
            render={(part) => (
              <ol className={LIST_CLASS}>
                {part.map((row) => (
                  <li key={row.eventId}>
                    {/* A link only to an act id the act page reads; anything else stays plain text. */}
                    {ACT_ID.test(row.actId) ? (
                      <Link to="/legislation/acts/$actId" params={{ actId: row.actId }} className={`${rowClass} transition-colors hover:bg-muted/40`}>
                        {line(row)}
                      </Link>
                    ) : (
                      <div className={rowClass}>{line(row)}</div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          />
        </div>
      ) : (
        <PendingRows rows={CHANGES_SHOWN / 2} />
      )}
      <Link to="/legislation/changes" className={MORE_LINK_CLASS}>
        <Trans>Toate modificările</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── Felul ──

/** The classes that are not groups: weak placements and acts no rule places. Shown apart, never inside a group. */
const APART = new Set(['uncertain', 'unplaced'])

/**
 * What the acts do: the groups of the Felul reading as ranked rows, each a share of all acts, then the uncertain
 * and the unplaced counted apart, on the same track; how the reading is made, under them, in the open.
 */
export function FelulBand() {
  const summary = useLegalAnalytics('summary', {})
  const head = useLegalAnalytics('head', {})
  const s = summary.data?.data
  const row = (key: string | null, acts: number): BarRow => ({
    key: key ?? '',
    label: labelOf(GROUP_LABEL, key, t`neîncadrate`),
    acts,
    link:
      key === null
        ? undefined
        : (children, className) => (
            <Link to="/legislation/analytics" search={analysisSearch({ felul: key })} className={className}>
              {children}
            </Link>
          ),
  })
  const groups = s ? s.felul.filter((r) => r.key !== null && !APART.has(r.key)).sort((a, b) => b.acts - a.acts) : []
  // The remainders come from the summary's own fields: the page never infers them from the list.
  const apart = s ? [row('uncertain', s.uncertain), row('unplaced', s.unplaced)] : []
  const lead = groups[0]
  return (
    <Band
      id="feluri"
      title={<Trans>Actele după fel</Trans>}
      lede={
        s && lead ? (
          <>
            <Trans>Cea mai mare grupă</Trans>, „{labelOf(GROUP_LABEL, lead.key, '')}": <Figure>{fmt(lead.acts)}</Figure>{' '}
            {plural(s.total, { one: 'din # act', few: 'din # acte', other: 'din # de acte' })} ({pctOf(lead.acts, s.total)}).
          </>
        ) : summary.error ? (
          <Trans>Fiecare act, după ce face: stabilește reguli, numește, alocă, judecă.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      infoLabel={t`Despre felul actului`}
      info={<p>{t`Felul actului e citit din titlu, de reguli. Un act încadrat nesigur sau neîncadrat nu e numărat în nicio grupă.`}</p>}
    >
      {summary.error ? (
        <BandNote error={summary.error} onRetry={() => void summary.refetch()} />
      ) : s ? (
        <div data-testid="legal-hub-felul">
          <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <BarRows rows={groups.map((r) => row(r.key, r.acts))} total={s.total} />
            <div>
              <p className={CAPTION_CLASS}>
                <Trans>Numărate separat</Trans>
              </p>
              <BarRows className="mt-2" rows={apart} total={s.total} quiet />
              {/* How the reading is made, by its figures: the audit for the rules it audited (design §11). */}
              <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{readingSentence(head.data?.data.rules['felul'])}</p>
            </div>
          </div>
          <p className={`mt-3 ${CAPTION_CLASS}`}>{plural(s.total, { one: 'Procente din tot # act publicat.', few: 'Procente din toate cele # acte publicate.', other: 'Procente din toate cele # de acte publicate.' })}</p>
        </div>
      ) : (
        <PendingRows rows={6} />
      )}
      <div className="flex flex-wrap gap-x-6">
        <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'felul' })} className={MORE_LINK_CLASS}>
          <Trans>Deschide în analiză, după felul actului</Trans> →
        </Link>
      </div>
    </Band>
  )
}

// ───────────────────────────────────────────────────── issuers ──

/** The issuers read, by the arguments the server rendered it with: one query, one cache entry. */
const ISSUERS_ARGS = LEGAL_HUB_SERVER_READS[3][1]

/**
 * Who issues: the leading issuer lineages as ranked rows. One row more than shown is asked for, because the
 * acts without an issuer rank among the first: they are drawn apart, and what the rows leave out is stated.
 */
export function IssuersBand() {
  const breakdown = useLegalAnalytics('breakdown', ISSUERS_ARGS)
  const b = breakdown.data?.data
  const named = b ? b.rows.filter((r): r is { key: string; acts: number } => r.key !== null).slice(0, ISSUERS_SHOWN) : []
  const none = b?.rows.find((r) => r.key === null) ?? null
  const shown = named.reduce((sum, r) => sum + r.acts, 0) + (none?.acts ?? 0)
  const others = b ? Math.max(0, b.total - shown) : 0
  const lead = named[0]
  const rows: BarRow[] = named.map((r) => ({
    key: r.key,
    label: r.key,
    acts: r.acts,
    link: (children, className) => (
      <Link to="/legislation/analytics" search={analysisSearch({ emitent: r.key })} className={className}>
        {children}
      </Link>
    ),
  }))
  return (
    <Band
      id="emitenti"
      title={<Trans>Actele după emitent</Trans>}
      lede={
        b && lead ? (
          <>
            <Trans>Cele mai multe acte le-a emis</Trans> {lead.key}: <Figure>{fmt(lead.acts)}</Figure>{' '}
            {plural(b.total, { one: 'din # act', few: 'din # acte', other: 'din # de acte' })} ({pctOf(lead.acts, b.total)}).
          </>
        ) : breakdown.error ? (
          <Trans>Actele, după cine le-a emis.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      infoLabel={t`Despre emitenți`}
      info={
        <p>
          {t`Emitentul e cel scris în sursă; pentru legi, ordonanțe și decrete fără emitent scris e derivat din tip și dată. O linie de minister unește denumirile lui succesive.`}
        </p>
      }
    >
      {breakdown.error ? (
        <BandNote error={breakdown.error} onRetry={() => void breakdown.refetch()} />
      ) : b ? (
        <div data-testid="legal-hub-issuers">
          <TwoColumns items={rows} render={(part) => <BarRows rows={part} total={b.total} />} />
          {none ? (
            <div className="mt-6 lg:w-1/2 lg:pr-5">
              <p className={CAPTION_CLASS}>
                <Trans>Numărate separat</Trans>
              </p>
              <BarRows className="mt-2" rows={[{ key: 'none', label: t`fără emitent`, acts: none.acts }]} total={b.total} quiet />
            </div>
          ) : null}
          <p className={`mt-3 ${CAPTION_CLASS}`}>
            {plural(b.total, { one: 'Procente din tot # act publicat.', few: 'Procente din toate cele # acte publicate.', other: 'Procente din toate cele # de acte publicate.' })}{' '}
            {none ? <Trans>Ceilalți emitenți:</Trans> : <Trans>Ceilalți emitenți și actele fără emitent:</Trans>}{' '}
            {plural(others, { one: '# act.', few: '# acte.', other: '# de acte.' })}
          </p>
        </div>
      ) : (
        <PendingRows rows={ISSUERS_SHOWN / 2} />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'emitent' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, după emitent</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── years ──

/**
 * Acts per year, stacked by Felul group, from `YEARS_FROM` on, a column a year across the band (the API leaves
 * out a year without acts; the chart draws it empty). The acts before the first column and the acts without a
 * year are counted under it, in the open. The year the corpus was built in is drawn hollow: it is not over.
 */
export function YearsBand() {
  const series = useLegalAnalytics('series', { lens: 'felul' })
  const s = series.data?.data
  const chart = s ? yearsChart(s) : null
  const builtYear = series.data ? Number(series.data.layer.releaseBuiltAt.slice(0, 4)) : null
  const lastYear = chart?.years[chart.years.length - 1]?.year ?? null
  return (
    <Band
      id="ani"
      title={<Trans>Acte după anul actului</Trans>}
      lede={
        chart?.peak ? (
          <>
            <Trans>Anul cu cele mai multe acte din {YEARS_FROM} încoace e</Trans> {chart.peak.year}: <Figure>{fmt(chart.peak.acts)}</Figure>.
          </>
        ) : series.error ? (
          <Trans>Actele fiecărui an, după felul lor.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      infoLabel={t`Despre ani`}
      info={<p>{t`Anul e cel al actului. Un an recent crește încă, pe măsură ce actele lui ajung în date.`}</p>}
    >
      {series.error ? (
        <BandNote error={series.error} onRetry={() => void series.refetch()} />
      ) : s && chart ? (
        <div data-testid="legal-hub-years">
          <StackedYears
            years={chart.years}
            labels={[...s.keys.map((key) => labelOfKey(s.lens, key)), t`altele`]}
            lastIsRest
            plain
            caption={t`Acte pe an, din ${YEARS_FROM}`}
            pendingFrom={builtYear !== null && lastYear !== null && builtYear <= lastYear ? { year: builtYear, label: t`an în curs` } : undefined}
            footnote={
              <>
                {/* The API picks the leading classes of each layer: the rest is named by what it is, not listed. */}
                <Trans>„Altele": clasele din afara legendei, împreună.</Trans>{' '}
                {plural(chart.earlier, {
                  one: `Nu sunt pe grafic: # act dinainte de ${YEARS_FROM}`,
                  few: `Nu sunt pe grafic: # acte dinainte de ${YEARS_FROM}`,
                  other: `Nu sunt pe grafic: # de acte dinainte de ${YEARS_FROM}`,
                })}{' '}
                {plural(s.unknownYear, { one: 'și # act fără an.', few: 'și # acte fără an.', other: 'și # de acte fără an.' })}
                {chart.later > 0 ? <> {plural(chart.later, { one: 'Nici # act cu un an după 2100.', few: 'Nici # acte cu un an după 2100.', other: 'Nici # de acte cu un an după 2100.' })}</> : null}
              </>
            }
          />
        </div>
      ) : (
        <div className="h-60 animate-pulse bg-muted/40 motion-reduce:animate-none sm:h-72" aria-hidden="true" />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ forma: 'timp' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, în timp</Trans> →
      </Link>
    </Band>
  )
}

// ───────────────────────────────────────────────────── links ──

/** What one kind of link is, in the page's words: who names whom. */
function linkText(kind: LinkKind): { readonly label: string; readonly text: string } {
  switch (kind) {
    case 'amends':
      return { label: t`Modificări`, text: t`Acte care numesc în titlu actul pe care îl modifică sau îl completează.` }
    case 'court_names':
      return { label: t`Decizii ale instanțelor`, text: t`Decizii care numesc în titlu actul asupra căruia se pronunță.` }
    case 'promulgates':
      return { label: t`Promulgări`, text: t`Decrete care promulgă o lege.` }
    case 'approves_ordinance':
      return { label: t`Ordonanțe aprobate`, text: t`Legi care aprobă o ordonanță.` }
    case 'rejects_ordinance':
      return { label: t`Ordonanțe respinse`, text: t`Legi care resping o ordonanță.` }
  }
}

type Days = { readonly links: number; readonly p25: number | null; readonly median: number | null; readonly p75: number | null }

/**
 * The days from an ordinance to the law that approves it, as the API measures them: from the first publication
 * in Monitorul Oficial of the one to the first publication in Monitorul Oficial of the other, over links (a law
 * can approve several ordinances). Each statistic the API gives is said on its own; one it does not give is left
 * out, never read as zero.
 */
export function OrdinanceDays({ days }: { readonly days: Days }) {
  const span = (n: number) => plural(n, { one: '# zi', few: '# zile', other: '# de zile' })
  const parts = [
    days.median !== null ? <Trans key="median">mediana: {span(days.median)}</Trans> : null,
    days.p25 !== null ? <Trans key="p25">un sfert dintre ele: cel mult {span(days.p25)}</Trans> : null,
    days.p75 !== null ? <Trans key="p75">un sfert: cel puțin {span(days.p75)}</Trans> : null,
  ].filter((part) => part !== null)
  if (parts.length === 0) return null
  return (
    <>
      <Trans>De la prima publicare în Monitorul Oficial a ordonanței la prima publicare în Monitorul Oficial a legii</Trans>:{' '}
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? '; ' : null}
          {part}
        </span>
      ))}
      ; {plural(days.links, { one: 'măsurate pe o trimitere.', few: 'măsurate pe # trimiteri.', other: 'măsurate pe # de trimiteri.' })}
    </>
  )
}

/**
 * How the acts link: per kind, the links read in titles whose target is an act of the corpus, as plain counts,
 * each with what it is and how many of that kind were read in all. References, not effects.
 */
export function LinksBand() {
  const links = useLegalAnalytics('links', {})
  // The answer names acts (its top targets): this band shows only its counts, from a read since it mounted.
  const l = links.isFetchedAfterMount && !links.isError ? links.data?.data : undefined
  const counts = l ? LINK_KINDS.map((kind) => ({ kind, ...linkCounts(l, kind) })) : []
  const resolved = counts.reduce((sum, row) => sum + row.resolved, 0)
  const approval = l?.days.find((row) => row.kind === 'approves_ordinance') ?? null
  return (
    <Band
      id="legaturi"
      title={<Trans>Legături între acte</Trans>}
      lede={
        l ? (
          <>
            <Figure>{fmt(resolved)}</Figure>{' '}
            {plural(resolved, {
              one: 'trimitere de la un act la alt act din corpus.',
              few: 'trimiteri de la un act la alt act din corpus.',
              other: 'de trimiteri de la un act la alt act din corpus.',
            })}
          </>
        ) : links.error ? (
          <Trans>Trimiterile de la un act la altul, citite din titluri.</Trans>
        ) : (
          <PendingBar className="w-4/5" />
        )
      }
      infoLabel={t`Despre legături`}
      info={<p>{t`Legăturile sunt citite din titluri: trimiteri, nu efecte. Sunt numărate doar cele a căror țintă e un act din corpus.`}</p>}
    >
      {links.error ? (
        <BandNote error={links.error} onRetry={() => void links.refetch()} />
      ) : l ? (
        <dl className="grid gap-px border-y border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3" data-testid="legal-hub-links">
          {counts.map((row) => {
            const text = linkText(row.kind)
            return (
              <div key={row.kind} className="flex flex-col bg-background py-4 sm:px-4">
                <dt className="order-2 mt-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">{text.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {text.text} {row.kind === 'approves_ordinance' && approval ? <OrdinanceDays days={approval} /> : null}
                  </span>
                  <span className="mt-1.5 block text-xs tabular-nums text-muted-foreground">
                    <Trans>din {fmt(row.read)} citite în titluri</Trans>
                  </span>
                </dt>
                <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmt(row.resolved)}</dd>
              </div>
            )
          })}
          {/* Five kinds in a grid of two, then three: one empty cell closes the last row in the page's colour. */}
          <div className="hidden bg-background sm:block" aria-hidden="true" />
        </dl>
      ) : (
        <PendingRows rows={3} />
      )}
      <Link to="/legislation/analytics" search={analysisSearch({ vedere: 'legaturi' })} className={MORE_LINK_CLASS}>
        <Trans>Deschide în analiză, legăturile</Trans> →
      </Link>
    </Band>
  )
}
