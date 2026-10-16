import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Check } from 'lucide-react'
import { Announce, CELL, Chip, FIELD, Notice, OPTION, Options, Row, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { useActiveOption } from '@/components/filters/filter-sheet/use-active-option'
import { placeKey, searchPlaces } from '@/features/procurement/lib/analytics-places'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import {
  COMPANY_ANALYSIS_ACTIVITY_BASES,
  COMPANY_ANALYSIS_FLAG_VALUES,
  COMPANY_ANALYSIS_SIZE_BANDS,
  companyMetricUnit,
  onrcBasisOfKey,
  type CompanyAnalysisDimension,
  type CompanyAnalysisCaenBasis,
  type CompanyAnalysisFlagValue,
  type CompanyAnalysisMetric,
  type CompanyAnalysisOnrcExcludeInput,
  type CompanyAnalysisOnrcInput,
  type CompanyAnalysisRangeInput,
  type CompanyAnalysisScope,
  type CompanyAnalysisSource,
  type CompanyAnalysisSizeBand,
} from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { useCompanyAnalysisOptions } from '../../hooks/use-company-analytics'
import { useCompanyNameSuggestions } from '../../hooks/use-company-name-suggestions'
import { useCompanyRegistryScope } from '../../hooks/use-company-registry-scope'
import type { UatIndex } from '../../hooks/use-uat-index'
import { activityBasisLabel, activitySelectorText } from '../../lib/company-activity-text'
import { amongFilers, boundOf, keyToggled, toggled, withFiling } from '../../lib/company-analytics-filter-model'
import { localeOf } from '../../lib/company-analytics-format'
import { rangeText } from '../../lib/company-analytics-scope-text'
import { directoryReadsSource } from '../../lib/company-analytics-source'
import { basisGroupLabel, caenBasisLabel, caenRuleText, countyLabel, flagLabel, metricLabel, sizeBandLabel, type CaenFilterRule } from '../../lib/company-analytics-text'
import { activitySelectorOf, activityToken, caenToken, ONRC_KEY_PATTERNS } from '../../lib/company-analytics-url'
import { legalFormName } from '../../lib/company-legal-forms'
import { CompanyRegistryScopeNotice } from '../registry/company-registry-notices'
import { CompanyRegistryScopeProvider } from '../registry/company-registry-scope-provider'
import { ChoiceSelect } from './analytics-choices'

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
      {/* As wide in every state as in its pressed weight: a pick never moves the values beside it. */}
      <span className="inline-grid">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 font-semibold">
          {children}
        </span>
        <span className="col-start-1 row-start-1">{children}</span>
      </span>
    </button>
  )
}

/** What an empty list says, in the procurement filters' own words. */
function nothingFor(term: string): string {
  return t`Nimic pentru „${term}".`
}

/** A list's value as the API words it in lower case, with its capital in a list of its own. */
function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)
}

/**
 * Up to four short values side by side — „Da", „Nu", „Necunoscut" — each as
 * wide as its word, the rest of the row shared out, so none is cut or wraps.
 * More values take one column (`CheckList`).
 */
function Segments({ children }: { readonly children: ReactNode }) {
  // On the narrowest phones (320 px) the three words do not fit one row: the last goes to a second.
  return <div className="flex flex-wrap gap-1.5 [&>button]:flex-auto [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:text-center">{children}</div>
}

/** One value of a list: its box, its code when the code is what readers know it by, its name. The box alone says it is picked: a heavier name could take another line and move the list. */
function CheckRow({ checked, onClick, title, code, className }: { readonly checked: boolean; readonly onClick: () => void; readonly title: string; readonly code?: string | null; readonly className?: string }) {
  return (
    // A name on two lines keeps its box and code on the first (the padding centres a line in the row's height).
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick} className={cn(TALL, 'flex w-full items-start gap-2.5 px-2.5 py-3 text-left text-sm leading-5 hover:bg-muted sm:py-2.5', className)}>
      <span aria-hidden="true" className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center border', checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60 bg-background')}>
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      {code ? <span className="w-10 shrink-0 font-mono text-xs font-medium leading-5">{code}</span> : null}
      {/* Out of the flex layout, but in the name a screen reader hears: „SA Societate pe acțiuni", not „SASocietate". */}
      {code ? ' ' : null}
      <span className="min-w-0 flex-1">{title}</span>
    </button>
  )
}

type Choice = { readonly id: string; readonly title: string; readonly code?: string | null }

/** Past this many values a list takes a search and scrolls (the owner, 3 October 2026). */
const LIST_SEARCHED_PAST = 8

/**
 * A field's values in one column, each with its box (the owner, 3 October
 * 2026: no two columns past four values). Past eight, a search over names
 * and codes above it, and the list scrolls. What was picked when the panel
 * opened comes first; a pick made now stays where it was clicked.
 */
function CheckList({
  label,
  choices,
  picked,
  onToggle,
  long = false,
}: {
  readonly label: string
  readonly choices: readonly Choice[]
  readonly picked: readonly string[]
  readonly onToggle: (id: string) => void
  /** A list known to be long before its values arrive: its search is there from the start, not inserted above it once they load. */
  readonly long?: boolean
}) {
  const [term, setTerm] = useState('')
  const [first] = useState(() => new Set(picked))
  const searched = long || choices.length > LIST_SEARCHED_PAST
  const key = placeKey(term)
  const ordered = [...choices.filter((choice) => first.has(choice.id)), ...choices.filter((choice) => !first.has(choice.id))]
  const shown = key === '' ? ordered : ordered.filter((choice) => placeKey(`${choice.code ?? ''} ${choice.title}`).includes(key))
  return (
    <>
      {searched ? (
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setTerm('')
          }}
          // The sheet keeps Escape while there is a search to clear (`keepEscapeForSearch`).
          data-clears-on-escape={term === '' ? undefined : 'true'}
          placeholder={t`Caută printre ${choices.length}`}
          aria-label={t`Caută: ${label}`}
          className={FIELD}
        />
      ) : null}
      {/* Out of the Tab order: Chrome makes a scroller a stop of its own. */}
      <div role="group" aria-label={label} tabIndex={-1} className={cn('border bg-background', searched && 'max-h-64 overflow-y-auto overscroll-contain')}>
        {shown.map((choice) => (
          <CheckRow key={choice.id} checked={picked.includes(choice.id)} onClick={() => onToggle(choice.id)} title={choice.title} code={choice.code} />
        ))}
        {shown.length === 0 ? <Notice kind="empty">{nothingFor(term.trim())}</Notice> : null}
      </div>
      <Announce text={shown.length === 0 && key !== '' ? nothingFor(term.trim()) : ''} />
    </>
  )
}

/** A small print under a row's control, in its column; `hidden`, it keeps its room (and is not read). */
function RowNote({ children, hidden = false }: { readonly children: ReactNode; readonly hidden?: boolean }) {
  return <p className={cn('text-xs text-muted-foreground', hidden && 'invisible')}>{children}</p>
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
 *
 * The names come from the companies directory, so the picker reads under a
 * registry pin of its own (`CompanyRegistryScopeProvider`): its suggestions
 * carry that confirmed scope and its refusal episodes (`use-company-name-
 * suggestions.ts`). They are offered only while the directory reads the very
 * ONRC edition the analysis release was exported from (`source`: the same
 * edition and publication); otherwise, or while the directory's scope moved
 * or could not be read, the picker says so and takes CUIs only. A change of
 * the directory's scope moves the picker alone, on the reader's click —
 * never the analysis release or the companies already chosen.
 */
export function CompanyField(props: { readonly scope: CompanyAnalysisScope; readonly max: number; readonly source: CompanyAnalysisSource | null; readonly onChange: ScopeChange }) {
  return (
    <CompanyRegistryScopeProvider>
      <CompanyPicker {...props} />
    </CompanyRegistryScopeProvider>
  )
}

type PickOption = { readonly id: string; readonly title: string; readonly sub: string | null }

/** A typed CUI first, then the hits not already chosen. */
function pickOptions(term: string, hits: readonly PickOption[], chosen: readonly string[]): { readonly options: readonly PickOption[]; readonly typed: string | null } {
  const typed = CUI_TYPED.exec(term.trim())?.[1] ?? null
  const options = [...(typed ? [{ id: typed, title: t`CUI ${typed}`, sub: null }] : []), ...hits.filter((hit) => hit.id !== typed)].filter((option) => !chosen.includes(option.id))
  return { options, typed }
}

interface PickProps {
  readonly term: string
  readonly onTerm: (term: string) => void
  readonly chosen: readonly string[]
  readonly onPick: (cui: string, title: string | null) => void
}

/** Names and CUIs: mounted only while the directory reads the analysis's edition, so no name is asked of another. */
function NamePick({ term, onTerm, chosen, onPick }: PickProps) {
  const suggestions = useCompanyNameSuggestions(term)
  // Only hits for what is typed now: another term's, picked by Enter, would add a company the reader did not ask for.
  const hits = suggestions.current ? (suggestions.data ?? []).flatMap((hit) => (hit.cui ? [{ id: hit.cui, title: hit.label, sub: `CUI ${hit.cui}` }] : [])) : []
  const { options, typed } = pickOptions(term, hits, chosen)
  const asked = term.trim().length >= 2
  const state = !asked && !typed ? 'idle' : suggestions.isError && !typed ? 'error' : (suggestions.isFetching || !suggestions.current) && options.length === 0 ? 'loading' : 'results'
  return (
    <PickField
      label={t`Adaugă o firmă`}
      placeholder={t`Nume sau CUI`}
      term={term}
      onTerm={onTerm}
      options={options}
      state={state}
      onPick={(cui) => onPick(cui, options.find((option) => option.id === cui)?.title ?? null)}
      onRetry={() => void suggestions.refetch()}
    />
  )
}

/** CUIs alone: no name is read. */
function CuiPick({ term, onTerm, chosen, onPick }: PickProps) {
  const { options, typed } = pickOptions(term, [], chosen)
  return <PickField label={t`Adaugă o firmă`} placeholder={t`CUI`} term={term} onTerm={onTerm} options={options} state={typed ? 'results' : 'idle'} onPick={(cui) => onPick(cui, null)} />
}

function CompanyPicker({ scope, max, source, onChange }: { readonly scope: CompanyAnalysisScope; readonly max: number; readonly source: CompanyAnalysisSource | null; readonly onChange: ScopeChange }) {
  const [term, setTerm] = useState('')
  const [named, setNamed] = useState<ReadonlyMap<string, string>>(new Map())
  const registry = useCompanyRegistryScope()
  const directory = registry.status === 'ready' && registry.moved === null ? registry.pinned.registry : null
  const sameEdition = directoryReadsSource(directory, source)
  const cuis = scope.cuis ?? []
  const asked = term.trim().length >= 2
  const typed = CUI_TYPED.test(term.trim())
  const pick = (cui: string, title: string | null) => {
    if (title) setNamed(new Map([...named, [cui, title]]))
    setTerm('')
    if (!cuis.includes(cui) && cuis.length < max) onChange({ ...scope, cuis: [...cuis, cui] })
  }
  const notice =
    registry.status === 'error' || (registry.status === 'ready' && registry.moved) ? (
      <CompanyRegistryScopeNotice scope={registry} />
    ) : registry.status === 'pending' ? (
      asked && !typed ? <p className="text-xs text-muted-foreground">{t`Se verifică ediția directorului de firme…`}</p> : null
    ) : !sameEdition ? (
      <p role="status" className="text-xs text-muted-foreground" data-testid="companies-analytics-names-unavailable">
        {t`Numele nu sunt oferite: directorul de firme citește altă ediție ONRC (${directory?.editionId ?? '—'}) decât analiza (${source?.editionId ?? '—'}). Poți adăuga o firmă după CUI.`}
      </p>
    ) : null
  return (
    <Row label={t`Firme`}>
      {cuis.map((cui) => (
        <Chip key={cui} label={named.get(cui) ? `${named.get(cui)} · ${cui}` : t`CUI ${cui}`} onClear={() => onChange({ ...scope, cuis: toggled(cuis, cui) })} />
      ))}
      {cuis.length < max ? sameEdition ? <NamePick term={term} onTerm={setTerm} chosen={cuis} onPick={pick} /> : <CuiPick term={term} onTerm={setTerm} chosen={cuis} onPick={pick} /> : null}
      {notice}
      <p className="text-xs text-muted-foreground">{t`Alegi firme anume, una câte una (cel mult ${max}). Căutarea după nume nu filtrează toate firmele al căror nume conține cuvintele. Numele sunt cele actuale din directorul platformei.`}</p>
    </Row>
  )
}

// ──────────────────────────────────────────────────────────────── where ──

/** A consensus key's chip text: a value by its name, a basis bucket by why it has no value. */
function consensusChip(dimension: CompanyAnalysisDimension, key: string, nameOf: (code: string) => string): string {
  const basis = onrcBasisOfKey(key)
  return basis === null ? nameOf(key) : basisGroupLabel(dimension, basis)
}

export function CountyField({ scope, onChange }: { readonly scope: CompanyAnalysisScope; readonly onChange: ScopeChange }) {
  const [term, setTerm] = useState('')
  const selected = scope.county?.in ?? []
  const key = placeKey(term)
  const options = key.length === 0 ? [] : ROMANIA_COUNTIES.filter((county) => !selected.includes(county.code) && (placeKey(county.nameRo).includes(key) || county.code.toLowerCase() === key)).map((county) => ({ id: county.code, title: county.nameRo, sub: county.code }))
  return (
    <Row label={t`Județ`}>
      {selected.map((code) => (
        <Chip key={code} label={consensusChip('COUNTY', code, countyLabel)} onClear={() => onChange({ ...scope, county: keyToggled(scope.county, code) })} />
      ))}
      <PickField label={t`Adaugă un județ`} placeholder={t`„Cluj", „IS"`} term={term} onTerm={setTerm} options={options} state={key.length === 0 ? 'idle' : 'results'} onPick={(code) => {
        setTerm('')
        onChange({ ...scope, county: keyToggled(scope.county, code) })
      }} />
      <Toggle pressed={Boolean(scope.county?.includeUnknown)} onClick={() => onChange({ ...scope, county: keyToggled(scope.county, null) })} className="w-full">
        {t`Și firmele fără un județ comun (orice motiv)`}
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
        <Chip key={code} label={consensusChip('UAT', code, (siruta) => uats.names.get(siruta) ?? t`SIRUTA ${siruta}`)} onClear={() => onChange({ ...scope, uat: keyToggled(scope.uat, code) })} />
      ))}
      <PickField label={t`Adaugă o localitate`} placeholder={t`„Sibiu", „Florești"`} term={term} onTerm={setTerm} options={options} state={state} onRetry={uats.retry} onPick={(code) => {
        setTerm('')
        onChange({ ...scope, uat: keyToggled(scope.uat, code) })
      }} />
      <Toggle pressed={Boolean(scope.uat?.includeUnknown)} onClick={() => onChange({ ...scope, uat: keyToggled(scope.uat, null) })} className="w-full">
        {t`Și firmele fără o localitate comună (orice motiv)`}
      </Toggle>
    </Row>
  )
}

// ───────────────────────────────────────────────────────────────── what ──

/** The unknown group's place in a codes list: no code the API sends is empty. */
const UNKNOWN_CHOICE = ''

/**
 * Codes from the year's own population (legal forms, observed statuses), the
 * most common first: a legal form by its code and its name, a status by the
 * registry's words.
 */
export function CodesField({
  label,
  dimension,
  question,
  open,
  values,
  unknown,
  onToggle,
  onUnknown,
  note,
}: {
  readonly label: string
  readonly dimension: 'LEGAL_FORM' | 'OBSERVED_STATUS'
  readonly question: ResolvedQuestion | null
  readonly open: boolean
  readonly values: readonly string[]
  readonly unknown?: boolean
  readonly onToggle: (code: string) => void
  readonly onUnknown?: () => void
  readonly note?: string
}) {
  const { i18n } = useLingui()
  const options = useCompanyAnalysisOptions(question, dimension, open)
  const groups = options.data?.groups ?? []
  const codes = [...new Set([...groups.map((group) => group.key ?? ''), ...values])].filter(Boolean)
  const choiceOf = (code: string): Choice => {
    // A status option may be a basis group (the companies without a common status, by why): its key filters exactly it.
    const basis = onrcBasisOfKey(code)
    if (basis !== null) return { id: code, title: basisGroupLabel(dimension, basis) }
    if (dimension === 'LEGAL_FORM') {
      const name = legalFormName(code, (descriptor) => i18n._(descriptor)) ?? code
      return { id: code, title: name, code: name === code ? null : code }
    }
    const group = groups.find((item) => item.key === code)
    return { id: code, title: group?.label ? capitalized(group.label) : code }
  }
  const choices = [...codes.map(choiceOf), ...(onUnknown ? [{ id: UNKNOWN_CHOICE, title: t`Fără stare comună (orice motiv)` }] : [])]
  return (
    <Row label={label}>
      {options.isError ? (
        <Notice kind="failed" onRetry={() => void options.refetch()}>
          {t`Lista nu s-a putut citi.`}
        </Notice>
      ) : options.isPending && values.length === 0 ? (
        <Notice kind="loading">{t`Se citește lista…`}</Notice>
      ) : null}
      {/* While the list is read, only a picked unknown group (to be cleared); once read — or failed — the unknown group always. */}
      {codes.length > 0 || unknown || (onUnknown && !options.isPending) ? (
        <CheckList
          label={label}
          long
          choices={choices}
          picked={[...values, ...(unknown ? [UNKNOWN_CHOICE] : [])]}
          onToggle={(id) => (id === UNKNOWN_CHOICE ? onUnknown?.() : onToggle(id))}
        />
      ) : null}
      {note ? <RowNote>{note}</RowNote> : null}
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
      <Row label={t`Cod CAEN fiscal ANAF`}>
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
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t`„6201"`} aria-label={t`Cod CAEN fiscal ANAF`} className={FIELD} />
          <button type="submit" className={cn(TALL, 'border px-3 text-sm hover:bg-muted')}>
            {t`Adaugă`}
          </button>
        </form>
        <p className="text-xs text-muted-foreground">{t`Codul CAEN fiscal ANAF e o observație din sursă, nu o activitate principală. ANAF nu publică revizia lui: un cod caută firmele cu revizia nepublicată, fără a o ghici.`}</p>
      </Row>
      <Row label={t`Revizia`}>
        <CheckList
          label={t`Revizia`}
          choices={(['REVISION_KNOWN', 'REVISION_UNKNOWN', 'MISSING'] as const).map((basis) => ({ id: basis, title: capitalized(caenBasisLabel(basis)) }))}
          picked={scope.mainCaenBasis ?? []}
          onToggle={(basis) => onChange({ ...scope, mainCaenBasis: toggled(scope.mainCaenBasis, basis as CompanyAnalysisCaenBasis) })}
        />
      </Row>
    </>
  )
}

// ─────────────────────────────────────────────────── derived activity ──

/**
 * The derived activity selection (v3): an exact selected activity — ONRC with
 * its revision (`onrc:rev2:6201`), ANAF without one (`anaf:6201`), never a
 * revision guessed for ANAF — and the basis it was selected on. Offered only
 * by a release that has it.
 */
export function ActivityField({ scope, max, onChange }: { readonly scope: CompanyAnalysisScope; readonly max: number; readonly onChange: ScopeChange }) {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const selectors = scope.activity ?? []
  const add = () => {
    const selector = activitySelectorOf(text.trim())
    if (!selector) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setText('')
    if (selectors.length < max && !selectors.some((item) => activityToken(item) === activityToken(selector))) onChange({ ...scope, activity: [...selectors, selector] })
  }
  return (
    <>
      <Row label={t`Activitate selectată`}>
        {selectors.map((selector) => (
          <Chip
            key={activityToken(selector)}
            label={activitySelectorText(selector)}
            onClear={() => {
              const next = selectors.filter((item) => activityToken(item) !== activityToken(selector))
              onChange({ ...scope, activity: next.length > 0 ? next : undefined })
            }}
          />
        ))}
        <form
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            add()
          }}
        >
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t`„onrc:rev2:6201" sau „anaf:6201"`} aria-label={t`Activitate selectată exactă`} className={FIELD} />
          <button type="submit" className={cn(TALL, 'border px-3 text-sm hover:bg-muted')}>
            {t`Adaugă`}
          </button>
        </form>
        {invalid ? (
          <p role="alert" className="text-xs text-destructive">
            {t`Scrie sursa, revizia și codul, de exemplu onrc:rev2:6201, sau un cod ANAF, de exemplu anaf:6201. ANAF nu publică revizia, așa că un cod ANAF nu are una.`}
          </p>
        ) : null}
      </Row>
      <Row label={t`Cum a fost selectată`}>
        <div className="grid grid-cols-1 gap-1.5">
          {COMPANY_ANALYSIS_ACTIVITY_BASES.map((basis) => (
            <Toggle key={basis} pressed={scope.activityBasis?.includes(basis) ?? false} onClick={() => onChange({ ...scope, activityBasis: toggled(scope.activityBasis, basis) })}>
              {activityBasisLabel(basis)}
            </Toggle>
          ))}
        </div>
      </Row>
      <p className="text-xs text-muted-foreground">{t`Activitatea selectată e o selecție derivată de platformă, nu o informație publicată de ONRC sau ANAF. Un cod ONRC nu găsește firmele selectate după codul ANAF și invers.`}</p>
    </>
  )
}

// ────────────────────────────────────────────────────── ONRC observations ──

/** Codes typed one at a time, each read in its own domain; one that is not is said, never sent. */
function CodeListField({
  label,
  placeholder,
  pattern,
  normalize,
  values,
  max,
  describe,
  invalidText,
  onChange,
}: {
  readonly label: string
  readonly placeholder: string
  readonly pattern: RegExp
  readonly normalize: (text: string) => string
  readonly values: readonly string[]
  readonly max: number
  readonly describe: (value: string) => string
  readonly invalidText: string
  readonly onChange: (values: readonly string[]) => void
}) {
  const [text, setText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const add = () => {
    const value = normalize(text.trim())
    if (!pattern.test(value)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setText('')
    if (!values.includes(value) && values.length < max) onChange([...values, value])
  }
  return (
    <Row label={label}>
      {values.map((value) => (
        <Chip key={value} label={describe(value)} onClear={() => onChange(values.filter((item) => item !== value))} />
      ))}
      <form
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder={placeholder} aria-label={label} className={FIELD} />
        <button type="submit" className={cn(TALL, 'border px-3 text-sm hover:bg-muted')}>
          {t`Adaugă`}
        </button>
      </form>
      {invalid ? (
        <p role="alert" className="text-xs text-destructive">
          {invalidText}
        </p>
      ) : null}
    </Row>
  )
}

type OnrcList = Exclude<keyof CompanyAnalysisOnrcInput, 'exclude'>
type OnrcExcludeList = keyof CompanyAnalysisOnrcExcludeInput

/** The observations without an empty list, an empty exclusion or an empty filter: what the API takes. */
function prunedOnrc(onrc: CompanyAnalysisOnrcInput): CompanyAnalysisOnrcInput | undefined {
  const lists = <K extends string>(source: Partial<Record<K, readonly string[] | undefined>>) => Object.fromEntries(Object.entries(source).filter(([, values]) => Array.isArray(values) && values.length > 0))
  const exclude = lists(onrc.exclude ?? {})
  const { exclude: _dropped, ...positive } = onrc
  const out = { ...lists(positive), ...(Object.keys(exclude).length > 0 ? { exclude } : {}) } as CompanyAnalysisOnrcInput
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * The ONRC observations of one identifier (`scope.onrc`): a status, a county,
 * a broad CAEN code (v3 releases: qualified classes only; v2: every
 * observation, unknown revision included) and an exact `rev<N>:<code>`, each a list (OR) and all on the SAME identifier (AND) — a
 * company with a public 1048 matches even beside a conflicting status. Apart
 * from the consensus fields above, which ask what all of a company's entries
 * agree on. The exclusions keep only companies whose evidence is complete:
 * incomplete evidence abstains, it is never read as „without" (an unparsed or
 * unknown-revision CAEN row makes CAEN coverage partial). An exact revision is
 * never excluded (an unknown revision may carry the same code). `caenRule`
 * names what the release's CAEN filters test.
 */
export function OnrcField({ scope, limits, statusNames, caenRule, onChange }: { readonly scope: CompanyAnalysisScope; readonly limits: { readonly statuses: number; readonly counties: number; readonly caen: number; readonly legalForms: number }; readonly statusNames: ReadonlyMap<string, string>; readonly caenRule?: CaenFilterRule | undefined; readonly onChange: ScopeChange }) {
  const onrc = scope.onrc ?? {}
  const set = (next: CompanyAnalysisOnrcInput) => onChange({ ...scope, onrc: prunedOnrc(next) })
  const list = (key: OnrcList) => (values: readonly string[]) => set({ ...onrc, [key]: [...values] })
  const excluded = (key: OnrcExcludeList) => (values: readonly string[]) => set({ ...onrc, exclude: { ...onrc.exclude, [key]: [...values] } })
  const upper = (text: string) => text.toUpperCase()
  const statusName = (code: string) => (statusNames.get(code) ? `${code} · ${statusNames.get(code) ?? ''}` : code)
  const statusInvalid = t`Scrie un cod de stare ONRC, de exemplu 1048.`
  const countyInvalid = t`Scrie codul județului, de exemplu CJ sau B.`
  const caenInvalid = t`Scrie un cod CAEN din patru cifre, de exemplu 6201.`
  return (
    <>
      <CodeListField label={t`Cu starea`} placeholder={t`„1048"`} pattern={ONRC_KEY_PATTERNS.status} normalize={(text) => text} values={onrc.status ?? []} max={limits.statuses} describe={statusName} invalidText={statusInvalid} onChange={list('status')} />
      <CodeListField label={t`În județul`} placeholder={t`„CJ"`} pattern={ONRC_KEY_PATTERNS.county} normalize={upper} values={onrc.county ?? []} max={limits.counties} describe={countyLabel} invalidText={countyInvalid} onChange={list('county')} />
      <CodeListField label={t`Cu CAEN (cod larg)`} placeholder={t`„6201"`} pattern={ONRC_KEY_PATTERNS.caenCode} normalize={(text) => text} values={onrc.caenCode ?? []} max={limits.caen} describe={(code) => t`${code} (cod larg)`} invalidText={caenInvalid} onChange={list('caenCode')} />
      <CodeListField
        label={t`Cu CAEN exact`}
        placeholder={t`„rev2:6201"`}
        pattern={ONRC_KEY_PATTERNS.onrcCaen}
        normalize={(text) => text.toLowerCase()}
        values={onrc.onrcCaen ?? []}
        max={limits.caen}
        describe={(key) => key}
        invalidText={t`Scrie revizia și codul, de exemplu rev2:6201. Un cod fără revizie se caută la „CAEN (cod larg)": revizia nu e ghicită.`}
        onChange={list('onrcCaen')}
      />
      <p className="text-xs text-muted-foreground">{t`Toate condițiile de mai sus se caută pe aceeași înscriere ONRC a firmei. Un cod CAEN exact nu găsește înscrierile cu revizia nepublicată.`}</p>
      <CodeListField label={t`Fără starea`} placeholder={t`„1070"`} pattern={ONRC_KEY_PATTERNS.status} normalize={(text) => text} values={onrc.exclude?.status ?? []} max={limits.statuses} describe={statusName} invalidText={statusInvalid} onChange={excluded('status')} />
      <CodeListField label={t`Fără CAEN (cod larg)`} placeholder={t`„4711"`} pattern={ONRC_KEY_PATTERNS.caenCode} normalize={(text) => text} values={onrc.exclude?.caenCode ?? []} max={limits.caen} describe={(code) => code} invalidText={caenInvalid} onChange={excluded('caenCode')} />
      <CodeListField label={t`Alt județ comun decât`} placeholder={t`„B"`} pattern={ONRC_KEY_PATTERNS.county} normalize={upper} values={onrc.exclude?.county ?? []} max={limits.counties} describe={countyLabel} invalidText={countyInvalid} onChange={excluded('county')} />
      <CodeListField label={t`Altă formă juridică decât`} placeholder={t`„SRL"`} pattern={ONRC_KEY_PATTERNS.legalForm} normalize={upper} values={onrc.exclude?.legalForm ?? []} max={limits.legalForms} describe={(form) => form} invalidText={t`Scrie forma juridică, de exemplu SRL.`} onChange={excluded('legalForm')} />
      <p className="text-xs text-muted-foreground">{t`Excluderile păstrează doar firmele cu dovezi complete în ediție; cele cu înscrieri incomplete sau nerezolvate nu sunt păstrate și nici socotite fără acel cod. Un CAEN exact nu se poate exclude.`}</p>
      {caenRuleText(caenRule).map((text) => (
        <p key={text} className="text-xs text-muted-foreground">
          {text}
        </p>
      ))}
    </>
  )
}

// ──────────────────────────────────────────────────────────────── fiscal ──

export function FlagField({ label, values, onChange, note }: { readonly label: string; readonly values: readonly CompanyAnalysisFlagValue[] | undefined; readonly onChange: (values: CompanyAnalysisFlagValue[] | undefined) => void; readonly note?: string }) {
  return (
    <Row label={label}>
      <Segments>
        {COMPANY_ANALYSIS_FLAG_VALUES.map((flag) => (
          <Toggle key={flag} pressed={values?.includes(flag) ?? false} onClick={() => onChange(toggled(values, flag))}>
            {flagLabel(flag)}
          </Toggle>
        ))}
      </Segments>
      {note ? <RowNote>{note}</RowNote> : null}
    </Row>
  )
}

// ───────────────────────────────────────────────────────────── statements ──

export function FilingField({ scope, year, onChange }: { readonly scope: CompanyAnalysisScope; readonly year: number; readonly onChange: ScopeChange }) {
  return (
    <Row label={t`Situație ${year}`}>
      <Segments>
        <Toggle pressed={scope.filing === undefined} onClick={() => onChange(withFiling(scope, undefined))}>
          {t`Toate`}
        </Toggle>
        <Toggle pressed={scope.filing === 'FILED'} onClick={() => onChange(withFiling(scope, 'FILED'))}>
          {t`Au depus`}
        </Toggle>
        <Toggle pressed={scope.filing === 'NOT_FILED'} onClick={() => onChange(withFiling(scope, 'NOT_FILED'))}>
          {t`N-au depus`}
        </Toggle>
      </Segments>
    </Row>
  )
}

/** Ranges of reported values; a new one starts on the measure the answer is in (`preferred`), any other offered one a pick away. */
export function RangeField({
  scope,
  offered,
  preferred,
  max,
  onChange,
}: {
  readonly scope: CompanyAnalysisScope
  readonly offered: readonly CompanyAnalysisMetric[]
  readonly preferred?: CompanyAnalysisMetric | null
  readonly max: number
  readonly onChange: ScopeChange
}) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const ranges = scope.financialRanges ?? []
  const free = offered.filter((metric) => !ranges.some((range) => range.metric === metric))
  const [metric, setMetric] = useState<CompanyAnalysisMetric | null>(null)
  const [min, setMin] = useState('')
  const [maxText, setMaxText] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [other, setOther] = useState(false)
  const chosen = metric && free.includes(metric) ? metric : preferred && free.includes(preferred) ? preferred : (free[0] ?? null)
  // On the answer's measure, the row above already names it: no second dropdown until another measure is asked for.
  const onMeasure = !other && Boolean(preferred) && chosen === preferred
  // Bounds typed for one measure would mean another once it changes (100 000 lei, then 100 000 employees): they go.
  // „Pe alt indicator" goes as it is pressed, with the focus: it lands on the dropdown it reveals. This runs after
  // the row's own rescue (a child's effect runs first), which would have put it on the first field.
  const otherBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (other) otherBox.current?.querySelector<HTMLElement>('button, select')?.focus()
  }, [other])
  const [draftFor, setDraftFor] = useState(chosen)
  if (draftFor !== chosen) {
    setDraftFor(chosen)
    setMin('')
    setMaxText('')
    setInvalid(false)
  }
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
    onChange({ ...amongFilers(scope), financialRanges: [...ranges, range] })
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
          {onMeasure ? null : (
            <div ref={otherBox}>
              <ChoiceSelect
                value={chosen}
                groups={[{ options: free.map((item) => ({ value: item, label: metricLabel(item) })) }]}
                onChange={(value) => setMetric(value as CompanyAnalysisMetric)}
                label={t`Indicatorul filtrului`}
                triggerClassName="h-11 rounded-none px-2.5 text-sm shadow-none sm:h-10"
              />
            </div>
          )}
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
            <input inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} placeholder={t`de la`} aria-label={t`${metricLabel(chosen)}: valoarea minimă`} className={FIELD} />
            <input inputMode="decimal" value={maxText} onChange={(event) => setMaxText(event.target.value)} placeholder={t`până la`} aria-label={t`${metricLabel(chosen)}: valoarea maximă`} className={FIELD} />
            <button type="submit" className={cn(TALL, 'border px-3 text-sm hover:bg-muted')}>
              {t`Adaugă`}
            </button>
          </div>
          {invalid ? (
            <p role="alert" className="text-xs text-destructive">
              {companyMetricUnit(chosen) === 'RON' ? t`Scrie o sumă în lei, cu cel mult două zecimale.` : t`Scrie un număr întreg de salariați.`}
            </p>
          ) : null}
          {onMeasure && free.length > 1 ? (
            <button type="button" onClick={() => setOther(true)} className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground sm:min-h-0">
              {t`Pe alt indicator`}
            </button>
          ) : null}
        </form>
      ) : null}
      <p className="text-xs text-muted-foreground">{t`Limitele sunt incluse și se aplică valorilor raportate în anul ales; firmele fără valoare raportată nu trec filtrul.`}</p>
    </Row>
  )
}

/** The bands by size, then what the statement could not place: no headcount, a negative one. */
const SIZE_BANDS_LISTED: readonly CompanyAnalysisSizeBand[] = [...COMPANY_ANALYSIS_SIZE_BANDS.filter((band) => band !== 'UNAVAILABLE' && band !== 'NEGATIVE'), 'UNAVAILABLE', 'NEGATIVE']

export function SizeField({ scope, onChange }: { readonly scope: CompanyAnalysisScope; readonly onChange: ScopeChange }) {
  return (
    <Row label={t`Mărime`}>
      <CheckList
        label={t`Mărime`}
        choices={SIZE_BANDS_LISTED.map((band) => ({ id: band, title: sizeBandLabel(band) }))}
        picked={scope.employeeSizeBands ?? []}
        onToggle={(band) => onChange({ ...amongFilers(scope), employeeSizeBands: toggled(scope.employeeSizeBands, band as CompanyAnalysisSizeBand) })}
      />
      {/*
        Under the last field it is about, never above one, and its room kept when it says nothing: a note
        that came with a pick higher up pushed the list under the pointer; one that left at the panel's
        end shortened it, and the panel scrolled back to fit.
      */}
      <RowNote hidden={!(scope.filing === undefined && (scope.financialRanges || scope.employeeSizeBands))}>{t`Filtrele pe valori și pe mărime păstrează doar firmele care au depus.`}</RowNote>
    </Row>
  )
}
