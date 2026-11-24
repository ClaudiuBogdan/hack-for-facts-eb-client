import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { HUB_SHORTCUT_LINK_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import type { LegalAnalyticsLinks, LegalAnalyticsOrder } from '@/schemas/legal-analytics'
import { useLegalAnalytics } from '../../hooks/use-legislation-analytics'
import { fmt, pct } from '../../lib/analytics-format'
import { labelOfKey } from '../../lib/analytics-view'
import { AnalyticsProblem } from './analytics-notes'
import { StackedYears } from './analytics-charts'

/** The analysis page's address for a question (Romanian keys, as the page reads them). */
const analysisHref = (search: Record<string, string> = {}) => {
  const params = new URLSearchParams(search).toString()
  return `/legislation/analytics${params ? `?${params}` : ''}`
}

function fact(key: string, value: number, label: string, note: string, href: string): HubFact {
  return {
    key,
    value,
    digits: 0,
    label,
    note,
    link: (children: ReactNode, className: string) => (
      <a href={href} className={className}>
        {children}
      </a>
    ),
  }
}

/**
 * The front door's analytics bands (design §4.1): the corpus in four figures, the acts most amended (or named by a
 * court, or with the most listed versions), what was published each year by Felul, the ordinance laws, and the
 * themes to come. Every figure is a count of the published insights layer; a band whose read fails says so alone.
 */
export function LegislationFrontDoorBands() {
  const head = useLegalAnalytics('head', {})
  const summary = useLegalAnalytics('summary', {})
  if (head.error) return <AnalyticsProblem error={head.error} />
  const h = head.data?.data
  const s = summary.data?.data
  return (
    <div className="flex min-w-0 flex-col gap-12">
      {h && s ? (
        <HubFiguresBand
          locale="ro"
          facts={[
            fact('acte', h.total, t`acte în corpus`, t`publice, din corpusul servit de Portal`, analysisHref()),
            fact(
              'versiuni',
              s.withVersions,
              t`acte cu versiuni listate de Portal`,
              t`${pct(s.withVersions / Math.max(1, s.total))} din acte; versiuni consolidate, neoficiale`,
              analysisHref({ vedere: 'dinamica' }),
            ),
            fact(
              'text',
              s.withText,
              t`au text citibil în Portal`,
              t`${pct(s.withText / Math.max(1, s.total))} din acte`,
              analysisHref(),
            ),
            fact(
              'stoc',
              h.totals.inStock,
              t`acte în stoc`,
              t`stabilesc reguli și stau singure, încadrate ferm (provizoriu)`,
              analysisHref({ populatie: 'stoc' }),
            ),
          ]}
        />
      ) : (
        <div className="h-28 animate-pulse bg-muted/40" aria-hidden="true" />
      )}
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <YearsBand />
        </div>
        <aside className="min-w-0 border bg-card/80 p-5 lg:col-span-5">
          <Board />
        </aside>
      </div>
      <OrdinancesBand />
      <section className="border border-dashed p-6" aria-label={t`Teme`}>
        <MonoLabel className="block text-primary">{t`Teme · în curând`}</MonoLabel>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          {t`Harta temelor (actele care stabilesc reguli, grupate după textul lor) vine după ce potrivirea pe tot corpusul e verificată. Domeniile vin după ce le măsurăm acoperirea.`}
        </p>
      </section>
    </div>
  )
}

function YearsBand() {
  const series = useLegalAnalytics('series', { lens: 'felul' })
  const s = series.data?.data
  return (
    <section aria-label={t`Ce s-a publicat pe an`}>
      <HubSectionHead
        index={t`Timp`}
        title={t`Ce s-a publicat pe an`}
        lede={
          s?.unknownYear
            ? t`Actele fiecărui an, după felul lor. Actele fără an (${fmt(s.unknownYear)}) nu sunt pe grafic.`
            : t`Actele fiecărui an, după felul lor.`
        }
        aside={
          <a className={HUB_SHORTCUT_LINK_CLASS} href={analysisHref({ forma: 'timp' })}>
            {t`Analiza în timp`}
          </a>
        }
      />
      <div className="mt-6">
        {series.error ? (
          <AnalyticsProblem error={series.error} />
        ) : s ? (
          <StackedYears
            years={s.years.map((y) => ({ year: y.year, values: y.acts }))}
            labels={[...s.keys.map((k) => labelOfKey(s.lens, k)), 'altele']}
            caption={t`acte pe an`}
          />
        ) : (
          <div className="h-60 animate-pulse bg-muted/40" aria-hidden="true" />
        )}
      </div>
    </section>
  )
}

type BoardKey = 'modificate' | 'decizii' | 'versiuni'
const BOARD_ORDER: Readonly<Record<BoardKey, LegalAnalyticsOrder>> = {
  modificate: 'amended',
  decizii: 'court',
  versiuni: 'versions',
}

function Board() {
  const [board, setBoard] = useState<BoardKey>('modificate')
  const acts = useLegalAnalytics('acts', { order: BOARD_ORDER[board], limit: 8 })
  const rows = acts.data?.data.rows ?? []
  return (
    <div>
      <IndicatorToggle<BoardKey>
        label={t`Clasament`}
        value={board}
        onChange={setBoard}
        options={[
          { key: 'modificate', label: t`Cele mai modificate` },
          { key: 'decizii', label: t`Numite în decizii` },
          { key: 'versiuni', label: t`Cele mai multe versiuni` },
        ]}
      />
      {acts.error ? (
        <div className="mt-4">
          <AnalyticsProblem error={acts.error} />
        </div>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {rows.map((a, j) => (
            <li key={a.actId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-2 text-sm">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{j + 1}</span>
              <a href={`/legislation/acts/${a.actId}`} className="line-clamp-2 underline-offset-4 hover:underline">
                {a.title ?? a.citation}
              </a>
              <span className="tabular-nums text-muted-foreground">
                {board === 'modificate' ? a.amended : board === 'decizii' ? a.court : a.versions}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        {board === 'modificate'
          ? t`De câte ori actul e numit ca țintă în titlul unui act care îl modifică.`
          : board === 'decizii'
            ? t`De câte ori actul e numit în titlul unei decizii a unei instanțe: trimiteri, nu efecte.`
            : t`Datele distincte la care Portalul a listat o versiune consolidată (neoficială).`}
      </p>
    </div>
  )
}

/** Ordinance laws: what the titles say, counted (no per-year chart in the first build). */
function OrdinancesBand() {
  const links = useLegalAnalytics('links', {})
  const l = links.data?.data
  return (
    <section aria-label={t`Ordonanțe și legi`}>
      <HubSectionHead
        index={t`Legături`}
        title={t`Ordonanțe și legile lor`}
        lede={t`Legile care aprobă sau resping o ordonanță, citite din titlurile lor.`}
        aside={
          <a className={HUB_SHORTCUT_LINK_CLASS} href={analysisHref({ vedere: 'legaturi' })}>
            {t`Toate legăturile`}
          </a>
        }
      />
      <div className="mt-6">
        {links.error ? (
          <AnalyticsProblem error={links.error} />
        ) : l ? (
          <OrdinanceFigures links={l} />
        ) : (
          <div className="h-24 animate-pulse bg-muted/40" aria-hidden="true" />
        )}
      </div>
    </section>
  )
}

export function OrdinanceFigures({ links }: { readonly links: LegalAnalyticsLinks }) {
  const n = (kind: string, note?: string) =>
    links.byKind.filter((x) => x.kind === kind && (note === undefined || x.note === note)).reduce((s, x) => s + x.links, 0)
  const approve = n('approves_ordinance', 'resolved')
  const reject = n('rejects_ordinance', 'resolved')
  const outside = n('approves_ordinance', 'outside_corpus') + n('rejects_ordinance', 'outside_corpus')
  const days = links.days.find((d) => d.kind === 'approves_ordinance')
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">{t`legi care aprobă o ordonanță din corpus`}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{fmt(approve)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t`legi care resping o ordonanță din corpus`}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{fmt(reject)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t`legi care numesc o ordonanță din afara corpusului`}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{fmt(outside)}</dd>
        </div>
      </dl>
      {days?.median != null ? (
        <p className="text-muted-foreground">
          {t`De la ordonanță la legea care o aprobă: mediana ${fmt(days.median)} zile (între ${fmt(days.p25 ?? 0)} și ${fmt(days.p75 ?? 0)}), din ${fmt(days.links)} legi. Zilele: de la prima publicare în Monitorul Oficial a ordonanței la a legii.`}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {t`Aprobarea cu modificări nu se vede în titlu. Pentru decretele de promulgare nu dăm zile: data decretului nu e în date.`}
      </p>
    </div>
  )
}
