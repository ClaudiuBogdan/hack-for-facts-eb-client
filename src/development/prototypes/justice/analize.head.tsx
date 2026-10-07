import { Fragment, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { i18n } from '@lingui/core'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, Check, ChevronDown, Info, Link2, Plus, SlidersHorizontal, TriangleAlert, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { courtName } from '@/features/justice/lib/judicial-labels'
import { STAGE_KEYS } from '@/features/justice/lib/judicial-model'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { Bone } from '@/features/procurement/components/home/home-chrome'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { cn } from '@/lib/utils'
import { countText, dayText, percentText } from '@/features/justice/lib/judicial-format'
import { JUSTICE_LAST_CAPTURE_YEAR } from '@/features/justice/lib/hub-years'
import { useFigures, useLevelCounts } from './analize.data'
import { askedQuestion, changeOf, COUNTY_CODES, COURTS, filterCount, LEVEL_KEYS, MATTER_KEYS, QUESTION_GROUPS, QUESTIONS, topShare, toggled, YEARS, type LevelKey, type Question } from './analize.model'
import { analysisNotes, ASOF, lastMonthText } from './analize.notes'
import { countyLabel, headlineOf, headlineText, levelLabel, matterLabel, rowLabel, stageName, unsaidChips, type PhraseRole } from './analize.text'

/**
 * The analysis page's head, on the procurement analysis's grid: the way
 * back, the year and how recent its data is; the question as the headline
 * (a filter's phrase opens the panel, its ✕ drops it); what adds to the
 * question and the caveats' marker — then the levels in the pinned bar and
 * the figures band.
 */

const PHRASE = 'text-left underline decoration-muted-foreground/35 decoration-dotted decoration-2 underline-offset-[0.18em] transition-colors hover:decoration-foreground'
const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
const TRIGGER = 'inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60'

type Change = (question: Question) => void

function without(question: Question, role: PhraseRole): Question {
  switch (role) {
    case 'matters':
      return { ...question, matters: [] }
    case 'stages':
      return { ...question, stages: [] }
    case 'levels':
      return { ...question, levels: [] }
    case 'counties':
      return { ...question, counties: [] }
    case 'courts':
      return { ...question, courts: [] }
    default:
      return question
  }
}

function headlineSize(text: string): string {
  if (text.length <= 36) return 'text-4xl sm:text-6xl'
  if (text.length <= 72) return 'text-3xl sm:text-5xl'
  return 'text-2xl sm:text-4xl'
}

/** The year: the capture's whole years and its part-year; the years before 2023 are the band's, never a question's. */
function YearMenu({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [open, setOpen] = useState(false)
  const yearText = (year: number) => (year === JUSTICE_LAST_CAPTURE_YEAR ? t`${year} (până în ${lastMonthText()})` : String(year))
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TRIGGER}>
        {yearText(question.year)}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <MonoLabel className="block px-2 text-muted-foreground">{t`Anul datei dosarului`}</MonoLabel>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {YEARS.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setOpen(false)
                onChange({ ...question, year })
              }}
              className={cn('border px-2 py-1.5 text-left text-sm tabular-nums hover:bg-muted', year === question.year && 'border-primary font-semibold', year === JUSTICE_LAST_CAPTURE_YEAR && 'col-span-2')}
            >
              {yearText(year)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** „+ Adaugă un filtru": one box over the courts, counties, matters, stages and levels — every name is the page's own. */
function AddFilter({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [open, setOpen] = useState(false)
  const pick = (next: Question) => {
    setOpen(false)
    onChange(next)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={LINK}>
        <Plus className="size-3.5" aria-hidden="true" />
        {t`Adaugă un filtru`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,24rem)] p-0">
        <Command>
          <CommandInput placeholder={t`Instanță, județ, materie, etapă…`} />
          <CommandList className="max-h-80">
            <CommandEmpty>{t`Nimic potrivit.`}</CommandEmpty>
            <CommandGroup heading={t`Materii`}>
              {MATTER_KEYS.filter((matter) => !question.matters.includes(matter)).map((matter) => (
                <CommandItem
                  key={matter}
                  value={`materie ${matterLabel(matter)}`}
                  onSelect={() =>
                    pick({
                      ...question,
                      matters: [...question.matters, matter],
                    })
                  }
                >
                  {matterLabel(matter)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t`Etape`}>
              {STAGE_KEYS.filter((stage) => !question.stages.includes(stage)).map((stage) => (
                <CommandItem key={stage} value={`etapa ${stageName(stage)}`} onSelect={() => pick({ ...question, stages: [...question.stages, stage] })}>
                  {stageName(stage)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t`Niveluri`}>
              {LEVEL_KEYS.filter((level) => !question.levels.includes(level)).map((level) => (
                <CommandItem key={level} value={`nivel ${levelLabel(level)}`} onSelect={() => pick({ ...question, levels: [...question.levels, level] })}>
                  {levelLabel(level)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t`Județe`}>
              {COUNTY_CODES.filter((county) => !question.counties.includes(county)).map((county) => (
                <CommandItem
                  key={county}
                  value={`judet ${countyLabel(county)} ${county}`}
                  onSelect={() =>
                    pick({
                      ...question,
                      counties: [...question.counties, county],
                    })
                  }
                >
                  {countyLabel(county)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t`Instanțe`}>
              {[...COURTS.keys()]
                .filter((code) => !question.courts.includes(code))
                .map((code) => (
                  <CommandItem key={code} value={`instanta ${courtName(code)}`} onSelect={() => pick({ ...question, courts: [...question.courts, code] })}>
                    {courtName(code)}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function QuestionsMenu({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={LINK}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-[min(92vw,26rem)] space-y-4 overflow-y-auto p-3">
        {QUESTION_GROUPS.map((group) => (
          <div key={group.id}>
            <MonoLabel className="block text-muted-foreground">{i18n._(group.title)}</MonoLabel>
            <ul className="mt-2 space-y-1.5">
              {QUESTIONS.filter((item) => item.group === group.id).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onChange(askedQuestion(question, item))
                    }}
                    className="text-left text-sm leading-snug text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {i18n._(item.text)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function ShareIcon() {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  return (
    <button type="button" onClick={copy} className={cn(LINK, 'size-11 justify-center sm:size-auto')} aria-label={copied ? t`Copiat` : t`Copiază legătura`} title={copied ? t`Copiat` : t`Copiază legătura`}>
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

/** One marker for what a reader should know before the numbers: amber with a count when something is off, an „i" otherwise. */
function NotesMarker({ question }: { readonly question: Question }) {
  const { warnings, notes } = analysisNotes(question)
  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-flex h-6 items-center gap-1 px-1 text-xs tabular-nums', warnings.length > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground')}
        aria-label={warnings.length > 0 ? t`${warnings.length} atenționări` : t`Despre aceste cifre`}
      >
        {warnings.length > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {warnings.length > 0 ? warnings.length : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 text-sm">
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

export function AnalyzeHead({ question, onChange, onFilters }: { readonly question: Question; readonly onChange: Change; readonly onFilters: () => void }) {
  const phrases = headlineOf(question)
  const chips = unsaidChips(question)
  const count = filterCount(question)
  const fresh = t`Date până la ${dayText(ASOF)}`
  return (
    <section className="relative border-b" aria-labelledby="justice-analysis-title">
      <TwoLayerLattice idPrefix="justice-analysis-head" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/justice" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Justiție`}</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{t`Analize`}</span>
            </span>
          </MonoLabel>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span>
            <span className="flex items-center gap-2">
              <MonoLabel className="sr-only text-muted-foreground sm:not-sr-only">{t`Anul`}</MonoLabel>
              <YearMenu question={question} onChange={onChange} />
            </span>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p>
        <h1 id="justice-analysis-title" className={cn('mt-6 max-w-5xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-8', headlineSize(headlineText(question)))}>
          {phrases.map((phrase, index) => {
            // A comma belongs to the phrase before it: on a phone, where the ✕ is inline, it never starts a line.
            const comma = phrases[index + 1]?.before.startsWith(',') ? ',' : ''
            return (
              <Fragment key={phrase.role}>
                {phrase.before.replace(/^,/u, '')}
                {phrase.role === 'base' || phrase.role === 'dupa' ? (
                  <span>
                    {phrase.text}
                    {comma}
                  </span>
                ) : (
                  <span className="group/phrase relative">
                    <button type="button" onClick={onFilters} className={PHRASE}>
                      {phrase.text}
                    </button>
                    {/* The comma and the ✕ on one line: on a phone the ✕ never starts the next. */}
                    <span className="whitespace-nowrap">
                      {comma}
                      <button
                        type="button"
                        onClick={() => onChange(without(question, phrase.role))}
                        aria-label={t`Scoate „${phrase.text}"`}
                        className="ml-0.5 inline-flex size-[0.7em] items-center justify-center align-[0.05em] text-muted-foreground/70 transition-opacity hover:text-foreground focus-visible:opacity-100 sm:absolute sm:-right-[0.5em] sm:-top-[0.1em] sm:ml-0 sm:size-[0.5em] sm:bg-background sm:opacity-0 sm:group-hover/phrase:opacity-100"
                      >
                        <X className="size-[0.55em] sm:size-full" aria-hidden="true" />
                      </button>
                    </span>
                  </span>
                )}
              </Fragment>
            )
          })}
        </h1>
        {chips.length > 0 ? (
          <p className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span key={`${chip.role}-${chip.key}`} className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 text-sm">
                {chip.label}
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      chip.role === 'levels'
                        ? {
                            ...question,
                            levels: toggled(question.levels, chip.key as LevelKey),
                          }
                        : {
                            ...question,
                            counties: toggled(question.counties, chip.key),
                          },
                    )
                  }
                  aria-label={t`Scoate ${chip.label}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1">
          <AddFilter question={question} onChange={onChange} />
          <button type="button" onClick={onFilters} className={LINK}>
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            {t`Filtre`}
            {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
          </button>
          <QuestionsMenu question={question} onChange={onChange} />
          <ShareIcon />
          <NotesMarker question={question} />
        </div>
        {/* The crux on the head's bottom rule, where the bar begins; above the bar, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────── the bar ──

type LevelTab = LevelKey | 'toate'

/**
 * The levels in the pinned bar, each with its count for the question's other
 * filters: the population the question reads, as procurement's bar picks
 * its records. A level picked in the panel among others is „several": no
 * tab is pressed then.
 */
export function LevelNav({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const counts = useLevelCounts(question)
  const tabs: readonly LevelTab[] = ['toate', ...LEVEL_KEYS]
  const pressed = (tab: LevelTab) => (tab === 'toate' ? question.levels.length === 0 : question.levels.length === 1 && question.levels[0] === tab)
  const countOf = (tab: LevelTab) => (counts.data ? (tab === 'toate' ? [...counts.data.values()].reduce((sum, count) => sum + count, 0) : (counts.data.get(tab) ?? 0)) : undefined)
  return (
    <nav aria-label={t`Ce instanțe`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground lg:block lg:max-w-sm">{headlineText(question)}</span>
        <ol className="grid w-full grid-cols-3 gap-x-3 sm:flex sm:w-auto sm:shrink-0 sm:gap-5 lg:ml-auto">
          {tabs.map((tab) => {
            const active = pressed(tab)
            const count = countOf(tab)
            return (
              <li key={tab}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      ...question,
                      levels: tab === 'toate' ? [] : [tab],
                    })
                  }
                  className={cn(
                    'flex h-full min-h-11 w-full flex-col justify-center border-b-2 py-2 text-left text-sm leading-tight transition-colors sm:w-auto',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{tab === 'toate' ? t`Toate` : levelLabel(tab)}</span>
                  <span className="flex h-4 items-center text-xs tabular-nums text-muted-foreground">{count === undefined ? <Bone className="w-12" /> : countText(count)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}

// ──────────────────────────────────────────────────────────── figures ──

/** The year's figures: the cases and their change on the year before, the courts, the five busiest courts' share, the largest matter's. */
export function AnalyzeFigures({ question }: { readonly question: Question }) {
  const { i18n: lingui } = useLingui()
  const figures = useFigures(question)
  const data = figures.data
  const plain = (label: React.ReactNode, className: string) => <span className={className}>{label}</span>
  const facts: HubFact[] = []
  if (data) {
    const change = changeOf(data.total, data.totalBefore)
    facts.push({
      key: 'dosare',
      value: data.total,
      digits: 0,
      label: t`Dosare`,
      note: change !== null ? t`${change >= 0 ? '+' : '−'}${percentText(Math.abs(change))} față de ${question.year - 1}` : question.year === JUSTICE_LAST_CAPTURE_YEAR ? t`până în ${lastMonthText()}` : null,
      link: plain,
    })
    facts.push({
      key: 'instante',
      value: data.courts.size,
      digits: 0,
      label: t`Instanțe`,
      note: null,
      link: plain,
    })
    const top5 = topShare(data.courts, data.total)
    if (top5 !== null)
      facts.push({
        key: 'top5',
        value: top5 * 100,
        digits: top5 < 0.1 ? 1 : 0,
        unit: '%',
        label: t`Top 5 instanțe, din dosare`,
        note: null,
        link: plain,
      })
    const [first] = [...data.matters.entries()].sort((a, b) => b[1] - a[1])
    if (first && data.matters.size > 1 && data.total > 0) {
      const share = first[1] / data.total
      facts.push({
        key: 'materie',
        value: share * 100,
        digits: share < 0.1 ? 1 : 0,
        unit: '%',
        label: t`${rowLabel('materii', first[0]).label}, din dosare`,
        note: null,
        link: plain,
      })
    }
  }
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {figures.isError ? (
          <div className="py-6">
            <HubLoadError onRetry={figures.retry} />
          </div>
        ) : facts.length === 0 ? (
          <div className="h-32 animate-pulse" aria-hidden="true" />
        ) : (
          <HubFiguresBand facts={facts} locale={lingui.locale === 'en' ? 'en' : 'ro'} />
        )}
      </RuledFrame>
    </section>
  )
}
