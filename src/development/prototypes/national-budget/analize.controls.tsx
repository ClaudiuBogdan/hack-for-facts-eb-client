import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Check, ChevronDown, Info, Link2, SlidersHorizontal, TriangleAlert } from 'lucide-react'

import { CELL, Group, Row, SHEET_CLOSE, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import type { BudgetCatalog } from '@/schemas/national-budget-page'
import { coverageText } from './budget.format'
import { ANALYSIS_DEFAULTS, AXES, type AnalysisState, type Population } from './budget.state'
import { LEVELS, QUESTIONS, editionOfYear, populationLabel, questionGroupLabel, releaseMonthOf } from './analize.view'

/** The analysis page's controls, as the procurement analytics page has them: the period, the questions, the link, the caveats, the filters. */

const FIRST_YEAR = 2016

/** Whether a population can answer for a year in this data, and if not, in a word. */
export function yearAvailability(state: Pick<AnalysisState, 'tip'>, catalog: BudgetCatalog, year: number, anafYears: readonly number[]): string | null {
  if (state.tip === 'cheltuieli' || state.tip === 'venituri') {
    const month = releaseMonthOf(catalog, year)
    const entry = month ? catalog.releases.find((release) => release.periodEnd.startsWith(month)) : undefined
    if (!entry) return t`fără buletin`
    if (entry.status === 'gap') return t`buletin nepublicat`
    return entry.inSample ? null : t`în producție, nu în machetă`
  }
  if (state.tip === 'lege') {
    if (editionOfYear(catalog, year)) return null
    const pending = catalog.pendingEditions.find((item) => item.budgetYear === year)
    return pending ? (pending.reason === 'deployment_in_progress' ? t`legea se încarcă` : t`lege în așteptare`) : t`fără lege în date`
  }
  return anafYears.includes(year) ? null : t`fără date ANAF`
}

function yearsOf(catalog: BudgetCatalog): readonly number[] {
  const last = Math.max(...catalog.releases.map((release) => Number(release.periodEnd.slice(0, 4))))
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, index) => last - index)
}

export function YearMenu({
  state,
  catalog,
  anafYears,
  onChange,
}: {
  readonly state: AnalysisState
  readonly catalog: BudgetCatalog
  readonly anafYears: readonly number[]
  readonly onChange: (patch: Partial<AnalysisState>) => void
}) {
  const [open, setOpen] = useState(false)
  const month = state.tip === 'cheltuieli' || state.tip === 'venituri' ? releaseMonthOf(catalog, state.an) : null
  const label = month && !month.endsWith('-12') ? coverageText(month) : String(state.an)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex h-9 items-center gap-2 whitespace-nowrap border border-foreground/25 bg-background px-3 text-sm font-semibold tabular-nums transition-colors hover:border-foreground/60">
        {label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <MonoLabel className="block px-2 pt-1 text-muted-foreground">{t`Anul`}</MonoLabel>
        <div className="mt-1 grid grid-cols-4 gap-1 px-1">
          {yearsOf(catalog).map((year) => {
            const missing = yearAvailability(state, catalog, year, anafYears)
            return (
              <button
                key={year}
                type="button"
                title={missing ?? undefined}
                aria-label={missing ? `${year}: ${missing}` : String(year)}
                onClick={() => {
                  setOpen(false)
                  onChange({ an: year })
                }}
                className={cn('border px-1 py-1 text-sm tabular-nums hover:bg-muted', state.an === year && 'border-primary font-semibold', missing && 'text-muted-foreground/60')}
              >
                {year}
              </button>
            )
          })}
        </div>
        <p className="mt-2 px-2 pb-1 text-xs text-muted-foreground">{t`Anii estompați nu au date în această machetă; pagina spune de ce.`}</p>
      </PopoverContent>
    </Popover>
  )
}

export function QuestionsMenu({ onPick, className }: { readonly onPick: (patch: Partial<AnalysisState>) => void; readonly className?: string }) {
  const [open, setOpen] = useState(false)
  const groups = ['executie', 'lege', 'ministere'] as const
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={className}>
        {t`Întrebări`}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-[min(92vw,30rem)] space-y-4 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group}>
            <MonoLabel className="block text-muted-foreground">{questionGroupLabel(group)}</MonoLabel>
            <ul className="mt-2 space-y-1.5">
              {QUESTIONS.filter((question) => question.group === group).map((question) => (
                <li key={question.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      // A ready question starts from the defaults: no filter of the last one survives into it.
                      onPick({ ...ANALYSIS_DEFAULTS, dupa: AXES[question.state.tip ?? 'cheltuieli'][0], ...question.state })
                    }}
                    className="text-left text-sm leading-snug text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {question.text()}
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

export function ShareIcon({ className }: { readonly className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(window.location.href).then(() => {
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        })
      }
      className={className}
      aria-label={copied ? t`Copiat` : t`Copiază legătura`}
      title={copied ? t`Copiat` : t`Copiază legătura`}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
    </button>
  )
}

/** One marker for what a reader should know before the numbers: amber with a count when something is off, an „i" otherwise. */
export function NotesMarker({ alerts, facts }: { readonly alerts: readonly string[]; readonly facts: readonly string[] }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-1 text-xs tabular-nums sm:h-7 sm:min-h-0 sm:min-w-7',
          alerts.length > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground',
        )}
        aria-label={alerts.length > 0 ? t`${alerts.length} atenționări` : t`Despre aceste cifre`}
      >
        {alerts.length > 0 ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : <Info className="size-3.5" aria-hidden="true" />}
        {alerts.length > 0 ? alerts.length : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,26rem)] space-y-2 text-sm">
        {alerts.map((alert) => (
          <p key={alert} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {alert}
          </p>
        ))}
        {facts.map((fact) => (
          <p key={fact} className="text-muted-foreground">
            {fact}
          </p>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** The filters that differ from the defaults: the count on the „Filtre" button. */
export function filterCount(state: AnalysisState): number {
  let count = 0
  if (state.an !== ANALYSIS_DEFAULTS.an) count += 1
  if ((state.tip === 'cheltuieli' || state.tip === 'venituri') && state.buget !== ANALYSIS_DEFAULTS.buget) count += 1
  if (state.rand) count += 1
  if (state.tip === 'lege' && state.credite !== ANALYSIS_DEFAULTS.credite) count += 1
  return count
}

export function FiltersButton({ state, onClick, className }: { readonly state: AnalysisState; readonly onClick: () => void; readonly className?: string }) {
  const count = filterCount(state)
  return (
    <button type="button" onClick={onClick} className={className}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
    </button>
  )
}

const POPULATIONS: readonly Population[] = ['cheltuieli', 'venituri', 'lege', 'ministere']

/**
 * Every filter, in a sheet: from the right on a wide screen, from the bottom
 * on a phone, as the procurement analytics page's. A change applies at once
 * (the address is the state).
 */
export function FilterSheet({
  state,
  catalog,
  anafYears,
  onChange,
  open,
  onOpenChange,
}: {
  readonly state: AnalysisState
  readonly catalog: BudgetCatalog
  readonly anafYears: readonly number[]
  readonly onChange: (patch: Partial<AnalysisState>) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const active = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : '')
  const execution = state.tip === 'cheltuieli' || state.tip === 'venituri'
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        closeClassName={SHEET_CLOSE}
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {filterCount(state) > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{filterCount(state)}</span> : null}
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <Group title={t`Ce citești`}>
            <Row label="">
              <div className="grid grid-cols-2 gap-1.5">
                {POPULATIONS.map((tip) => (
                  <button key={tip} type="button" aria-pressed={state.tip === tip} onClick={() => onChange({ tip, dupa: AXES[tip][0], rand: null })} className={cn(CELL, active(state.tip === tip))}>
                    {populationLabel(tip)}
                  </button>
                ))}
              </div>
            </Row>
          </Group>
          <Group title={t`Când`}>
            <Row label={t`Anul`}>
              <div className="grid grid-cols-4 gap-1.5">
                {yearsOf(catalog).map((year) => {
                  const missing = yearAvailability(state, catalog, year, anafYears)
                  return (
                    <button
                      key={year}
                      type="button"
                      aria-pressed={state.an === year}
                      title={missing ?? undefined}
                      onClick={() => onChange({ an: year })}
                      className={cn(CELL, 'tabular-nums', active(state.an === year), missing && 'text-muted-foreground/60')}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </Row>
          </Group>
          {execution ? (
            <Group title={t`Ce buget`}>
              <Row label="">
                <div className="grid grid-cols-1 gap-1.5">
                  {(['consolidat', 'stat'] as const).map((buget) => (
                    <button key={buget} type="button" aria-pressed={state.buget === buget} onClick={() => onChange({ buget, masura: buget === 'stat' ? 'lei' : state.masura })} className={cn(CELL, 'text-left', active(state.buget === buget))}>
                      {buget === 'consolidat' ? t`Bugetul general consolidat (toate bugetele, fără transferurile dintre ele)` : t`Bugetul de stat`}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label={t`Nivelul`}>
                <div className="grid grid-cols-3 gap-1.5">
                  {LEVELS[state.tip === 'cheltuieli' ? 'cheltuieli' : 'venituri'].map((level) => (
                    <button key={level.key} type="button" aria-pressed={!state.rand && String(state.nivel) === level.key} onClick={() => onChange({ nivel: Number(level.key) as AnalysisState['nivel'], rand: null })} className={cn(CELL, active(!state.rand && String(state.nivel) === level.key))}>
                      {level.label()}
                    </button>
                  ))}
                </div>
              </Row>
            </Group>
          ) : null}
          {state.tip === 'lege' ? (
            <Group title={t`Legea`}>
              <Row label={t`Rândul`}>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['cheltuieli', 'venituri'] as const).map((linie) => (
                    <button key={linie} type="button" aria-pressed={state.linie === linie} onClick={() => onChange({ linie })} className={cn(CELL, active(state.linie === linie))}>
                      {linie === 'cheltuieli' ? t`Cheltuieli` : t`Venituri`}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label={t`Creditele`}>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['bugetare', 'angajament'] as const).map((credite) => (
                    <button key={credite} type="button" aria-pressed={state.credite === credite} onClick={() => onChange({ credite })} className={cn(CELL, active(state.credite === credite))}>
                      {credite === 'bugetare' ? t`Bugetare` : t`De angajament`}
                    </button>
                  ))}
                </div>
              </Row>
            </Group>
          ) : null}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={() => onChange({ ...ANALYSIS_DEFAULTS, tip: state.tip, dupa: state.dupa, demo: state.demo })}
            disabled={filterCount(state) === 0}
            className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}
          >
            {t`Șterge tot`}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(TALL, 'bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90')}>
            {t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
