import { useState, type ReactNode } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Announce, CELL, Chip, FIELD, Notice, OPTION, Options, Row, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { useActiveOption } from '@/components/filters/filter-sheet/use-active-option'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { placeKey, searchPlaces } from '@/features/procurement/lib/analytics-places'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import {
  COMPANY_ANALYSIS_FLAG_VALUES,
  COMPANY_ANALYSIS_SIZE_BANDS,
  companyMetricUnit,
  type CompanyAnalysisFlagValue,
  type CompanyAnalysisMetric,
  type CompanyAnalysisRangeInput,
  type CompanyAnalysisScope,
} from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisOptions } from '../../hooks/use-company-analytics'
import { useCompanyNameSuggestions } from '../../hooks/use-company-name-suggestions'
import type { UatIndex } from '../../hooks/use-uat-index'
import { boundOf, keyToggled, toggled } from '../../lib/company-analytics-filter-model'
import { localeOf } from '../../lib/company-analytics-format'
import { rangeText } from '../../lib/company-analytics-scope-text'
import { caenBasisLabel, countyLabel, flagLabel, metricLabel, sizeBandLabel } from '../../lib/company-analytics-text'
import { caenToken } from '../../lib/company-analytics-url'

/**
 * The filters panel's fields. Each writes the scope at once (the address is
 * the state): OR within a field, AND across fields, a field's unknown group
 * named as its own value. Only what the API reads exactly is offered — no
 * search over company names that would pass the search's first hits off as
 * every matching company.
 */

type ScopeChange = (scope: CompanyAnalysisScope) => void

const PRESSED = 'border-primary bg-primary/5 font-semibold'

function Toggle({ pressed, onClick, children, className }: { readonly pressed: boolean; readonly onClick: () => void; readonly children: ReactNode; readonly className?: string }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={cn(CELL, 'text-left leading-tight', pressed && PRESSED, className)}>
      {children}
    </button>
  )
}

/** What an empty list says, in the procurement filters' own words. */
function nothingFor(term: string): string {
  return t`Nimic pentru „${term}".`
}

/** A search field with its list: the arrow keys over the options, Enter the first, Escape clears. */
function PickField({
  label,
  placeholder,
  term,
  onTerm,
  options,
  state,
  onPick,
  onRetry,
}: {
  readonly label: string
  readonly placeholder: string
  readonly term: string
  readonly onTerm: (term: string) => void
  readonly options: readonly { readonly id: string; readonly title: string; readonly sub?: string | null }[]
  readonly state: 'idle' | 'loading' | 'error' | 'results'
  readonly onPick: (id: string) => void
  readonly onRetry?: () => void
}) {
  const open = state !== 'idle'
  const keys = useActiveOption(open && state === 'results' ? options.map((option) => option.id) : [])
  const nothing = state === 'results' && options.length === 0
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const first = options[0]
        if (state === 'results' && first) onPick(first.id)
      }}
    >
      <input
        {...keys.input(open)}
        value={term}
        onChange={(event) => onTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onTerm('')
          else keys.onKeyDown(event, (position) => onPick(options[position]!.id))
        }}
        placeholder={placeholder}
        aria-label={label}
        className={FIELD}
      />
      {open ? (
        <Options
          id={keys.listId}
          label={label}
          notices={
            state === 'loading' ? (
              <Notice kind="loading">{t`Se caută…`}</Notice>
            ) : state === 'error' ? (
              <Notice kind="failed" onRetry={onRetry}>
                {t`Căutarea nu a mers.`}
              </Notice>
            ) : nothing ? (
              <Notice kind="empty">{nothingFor(term.trim())}</Notice>
            ) : null
          }
        >
          {state === 'results'
            ? options.map((option, index) => (
                <button key={option.id} type="button" {...keys.option(index)} onClick={() => onPick(option.id)} className={OPTION}>
                  <span className="min-w-0 truncate">{option.title}</span>
                  {option.sub ? <span className="shrink-0 font-mono text-xs text-muted-foreground">{option.sub}</span> : null}
                </button>
              ))
            : null}
        </Options>
      ) : null}
      <Announce text={state === 'loading' ? t`Se caută…` : nothing ? nothingFor(term.trim()) : ''} />
    </form>
  )
}

// ──────────────────────────────────────────────────────────── companies ──

const CUI_TYPED = /^(?:ro)?\s*([1-9]\d{1,9})$/iu

/**
 * Companies picked one by one: a name finds a company to add, a CUI is
 * taken as typed. The search's hits are suggestions to pick from — never the
 * set of every company whose name holds the words.
 */
export function CompanyField({ scope, max, onChange }: { readonly scope: CompanyAnalysisScope; readonly max: number; readonly onChange: ScopeChange }) {
  const [term, setTerm] = useState('')
  const [named, setNamed] = useState<ReadonlyMap<string, string>>(new Map())
  const suggestions = useCompanyNameSuggestions(term)
  const typed = CUI_TYPED.exec(term.trim())?.[1] ?? null
  const cuis = scope.cuis ?? []
  const hits = (suggestions.data ?? []).flatMap((hit) => (hit.cui ? [{ id: hit.cui, title: hit.label, sub: `CUI ${hit.cui}` }] : []))
  const options = [...(typed ? [{ id: typed, title: t`CUI ${typed}`, sub: null }] : []), ...hits.filter((hit) => hit.id !== typed)].filter((option) => !cuis.includes(option.id))
  const asked = term.trim().length >= 2
  const state = !asked && !typed ? 'idle' : suggestions.isError && !typed ? 'error' : suggestions.isFetching && options.length === 0 ? 'loading' : 'results'
  const pick = (cui: string) => {
    const title = options.find((option) => option.id === cui)?.title
    if (title) setNamed(new Map([...named, [cui, title]]))
    setTerm('')
    if (!cuis.includes(cui) && cuis.length < max) onChange({ ...scope, cuis: [...cuis, cui] })
  }
  return (
    <Row label={t`Firme`}>
      {cuis.map((cui) => (
        <Chip key={cui} label={named.get(cui) ? `${named.get(cui)} · ${cui}` : t`CUI ${cui}`} onClear={() => onChange({ ...scope, cuis: toggled(cuis, cui) })} />
      ))}
      {cuis.length < max ? <PickField label={t`Adaugă o firmă`} placeholder={t`Nume sau CUI`} term={term} onTerm={setTerm} options={options} state={state} onPick={pick} onRetry={() => void suggestions.refetch()} /> : null}
      <p className="text-xs text-muted-foreground">{t`Alegi firme anume, una câte una (cel mult ${max}). Căutarea după nume nu filtrează toate firmele al căror nume conține cuvintele.`}</p>
    </Row>
  )
}

// ──────────────────────────────────────────────────────────────── where ──

export function CountyField({ scope, onChange }: { readonly scope: CompanyAnalysisScope; readonly onChange: ScopeChange }) {
  const [term, setTerm] = useState('')
  const selected = scope.county?.in ?? []
  const key = placeKey(term)
  const options = key.length === 0 ? [] : ROMANIA_COUNTIES.filter((county) => !selected.includes(county.code) && (placeKey(county.nameRo).includes(key) || county.code.toLowerCase() === key)).map((county) => ({ id: county.code, title: county.nameRo, sub: county.code }))
  return (
    <Row label={t`Județ`}>
      {selected.map((code) => (
        <Chip key={code} label={countyLabel(code)} onClear={() => onChange({ ...scope, county: keyToggled(scope.county, code) })} />
      ))}
      <PickField label={t`Adaugă un județ`} placeholder={t`„Cluj", „IS"`} term={term} onTerm={setTerm} options={options} state={key.length === 0 ? 'idle' : 'results'} onPick={(code) => {
        setTerm('')
        onChange({ ...scope, county: keyToggled(scope.county, code) })
      }} />
      <Toggle pressed={Boolean(scope.county?.includeUnknown)} onClick={() => onChange({ ...scope, county: keyToggled(scope.county, null) })} className="w-full">
        {t`Și firmele cu județul necunoscut`}
      </Toggle>
    </Row>
  )
}

export function UatField({ scope, uats, onChange }: { readonly scope: CompanyAnalysisScope; readonly uats: UatIndex; readonly onChange: ScopeChange }) {
  const [term, setTerm] = useState('')
  const selected = scope.uat?.in ?? []
  const counties = scope.county?.in ?? []
  const asked = placeKey(term).length >= 2
  // Within the one county picked, when there is one.
  const found = asked && uats.localities ? searchPlaces(uats.index, term, { region: null, county: counties.length === 1 ? (counties[0] ?? null) : null }, 8).localities : []
  const options = found.filter((place) => !selected.includes(place.value)).map((place) => ({ id: place.value, title: place.name, sub: place.county ? countyLabel(place.county) : null }))
  const state = !asked ? 'idle' : uats.failed ? 'error' : uats.loading ? 'loading' : 'results'
  return (
    <Row label={t`Localitate`}>
      {selected.map((code) => (
        <Chip key={code} label={uats.names.get(code) ?? t`SIRUTA ${code}`} onClear={() => onChange({ ...scope, uat: keyToggled(scope.uat, code) })} />
      ))}
      <PickField label={t`Adaugă o localitate`} placeholder={t`„Sibiu", „Florești"`} term={term} onTerm={setTerm} options={options} state={state} onRetry={uats.retry} onPick={(code) => {
        setTerm('')
        onChange({ ...scope, uat: keyToggled(scope.uat, code) })
      }} />
      <Toggle pressed={Boolean(scope.uat?.includeUnknown)} onClick={() => onChange({ ...scope, uat: keyToggled(scope.uat, null) })} className="w-full">
        {t`Și firmele cu sediul neidentificat`}
      </Toggle>
    </Row>
  )
}

// ───────────────────────────────────────────────────────────────── what ──

/** Codes from the year's own population (legal forms, observed statuses), the most common first. */
export function CodesField({
  label,
  dimension,
  question,
  open,
  values,
  unknown,
  onToggle,
  onUnknown,
}: {
  readonly label: string
  readonly dimension: 'LEGAL_FORM' | 'OBSERVED_STATUS'
  readonly question: ResolvedQuestion | null
  readonly open: boolean
  readonly values: readonly string[]
  readonly unknown?: boolean
  readonly onToggle: (code: string) => void
  readonly onUnknown?: () => void
}) {
  const options = useCompanyAnalysisOptions(question, dimension, open)
  const groups = options.data?.groups ?? []
  const codes = [...new Set([...groups.map((group) => group.key ?? ''), ...values])].filter(Boolean)
  const labelOf = (code: string) => {
    const group = groups.find((item) => item.key === code)
    return group?.label ? `${group.label}` : code
  }
  return (
    <Row label={label}>
      {options.isError ? (
        <Notice kind="failed" onRetry={() => void options.refetch()}>
          {t`Lista nu s-a putut citi.`}
        </Notice>
      ) : options.isPending && values.length === 0 ? (
        <Notice kind="loading">{t`Se citește lista…`}</Notice>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5">
        {codes.map((code) => (
          <Toggle key={code} pressed={values.includes(code)} onClick={() => onToggle(code)}>
            {labelOf(code)}
          </Toggle>
        ))}
        {onUnknown ? (
          <Toggle pressed={Boolean(unknown)} onClick={onUnknown}>
            {t`Necunoscută`}
          </Toggle>
        ) : null}
      </div>
    </Row>
  )
}

const CAEN_TYPED = /^(?:([A-Za-z0-9._-]{1,16}):)?([A-Za-z0-9.]{1,12})$/u

/** Main activity codes as ANAF published them: a code alone matches an unpublished revision, never a guessed one. */
export function CaenField({ scope, max, onChange }: { readonly scope: CompanyAnalysisScope; readonly max: number; readonly onChange: ScopeChange }) {
  const [text, setText] = useState('')
  const selectors = scope.mainCaen ?? []
  const add = () => {
    const match = CAEN_TYPED.exec(text.trim())
    if (!match?.[2] || selectors.length >= max) return
    const selector = match[1] ? { code: match[2], revision: match[1] } : { code: match[2] }
    setText('')
    if (!selectors.some((item) => caenToken(item) === caenToken(selector))) onChange({ ...scope, mainCaen: [...selectors, selector] })
  }
  return (
    <>
      <Row label={t`CAEN principal`}>
        {selectors.map((selector) => (
          <Chip key={caenToken(selector)} label={selector.revision ? caenToken(selector) : t`${selector.code} (revizie necunoscută)`} onClear={() => onChange({ ...scope, mainCaen: selectors.filter((item) => caenToken(item) !== caenToken(selector)) })} />
        ))}
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            add()
          }}
        >
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t`„6201"`} aria-label={t`Cod CAEN principal`} className={FIELD} />
          <button type="submit" className={cn(TALL, 'border px-3 text-sm hover:bg-muted')}>
            {t`Adaugă`}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">{t`ANAF nu publică revizia CAEN a activității principale: un cod caută firmele cu revizia nepublicată, fără a o ghici.`}</p>
      </Row>
      <Row label={t`Revizia`}>
        <div className="grid grid-cols-1 gap-1.5">
          {(['REVISION_KNOWN', 'REVISION_UNKNOWN', 'MISSING'] as const).map((basis) => (
            <Toggle key={basis} pressed={scope.mainCaenBasis?.includes(basis) ?? false} onClick={() => onChange({ ...scope, mainCaenBasis: toggled(scope.mainCaenBasis, basis) })}>
              {caenBasisLabel(basis)}
            </Toggle>
          ))}
        </div>
      </Row>
    </>
  )
}

// ──────────────────────────────────────────────────────────────── fiscal ──

export function FlagField({ label, values, onChange }: { readonly label: string; readonly values: readonly CompanyAnalysisFlagValue[] | undefined; readonly onChange: (values: CompanyAnalysisFlagValue[] | undefined) => void }) {
  return (
    <Row label={label}>
      <div className="grid grid-cols-3 gap-1.5">
        {COMPANY_ANALYSIS_FLAG_VALUES.map((flag) => (
          <Toggle key={flag} pressed={values?.includes(flag) ?? false} onClick={() => onChange(toggled(values, flag))}>
            {flagLabel(flag)}
          </Toggle>
        ))}
      </div>
    </Row>
  )
}

// ───────────────────────────────────────────────────────────── statements ──

export function FilingField({ scope, year, onChange }: { readonly scope: CompanyAnalysisScope; readonly year: number; readonly onChange: ScopeChange }) {
  const statementFilters = Boolean(scope.financialRanges || scope.employeeSizeBands)
  return (
    <Row label={t`Situație ${year}`}>
      <div className="grid grid-cols-3 gap-1.5">
        <Toggle pressed={scope.filing === undefined} onClick={() => onChange({ ...scope, filing: undefined })}>
          {t`Toate`}
        </Toggle>
        <Toggle pressed={scope.filing === 'FILED'} onClick={() => onChange({ ...scope, filing: 'FILED' })}>
          {t`Au depus`}
        </Toggle>
        {/* A company without a statement has no value or size band to filter on: the API refuses the pair. */}
        <Toggle pressed={scope.filing === 'NOT_FILED'} onClick={() => onChange({ ...scope, filing: 'NOT_FILED', financialRanges: undefined, employeeSizeBands: undefined })}>
          {t`N-au depus`}
        </Toggle>
      </div>
      {statementFilters ? <p className="text-xs text-muted-foreground">{t`Filtrele pe valori și pe mărime păstrează doar firmele care au depus.`}</p> : null}
    </Row>
  )
}

export function RangeField({ scope, offered, max, onChange }: { readonly scope: CompanyAnalysisScope; readonly offered: readonly CompanyAnalysisMetric[]; readonly max: number; readonly onChange: ScopeChange }) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const ranges = scope.financialRanges ?? []
  const free = offered.filter((metric) => !ranges.some((range) => range.metric === metric))
  const [metric, setMetric] = useState<CompanyAnalysisMetric | null>(null)
  const [min, setMin] = useState('')
  const [maxText, setMaxText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const chosen = metric && free.includes(metric) ? metric : (free[0] ?? null)
  const add = () => {
    if (!chosen) return
    const low = min.trim() === '' ? null : boundOf(min, chosen)
    const high = maxText.trim() === '' ? null : boundOf(maxText, chosen)
    const unreadable = (min.trim() !== '' && low === null) || (maxText.trim() !== '' && high === null) || (low === null && high === null)
    setInvalid(unreadable)
    if (unreadable) return
    const range: CompanyAnalysisRangeInput = { metric: chosen, ...(low !== null ? { min: low } : {}), ...(high !== null ? { max: high } : {}) }
    setMin('')
    setMaxText('')
    onChange({ ...scope, filing: scope.filing === 'NOT_FILED' ? undefined : scope.filing, financialRanges: [...ranges, range] })
  }
  return (
    <Row label={t`Valori`}>
      {ranges.map((range) => (
        <Chip key={range.metric} label={rangeText(range, locale)} onClear={() => onChange({ ...scope, financialRanges: ranges.filter((item) => item.metric !== range.metric) })} />
      ))}
      {chosen && ranges.length < max ? (
        <form
          className="space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            add()
          }}
        >
          <Select value={chosen} onValueChange={(value) => setMetric(value as CompanyAnalysisMetric)}>
            <SelectTrigger className="h-11 rounded-none px-2.5 text-sm shadow-none sm:h-10" aria-label={t`Indicatorul filtrului`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {free.map((item) => (
                <SelectItem key={item} value={item}>
                  {metricLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
            <input inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} placeholder={t`de la`} aria-label={t`Valoarea minimă`} className={FIELD} />
            <input inputMode="decimal" value={maxText} onChange={(event) => setMaxText(event.target.value)} placeholder={t`până la`} aria-label={t`Valoarea maximă`} className={FIELD} />
            <button type="submit" className={cn(TALL, 'border px-3 text-sm hover:bg-muted')}>
              {t`Adaugă`}
            </button>
          </div>
          {invalid ? (
            <p role="alert" className="text-xs text-destructive">
              {companyMetricUnit(chosen) === 'RON' ? t`Scrie o sumă în lei, cu cel mult două zecimale.` : t`Scrie un număr întreg de salariați.`}
            </p>
          ) : null}
        </form>
      ) : null}
      <p className="text-xs text-muted-foreground">{t`Limitele sunt incluse și se aplică valorilor raportate în anul ales; firmele fără valoare raportată nu trec filtrul.`}</p>
    </Row>
  )
}

export function SizeField({ scope, onChange }: { readonly scope: CompanyAnalysisScope; readonly onChange: ScopeChange }) {
  return (
    <Row label={t`Mărime`}>
      <div className="grid grid-cols-1 gap-1.5">
        {COMPANY_ANALYSIS_SIZE_BANDS.map((band) => (
          <Toggle key={band} pressed={scope.employeeSizeBands?.includes(band) ?? false} onClick={() => onChange({ ...scope, filing: scope.filing === 'NOT_FILED' ? undefined : scope.filing, employeeSizeBands: toggled(scope.employeeSizeBands, band) })}>
            {sizeBandLabel(band)}
          </Toggle>
        ))}
      </div>
    </Row>
  )
}
