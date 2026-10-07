import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { useSuspenseQueries } from '@tanstack/react-query'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { changeText } from '@/features/national-budget/analytics/lib/analytics-view'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { sumDecimals } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import { PartRows, Treemap, cellsOutOfHundred, type Part } from './principal.charts'
import { ANAF_FIRST_YEAR, anafChaptersOptions, anafTotal, lawEditionOf, previousView, type AnafChapter, type YearView } from './principal.data'
import { chapterName, moneyText, shareNumber } from './principal.format'
import { AnalyticsLink, SourceNote, type BandDefinition, type BandProps } from './principal.shell'

/**
 * „Pe domenii": the state budget's payments by functional chapter —
 * education, defence, roads, police — as the principal authorising officers
 * report them to ANAF, over the bulletin's own window. The state budget only
 * (499,4 mld. lei in 2025, the bulletin's state-budget column): pensions are
 * paid mostly from the social insurance budget and hospitals from the health
 * fund, which the budgets band shows. ANAF's reports start in 2016; an
 * earlier year says so.
 */

/** What a chapter holds, in a reader's words (from the subchapters the state budget pays most under). */
const HINTS: Readonly<Record<string, () => string>> = {
  '51': () => t`Guvernul și ministerele, contribuția României la bugetul UE, cofinanțarea proiectelor europene`,
  '54': () => t`alte servicii ale statului, garanții plătite din bugetul de stat`,
  '55': () => t`dobânzile la datoria publică: banii împrumutați în anii trecuți`,
  '56': () => t`bani trimiși altor bugete, mai ales celui de pensii, ca să-și acopere plățile`,
  '60': () => t`armata`,
  '61': () => t`poliție, protecție civilă și pompieri, instanțe, penitenciare`,
  '65': () => t`școli: salariile profesorilor, învățământul primar și gimnazial`,
  '66': () => t`programe naționale de sănătate, spitalele ministerelor`,
  '67': () => t`culte, sport, cultură`,
  '68': () => t`pensii plătite din bugetul de stat, alocații, indemnizații, ajutor social`,
  '70': () => t`locuințe, apă și canalizare, dezvoltarea localităților`,
  '74': () => t`mediu, poluare, ape`,
  '80': () => t`programe de dezvoltare regională și socială`,
  '81': () => t`energie`,
  '83': () => t`subvenții pentru agricultori, păduri`,
  '84': () => t`drumuri și poduri, căi ferate`,
}

const hintOf = (code: string): string | null => HINTS[code]?.() ?? null

/** How many chapters a design names; the others are „the other domains". */
const NAMED = 11

/** The chapters as parts of the state budget's payments: the largest named, the rest as one, each with its change. */
function chapterParts(now: readonly AnafChapter[], before: readonly AnafChapter[], named = NAMED): { readonly total: string; readonly parts: readonly Part[] } {
  const total = anafTotal(now)
  const previous = new Map(before.map((chapter) => [chapter.code, chapter.lei]))
  const shown = now.slice(0, named)
  const others = now.slice(named)
  const parts: Part[] = shown.map((chapter) => ({
    key: chapter.code,
    label: chapterName(chapter.code),
    hint: hintOf(chapter.code),
    amount: moneyText(chapter.lei),
    share: shareNumber(chapter.lei, total) ?? 0,
    change: changeText(chapter.lei, previous.get(chapter.code) ?? null),
  }))
  const rest = others.length > 0 ? sumDecimals(others.map((chapter) => chapter.lei)) : null
  if (rest && (shareNumber(rest, total) ?? 0) > 0) {
    parts.push({
      key: 'rest',
      label: t`Alte domenii`,
      hint: others.map((chapter, position) => (position === 0 ? chapterName(chapter.code) : chapterName(chapter.code).toLocaleLowerCase('ro-RO'))).join(', '),
      amount: moneyText(rest),
      share: shareNumber(rest, total) ?? 0,
      rest: true,
    })
  }
  return { total, parts }
}

/** The year's chapters and the same window a year earlier, read together. */
function useChapters(view: YearView) {
  const [{ data: now }, { data: before }] = useSuspenseQueries({ queries: [anafChaptersOptions(view), anafChaptersOptions(previousView(view))] })
  return { now, before }
}

function lede(view: YearView, total: string, parts: readonly Part[]): string {
  const [first, second] = parts.filter((part) => !part.rest)
  if (!first || !second) return t`Din bugetul de stat s-au plătit ${moneyText(total)} în ${view.text}.`
  return t`Din bugetul de stat s-au plătit ${moneyText(total)} în ${view.text}. Cel mai mult a mers la ${first.label.toLocaleLowerCase('ro-RO')} (${Math.round(first.share)} lei din 100), apoi la ${second.label.toLocaleLowerCase('ro-RO')} (${Math.round(second.share)} lei).`
}

/** The page says what this band is not: the other budgets, where pensions and hospitals are paid. */
function ScopeNote({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[56ch] border-l-2 border-primary/60 pl-4 text-sm leading-relaxed text-muted-foreground', className)}>
      {t`Doar bugetul de stat. Cele mai multe pensii se plătesc din bugetul asigurărilor sociale, iar spitalele, din Fondul de sănătate: sunt bugete separate,`}{' '}
      <a href="#bugete" className="font-medium text-foreground underline-offset-4 hover:underline">
        {t`mai jos`}
      </a>
      .
    </p>
  )
}

function Sources({ view }: { readonly view: YearView }) {
  return (
    <SourceNote>
      {t`Plățile din bugetul de stat raportate la ANAF de ordonatorii principali de credite, pe capitolele clasificației funcționale, ${view.text}. Variația, față de aceleași luni ale anului anterior, în lei curenți.`}
    </SourceNote>
  )
}

/** The law's chapters for the same year, when a law of that year is loaded. */
function LawLink({ view }: { readonly view: YearView }) {
  const catalog = useNationalCatalog()
  if (!lawEditionOf(catalog, view.year)) return null
  return <AnalyticsLink patch={{ tip: 'lege', dupa: 'capitole', an: view.year }}>{t`Ce a aprobat legea, pe capitole`}</AnalyticsLink>
}

/** A year ANAF's reports don't reach: the band says so, with its question. */
function BeforeAnaf({ index, titleId, view }: BandProps) {
  return (
    <div className="max-w-2xl">
      <HubSectionHead titleId={titleId} index={index} title={t`Pe ce domenii plătește bugetul de stat`} />
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {t`Plățile pe domenii vin din rapoartele de execuție depuse la ANAF, care încep în ${ANAF_FIRST_YEAR}. Pentru ${view.year} nu le avem; alege un an din ${ANAF_FIRST_YEAR} încoace.`}
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

// ──────────────────────────────────────────────────────────── A: treemap ──

function DomainsTreemap({ view, index, titleId }: BandProps) {
  const { now, before } = useChapters(view)
  const { total, parts } = chapterParts(now, before)
  const [active, setActive] = useState<string | null>(null)
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <HubSectionHead titleId={titleId} index={index} title={t`Pe ce domenii plătește bugetul de stat`} lede={lede(view, total, parts)} />
        </div>
        <div className="flex flex-wrap gap-x-5">
          <LawLink view={view} />
        </div>
      </div>
      <Treemap className="mt-8" parts={parts} active={active} onActive={setActive} aspect="aspect-[4/5] sm:aspect-[16/7]" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <PartRows className="lg:col-span-8 sm:columns-2 sm:gap-8 [&>li]:break-inside-avoid" parts={parts} active={active} onActive={setActive} showBars={false} />
        <div className="lg:col-span-4">
          <ScopeNote />
        </div>
      </div>
      <Sources view={view} />
    </div>
  )
}

// ─────────────────────────────────────────────────────── B: per hundred ──

/** Each domain as lei out of every hundred the state budget pays: the number large, the bar and the amount beside it. */
function DomainsPerHundred({ view, index, titleId }: BandProps) {
  const { now, before } = useChapters(view)
  const { total, parts } = chapterParts(now, before, 12)
  const lei = cellsOutOfHundred(parts)
  const widest = Math.max(...parts.map((part) => part.share), 1)
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <HubSectionHead titleId={titleId} index={index} title={t`Din fiecare 100 de lei ai bugetului de stat`} lede={lede(view, total, parts)} />
        <ScopeNote className="mt-6" />
        <div className="mt-6 flex flex-wrap gap-x-5">
          <LawLink view={view} />
        </div>
      </div>
      <div className={cn('lg:col-span-7', HUB_BESIDE_TITLE_CLASS)}>
        <ol className="divide-y divide-border/70 border-y border-border/70">
          {parts.map((part, rank) => (
            <li key={part.key} className="grid grid-cols-[3.25rem_1fr_auto] items-start gap-x-4 py-3">
              <span className="text-right">
                <span className={cn('block text-2xl font-semibold leading-none tabular-nums tracking-tight', part.rest ? 'text-muted-foreground' : 'text-foreground')}>{lei[rank]}</span>
                <MonoLabel className="mt-1 block text-muted-foreground">{t`lei`}</MonoLabel>
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-foreground">{part.label}</span>
                {part.hint ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground line-clamp-2">{part.hint}</span> : null}
                <span className="mt-2 block h-1.5 w-full bg-muted" aria-hidden="true">
                  <span className={cn('block h-full', part.rest ? 'bg-muted-foreground/40' : rank === 0 ? 'bg-primary' : 'bg-primary/60')} style={{ width: `${(part.share / widest) * 100}%` }} />
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums text-foreground">{part.amount}</span>
                {part.change ? (
                  <MonoLabel className="mt-1 block text-muted-foreground">
                    {part.change} {view.partial ? '' : t`față de ${view.year - 1}`}
                  </MonoLabel>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">{t`Leii din 100 sunt rotunjiți ca să dea împreună 100.`}</p>
        <Sources view={view} />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────── C: tiles ──

/** A domain's tile: its amount, its lei out of a hundred, and the year against the one before as two bars. */
function DomainTile({ part, lei, before, now, since, max }: { readonly part: Part; readonly lei: number; readonly before: number | null; readonly now: number; readonly since: string; readonly max: number }) {
  return (
    <li className="flex flex-col bg-background p-4 sm:p-5">
      <span className="text-sm font-medium leading-snug text-foreground">{part.label}</span>
      {part.hint ? <span className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2">{part.hint}</span> : null}
      <span className="mt-auto pt-4">
        <span className="block text-2xl font-semibold tabular-nums tracking-tight text-foreground">{part.amount}</span>
        <MonoLabel className="mt-1 block text-muted-foreground">{t`${lei} lei din 100`}</MonoLabel>
        <span className="mt-3 block space-y-1" aria-hidden="true">
          <span className="block h-1.5 bg-muted">
            <span className="block h-full bg-chart-4" style={{ width: `${((before ?? 0) / max) * 100}%` }} />
          </span>
          <span className="block h-1.5 bg-muted">
            <span className="block h-full bg-primary" style={{ width: `${(now / max) * 100}%` }} />
          </span>
        </span>
        <MonoLabel className="mt-2 block text-muted-foreground">{part.change ? `${part.change} ${since}` : t`fără an de comparat`}</MonoLabel>
      </span>
    </li>
  )
}

function DomainsTiles({ view, index, titleId }: BandProps) {
  const { now, before } = useChapters(view)
  const { total, parts } = chapterParts(now, before, 11)
  const lei = cellsOutOfHundred(parts)
  const previous = new Map(before.map((chapter) => [chapter.code, Number(chapter.lei)]))
  const current = new Map(now.map((chapter) => [chapter.code, Number(chapter.lei)]))
  // One scale for every tile: the largest of either year, so the bars compare across domains too.
  const max = Math.max(1, ...now.slice(0, 11).map((chapter) => Number(chapter.lei)), ...before.slice(0, 11).map((chapter) => Number(chapter.lei)))
  const since = view.partial ? t`față de aceleași luni din ${view.year - 1}` : t`față de ${view.year - 1}`
  const named = parts.filter((part) => !part.rest)
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <HubSectionHead titleId={titleId} index={index} title={t`Pe ce domenii plătește bugetul de stat`} lede={lede(view, total, parts)} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-4 bg-chart-4" aria-hidden="true" />
            {view.partial ? t`aceleași luni din ${view.year - 1}` : String(view.year - 1)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-4 bg-primary" aria-hidden="true" />
            {view.text}
          </span>
        </div>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-px border bg-border/70 sm:grid-cols-2 lg:grid-cols-4">
        {named.map((part) => (
          <DomainTile key={part.key} part={part} lei={lei[parts.indexOf(part)] ?? 0} before={previous.get(part.key) ?? null} now={current.get(part.key) ?? 0} since={since} max={max} />
        ))}
        {parts
          .filter((part) => part.rest)
          .map((part) => (
            <li key={part.key} className="flex flex-col bg-muted/30 p-4 sm:p-5">
              <span className="text-sm font-medium text-foreground">{part.label}</span>
              <span className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-3">{part.hint}</span>
              <span className="mt-auto pt-4 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{part.amount}</span>
              <MonoLabel className="mt-1 block text-muted-foreground">{t`${lei[parts.indexOf(part)] ?? 0} lei din 100`}</MonoLabel>
            </li>
          ))}
      </ul>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ScopeNote className="lg:col-span-7" />
        <div className="flex flex-wrap gap-x-5 lg:col-span-5 lg:justify-end">
          <LawLink view={view} />
        </div>
      </div>
      <Sources view={view} />
    </div>
  )
}

export const DOMAINS_BAND: BandDefinition = {
  id: 'domenii',
  nav: t`Pe domenii`,
  variants: [
    { key: 'harta', title: t`Hartă de suprafețe`, note: t`Capitolele bugetului de stat ca dreptunghiuri cât plățile lor (ANAF); rândurile dedesubt, cu variația.`, component: guarded(DomainsTreemap) },
    { key: 'suta', title: t`Lei din 100`, note: t`Câți lei din fiecare 100 ai bugetului de stat merg la fiecare domeniu, mare în stânga; bara, suma și variația.`, component: guarded(DomainsPerHundred) },
    { key: 'cartonase', title: t`Cartonașe`, note: t`Câte un cartonaș pe domeniu: suma, leii din 100 și anul față de cel dinainte, ca două bare pe aceeași scară.`, component: guarded(DomainsTiles) },
  ],
}
