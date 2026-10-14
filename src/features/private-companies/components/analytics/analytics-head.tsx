import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { ArrowLeft, Check, ChevronDown, Info, Link2, Plus, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { sourceEditionText } from '../../lib/company-analytics-source'
import { companyAnalyticsCaveats } from '../../lib/company-analytics-text'
import { DEFAULT_STATE, filterCount, withScope, type CompanyAnalyticsState } from '../../lib/company-analytics-url'
import { heldOf, partialYears } from '../../lib/company-analytics-view'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { phrasesOf, sentenceOf } from '../../lib/company-analytics-sentence'
import { withoutChip } from '../../lib/company-analytics-scope-text'
import type { CompanyAnalyticsPageData } from '../../hooks/use-company-analytics-page'
import { FiscalYearSelect, MeasureSelect } from './analytics-choices'
import { AddFilter } from './analytics-add-filter'

/**
 * The head, in the NGO registry's and the procurement analytics page's
 * language: the way back and the data's date, the selection as the headline
 * — a filter's phrase opens the panel, its ✕ drops it — then one row of
 * controls: the two choices every answer makes (the fiscal year, the
 * measure) as dropdowns, the ways to change the rest (a filter by name, the
 * filters, a ready question), the link and the notes; the crux where the
 * pinned bar begins. The companies' state is one of the filters.
 */

/** A control in the row: quiet words, a 44 px target on a phone. */
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
/** A dropdown in the row: a bordered value beside the quiet controls. */
const CHOICE = 'h-9 w-auto gap-2 rounded-none border-foreground/25 bg-background px-3 text-sm shadow-none transition-colors hover:border-foreground/60 [&>svg]:opacity-70'

// ─────────────────────────────────────────────────────── the headline's room ──

/*
 * The headline has a room of its own height, so the controls, the bar and
 * the answer stay where they are as filters come and go: two lines of the
 * 48 px step on a wide frame, three of the 32 px step on a phone. The type
 * steps down by the sentence's length to fit that room, and every step is a
 * share of the frame's width (`cqi`, capped), so a line holds as many
 * letters at any width — about 40 at the largest step, the face being some
 * 0.43 em a letter. The headline stands at the room's foot, on its controls;
 * a sentence past every step (some 200 letters) grows the room, never clips.
 */
const HEADLINE_ROOM = 'min-h-[min(6.12rem,24.5cqi)] sm:min-h-[min(6.12rem,8.98cqi)]'

function headlineSize(length: number): string {
  const phone = length <= 34 ? 'text-[length:min(2.5rem,10cqi)]' : length <= 66 ? 'text-[length:min(2rem,8cqi)]' : 'text-[length:min(1.5rem,6cqi)]'
  const wide = length <= 36 ? 'sm:text-[length:min(3.75rem,5.5cqi)]' : length <= 76 ? 'sm:text-[length:min(3rem,4.4cqi)]' : length <= 100 ? 'sm:text-[length:min(2.5rem,3.67cqi)]' : 'sm:text-[length:min(2rem,2.93cqi)]'
  return `${phone} ${wide}`
}

// ──────────────────────────────────────────────────────────────── the head ──

/** The selection as the headline — „Firmele SRL radiate din Cluj, plătitoare de TVA, în 2024" — each filter a phrase that opens the filters, with its ✕. */
export function AnalyticsHead({ page, onFilters }: { readonly page: CompanyAnalyticsPageData; readonly onFilters: () => void }) {
  const { state, question, live, move, locale } = page
  const phrases = phrasesOf(page)
  const year = question?.year ?? live?.defaults.fiscalYear ?? null
  // The sentence in plain words: the headline's name (its phrases and their ✕s stay reachable inside) and its size.
  const plain = sentenceOf(page)
  return (
    <section className="relative border-b" aria-labelledby="company-analytics-title">
      <TwoLayerLattice idPrefix="company-analytics" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/companies" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Firme`}</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <Freshness page={page} />
        </div>
        <div className="mt-4 @container sm:mt-6">
          <div className={cn('flex flex-col justify-end', HEADLINE_ROOM)}>
            {/* The leading after the size: a font size given later would drop it (tailwind-merge pairs the two). */}
            <h1 id="company-analytics-title" aria-label={plain} className={cn(headlineSize(plain.length), 'text-balance break-words font-extrabold leading-[1.02] tracking-tighter text-foreground')}>
              {t`Firmele`}
              {phrases.map((phrase) => (
                <span key={`${phrase.field}:${phrase.chip.part ?? ''}:${phrase.chip.text}`}>
                  {phrase.before}
                  <HeadlinePhrase text={phrase.text} removeLabel={t`Scoate „${phrase.text}”`} onOpen={onFilters} onRemove={() => move(withScope(state, withoutChip(state.scope, phrase.chip, locale)))} />
                </span>
              ))}
              {year ? `, ${t`în ${year}`}` : null}
            </h1>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex flex-wrap items-center gap-2">
            <YearSelect page={page} />
            <MeasureSelectInHead page={page} />
          </span>
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <AddFilter
              page={page}
              triggerClassName={LINK}
              trigger={
                <>
                  <Plus className="size-3.5" aria-hidden="true" />
                  {t`Adaugă un filtru`}
                </>
              }
            />
            <FiltersButton count={filterCount(state.scope)} onClick={onFilters} />
            <QuestionsMenu page={page} />
            <CopyLink pinned={page.pinned} />
            <NotesMarker page={page} />
          </span>
        </div>
        {/* The crux on the head's bottom rule, where the bar begins; above the bar, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** A date in words, as the registry's export date reads („11 octombrie 2026"). */
function dayText(value: string | null | undefined, locale: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' })
}

/** When the release was published — the registry's own edition on hover: the place and the state are as of that day. */
function Freshness({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { live, release, locale } = page
  if (release.isPending) return <span className="h-4 w-44 animate-pulse bg-muted/60" aria-hidden="true" />
  const published = dayText(live?.release.publishedAt, locale)
  if (!live || !published) return null
  const registry = dayText(live.asOf.find((entry) => entry.kind === 'onrc_edition')?.published, locale)
  // The sources named beside the date; on a phone, under it.
  return (
    <span className="text-right text-xs tabular-nums text-muted-foreground" title={registry ? t`Registrul ONRC: ediția din ${registry}` : undefined}>
      <span className="whitespace-nowrap">{t`Date actualizate pe ${published}`}</span>
      <span className="hidden sm:inline"> · </span>
      <span className="block whitespace-nowrap sm:inline">{t`ANAF, ONRC`}</span>
    </span>
  )
}

// ──────────────────────────────────────────────────────────── the controls ──

/** A dropdown's value with its name before it, quieter: „Anul fiscal: 2024". */
function ChoiceText({ name, children }: { readonly name: string; readonly children: ReactNode }) {
  return (
    <span>
      <span className="text-muted-foreground">{name}:</span> <span className="font-semibold tabular-nums text-foreground">{children}</span>
    </span>
  )
}

function YearSelect({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { state, live, question, move } = page
  if (!live || !question) return <span className="inline-block h-9 w-40 animate-pulse border bg-muted/40" aria-hidden="true" />
  return (
    <FiscalYearSelect release={live} year={question.year} onChange={(year) => move({ ...state, year })} triggerClassName={CHOICE}>
      <ChoiceText name={t`Anul fiscal`}>{question.year}</ChoiceText>
    </FiscalYearSelect>
  )
}

function MeasureSelectInHead({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { state, live, question, move } = page
  if (!live || !question) return <span className="inline-block h-9 w-44 animate-pulse border bg-muted/40" aria-hidden="true" />
  return <MeasureSelect release={live} year={question.year} metric={question.metric} onChange={(metric) => move({ ...state, metric })} triggerClassName={cn(CHOICE, 'max-w-xs font-semibold')} />
}

/** „Filtre", with how many are on in the accent's square. */
function FiltersButton({ count, onClick }: { readonly count: number; readonly onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={LINK}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
    </button>
  )
}

/** Copies this page's address: every control writes it, so a question is a link. */
function CopyLink({ pinned }: { readonly pinned: string | null }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    // The link names the release the figures came from, as the page's own share does: a fresh page has not written it yet.
    const url = new URL(window.location.href)
    if (pinned) url.searchParams.set('editie', pinned)
    void navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button type="button" onClick={copy} className={cn(LINK, 'size-11 justify-center sm:size-auto')} aria-label={copied ? t`Copiat` : t`Copiază legătura`} title={copied ? t`Copiat` : t`Copiază legătura`}>
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

// ──────────────────────────────────────────────────────── the questions ──

interface ReadyQuestion {
  readonly group: string
  readonly text: string
  readonly to: (state: CompanyAnalyticsState) => CompanyAnalyticsState
}

/**
 * Questions a reader asks first, each the page's own state, asked afresh: the
 * reader's year, release and view, nothing of the last question's order or
 * axis. The map draws places only, so a question of companies or of another
 * axis is read in the table.
 */
function readyQuestions(): readonly ReadyQuestion[] {
  const base = (state: CompanyAnalyticsState, patch: Partial<CompanyAnalyticsState>): CompanyAnalyticsState => {
    const next: CompanyAnalyticsState = { ...DEFAULT_STATE, year: state.year, release: state.release, mode: state.mode, ...patch }
    const places = next.panel === 'defalcare' && (next.dimension === 'COUNTY' || next.dimension === 'UAT')
    return next.mode === 'harta' && !places ? { ...next, mode: 'tabel' } : next
  }
  return [
    { group: t`Cele mai mari`, text: t`Cele mai mari firme după cifra de afaceri`, to: (s) => base(s, { scope: {}, metric: 'TURNOVER', panel: 'firme' }) },
    { group: t`Cele mai mari`, text: t`Cei mai mari angajatori`, to: (s) => base(s, { scope: {}, metric: 'EMPLOYEES', panel: 'firme' }) },
    { group: t`Cele mai mari`, text: t`Firmele cu cele mai mari pierderi`, to: (s) => base(s, { scope: {}, metric: 'NET_RESULT', panel: 'firme', direction: 'ASC' }) },
    { group: t`Unde`, text: t`Cifra de afaceri pe județe`, to: (s) => base(s, { scope: {}, metric: 'TURNOVER', panel: 'defalcare', dimension: 'COUNTY' }) },
    { group: t`Unde`, text: t`Unde lucrează salariații din Cluj`, to: (s) => base(s, { scope: { county: { in: ['CJ'] } }, metric: 'EMPLOYEES', panel: 'defalcare', dimension: 'UAT' }) },
    { group: t`Cine`, text: t`Firmele mari (250+ salariați), pe activități`, to: (s) => base(s, { scope: { employeeSizeBands: ['FROM_250'] }, metric: 'TURNOVER', panel: 'defalcare', dimension: 'MAIN_CAEN' }) },
    { group: t`Cine`, text: t`Firmele pe mărime, după salariați`, to: (s) => base(s, { scope: {}, metric: 'EMPLOYEES', panel: 'defalcare', dimension: 'EMPLOYEE_SIZE' }) },
    { group: t`Semnale`, text: t`Firmele în funcțiune fără bilanț`, to: (s) => base(s, { scope: { observedStatus: { in: [STATUS_ACTIVE] }, filing: 'NOT_FILED' }, metric: 'TURNOVER', panel: 'defalcare', dimension: 'COUNTY' }) },
    { group: t`Semnale`, text: t`Inactive fiscal, dar cu bilanț`, to: (s) => base(s, { scope: { fiscallyInactive: ['YES'], filing: 'FILED' }, metric: 'TURNOVER', panel: 'firme' }) },
    { group: t`Semnale`, text: t`Firmele cu pierderi, pe județe`, to: (s) => base(s, { scope: { financialRanges: [{ metric: 'NET_RESULT', max: '-0.01' }] }, metric: 'NET_RESULT', panel: 'defalcare', dimension: 'COUNTY' }) },
  ]
}

function QuestionsMenu({ page }: { readonly page: CompanyAnalyticsPageData }) {
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
                    page.move(question.to(page.state))
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

// ──────────────────────────────────────────────────────── the caveats ──

/** Every caveat behind one marker: an „i", amber with a count when something about this answer is off. */
function NotesMarker({ page }: { readonly page: CompanyAnalyticsPageData }) {
  const { live, question, stats, locale } = page
  if (!live || !question) return null
  const selected = stats.data?.metrics.find((aggregate) => aggregate.metric === question.metric)
  // Amber only when this answer is off: a year still filling, or more than 1% of its statements without a usable value.
  const warnings: string[] = []
  const notes: string[] = []
  if (partialYears(live).has(question.year)) warnings.push(t`${question.year} e incomplet: situațiile financiare încă se depun.`)
  if (selected) {
    const held = Number(heldOf(selected.coverage))
    const missing = Number(selected.coverage.missing)
    const statements = Number(selected.coverage.reported) + held + missing + Number(selected.coverage.notAdmitted)
    const gaps: string[] = []
    if (held > 0)
      gaps.push(
        plural(held, {
          one: 'O valoare reținută la verificare nu intră în sume.',
          few: '# valori reținute la verificare nu intră în sume.',
          other: '# de valori reținute la verificare nu intră în sume.',
        }),
      )
    if (missing > 0)
      gaps.push(
        plural(missing, {
          one: 'O situație nu are valoarea completată.',
          few: '# situații nu au valoarea completată.',
          other: '# de situații nu au valoarea completată.',
        }),
      )
    ;(statements > 0 && (held + missing) / statements > 0.01 ? warnings : notes).push(...gaps)
  }
  notes.push(
    t`Firmele sunt persoanele juridice din registrul comerțului (SRL, SA…), fără PFA, II sau IF.`,
    t`O valoare lipsă nu e zero: o firmă fără bilanț nu are cifre pentru acel an.`,
    t`Un 0 este valoarea numerică păstrată din sursă. Unele situații au câmpul gol într-o sursă și 0 în alta, așa că valorile din surse și ani diferiți nu sunt neapărat comparabile.`,
    ...companyAnalyticsCaveats(),
    t`Județul, localitatea, starea și forma juridică sunt cele din ${sourceEditionText(live.release, locale)}.`,
  )
  const count = warnings.length
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs tabular-nums sm:h-6 sm:min-h-0 sm:min-w-0',
          count > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label={count > 0 ? plural(count, { one: '# atenționare', few: '# atenționări', other: '# de atenționări' }) : t`Despre aceste cifre`}
      >
        {count > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {count > 0 ? count : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(70vh,var(--radix-popover-content-available-height))] w-[min(92vw,26rem)] space-y-2 overflow-y-auto text-sm">
        {warnings.map((warning) => (
          <p key={warning} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {warning}
          </p>
        ))}
        {notes.map((note) => (
          <p key={note} className="text-muted-foreground">
            {note}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  )
}
