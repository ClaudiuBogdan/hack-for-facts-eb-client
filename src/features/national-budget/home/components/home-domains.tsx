import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'

import { useNationalCatalog } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { changeText } from '@/features/national-budget/analytics/lib/analytics-view'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { sumDecimals } from '@/lib/exact-decimal'
import { inSentence } from '@/features/national-budget/analytics/lib/analytics-format'
import { cn } from '@/lib/utils'
import { PartRows, Treemap } from './home-charts'
import type { Part } from '../lib/home-geometry'
import { ANAF_FIRST_YEAR, anafTotal, lawEditionOf, type AnafChapter, type YearView } from '../lib/home-data'
import { useAnafChapterYears } from '../hooks/use-home-data'
import { chapterName, moneyText, shareNumber, shareOf } from '../lib/home-format'
import { AnalyticsLink, SourceNote, type BandProps } from './home-shell'

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
function chapterParts(now: readonly AnafChapter[], before: readonly AnafChapter[] | null, named = NAMED): { readonly total: string; readonly parts: readonly Part[] } {
  const total = anafTotal(now)
  // No year before to compare with (2016): no change, rather than a change against nothing.
  const previous = new Map((before ?? []).map((chapter) => [chapter.code, chapter.lei]))
  const shown = now.slice(0, named)
  const others = now.slice(named)
  const parts: Part[] = shown.map((chapter) => ({
    key: chapter.code,
    label: chapterName(chapter.code),
    hint: hintOf(chapter.code),
    amount: moneyText(chapter.lei),
    ...shareOf(chapter.lei, total),
    change: changeText(chapter.lei, previous.get(chapter.code) ?? null),
  }))
  const rest = others.length > 0 ? sumDecimals(others.map((chapter) => chapter.lei)) : null
  if (rest && (shareNumber(rest, total) ?? 0) > 0) {
    parts.push({
      key: 'rest',
      label: t`Alte domenii`,
      hint: others.map((chapter, position) => (position === 0 ? chapterName(chapter.code) : inSentence(chapterName(chapter.code)))).join(', '),
      amount: moneyText(rest),
      ...shareOf(rest, total),
      rest: true,
    })
  }
  return { total, parts }
}

/** The year's chapters and the same window a year earlier (none before ANAF's first year), read together. */
const useChapters = useAnafChapterYears

function lede(view: YearView, total: string, parts: readonly Part[]): string {
  const [first, second] = parts.filter((part) => !part.rest)
  if (!first || !second) return t`Din bugetul de stat s-au plătit ${moneyText(total)} în ${view.text}.`
  return t`Din bugetul de stat s-au plătit ${moneyText(total)} în ${view.text}. Cel mai mult a mers la ${inSentence(first.label)} (${first.shareWhole} lei din 100), apoi la ${inSentence(second.label)} (${second.shareWhole} lei).`
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

const DomainsTreemapGuarded = guarded(DomainsTreemap)

export function DomainsBand(props: BandProps) {
  return <DomainsTreemapGuarded {...props} />
}
