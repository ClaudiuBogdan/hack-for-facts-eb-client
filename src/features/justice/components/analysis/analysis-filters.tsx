import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Check } from 'lucide-react'
import { keepEscapeForOpenList } from '@/components/filters/filter-sheet/filter-sheet-focus'
import { Announce, CELL, Chip, FIELD, Group, Notice, OPTION, Options, Row, SHEET_CLOSE, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { useActiveOption } from '@/components/filters/filter-sheet/use-active-option'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { placeKey } from '@/features/procurement/lib/analytics-places'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { useAnalysisFigures } from '../../hooks/use-justice-analysis'
import { COUNTY_CODES, COURTS, DEFAULT_QUESTION, filterCount, LEVEL_KEYS, MATTER_KEYS, toggled, type LevelKey, type MatterKey, type Question } from '../../lib/analysis-model'
import { countyLabel, levelLabel, matterLabel, stageName } from '../../lib/analysis-text'
import { casesCount, courtName } from '../../lib/judicial-labels'
import { STAGE_KEYS, type StageKey } from '../../lib/judicial-model'

/**
 * Every filter the question takes, in one panel, in a sheet: from the right
 * on a wide screen, from the bottom on a phone. Where (counties, courts),
 * what (matters), at which step (levels, stages); a change applies at once
 * (the address is the question). OR within a field, AND across fields.
 * Lists of more than four values are one column, a list past eight has a
 * search, and a pick moves nothing above or under it (the owner, 3 October
 * 2026).
 */

type Change = (question: Question) => void

/** A value of a list, pressed or not: one weight either way, a check when pressed, so a pick moves nothing. */
function Toggle({ pressed, onClick, children }: { readonly pressed: boolean; readonly onClick: () => void; readonly children: ReactNode }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn(CELL, 'flex w-full items-center justify-between gap-2 text-left leading-tight', pressed && 'border-primary bg-primary/5')}>
      <span className="min-w-0">{children}</span>
      <Check className={cn('size-3.5 shrink-0 text-primary', !pressed && 'invisible')} aria-hidden="true" />
    </button>
  )
}

function nothingFor(term: string): string {
  return t`Nimic pentru „${term}".`
}

/**
 * A field's values in one column; past eight, a search over them (there from
 * the start, so nothing moves when the list fills) and a scrolled list. A
 * pick keeps its place: the order is the list's own.
 */
function CheckList({ label, items, values, onToggle }: { readonly label: string; readonly items: readonly { readonly id: string; readonly label: string }[]; readonly values: readonly string[]; readonly onToggle: (id: string) => void }) {
  const [term, setTerm] = useState('')
  const searchable = items.length > 8
  const key = placeKey(term)
  const shown = key.length === 0 ? items : items.filter((item) => placeKey(item.label).includes(key))
  return (
    <div className="space-y-1.5">
      {searchable ? <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t`Caută`} aria-label={t`Caută în ${label}`} className={FIELD} /> : null}
      <div className={cn('space-y-1', searchable && 'max-h-80 overflow-y-auto')}>
        {shown.map((item) => (
          <Toggle key={item.id} pressed={values.includes(item.id)} onClick={() => onToggle(item.id)}>
            {item.label}
          </Toggle>
        ))}
        {shown.length === 0 ? <Notice kind="empty">{nothingFor(term.trim())}</Notice> : null}
      </div>
    </div>
  )
}

/** A search field with its list under it: the arrow keys over the options, Enter the first, Escape clears. */
function PickField({
  label,
  placeholder,
  options,
  onPick,
}: {
  readonly label: string
  readonly placeholder: string
  /** Every option the field can find, by id; the field filters them by what is typed. */
  readonly options: readonly { readonly id: string; readonly title: string; readonly sub?: string | null }[]
  readonly onPick: (id: string) => void
}) {
  const [term, setTerm] = useState('')
  const key = placeKey(term)
  const found = key.length === 0 ? [] : options.filter((option) => placeKey(option.title).includes(key) || option.id.toLowerCase() === key).slice(0, 30)
  const open = key.length > 0
  const keys = useActiveOption(open ? found.map((option) => option.id) : [])
  const pick = (id: string) => {
    setTerm('')
    onPick(id)
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (found[0]) pick(found[0].id)
      }}
    >
      <input
        {...keys.input(open)}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setTerm('')
          else keys.onKeyDown(event, (position) => pick(found[position]!.id))
        }}
        placeholder={placeholder}
        aria-label={label}
        className={FIELD}
      />
      {open ? (
        <Options id={keys.listId} label={label} notices={found.length === 0 ? <Notice kind="empty">{nothingFor(term.trim())}</Notice> : null}>
          {found.map((option, index) => (
            <button key={option.id} type="button" {...keys.option(index)} onClick={() => pick(option.id)} className={OPTION}>
              <span className="min-w-0 truncate">{option.title}</span>
              {option.sub ? <span className="shrink-0 text-xs text-muted-foreground">{option.sub}</span> : null}
            </button>
          ))}
        </Options>
      ) : null}
      <Announce text={open && found.length === 0 ? nothingFor(term.trim()) : ''} />
    </form>
  )
}

export function AnalysisFilters({ question, open, onOpenChange, onChange }: { readonly question: Question; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly onChange: Change }) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const count = filterCount(question)
  const figures = useAnalysisFigures(question)
  // Courts within the counties picked, when there are some.
  const courtOptions = [...COURTS.values()]
    .filter((court) => !question.courts.includes(court.code) && (question.counties.length === 0 || (court.county !== null && question.counties.includes(court.county))))
    .map((court) => ({ id: court.code, title: courtName(court.code), sub: court.county ? countyLabel(court.county) : null }))
  const countyOptions = COUNTY_CODES.filter((code) => !question.counties.includes(code)).map((code) => ({ id: code, title: countyLabel(code), sub: code }))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        onEscapeKeyDown={keepEscapeForOpenList}
        closeClassName={SHEET_CLOSE}
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
        </div>
        <div className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto px-4 py-4">
          <Group title={t`Unde`}>
            <Row label={t`Județ`}>
              {question.counties.map((code) => (
                <Chip key={code} label={countyLabel(code)} onClear={() => onChange({ ...question, counties: toggled(question.counties, code) })} />
              ))}
              <PickField label={t`Adaugă un județ`} placeholder={t`„Cluj", „IS"`} options={countyOptions} onPick={(code) => onChange({ ...question, counties: [...question.counties, code] })} />
            </Row>
            <Row label={t`Instanță`}>
              {question.courts.map((code) => (
                <Chip key={code} label={courtName(code)} onClear={() => onChange({ ...question, courts: toggled(question.courts, code) })} />
              ))}
              <PickField label={t`Adaugă o instanță`} placeholder={t`„Tribunalul Cluj", „Sectorul 1"`} options={courtOptions} onPick={(code) => onChange({ ...question, courts: [...question.courts, code] })} />
            </Row>
          </Group>
          <Group title={t`Ce se judecă`}>
            <Row label={t`Materie`}>
              <CheckList label={t`Materie`} items={MATTER_KEYS.map((matter) => ({ id: matter, label: matterLabel(matter) }))} values={question.matters} onToggle={(id) => onChange({ ...question, matters: toggled(question.matters, id as MatterKey) })} />
            </Row>
          </Group>
          <Group title={t`Pe ce treaptă`}>
            <Row label={t`Nivel`}>
              <CheckList label={t`Nivel`} items={LEVEL_KEYS.map((level) => ({ id: level, label: levelLabel(level) }))} values={question.levels} onToggle={(id) => onChange({ ...question, levels: toggled(question.levels, id as LevelKey) })} />
            </Row>
            <Row label={t`Etapă`}>
              <CheckList label={t`Etapă`} items={STAGE_KEYS.map((stage) => ({ id: stage, label: stageName(stage) }))} values={question.stages} onToggle={(id) => onChange({ ...question, stages: toggled(question.stages, id as StageKey) })} />
            </Row>
          </Group>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_QUESTION, year: question.year, dupa: question.dupa, masura: question.masura })}
            disabled={count === 0}
            className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}
          >
            {t`Șterge tot`}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(TALL, 'bg-primary px-3 text-sm font-medium tabular-nums text-primary-foreground hover:bg-primary/90')}>
            {figures.data ? t`Arată ${casesCount(figures.data.total)}` : t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
