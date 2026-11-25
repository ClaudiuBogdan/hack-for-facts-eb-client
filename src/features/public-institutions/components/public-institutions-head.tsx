import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, Check, ChevronDown, Link2, SlidersHorizontal, X } from 'lucide-react'
import { HeadlinePhrase } from '@/components/filters/filter-sheet/headline-phrase'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { defaultEntityAnalyticsFilter } from '@/lib/entity-analytics-query'
import { cn } from '@/lib/utils'
import { defaultYearRange } from '@/schemas/chart-defaults'
import type { PublicInstitutionsState } from '../hooks/use-public-institutions-page'
import { DETAILED_REPORT, PRINCIPAL_REPORT, yearPeriod } from '../lib/public-institutions-selection'
import { coverageText, readyQuestions } from '../lib/public-institutions-text'
import { FILTERS_BUTTON_ID } from '../lib/public-institutions-anchors'
import { MonoLabelGroup } from './public-institutions-parts'

/**
 * The head, in the analysis pages' language (`/companies/analytics`): the
 * way back and the data's reach, the selection as the headline in a room of
 * fixed height (its topic a phrase with a ✕), then the choices most readers
 * make — expenses or income, the year, total or per inhabitant, principal or
 * detailed reports — and the rest: every filter, the ready questions, the link.
 */

/** A control in the row: quiet words, a 44 px target on a phone. */
export const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
/** A dropdown in the row: a bordered value beside the quiet controls. */
export const CHOICE = 'h-9 w-auto gap-2 rounded-none border-foreground/25 bg-background px-3 text-sm shadow-none transition-colors hover:border-foreground/60 [&>svg]:opacity-70'

/** Two short values side by side, each as wide as its word; a value no option names (an older link's) presses none. */
export function Segments<K extends string>({ label, value, options, onChange }: { readonly label: string; readonly value: K | null; readonly options: readonly { readonly id: K; readonly text: ReactNode; readonly title?: string }[]; readonly onChange: (value: K) => void }) {
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

function YearChoice({ page }: { readonly page: PublicInstitutionsState }) {
  const years = Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, index) => String(defaultYearRange.end - index))
  const year = page.selection.year
  return (
    <Select value={year == null ? '' : String(year)} onValueChange={(value) => page.setFilter({ report_period: yearPeriod(Number(value), Number(value)) })}>
      <SelectTrigger aria-label={t`Anul`} className={CHOICE}>
        <span className="text-muted-foreground">{t`Anul`}:</span>
        <span className="max-w-[9rem] truncate font-semibold sm:max-w-[14rem]">
          <SelectValue placeholder={page.periodLabel || t`altă perioadă`} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {years.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
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

function FiltersButton({ page, onClick }: { readonly page: PublicInstitutionsState; readonly onClick: () => void }) {
  return (
    <button type="button" id={FILTERS_BUTTON_ID} onClick={onClick} className={LINK}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {page.chips.length > 0 ? <span className="ml-0.5 bg-foreground px-1.5 py-px text-xs tabular-nums text-background">{page.chips.length}</span> : null}
    </button>
  )
}

function QuestionsMenu({ page }: { readonly page: PublicInstitutionsState }) {
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
          <MonoLabelGroup key={group} label={group}>
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
                      report_type: page.filter.report_type ?? PRINCIPAL_REPORT,
                      ...question.filter,
                    })
                  }}
                  className="block min-h-9 w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {question.text}
                </button>
              ))}
          </MonoLabelGroup>
        ))}
      </PopoverContent>
    </Popover>
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

export function PublicInstitutionsHead({ page, onFilters }: { readonly page: PublicInstitutionsState; readonly onFilters: () => void }) {
  const { topic, coverage } = page
  const when = page.periodLabel ? `, ${t`în ${page.periodLabel}`}` : ''
  const reach = coverage && coverage.status !== 'pending' && coverage.status !== 'unknown' ? coverageText({ year: coverage.year, complete: coverage.status === 'complete', lastMonth: coverage.status === 'partial' ? coverage.lastMonth : null }, page.locale) : null
  const measure = page.selection.measure === 'other' ? null : page.selection.measure
  return (
    <section className="relative border-b" aria-labelledby="public-institutions-title">
      <TwoLayerLattice idPrefix="public-institutions" />
      <RuledFrame className="py-6 sm:py-10 lg:py-12">
        <CornerTicks />
        <div className="flex min-h-4 items-start justify-between gap-4">
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
          {reach ? (
            <p className="text-right text-xs leading-4 text-muted-foreground">
              <span className="inline-block first-letter:uppercase">{reach}</span>
              <span className="whitespace-nowrap"> · {t`ANAF`}</span>
            </p>
          ) : null}
        </div>
        <div className="mt-3 @container sm:mt-6">
          <div className={cn('flex flex-col justify-end', HEADLINE_ROOM)}>
            <h1 id="public-institutions-title" aria-label={page.sentence} className={cn(headlineSize(page.sentence.length), 'text-balance break-words font-extrabold leading-[1.02] tracking-tighter text-foreground')}>
              {page.subject}
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
            <span className="flex flex-wrap items-center gap-2">
              <Segments
                label={t`Cheltuieli sau venituri`}
                value={page.income ? 'vn' : 'ch'}
                options={[
                  { id: 'ch', text: t`Cheltuieli` },
                  { id: 'vn', text: t`Venituri` },
                ]}
                onChange={(value) => page.setFilter({ account_category: value })}
              />
              <YearChoice page={page} />
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Segments
                label={t`Cum se măsoară`}
                value={measure}
                options={[
                  { id: 'total', text: t`Total` },
                  { id: 'per_capita', text: t`Pe locuitor` },
                ]}
                onChange={(value) => page.setFilter({ normalization: value })}
              />
              <Segments
                label={t`Rapoartele`}
                value={page.reports === 'secondary' ? null : page.reports}
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
                onChange={(value) => page.setFilter({ report_type: value === 'detailed' ? DETAILED_REPORT : PRINCIPAL_REPORT })}
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
