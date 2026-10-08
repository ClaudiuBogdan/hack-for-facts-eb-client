import { useId, useState } from 'react'
import { i18n } from '@lingui/core'
import { plural, t } from '@lingui/core/macro'
import { Check, ChevronDown, Info, Link2, Plus, TriangleAlert } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { analysisUrl, COUNTY_CODES, COURTS, LEVEL_KEYS, MATTER_KEYS, sourceOf, YEARS, type Question } from '../../lib/analysis-model'
import { analysisNotes } from '../../lib/analysis-notes'
import { askedQuestion, QUESTION_GROUPS, QUESTIONS } from '../../lib/analysis-questions'
import { countyLabel, levelLabel, matterLabel, stageName, yearText } from '../../lib/analysis-text'
import { JUSTICE_LAST_CAPTURE_YEAR } from '../../lib/hub-years'
import { courtName } from '../../lib/judicial-labels'
import { STAGE_KEYS } from '../../lib/judicial-model'

/** The analysis head's controls: the year, the quick filter, the ready questions, the link, the caveats. */

type Change = (question: Question) => void

export const LINK = 'inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:min-h-0'
const TRIGGER = 'inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60'

/** The year: the capture's whole years and its part-year; the years before 2023 are the band's, never a question's. */
export function YearMenu({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [open, setOpen] = useState(false)
  const captionId = useId()
  const source = sourceOf(question)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={TRIGGER} aria-label={t`Anul: ${yearText(question.year, source)}`}>
        {yearText(question.year, source)}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2" aria-labelledby={captionId}>
        <MonoLabel id={captionId} className="block px-2 text-muted-foreground">
          {t`Anul datei dosarului`}
        </MonoLabel>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {YEARS.map((year) => (
            <button
              key={year}
              type="button"
              aria-pressed={year === question.year}
              onClick={() => {
                setOpen(false)
                onChange({ ...question, year })
              }}
              className={cn('min-h-11 border px-2 py-1.5 text-left text-sm tabular-nums hover:bg-muted sm:min-h-0', year === question.year && 'border-primary font-semibold', year === JUSTICE_LAST_CAPTURE_YEAR && 'col-span-2')}
            >
              {yearText(year, source)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** „+ Adaugă un filtru": one box over the matters, stages, levels, counties and courts — every name is the page's own, nothing is searched for. */
export function AddFilter({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
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
      <PopoverContent align="start" className="w-[min(92vw,24rem)] p-0" aria-label={t`Adaugă un filtru`}>
        <Command label={t`Adaugă un filtru`}>
          <CommandInput placeholder={t`Instanță, județ, materie, etapă…`} />
          <CommandList label={t`Filtre`} className="max-h-80">
            <CommandEmpty>{t`Nimic potrivit.`}</CommandEmpty>
            <CommandGroup heading={t`Materii`}>
              {MATTER_KEYS.filter((matter) => !question.matters.includes(matter)).map((matter) => (
                <CommandItem key={matter} value={`materie ${matterLabel(matter)}`} onSelect={() => pick({ ...question, matters: [...question.matters, matter] })}>
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
                <CommandItem key={county} value={`judet ${countyLabel(county)} ${county}`} onSelect={() => pick({ ...question, counties: [...question.counties, county] })}>
                  {countyLabel(county)}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t`Instanțe`}>
              {/* Within the counties picked, as the filters' panel offers them: a court outside them would match nothing. */}
              {[...COURTS.values()]
                .filter((court) => !question.courts.includes(court.code) && (question.counties.length === 0 || (court.county !== null && question.counties.includes(court.county))))
                .map(({ code }) => (
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

export function QuestionsMenu({ question, onChange }: { readonly question: Question; readonly onChange: Change }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={LINK}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-[min(92vw,26rem)] space-y-4 overflow-y-auto p-3" aria-label={t`Întrebări`}>
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

export function ShareIcon({ question }: { readonly question: Question }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void navigator.clipboard?.writeText(analysisUrl(question, window.location.origin)).then(() => {
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
export function NotesMarker({ question }: { readonly question: Question }) {
  const { warnings, notes } = analysisNotes(question)
  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs tabular-nums sm:min-h-6 sm:min-w-6', warnings.length > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground')}
        aria-label={warnings.length > 0 ? plural(warnings.length, { one: '# atenționare', other: '# atenționări' }) : t`Despre aceste cifre`}
      >
        {warnings.length > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {warnings.length > 0 ? warnings.length : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 text-sm" aria-label={t`Despre aceste cifre`}>
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
