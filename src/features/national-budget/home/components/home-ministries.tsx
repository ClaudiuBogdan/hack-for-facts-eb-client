import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowUpRight, ChevronDown } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { changeText } from '@/features/national-budget/analytics/lib/analytics-view'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { BandRead } from '@/features/national-budget/analytics/components/analytics-parts'
import { sumDecimals } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import { useAnafAuthorities, useAnafChapters } from '../hooks/use-home-data'
import { ANAF_FIRST_YEAR, anafTotal, lawEditionOf, siteKeys, type AnafAuthority, type YearView } from '../lib/home-data'
import { authorityName, chapterName, moneyText, shareOf, shareText } from '../lib/home-format'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

/**
 * „Cine cheltuie": the principal authorising officers — the ministries and
 * the central bodies — ranked by what they paid from the state budget, as
 * they report it to ANAF, over the bulletin's own window. Each links to its
 * entity page by CUI; each change is against the same window a year earlier,
 * matched by CUI. The law lists its authorities under codes of its own, so
 * the law's view is a link, never a column beside these.
 */

type Authority = AnafAuthority & {
  readonly label: string
  readonly before: string | null
  /** Whether there is a year before to compare with (none for ANAF's first year). */
  readonly compared: boolean
  readonly share: number
  readonly shareDecimal: string
  readonly change: string | null
}

function useRanking(view: YearView) {
  const { now, before } = useAnafAuthorities(view)
  const total = anafTotal(now)
  const previous = new Map((before ?? []).map((row) => [row.cui, row.lei]))
  const rows: readonly Authority[] = now.map((row) => ({
    ...row,
    label: authorityName(row.cui, row.name),
    before: previous.get(row.cui) ?? null,
    compared: before !== null,
    ...shareOf(row.lei, total),
    change: changeText(row.lei, previous.get(row.cui) ?? null),
  }))
  return { total, rows }
}

function lede(view: YearView, total: string, rows: readonly Authority[]): string {
  const top = rows.slice(0, 5)
  const topShare = shareText(sumDecimals(top.map((row) => row.lei)), total, 0)
  return topShare
    ? t`${rows.length} ministere și instituții centrale au plătit ${moneyText(total)} din bugetul de stat în ${view.text}. Primele cinci, ${topShare} din tot.`
    : t`${rows.length} ministere și instituții centrale au plătit ${moneyText(total)} din bugetul de stat în ${view.text}.`
}

function Sources({ view }: { readonly view: YearView }) {
  return (
    <SourceNote>
      {t`Plățile din bugetul de stat ale ordonatorilor principali de credite, raportate la ANAF, ${view.text}; ponderea, din plățile întregului buget de stat. Variația, față de aceleași luni ale anului anterior, pentru aceeași instituție (după CUI), în lei curenți.`}
    </SourceNote>
  )
}

/** The law's ministries for the same year, when that law is loaded: a way out, never a column here. */
function LawLink({ view }: { readonly view: YearView }) {
  const catalog = useNationalCatalog()
  if (!lawEditionOf(catalog, view.year)) return null
  return <AnalyticsLink patch={{ tip: 'ministere', an: view.year }}>{t`Ce le-a aprobat legea pe ${view.year}`}</AnalyticsLink>
}

function BeforeAnaf({ index, titleId, view }: BandProps) {
  return (
    <div className="max-w-2xl">
      <HubSectionHead titleId={titleId} index={index} title={t`Ministerele care cheltuie cel mai mult`} />
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {t`Plățile ministerelor vin din rapoartele de execuție depuse la ANAF, care încep în ${ANAF_FIRST_YEAR}. Pentru ${view.year} nu le avem; alege un an din ${ANAF_FIRST_YEAR} încoace.`}
      </p>
    </div>
  )
}

/** Hooks only for a year ANAF covers. */
function guarded(Design: (props: BandProps) => ReactNode) {
  return function Guarded(props: BandProps) {
    return props.view.year < ANAF_FIRST_YEAR ? <BeforeAnaf {...props} /> : <Design {...props} />
  }
}

// ───────────────────────────────────────────────── A: the list that opens ──

/** One ministry's own domains, read when its row opens. */
function AuthorityChapters({ view, row }: { readonly view: YearView; readonly row: Authority }) {
  const chapters = useAnafChapters(view, row.cui)
  const top = chapters.slice(0, 5)
  const widest = Math.max(1, ...top.map((chapter) => Number(chapter.lei)))
  return (
    <div className="pb-4 pl-10 pr-1">
      <MonoLabel className="block text-muted-foreground">{t`Pe ce a plătit`}</MonoLabel>
      <ul className="mt-2 space-y-2">
        {top.map((chapter) => (
          <li key={chapter.code} className="grid grid-cols-[1fr_auto] items-center gap-x-4 text-sm">
            <span className="min-w-0">
              <span className="block truncate text-foreground">{chapterName(chapter.code)}</span>
              <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                <span className="block h-full bg-chart-2" style={{ width: `${(Number(chapter.lei) / widest) * 100}%` }} />
              </span>
            </span>
            <span className="text-right tabular-nums text-foreground">
              {moneyText(chapter.lei)}
              <MonoLabel className="ml-2 text-muted-foreground">{shareText(chapter.lei, row.lei, 0)}</MonoLabel>
            </span>
          </li>
        ))}
      </ul>
      <Link to="/entities/$cui" params={{ cui: row.cui }} search={((previous: Record<string, unknown>) => siteKeys(previous)) as never} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0">
        {t`Pagina instituției`}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  )
}

function AuthorityRow({ view, row, rank, widest }: { readonly view: YearView; readonly row: Authority; readonly rank: number; readonly widest: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[1.75rem_1fr_auto] items-start gap-x-3 px-1 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <MonoLabel className="pt-1 text-muted-foreground">{String(rank).padStart(2, '0')}</MonoLabel>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm text-foreground">
            <span className="truncate">{row.label}</span>
            <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </span>
          <span className="mt-1.5 block h-1 w-full bg-muted" aria-hidden="true">
            <span className="block h-full bg-primary/70" style={{ width: `${Math.max((Number(row.lei) / widest) * 100, 0.5)}%` }} />
          </span>
          <MonoLabel className="mt-1.5 block truncate text-muted-foreground">
            {t`${row.shareDecimal} din bugetul de stat`}
            {row.change ? ` · ${row.change}` : row.compared && row.before === null ? ` · ${t`fără plăți în anul dinainte`}` : ''}
          </MonoLabel>
        </span>
        <span className="text-right text-sm font-semibold tabular-nums text-foreground">{moneyText(row.lei)}</span>
      </button>
      {open ? (
        // Its own read: a ministry whose chapters fail says so under its row; the ranking stays.
        <BandRead resetKey={row.cui} fallback={<HubPending rows={3} className="pb-4 pl-10" />} renderError={(retry) => <div className="pb-4 pl-10"><HubLoadError onRetry={retry} /></div>}>
          <AuthorityChapters view={view} row={row} />
        </BandRead>
      ) : null}
    </li>
  )
}

function MinistriesList({ view, index, titleId }: BandProps) {
  const { total, rows } = useRanking(view)
  const [all, setAll] = useState(false)
  const widest = Number(rows[0]?.lei ?? 1)
  const shown = all ? rows : rows.slice(0, 10)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={t`Ministerele care cheltuie cel mai mult`} lede={lede(view, total, rows)} />
        <p className="mt-6 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          {t`Deschide un minister ca să vezi pe ce a plătit. Ministerul Muncii plătește alocațiile, ajutoarele și pensiile din bugetul de stat și trimite bani bugetului de pensii; „Finanțe — acțiuni generale” plătește dobânzile la datorie, contribuția României la bugetul UE și cofinanțarea proiectelor europene.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-5">
          <LawLink view={view} />
        </div>
      </div>
      <div className={cn('lg:col-span-7', HUB_BESIDE_TITLE_CLASS)}>
        <ol className="divide-y divide-border/70 border-y border-border/70">
          {shown.map((row, position) => (
            <AuthorityRow key={row.cui} view={view} row={row} rank={position + 1} widest={widest} />
          ))}
        </ol>
        {rows.length > 10 ? (
          <button type="button" onClick={() => setAll(!all)} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
            {all ? t`Doar primele 10` : t`Toate cele ${rows.length}`}
          </button>
        ) : null}
        <Sources view={view} />
      </div>
    </div>
  )
}

const MinistriesListGuarded = guarded(MinistriesList)

export function MinistriesBand(props: BandProps) {
  return <MinistriesListGuarded {...props} />
}
