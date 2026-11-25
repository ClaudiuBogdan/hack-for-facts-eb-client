import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Link2, SlidersHorizontal, X } from 'lucide-react'
import { yValueFormatter } from '@/components/charts/components/chart-renderer/utils'
import { EntityAnalyticsFilter } from '@/components/filters/EntityAnalyticsFilter'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { PopulationMethodologyNote } from '@/components/normalization/population-methodology-note'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePeriodLabel } from '@/hooks/use-period-label'
import { EntityAnalyticsAddressContext, useEntityAnalyticsFilter, type EntityAnalyticsAddress } from '@/hooks/useEntityAnalyticsFilter'
import { getChartAnalytics } from '@/lib/api/charts'
import { entityRankingFilter, fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import { getClassificationName } from '@/lib/classifications'
import { getEconomicChapterName } from '@/lib/economic-classifications'
import { defaultEntityAnalyticsFilter, entityAnalyticsQueryOptions, resolveEntityAnalyticsFilter } from '@/lib/entity-analytics-query'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted'
import { downloadMapDataCsv } from '@/lib/map-data-csv'
import { cn, formatCurrency, formatNumber, generateHash, getNormalizationUnit } from '@/lib/utils'
import { defaultYearRange } from '@/schemas/chart-defaults'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { EntityAnalyticsDataPoint } from '@/schemas/entity-analytics'
import type { ReportPeriodInput } from '@/schemas/reporting'

/**
 * `/entity-analytics`, rethought: the parts the three layouts share. The
 * ranking and the breakdown are the page's own reads and components (the
 * treemap, the classification tree, the filters panel); the head, the pinned
 * bar, the figures, the ready questions and the table's markup follow the
 * analysis pages (`/companies/analytics`).
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const PRINCIPAL = 'Executie bugetara agregata la nivel de ordonator principal'
const DETAILED = 'Executie bugetara detaliata'

// ─────────────────────────────────────────────────────────── the address ──

type SearchRecord = Record<string, unknown>

/** The page's state on the harness's own address, so the page's hook and the filters panel work off their route. */
export function HarnessAddress({ children }: { readonly children: ReactNode }) {
  const search = useSearch({ strict: false }) as SearchRecord
  const navigate = useNavigate()
  const change = useCallback(
    (update: (prev: SearchRecord) => SearchRecord) => {
      void navigate({ to: '.', search: ((prev: SearchRecord) => update(prev)) as never, replace: true, resetScroll: false })
    },
    [navigate],
  )
  const address = useMemo<EntityAnalyticsAddress>(() => ({ search, change }), [search, change])
  return <EntityAnalyticsAddressContext value={address}>{children}</EntityAnalyticsAddressContext>
}

// ──────────────────────────────────────────────────────────── the page ──

const QUIET_KEYS = new Set(['account_category', 'report_period', 'normalization', 'report_type', 'currency', 'inflation_adjusted', 'exclude'])

function isSet(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

type Topic = { readonly key: 'functional_prefixes' | 'economic_prefixes'; readonly text: string }

/** A chapter's name as words in a sentence: „Învățământ” → „învățământ”, the code and any formula dropped. */
function chapterWords(name: string): string {
  const words = name.replace(/^[\d.\s]+/, '').replace(/\s*\(.*\)\s*$/, '').trim()
  return words.charAt(0).toLocaleLowerCase('ro') + words.slice(1)
}

/** What the money is for, when the selection names exactly one chapter: it goes in the headline. */
function topicOf(filter: AnalyticsFilterType): Topic | null {
  const functional = filter.functional_prefixes ?? []
  const economic = filter.economic_prefixes ?? []
  if (functional.length === 1 && economic.length === 0) {
    const name = getClassificationName(functional[0].replace(/\.$/, ''))
    return name ? { key: 'functional_prefixes', text: chapterWords(name) } : null
  }
  if (economic.length === 1 && functional.length === 0) {
    const name = getEconomicChapterName(economic[0].replace(/\.$/, ''))
    return name ? { key: 'economic_prefixes', text: chapterWords(name) } : null
  }
  return null
}

/** One chip per kind of filter the reader added beyond the quick choices (and beyond the headline's topic). */
function chipsOf(filter: AnalyticsFilterType, topic: Topic | null): readonly { readonly key: string; readonly text: string; readonly clear: Partial<AnalyticsFilterType> }[] {
  const count = (value: unknown) => (Array.isArray(value) ? value.length : 1)
  const names: Record<string, (n: number) => string> = {
    entity_cuis: (n) => (n === 1 ? t`o instituție aleasă` : t`${n} instituții alese`),
    main_creditor_cui: () => t`un ordonator principal`,
    uat_ids: (n) => (n === 1 ? t`o localitate` : t`${n} localități`),
    county_codes: (n) => (n === 1 ? t`un județ` : t`${n} județe`),
    entity_types: (n) => (n === 1 ? t`un tip de instituție` : t`${n} tipuri de instituții`),
    tags: (n) => (n === 1 ? t`o etichetă` : t`${n} etichete`),
    functional_codes: (n) => (n === 1 ? t`un cod funcțional` : t`${n} coduri funcționale`),
    functional_prefixes: (n) => (n === 1 ? t`un capitol funcțional` : t`${n} capitole funcționale`),
    economic_codes: (n) => (n === 1 ? t`un cod economic` : t`${n} coduri economice`),
    economic_prefixes: (n) => (n === 1 ? t`un titlu economic` : t`${n} titluri economice`),
    budget_sector_ids: (n) => (n === 1 ? t`un sector bugetar` : t`${n} sectoare bugetare`),
    funding_source_ids: (n) => (n === 1 ? t`o sursă de finanțare` : t`${n} surse de finanțare`),
    is_uat: () => t`doar UAT-uri`,
    is_territorial_executive: () => t`autorități executive`,
    aggregate_min_amount: () => t`sumă minimă`,
    aggregate_max_amount: () => t`sumă maximă`,
    min_population: () => t`populație minimă`,
    max_population: () => t`populație maximă`,
  }
  const chips = Object.entries(filter)
    .filter(([key, value]) => !QUIET_KEYS.has(key) && key !== topic?.key && isSet(value))
    .map(([key, value]) => ({ key, text: names[key]?.(count(value)) ?? key, clear: { [key]: undefined } as Partial<AnalyticsFilterType> }))
  const excluded = Object.values(filter.exclude ?? {}).filter(isSet).length
  return excluded > 0 ? [...chips, { key: 'exclude', text: excluded === 1 ? t`o excludere` : t`${excluded} excluderi`, clear: { exclude: undefined } }] : chips
}

/** A single year the period names, or null when it is anything else (months, a span, several years). */
function singleYear(period: AnalyticsFilterType['report_period']): number | null {
  if (!period || period.type !== 'YEAR') return null
  const { interval, dates } = period.selection
  const value = interval && interval.start === interval.end ? interval.start : dates && dates.length === 1 ? dates[0] : null
  const year = Number(value)
  return Number.isInteger(year) ? year : null
}

const yearPeriod = (from: number, to: number) => ({ type: 'YEAR', selection: { interval: { start: String(from), end: String(to) } } }) as AnalyticsFilterType['report_period']

export function useAnalyticsPage() {
  const state = useEntityAnalyticsFilter()
  const { filter, page, pageSize } = state
  const { i18n } = useLingui()
  const [currency] = useUserCurrency()
  const [inflationAdjusted] = useUserInflationAdjusted()
  const effectiveFilter = resolveEntityAnalyticsFilter(filter, { currency, inflationAdjusted })
  const perCapita = effectiveFilter.normalization === 'per_capita'
  const sortBy = state.sortBy ?? (perCapita ? 'per_capita_amount' : 'total_amount')
  const ranking = useQuery(entityAnalyticsQueryOptions({ filter: effectiveFilter, sortBy, sortOrder: state.sortOrder, page, pageSize }))
  const periodLabel = usePeriodLabel(filter.report_period as ReportPeriodInput | undefined)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const topic = topicOf(filter)
  // The per-capita ranking keeps to the territorial executives (`entityRankingFilter`), as an explicit „UAT” filter does.
  const local = perCapita ? filter.is_territorial_executive !== false : filter.is_uat === true
  const year = singleYear(filter.report_period)
  return {
    ...state,
    locale: i18n.locale,
    effectiveFilter,
    /** The selection exactly as the ranking reads it, the territorial-executive default included. */
    rankingFilter: entityRankingFilter(effectiveFilter),
    currency: effectiveFilter.currency ?? currency,
    /** „% din PIB” and the like: an amount that is not money. */
    unit: getNormalizationUnit({ normalization: effectiveFilter.normalization ?? 'total', currency: effectiveFilter.currency ?? currency }),
    perCapita,
    income: filter.account_category === 'vn',
    detailed: filter.report_type === DETAILED,
    sortBy,
    ranking,
    periodLabel,
    year,
    /** A year whose months are still being reported: nothing is compared with a whole year. */
    yearInProgress: year != null && year >= new Date().getFullYear(),
    topic,
    local,
    chips: chipsOf(filter, topic),
    filtersOpen,
    setFiltersOpen,
  }
}

export type AnalyticsPage = ReturnType<typeof useAnalyticsPage>

// ─────────────────────────────────────────────────────────── the words ──

/** „Cheltuielile pe locuitor ale primăriilor și consiliilor județene”: what is measured, of whom. */
function subjectOf(page: AnalyticsPage): string {
  if (page.income) {
    if (page.perCapita) return t`Veniturile pe locuitor ale primăriilor și consiliilor județene`
    return page.local ? t`Veniturile primăriilor și consiliilor județene` : t`Veniturile instituțiilor publice`
  }
  if (page.perCapita) return t`Cheltuielile pe locuitor ale primăriilor și consiliilor județene`
  return page.local ? t`Cheltuielile primăriilor și consiliilor județene` : t`Cheltuielile instituțiilor publice`
}

/** The headline in plain words: the bar's line, the headline's accessible name and its size. */
export function sentenceOf(page: AnalyticsPage): string {
  const topic = page.topic ? ` ${t`pentru`} ${page.topic.text}` : ''
  const when = page.periodLabel ? `, ${t`în ${page.periodLabel}`}` : ''
  return `${subjectOf(page)}${topic}${when}`
}

const MONTHS = () => [t`ianuarie`, t`februarie`, t`martie`, t`aprilie`, t`mai`, t`iunie`, t`iulie`, t`august`, t`septembrie`, t`octombrie`, t`noiembrie`, t`decembrie`]

/** How far the year's data reaches: the last month reported, derived from the reports themselves, never written in the code. */
export function useDataThrough(page: AnalyticsPage) {
  const { year, yearInProgress } = page
  const base = { account_category: page.filter.account_category, report_type: page.filter.report_type ?? PRINCIPAL, normalization: 'total' as const, currency: 'RON' as const, inflation_adjusted: false }
  const months = useQuery({
    queryKey: ['entity-analytics-data-through', year, base.account_category, base.report_type],
    // Only a year in progress is read month by month (a slow read, after the ranking); a past year is whole.
    enabled: yearInProgress && page.ranking.data != null,
    staleTime: 30 * 60_000,
    queryFn: ({ signal }) =>
      getChartAnalytics([{ seriesId: 'months', filter: { ...base, report_period: { type: 'MONTH', selection: { interval: { start: `${year}-01`, end: `${year}-12` } } } as AnalyticsFilterType['report_period'] } }], signal),
  })
  if (year == null) return null
  if (!yearInProgress) return { text: t`date pentru tot anul ${year}`, pending: false }
  const points = months.data?.[0]?.data ?? []
  const last = points.reduce<string | null>((latest, point) => (point.y !== 0 && (!latest || String(point.x) > latest) ? String(point.x) : latest), null)
  if (!last) return { text: months.isError ? t`anul ${year} e în curs` : '…', pending: months.isPending }
  const month = Number(last.slice(5, 7))
  return { text: t`date până în ${MONTHS()[month - 1]} ${year}`, pending: false }
}

// ───────────────────────────────────────────────────── the ready questions ──

type Question = { readonly group: string; readonly text: string; readonly filter: Partial<AnalyticsFilterType> }

/** Ready questions: each is a whole selection, asked about the year and the reports the page is on. */
function readyQuestions(): readonly Question[] {
  const who = t`Cine`
  const perPerson = t`Pe locuitor`
  const what = t`Pe ce`
  return [
    { group: who, text: t`Instituțiile cu cele mai mari cheltuieli`, filter: {} },
    { group: who, text: t`Instituțiile cu cele mai mari venituri`, filter: { account_category: 'vn' } },
    { group: who, text: t`Primăriile și consiliile județene, după cheltuieli`, filter: { is_uat: true } },
    { group: perPerson, text: t`Unde se cheltuie cel mai mult pe locuitor`, filter: { normalization: 'per_capita' } },
    { group: perPerson, text: t`Unde sunt cele mai mari venituri pe locuitor`, filter: { account_category: 'vn', normalization: 'per_capita' } },
    { group: what, text: t`Cine cheltuie cel mai mult pe învățământ`, filter: { functional_prefixes: ['65'] } },
    { group: what, text: t`Cine cheltuie cel mai mult pe sănătate`, filter: { functional_prefixes: ['66'] } },
    { group: what, text: t`Cine cheltuie cel mai mult pe asistență socială`, filter: { functional_prefixes: ['68'] } },
    { group: what, text: t`Cine cheltuie cel mai mult pe transporturi`, filter: { functional_prefixes: ['84'] } },
    { group: what, text: t`Cele mai mari cheltuieli de personal`, filter: { economic_prefixes: ['10'] } },
  ]
}

const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'

function QuestionsMenu({ page }: { readonly page: AnalyticsPage }) {
  const [open, setOpen] = useState(false)
  const questions = readyQuestions()
  const groups = [...new Set(questions.map((question) => question.group))]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={LINK}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(70vh,var(--radix-popover-content-available-height))] w-[min(92vw,22rem)] overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group} className="py-1">
            <MonoLabel className="block px-2 py-1 text-muted-foreground">{group}</MonoLabel>
            {questions
              .filter((question) => question.group === group)
              .map((question) => (
                <button
                  key={question.text}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    page.replaceFilter({
                      ...defaultEntityAnalyticsFilter,
                      report_period: page.filter.report_period ?? defaultEntityAnalyticsFilter.report_period,
                      report_type: page.filter.report_type ?? PRINCIPAL,
                      ...question.filter,
                    })
                  }}
                  className="block min-h-9 w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {question.text}
                </button>
              ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

// ──────────────────────────────────────────────────────────── the head ──

export const CHOICE = 'h-9 w-auto gap-2 rounded-none border-foreground/25 bg-background px-3 text-sm shadow-none transition-colors hover:border-foreground/60 [&>svg]:opacity-70'

/** Two or three short values side by side, each as wide as its word. */
export function Segments<K extends string>({ label, value, options, onChange }: { readonly label: string; readonly value: K; readonly options: readonly { readonly id: K; readonly text: ReactNode; readonly title?: string }[]; readonly onChange: (value: K) => void }) {
  return (
    <span role="group" aria-label={label} className="inline-flex h-9 border border-foreground/25">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          title={option.title}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={cn('whitespace-nowrap px-2 text-sm transition-colors sm:px-3', option.id === value ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground')}
        >
          {option.text}
        </button>
      ))}
    </span>
  )
}

function YearChoice({ page }: { readonly page: AnalyticsPage }) {
  const years = Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, index) => String(defaultYearRange.end - index))
  return (
    <Select value={page.year == null ? '' : String(page.year)} onValueChange={(year) => page.setFilter({ report_period: yearPeriod(Number(year), Number(year)) })}>
      <SelectTrigger aria-label={t`Anul`} className={CHOICE}>
        <span className="text-muted-foreground">{t`Anul`}:</span>
        <span className="font-semibold">
          <SelectValue placeholder={page.periodLabel || t`altă perioadă`} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CopyLink() {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={LINK}
      aria-label={t`Copiază linkul`}
      title={t`Copiază linkul`}
      onClick={() => {
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 2000)
        })
      }}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

export function FiltersButton({ page, onClick, className }: { readonly page: AnalyticsPage; readonly onClick: () => void; readonly className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(LINK, className)}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {page.chips.length > 0 ? <span className="ml-0.5 bg-foreground px-1.5 py-px text-xs tabular-nums text-background">{page.chips.length}</span> : null}
    </button>
  )
}

/*
 * The headline has a room of its own height, so the controls, the bar and the
 * table stay where they are whatever the selection says: two lines of the
 * widest step on a wide frame, three on a phone. The type steps down by the
 * sentence's length to fit that room, each step a share of the frame's width
 * (`cqi`, capped), as on /companies/analytics. A sentence past every step
 * grows the room, never clips.
 */
const HEADLINE_ROOM = 'min-h-[min(6.12rem,24.5cqi)] sm:min-h-[min(6.12rem,8.98cqi)]'

function headlineSize(length: number): string {
  const phone = length <= 34 ? 'text-[length:min(2.5rem,10cqi)]' : length <= 66 ? 'text-[length:min(2rem,8cqi)]' : 'text-[length:min(1.5rem,6cqi)]'
  const wide = length <= 36 ? 'sm:text-[length:min(3.75rem,5.5cqi)]' : length <= 76 ? 'sm:text-[length:min(3rem,4.4cqi)]' : length <= 100 ? 'sm:text-[length:min(2.5rem,3.67cqi)]' : 'sm:text-[length:min(2rem,2.93cqi)]'
  return `${phone} ${wide}`
}

/** The selection as the headline, then the choices most readers make; the ready questions; everything else behind „Filtre”. */
export function Head({ page, onFilters }: { readonly page: AnalyticsPage; readonly onFilters: () => void }) {
  const plain = sentenceOf(page)
  const when = page.periodLabel ? `, ${t`în ${page.periodLabel}`}` : ''
  const topic = page.topic
  const through = useDataThrough(page)
  return (
    <section className="relative border-b" aria-labelledby="entity-analytics-title">
      <TwoLayerLattice idPrefix="entity-analytics" />
      <RuledFrame className="py-6 sm:py-10 lg:py-12">
        <CornerTicks />
        <div className="flex items-start justify-between gap-4">
          <MonoLabel className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Link to="/" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3" aria-hidden="true" />
              <span>{t`Acasă`}</span>
            </Link>
            <span aria-hidden="true" className="hidden sm:inline">
              /
            </span>
            <span className="hidden sm:inline">{t`Instituții publice`}</span>
          </MonoLabel>
          {through ? (
            <p className="text-right text-xs leading-4 text-muted-foreground">
              <span className="first-letter:uppercase inline-block">{through.text}</span>
              <span className="whitespace-nowrap"> · {t`ANAF`}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-3 @container sm:mt-6">
          <div className={cn('flex flex-col justify-end', HEADLINE_ROOM)}>
            <h1 id="entity-analytics-title" aria-label={plain} className={cn(headlineSize(plain.length), 'text-balance break-words font-extrabold leading-[1.02] tracking-tighter text-foreground')}>
              {subjectOf(page)}
              {topic ? (
                <>
                  {` ${t`pentru`} `}
                  <HeadlinePhrase text={topic.text} removeLabel={t`Scoate „${topic.text}”`} onOpen={onFilters} onRemove={() => page.setFilter({ [topic.key]: undefined })} />
                </>
              ) : null}
              {when}
            </h1>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 sm:mt-6 sm:gap-x-5 sm:gap-y-3">
          <span className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2">
            <Segments
              label={t`Venituri sau cheltuieli`}
              value={page.income ? 'vn' : 'ch'}
              options={[
                { id: 'ch', text: t`Cheltuieli` },
                { id: 'vn', text: t`Venituri` },
              ]}
              onChange={(value) => page.setFilter({ account_category: value })}
            />
            <YearChoice page={page} />
            </span>
            <span className="flex items-center gap-2">
            <Segments
              label={t`Cum se măsoară`}
              value={page.perCapita ? 'per_capita' : 'total'}
              options={[
                { id: 'total', text: t`Total` },
                { id: 'per_capita', text: t`Pe locuitor` },
              ]}
              onChange={(value) => page.setFilter({ normalization: value })}
            />
            <Segments
              label={t`Rapoartele`}
              value={page.detailed ? 'detailed' : 'principal'}
              options={[
                {
                  id: 'principal',
                  text: (
                    <>
                      <span className="sm:hidden">{t`Principal`}</span>
                      <span className="hidden sm:inline">{t`Ordonator principal`}</span>
                    </>
                  ),
                  title: t`Fiecare ordonator principal de credite, cu instituțiile din subordine la un loc`,
                },
                { id: 'detailed', text: t`Detaliat`, title: t`Fiecare instituție, cu raportul ei` },
              ]}
              onChange={(value) => page.setFilter({ report_type: value === 'detailed' ? DETAILED : PRINCIPAL })}
            />
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <FiltersButton page={page} onClick={onFilters} />
            <QuestionsMenu page={page} />
            <CopyLink />
          </span>
        </div>
        {page.chips.length > 0 ? (
          <ul className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4" aria-label={t`Filtre active`}>
            {page.chips.map((chip) => (
              <li key={chip.key} className="inline-flex items-center gap-1 border bg-background py-1 pl-2.5 pr-1 text-sm">
                <button type="button" onClick={onFilters} className="hover:underline">
                  {chip.text}
                </button>
                <button type="button" onClick={() => page.setFilter(chip.clear)} aria-label={t`Scoate „${chip.text}”`} className="inline-flex size-6 items-center justify-center text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={page.resetFilter} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                {t`Șterge toate`}
              </button>
            </li>
          </ul>
        ) : null}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────── the pinned bar ──

export const RANKING_ID = 'clasament'
export const BREAKDOWN_ID = 'structura'

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

/** The selection in a line, and the two parts of the answer to jump between. */
export function Bar({ page, frameClassName }: { readonly page: AnalyticsPage; readonly frameClassName?: string }) {
  return (
    <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
      <RuledFrame className={cn('flex min-h-11 items-center justify-between gap-6', frameClassName)}>
        <p className="hidden min-w-0 truncate text-sm font-semibold text-foreground md:block">{sentenceOf(page)}</p>
        <nav aria-label={t`Părțile paginii`} className="ml-auto flex shrink-0 items-center gap-5 text-sm">
          <button type="button" onClick={() => jumpTo(RANKING_ID)} className="min-h-11 text-muted-foreground hover:text-foreground">
            {t`Clasament`}
          </button>
          <button type="button" onClick={() => jumpTo(BREAKDOWN_ID)} className="min-h-11 text-muted-foreground hover:text-foreground">
            <span className="sm:hidden">{t`Structură`}</span>
            <span className="hidden sm:inline">{page.income ? t`De unde vin banii` : t`Pe ce se cheltuie`}</span>
          </button>
        </nav>
      </RuledFrame>
    </div>
  )
}

// ────────────────────────────────────────────────────────── the figures ──

/** A compact amount split into its digits and its scale („991,06” · „mld. RON”); a form that does not start with its digits stays whole. */
function splitCompact(value: number, page: AnalyticsPage, unit?: string): { readonly digits: string; readonly scale: string | null; readonly exact: string } {
  if (unit && unit !== page.currency && !unit.startsWith(page.currency)) {
    return { digits: yValueFormatter(value, unit, 'compact'), scale: null, exact: yValueFormatter(value, unit, 'standard') }
  }
  const exact = formatCurrency(value, 'standard', page.currency)
  // Below a hundred thousand the whole number reads better than its scale („1.033 RON”, not „1,03 mii RON”).
  if (Math.abs(value) < 100_000) {
    const digits = new Intl.NumberFormat(page.locale === 'en' ? 'en-GB' : 'ro-RO', { maximumFractionDigits: 0 }).format(value)
    return { digits, scale: page.currency, exact }
  }
  const compact = formatCurrency(value, 'compact', page.currency)
  const split = /^([-\u2212]?[\d.,\u00a0\u202f]*\d)[\s\u00a0\u202f]+(.+)$/.exec(compact)
  return split ? { digits: split[1], scale: split[2], exact } : { digits: compact, scale: null, exact }
}

function percentText(value: number, locale: string, signed = false): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { style: 'percent', maximumFractionDigits: 1, minimumFractionDigits: Math.abs(value) < 0.1 ? 1 : 0, signDisplay: signed ? 'exceptZero' : 'auto' }).format(value)
}

type FigureCell = { readonly key: string; readonly value: string | null; readonly unit?: string | null; readonly exact?: string; readonly label: string; readonly detail?: string }

/** The selection's own figures, read as one series over two years and the ten largest: what the table's pages cannot add up. */
export function Figures({ page }: { readonly page: AnalyticsPage }) {
  const { year, rankingFilter, perCapita, locale } = page
  const series = useQuery({
    queryKey: ['entity-analytics-figures', generateHash(JSON.stringify(rankingFilter)), year],
    enabled: year != null,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) =>
      getChartAnalytics(
        [
          { seriesId: 'total', filter: { ...rankingFilter, normalization: 'total', report_period: yearPeriod((year ?? 0) - 1, year ?? 0) } },
          ...(perCapita ? [{ seriesId: 'per-capita', filter: { ...rankingFilter, normalization: 'per_capita' as const, report_period: yearPeriod((year ?? 0) - 1, year ?? 0) } }] : []),
        ],
        signal,
      ),
  })
  const largest = useQuery({
    ...entityAnalyticsQueryOptions({ filter: { ...rankingFilter, normalization: 'total' }, sortBy: 'total_amount', sortOrder: 'desc', page: 1, pageSize: 10 }),
    enabled: year != null,
  })
  const valueOf = (id: string, at: number) => series.data?.find((one) => one.seriesId === id)?.data.find((point) => Number(point.x) === at)?.y
  const unitOf = (id: string) => series.data?.find((one) => one.seriesId === id)?.yAxis?.unit
  const measure = perCapita ? 'per-capita' : 'total'
  const current = year == null ? undefined : valueOf(measure, year)
  const previous = year == null ? undefined : valueOf(measure, year - 1)
  const total = year == null ? undefined : valueOf('total', year)
  const count = page.ranking.data?.pageInfo.totalCount
  const pending = series.isPending && year != null

  const amountCell = (key: string, value: number | undefined, label: string, unit?: string): FigureCell => {
    if (pending) return { key, value: null, label }
    if (value == null) return { key, value: '—', label }
    const split = splitCompact(value, page, unit)
    return { key, value: split.digits, unit: split.scale, exact: split.exact, label }
  }
  const changeCell = (): FigureCell => {
    const label = year == null ? t`Față de anul anterior` : t`Față de ${year - 1}`
    if (page.yearInProgress) return { key: 'change', value: '—', label, detail: t`anul ${String(year)} e în curs` }
    if (pending) return { key: 'change', value: null, label }
    if (current == null || previous == null || previous === 0) return { key: 'change', value: '—', label }
    return { key: 'change', value: percentText((current - previous) / Math.abs(previous), locale, true), label }
  }
  const topTen = largest.data?.nodes ?? []
  const topShare = total && topTen.length > 0 ? topTen.reduce((sum, row) => sum + row.total_amount, 0) / total : null
  const cells: readonly FigureCell[] = [
    perCapita ? amountCell('measure', current, t`Pe locuitor, toată selecția`, unitOf('per-capita')) : amountCell('measure', total, page.income ? t`Venituri` : t`Cheltuieli`),
    changeCell(),
    { key: 'count', value: count == null ? null : formatNumber(count), label: t`Instituții` },
    perCapita
      ? amountCell('total', total, t`Total`)
      : {
          key: 'top',
          value: largest.isPending || pending ? null : topShare == null ? '—' : percentText(topShare, locale),
          label: (count ?? 0) > 10 ? t`Primele 10 instituții` : t`Cea mai mare instituție`,
          detail: topShare == null ? undefined : t`din total`,
        },
  ]
  if (year == null) return null
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {series.isError ? (
          <p role="alert" className="py-6 text-sm text-muted-foreground">
            {t`Cifrele selecției nu au putut fi citite.`}{' '}
            <button type="button" onClick={() => void series.refetch()} className="font-medium text-foreground underline underline-offset-4">
              {t`Încearcă din nou`}
            </button>
          </p>
        ) : (
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {cells.map((cell, index) => (
              <div key={cell.key} className={cn('flex flex-col px-4 py-5 sm:px-5 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
                <dt className="order-2 mt-2">
                  <MonoLabel className="block leading-relaxed text-foreground">{cell.label}</MonoLabel>
                  {/* Room for a note on every figure, so the band keeps its height as notes come and go. */}
                  <span className={cn('mt-1 block text-xs text-muted-foreground', !cell.detail && 'invisible')} aria-hidden={cell.detail ? undefined : 'true'}>
                    {cell.detail ?? '·'}
                  </span>
                </dt>
                <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl" title={cell.exact}>
                  {cell.value === null ? (
                    <span className="inline-block h-8 w-24 animate-pulse rounded-sm bg-muted align-middle sm:h-9 sm:w-28" />
                  ) : (
                    <span aria-hidden={cell.exact ? 'true' : undefined}>{cell.value}</span>
                  )}
                  {cell.unit && cell.value !== null ? (
                    <span className="ml-1.5 text-sm font-medium tracking-normal text-muted-foreground sm:text-xl" aria-hidden="true">
                      {cell.unit}
                    </span>
                  ) : null}
                  {cell.exact ? <span className="sr-only">{cell.exact}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────────── the table ──

/** „MUNICIPIUL BUCUREȘTI” as „Municipiul București”: a county is read as a name, not as a code. */
function placeName(value: string, locale: string): string {
  return value.toLocaleLowerCase(locale).replace(/(^|[\s-])(\p{L})/gu, (_, before: string, letter: string) => `${before}${letter.toLocaleUpperCase(locale)}`)
}

/** An amount as its digits and its scale apart („259,69” · „mld. RON”), the exact value on hover and for a screen reader. */
function Amount({ value, page, strong }: { readonly value: number | null | undefined; readonly page: AnalyticsPage; readonly strong: boolean }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  if (page.unit.startsWith('%')) return <span className={cn(strong && 'font-semibold text-foreground')}>{yValueFormatter(value, page.unit, 'compact')}</span>
  const split = splitCompact(value, page)
  return (
    <span title={split.exact}>
      <span aria-hidden="true">
        <span className={cn(strong && 'font-semibold text-foreground')}>{split.digits}</span>
        {split.scale ? <span className="ml-1 text-xs text-muted-foreground">{split.scale}</span> : null}
      </span>
      <span className="sr-only">{split.exact}</span>
    </span>
  )
}

function SortHead({ page, column, children, className, firstOrder = 'desc' }: { readonly page: AnalyticsPage; readonly column: string; readonly children: ReactNode; readonly className?: string; readonly firstOrder?: 'asc' | 'desc' }) {
  const sorted = page.sortBy === column
  const Arrow = page.sortOrder === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead className={className} aria-sort={sorted ? (page.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => page.setSorting(column, sorted ? (page.sortOrder === 'asc' ? 'desc' : 'asc') : firstOrder)}
        className={cn('inline-flex min-h-11 items-center gap-1 whitespace-nowrap hover:text-foreground sm:min-h-0', sorted && 'font-semibold text-foreground')}
      >
        {children}
        {sorted ? <Arrow className="size-3" aria-hidden="true" /> : null}
      </button>
    </TableHead>
  )
}

const PAGER = 'inline-flex size-11 items-center justify-center border hover:bg-muted disabled:opacity-40 sm:size-8'
const EXPORT_BATCH = 500

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/** Every row of the selection, in the list's order, read in batches; a list that changed while it was read is refused. */
async function readAllRows(page: AnalyticsPage, total: number): Promise<readonly EntityAnalyticsDataPoint[]> {
  const rows: EntityAnalyticsDataPoint[] = []
  for (let offset = 0; offset < total; offset += EXPORT_BATCH) {
    const batch = await fetchEntityAnalytics({
      filter: page.rankingFilter,
      sort: { by: page.sortBy === 'county_name' ? 'county_code' : page.sortBy, order: page.sortOrder },
      limit: EXPORT_BATCH,
      offset,
    })
    if (batch.pageInfo.totalCount !== total || batch.nodes.length === 0) throw new Error('changed')
    rows.push(...batch.nodes)
  }
  if (rows.length !== total) throw new Error('incomplete')
  return rows
}

/** Under the table: which rows these are, the whole list as a file, the pages. */
function RankingFoot({ page, shown, total }: { readonly page: AnalyticsPage; readonly shown: number; readonly total: number }) {
  const [exporting, setExporting] = useState<'idle' | 'busy' | 'failed'>('idle')
  const first = (page.page - 1) * page.pageSize + 1
  const pages = Math.max(1, Math.ceil(total / page.pageSize))
  const exportCsv = async () => {
    setExporting('busy')
    try {
      const rows = await readAllRows(page, total)
      const header = ['entity_cui', 'entity_name', 'entity_type', 'county_code', 'county_name', 'population', 'total_amount', 'per_capita_amount']
      const lines = rows.map((row) => [row.entity_cui, row.entity_name, row.entity_type, row.county_code, row.county_name, row.population, row.total_amount, row.per_capita_amount].map(csvCell).join(','))
      downloadMapDataCsv([header.join(','), ...lines].join('\n'), `institutii-publice-${page.year ?? 'perioada'}.csv`)
      setExporting('idle')
    } catch {
      setExporting('failed')
    }
  }
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="tabular-nums">
        {t`${formatNumber(first)}–${formatNumber(first + shown - 1)} din ${formatNumber(total)}`}
        {exporting === 'failed' ? (
          <span role="alert" className="ml-2 text-foreground">
            {t`Fișierul nu a putut fi făcut. Încearcă din nou.`}
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-1">
        <button type="button" disabled={exporting === 'busy'} onClick={() => void exportCsv()} className="inline-flex min-h-11 items-center gap-1 px-2 hover:text-foreground disabled:opacity-60 sm:min-h-8">
          <Download className="size-3.5" aria-hidden="true" />
          {exporting === 'busy' ? t`Se pregătește…` : t`CSV`}
        </button>
        <span className="px-1 tabular-nums">{t`Pagina ${formatNumber(page.page)} din ${formatNumber(pages)}`}</span>
        <button type="button" disabled={page.page <= 1} onClick={() => page.setPagination(page.page - 1)} className={PAGER} aria-label={t`Pagina anterioară`}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" disabled={page.page >= pages} onClick={() => page.setPagination(page.page + 1)} className={PAGER} aria-label={t`Pagina următoare`}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  )
}

/**
 * The same institutions a year earlier: one read of the page's rows, the
 * thresholds dropped (they choose rows, and a row is compared, not chosen).
 * None for a year still being reported.
 */
function usePreviousYear(page: AnalyticsPage, rows: readonly EntityAnalyticsDataPoint[]) {
  const cuis = rows.map((row) => row.entity_cui)
  const { year } = page
  const previousFilter: AnalyticsFilterType = {
    ...page.rankingFilter,
    entity_cuis: cuis,
    aggregate_min_amount: undefined,
    aggregate_max_amount: undefined,
    min_population: undefined,
    max_population: undefined,
    report_period: year == null ? page.rankingFilter.report_period : yearPeriod(year - 1, year - 1),
  }
  const previous = useQuery({
    ...entityAnalyticsQueryOptions({ filter: previousFilter, sortBy: 'total_amount', sortOrder: 'desc', page: 1, pageSize: Math.max(cuis.length, 1) }),
    enabled: cuis.length > 0 && year != null && !page.yearInProgress,
  })
  const byCui = useMemo(() => new Map((previous.data?.nodes ?? []).map((node) => [node.entity_cui, node])), [previous.data])
  const shown = year != null && !page.yearInProgress
  return { shown, pending: previous.isPending, byCui }
}

function Change({ now, before, locale, pending }: { readonly now: number | null | undefined; readonly before: number | null | undefined; readonly locale: string; readonly pending: boolean }) {
  if (pending) return <span className="inline-block h-3 w-10 animate-pulse rounded-sm bg-muted align-middle" />
  if (now == null || before == null || before === 0) return <span className="text-muted-foreground">—</span>
  return <span className="text-muted-foreground">{percentText((now - before) / Math.abs(before), locale, true)}</span>
}

/** The ranking: who, and how much. The amount the list is ordered by is always in view, a phone included. */
export function Ranking({ page, className }: { readonly page: AnalyticsPage; readonly className?: string }) {
  const { ranking, perCapita } = page
  const rows: readonly EntityAnalyticsDataPoint[] = ranking.data?.nodes ?? []
  const total = ranking.data?.pageInfo.totalCount ?? 0
  const first = (page.page - 1) * page.pageSize + 1
  const previous = usePreviousYear(page, rows)
  const NUMBER = 'whitespace-nowrap text-right align-top leading-5 tabular-nums'
  const measure = (row: EntityAnalyticsDataPoint | undefined) => (row ? (perCapita ? row.per_capita_amount : row.total_amount) : undefined)
  return (
    <section id={RANKING_ID} aria-label={t`Clasament`} className={cn('min-w-0 scroll-mt-14', className)}>
      {ranking.isError ? (
        <p role="alert" className="py-6 text-sm text-muted-foreground">
          {t`Clasamentul nu a putut fi citit.`}{' '}
          <button type="button" onClick={() => void ranking.refetch()} className="font-medium text-foreground underline underline-offset-4">
            {t`Încearcă din nou`}
          </button>
        </p>
      ) : !ranking.data ? (
        <div className="h-[36rem] animate-pulse bg-muted/30" aria-busy="true" aria-label={t`Se încarcă clasamentul`} />
      ) : rows.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t`Nicio instituție în această selecție.`}</p>
      ) : (
        <div className={cn(ranking.isFetching && 'opacity-70 transition-opacity')}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="hidden w-12 sm:table-cell">#</TableHead>
                <SortHead page={page} column="entity_name" firstOrder="asc">
                  {t`Instituția`}
                </SortHead>
                {perCapita ? (
                  <>
                    <SortHead page={page} column="population" className="hidden text-right md:table-cell">
                      {t`Populație`}
                    </SortHead>
                    <SortHead page={page} column="per_capita_amount" className="text-right">
                      {t`Pe locuitor`}
                    </SortHead>
                  </>
                ) : null}
                <SortHead page={page} column="total_amount" className={cn('text-right', perCapita && 'hidden sm:table-cell')}>
                  {t`Total`}
                </SortHead>
                {previous.shown ? <TableHead className="hidden w-28 whitespace-nowrap text-right md:table-cell">{t`Față de ${(page.year ?? 0) - 1}`}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.entity_cui}>
                  <TableCell className="hidden align-top font-mono text-xs leading-5 tabular-nums text-muted-foreground sm:table-cell">{first + index}</TableCell>
                  <TableCell className="max-w-[11rem] align-top sm:max-w-md lg:max-w-xl">
                    <Link to="/entities/$cui" params={{ cui: row.entity_cui }} className="line-clamp-2 font-medium leading-5 text-foreground hover:underline sm:line-clamp-1" title={row.entity_name}>
                      {row.entity_name}
                    </Link>
                    {row.county_name ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{placeName(row.county_name, page.locale)}</span> : null}
                  </TableCell>
                  {perCapita ? (
                    <>
                      <TableCell className={cn(NUMBER, 'hidden text-muted-foreground md:table-cell')}>{row.population != null ? formatNumber(row.population) : '—'}</TableCell>
                      <TableCell className={NUMBER}>
                        <Amount value={row.per_capita_amount} page={page} strong={page.sortBy !== 'total_amount'} />
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell className={cn(NUMBER, perCapita && 'hidden sm:table-cell')}>
                    <Amount value={row.total_amount} page={page} strong={!perCapita || page.sortBy === 'total_amount'} />
                  </TableCell>
                  {previous.shown ? (
                    <TableCell className={cn(NUMBER, 'hidden text-xs md:table-cell')}>
                      <Change now={measure(row)} before={measure(previous.byCui.get(row.entity_cui))} locale={page.locale} pending={previous.pending} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <RankingFoot page={page} shown={rows.length} total={total} />
          {perCapita ? <PopulationMethodologyNote /> : null}
        </div>
      )}
    </section>
  )
}

// ──────────────────────────────────────────────────────────── the source ──

/** Where the figures come from, once, at the foot. */
export function SourceLine({ page }: { readonly page: AnalyticsPage }) {
  const through = useDataThrough(page)
  const reports = page.detailed ? t`raportul fiecărei instituții` : t`rapoartele ordonatorilor principali de credite, cu instituțiile din subordine la un loc`
  return (
    <RuledFrame className="border-t py-8">
      <p className="text-xs leading-5 text-muted-foreground">
        {t`Sursa: execuțiile bugetare lunare publicate de ANAF (extranet)`}; {reports}
        {through ? `; ${through.text}` : ''}.{' '}
        {page.perCapita ? t`Populația: INS.` : null}
      </p>
    </RuledFrame>
  )
}

// ────────────────────────────────────────────────────────── the filters ──

/** The page's own filters panel, unchanged, without the view switch. */
export function FiltersPanel({ page }: { readonly page: AnalyticsPage }) {
  return <EntityAnalyticsFilter currency={page.currency} normalization={page.effectiveFilter.normalization} showViewSwitch={false} />
}

/** Every filter, for the few who need them: a side panel on a wide screen, a sheet from the bottom on a phone. */
export function FiltersSheet({ page }: { readonly page: AnalyticsPage }) {
  const phone = useIsMobile()
  return (
    <Sheet open={page.filtersOpen} onOpenChange={page.setFiltersOpen}>
      <SheetContent side={phone ? 'bottom' : 'right'} className={cn('flex flex-col gap-0 p-0', phone ? 'h-[88dvh]' : 'w-full max-w-md sm:max-w-md')}>
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">{t`Toate filtrele`}</SheetTitle>
          <SheetDescription className="sr-only">{t`Restrânge instituțiile și sumele după loc, clasificație, sector și altele.`}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <FiltersPanel page={page} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
