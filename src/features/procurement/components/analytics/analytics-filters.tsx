import { useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { SlidersHorizontal } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { MIN_QUERY_CHARS, useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { procurementHrefOf } from '@/features/procurement/lib/home-links'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { cpvKey, cpvLevelOf, FIRST_MONTH, POPULATIONS, repaired, withFilter, withoutFilter, withTitle, type PopulationId, type Query } from '../../lib/analytics-model'
import { useActiveOption } from '../../hooks/use-active-option'
import { CPV_SEARCH_MIN, useCpvSearch, useNames, type Answer } from '../../hooks/use-procurement-analytics'
import { countText, cpvLabel, headlineParts, keyLabel, recordsTab, type Namer } from '../../lib/analytics-text'
import { SHOW_MORE_CLASS } from '../home/home-chrome'
import { Announce, CELL, Chip, FIELD, Group, Notice, OPTION, Options, Row, TALL } from './analytics-filter-parts'
import { MonthField } from './analytics-month-field'
import { PlaceField } from './analytics-place-field'
import { cpvFilterOf, filterCount, PROCEDURES } from './analytics-view'

/**
 * Every filter the query takes, in one panel, in a sheet: from the right on
 * a wide screen, from the bottom on a phone. The quick row above the answer
 * stays for the common moves; this is the whole set. A change applies at
 * once (the address is the state).
 *
 * Five groups for the query's questions — what records, when, who buys,
 * who sells, what — each row a label and one control; a value set is a chip
 * with its own ✕, a value unset a field. A place is one search over the
 * regions, the counties and the localities (`analytics-place-field.tsx`).
 * The months read in the page's language; every list under a search takes
 * the arrow keys. Designed in `/development/procurement/analytics-filters-fable`
 * (30 September 2026; docs/design/procurement/design.md §18.18).
 */

const ALL = '__toate__'

/** The years shown before „Arată mai multe". */
const RECENT_YEARS = 4

/** The first year the buttons offer; an earlier month, back to SEAP's first, is the months' to pick. */
const FIRST_YEAR = 2016

function cleared(query: Query): Query {
  return repaired({ ...query, filters: {}, titlu: null, valoare: null })
}

// ───────────────────────────────────────────────────────────── period ──

function PeriodRows({ query, answer, onChange }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void }) {
  const cutoff = answer.cutoff ? answer.cutoff[POPULATIONS[query.tip].cutoff] : null
  const lastYear = cutoff ? Number(cutoff.slice(0, 4)) : null
  const years = lastYear ? Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, index) => lastYear - index) : []
  const [more, setMore] = useState(false)
  const picked = query.period.kind === 'year' ? query.period.year : null
  // The recent years and, when it is older, the one picked; all of them once the reader asks.
  const recent = years.slice(0, RECENT_YEARS)
  const shown = more ? years : picked !== null && years.includes(picked) && !recent.includes(picked) ? [...recent, picked] : recent
  const set = (period: Query['period']) => onChange({ ...query, period })
  const active = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : '')
  // The months the answer reads; in force only when the reader picked them, else shown muted.
  const from = answer.period?.from ?? ''
  const to = answer.period?.to ?? ''
  const months = query.period.kind === 'months'
  const last = cutoff ?? `${new Date().getFullYear()}-12`
  return (
    <>
      <Row label="">
        <button type="button" aria-pressed={query.period.kind === 'recent'} onClick={() => set({ kind: 'recent' })} className={cn(CELL, 'w-full text-left', active(query.period.kind === 'recent'))}>
          {t`Ultimele 12 luni`}
        </button>
      </Row>
      <Row label={t`Anul`}>
        <div className="grid grid-cols-4 gap-1.5">
          {shown.map((year) => (
            <button key={year} type="button" aria-pressed={picked === year} onClick={() => set({ kind: 'year', year })} className={cn(CELL, 'tabular-nums', active(picked === year))}>
              {year}
            </button>
          ))}
        </div>
        {years.length > RECENT_YEARS ? (
          <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className={cn(SHOW_MORE_CLASS, TALL, 'mt-0 font-normal text-muted-foreground hover:text-foreground')}>
            {more ? t`Arată mai puține` : t`Arată mai multe`}
          </button>
        ) : null}
      </Row>
      <Row label={t`Lunile`}>
        <div className="grid grid-cols-2 gap-1.5">
          <MonthField value={from} min={FIRST_MONTH} max={last} active={months} label={t`De la`} className={TALL} onChange={(month) => set({ kind: 'months', from: month, to: to && to >= month ? to : month })} />
          <MonthField value={to} min={FIRST_MONTH} max={last} active={months} label={t`Până la`} className={TALL} onChange={(month) => set({ kind: 'months', from: from && from <= month ? from : month, to: month })} />
        </div>
      </Row>
    </>
  )
}

// ───────────────────────────────────────────────────────────── parties ──

/** The families a party's search asks for: a buyer is an institution or a state company, a seller a firm (`procurementHrefOf`). */
const PARTY_DOC_TYPES = {
  cumparator: ['organization', 'public_enterprise'],
  furnizor: ['company'],
} as const

/** An institution or a firm: its name from the site's search, or a CUI typed as it is. */
function OrgField({ axis, label, query, namer, onChange }: { readonly axis: 'cumparator' | 'furnizor'; readonly label: string; readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const filter = query.filters[axis]
  // Each field asks for its own families: a shared search's eight results could all be the other side's.
  const search = useSearchResults({ docTypes: PARTY_DOC_TYPES[axis], suggestions: false })
  const term = search.term.trim()
  const wanted = axis === 'furnizor' ? '/suppliers/' : '/institutions/'
  const hits = search.results
    .flatMap((hit) => {
      const href = procurementHrefOf(hit)
      const cui = href?.split('/').pop()
      return href && cui && href.includes(wanted) ? [{ id: hit.id, title: hit.title, cui }] : []
    })
    .slice(0, 6)
  const typed = /^(ro)?\s*\d{2,12}$/iu.test(term) ? term.replace(/^ro\s*/iu, '') : null
  const pick = (cui: string) => {
    search.reset()
    onChange(withFilter(query, axis, 'cui', cui))
  }
  const { status } = search
  // The last term's rows, kept while the next is read, answer another question: shown dimmed, not to be picked.
  const stale = status.kind === 'results' && status.stale
  // Rows of the last term with none for this field are no answer yet; a current read with none is nothing.
  const state = stale ? 'loading' : status.kind === 'results' && hits.length === 0 ? 'empty' : status.kind
  // The options in order, for the arrow keys: the CUI as typed first, then the search's hits once they are current.
  const choices = [...(typed ? [typed] : []), ...(stale ? [] : hits.map((hit) => hit.cui))]
  const open = Boolean(typed) || term.length >= MIN_QUERY_CHARS
  const keys = useActiveOption(open ? [...(typed ? [`typed:${typed}`] : []), ...(stale ? [] : hits.map((hit) => `hit:${hit.id}`))] : [])
  return (
    <Row label={label}>
      {filter ? (
        <Chip label={keyLabel(axis, 'cui', filter.values[0]!, namer)} onClear={() => onChange(withoutFilter(query, axis))} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            // Enter picks the CUI typed, or the first name found for what is typed now — never the last term's.
            const first = typed ?? (search.isCurrent ? hits[0]?.cui : undefined)
            if (first) pick(first)
          }}
        >
          <input
            {...keys.input(open)}
            value={search.term}
            onChange={(event) => search.setTerm(event.target.value)}
            onKeyDown={(event) => {
              // The sheet leaves Escape to an open list (`FilterSheet`): it clears the search, not the sheet.
              if (event.key === 'Escape') search.reset()
              else keys.onKeyDown(event, (position) => pick(choices[position]!))
            }}
            placeholder={t`Nume sau CUI`}
            aria-label={axis === 'furnizor' ? t`Caută o firmă` : t`Caută o instituție`}
            className={FIELD}
          />
          {open ? (
            <Options
              id={keys.listId}
              label={axis === 'furnizor' ? t`Firme` : t`Instituții`}
              notices={
                state === 'pending' || state === 'loading' ? (
                  <Notice kind="loading">{t`Se caută…`}</Notice>
                ) : state === 'error' ? (
                  <Notice kind="failed" onRetry={search.retry}>
                    {t`Căutarea nu a mers.`}
                  </Notice>
                ) : state === 'invalid' ? (
                  // The words themselves are what the search refused: asking again would fail the same way.
                  <Notice kind="failed">{t`Căutarea nu a mers.`}</Notice>
                ) : state === 'empty' && !typed ? (
                  <Notice kind="empty">{t`Nimic pentru „${term}".`}</Notice>
                ) : null
              }
            >
              {typed ? (
                <button type="button" {...keys.option(0)} onClick={() => pick(typed)} className={OPTION}>
                  <span className="font-mono">{`CUI ${typed}`}</span>
                </button>
              ) : null}
              {hits.map((hit, index) => (
                <button key={hit.id} type="button" {...keys.option(index + (typed ? 1 : 0))} disabled={stale} onClick={() => pick(hit.cui)} className={cn(OPTION, 'disabled:opacity-50')}>
                  <span className="min-w-0 truncate">{hit.title}</span>
                </button>
              ))}
            </Options>
          ) : null}
          <Announce text={!open ? '' : state === 'pending' || state === 'loading' ? t`Se caută…` : state === 'empty' && !typed ? t`Nimic pentru „${term}".` : ''} />
        </form>
      )}
    </Row>
  )
}

// ──────────────────────────────────────────────────────────── the what ──

/** A CPV pick from its path: division › group › class › category › code, each step a click back up. */
function cpvPath(prefix: string): readonly string[] {
  const steps = [2, 3, 4, 5].filter((length) => length < prefix.length).map((length) => prefix.slice(0, length))
  // A step ending in 0 is no level of its own (45000000 is the division's own code, not a group „450").
  return [...steps.filter((step) => step.length === 2 || !step.endsWith('0')), prefix]
}

function CpvField({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const filter = query.filters.cpv
  const [text, setText] = useState('')
  const term = text.trim()
  const found = useCpvSearch(term)
  const prefix = filter?.values[0] ?? null
  const path = prefix ? cpvPath(prefix) : []
  const names = useNames({ orgs: [], cpv: path.map(cpvKey) })
  const local: Namer = { ...namer, names: names.data ?? namer.names }
  const asked = term.length >= CPV_SEARCH_MIN
  const hits = (found.data ?? []).flatMap((hit) => {
    const next = cpvFilterOf(hit.value)
    return next ? [{ label: hit.label, ...next }] : []
  })
  // The last term's rows stay on screen while the next is read, dimmed and not to be picked: they answer another question.
  const stale = !found.settled
  const pick = (hit: { readonly level: string; readonly value: string }) => {
    setText('')
    onChange(withFilter(query, 'cpv', hit.level, hit.value))
  }
  const keys = useActiveOption(asked && !stale ? hits.map((hit) => hit.value) : [])
  return (
    <Row label={t`Categoria`}>
      {path.length > 0 ? (
        <ol className="space-y-1.5">
          {path.map((step, index) => {
            const label = cpvLabel(step, local)
            return (
              <li key={step}>
                {index === path.length - 1 ? (
                  <Chip label={`${step} · ${label}`} onClear={() => onChange(index > 0 ? withFilter(query, 'cpv', cpvLevelOf(path[index - 1]!)!.id, path[index - 1]!) : withoutFilter(query, 'cpv'))} />
                ) : (
                  <button type="button" onClick={() => onChange(withFilter(query, 'cpv', cpvLevelOf(step)!.id, step))} title={t`Doar ${label}`} className={cn(OPTION, 'justify-start gap-2 border text-muted-foreground hover:text-foreground')}>
                    <span className="shrink-0 font-mono text-xs">{step}</span>
                    <span className="min-w-0 truncate">{label}</span>
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      ) : null}
      {path.length < 5 ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (!stale && hits[0]) pick(hits[0])
          }}
          className="space-y-1.5"
        >
          <input
            {...keys.input(asked)}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // The sheet leaves Escape to an open list (`FilterSheet`): it clears the search, not the sheet.
              if (event.key === 'Escape') setText('')
              else keys.onKeyDown(event, (position) => pick(hits[position]!))
            }}
            placeholder={t`„drumuri", „medicamente", 45233120`}
            aria-label={t`Caută o categorie`}
            className={FIELD}
          />
          {asked ? (
            <Options
              id={keys.listId}
              label={t`Categorii`}
              notices={
                found.isError ? (
                  <Notice kind="failed" onRetry={found.retry}>
                    {t`Căutarea nu a mers.`}
                  </Notice>
                ) : stale ? (
                  <Notice kind="loading">{t`Se caută…`}</Notice>
                ) : hits.length === 0 ? (
                  <Notice kind="empty">{t`Nimic pentru „${term}".`}</Notice>
                ) : null
              }
            >
              {hits.map((hit, index) => (
                <button key={hit.value} type="button" {...keys.option(index)} disabled={stale} onClick={() => pick(hit)} className={cn(OPTION, 'disabled:opacity-50')}>
                  <span className="min-w-0 truncate">{hit.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{hit.value}</span>
                </button>
              ))}
            </Options>
          ) : null}
          <Announce text={!asked || found.isError ? '' : stale ? t`Se caută…` : hits.length === 0 ? t`Nimic pentru „${term}".` : ''} />
        </form>
      ) : null}
    </Row>
  )
}

function ProcedureField({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const picked = query.filters.procedura?.values[0] ?? null
  return (
    <Row label={t`Procedura`}>
      <Select value={picked ?? ALL} onValueChange={(value) => onChange(value === ALL ? withoutFilter(query, 'procedura') : withFilter(query, 'procedura', 'tip', value))}>
        <SelectTrigger className={cn('h-11 rounded-none px-2.5 text-sm shadow-none sm:h-10', picked && 'border-primary/50 bg-primary/5 font-medium')} aria-label={t`Procedura`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t`Toate procedurile`}</SelectItem>
          {[...new Set([...PROCEDURES, ...(picked ? [picked] : [])])].map((key) => (
            <SelectItem key={key} value={key}>
              {keyLabel('procedura', 'tip', key, namer)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Row>
  )
}

function TitleField({ query, onChange }: { readonly query: Query; readonly onChange: (query: Query) => void }) {
  const [value, setValue] = useState('')
  const title = query.titlu
  const apply = () => {
    const words = value.trim()
    if (words.length >= 3) {
      setValue('')
      onChange(withTitle(query, words.slice(0, 100)))
    }
  }
  return (
    <Row label={t`Titlul`}>
      {title ? (
        <Chip label={t`„${title}"`} onClear={() => onChange(withTitle(query, null))} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <input value={value} onChange={(event) => setValue(event.target.value)} onBlur={apply} placeholder={t`„laptop", „deszăpezire"`} aria-label={t`Titlul conține`} className={FIELD} />
        </form>
      )}
    </Row>
  )
}

/** Lei as a reader writes them: „1.000", „1 000", „1000,50". */
function lei(text: string): number | null {
  const number = Number(text.replace(/[.\s]/gu, '').replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(number) && number >= 0 ? number : null
}

function ValueField({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const apply = () => {
    const low = lei(min)
    const high = lei(max)
    if (low === null && high === null) return
    setMin('')
    setMax('')
    onChange({ ...query, valoare: { min: low, max: high } })
  }
  // The range in the headline's own words: „între 10.000 lei și 50.000 lei".
  const text = headlineParts(query, namer, false).find((part) => part.role === 'valoare')?.text ?? ''
  return (
    <Row label={t`Valoarea`}>
      {query.valoare ? (
        <Chip label={text} onClear={() => onChange({ ...query, valoare: null })} />
      ) : (
        <form
          className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
          // Applied when the focus leaves the pair: moving from one field to the other applies nothing half-typed.
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) apply()
          }}
        >
          <input inputMode="numeric" value={min} onChange={(event) => setMin(event.target.value)} placeholder={t`de la`} aria-label={t`Valoare de la, lei`} className={FIELD} />
          <input inputMode="numeric" value={max} onChange={(event) => setMax(event.target.value)} placeholder={t`până la`} aria-label={t`Valoare până la, lei`} className={FIELD} />
          <span className="text-xs text-muted-foreground">{t`lei`}</span>
          {/* What lets Enter apply the pair; out of the Tab order, where it would be a stop no one sees. */}
          <button type="submit" tabIndex={-1} className="sr-only">
            {t`Aplică`}
          </button>
        </form>
      )}
    </Row>
  )
}

// ────────────────────────────────────────────────────────────── panel ──

export function FilterPanel({
  query,
  answer,
  namer,
  phone,
  onChange,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  /** In a phone's bottom sheet: a search focused moves to the top, above the keyboard. */
  readonly phone: boolean
  readonly onChange: (query: Query) => void
  readonly className?: string
}) {
  const contract = POPULATIONS[query.tip].grain === 'contract'
  // On a phone the keyboard covers the sheet's lower half: a search focused
  // moves to the top of the sheet, its list under it, with room below the
  // panel to scroll that far even for the last field.
  const [lifted, setLifted] = useState<HTMLElement | null>(null)
  useEffect(() => {
    lifted?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [lifted])
  return (
    <div
      className={cn('divide-y divide-border/70', lifted && 'pb-[70vh]', className)}
      // Any other focus lets the lift go: after a pick that removed the field, `Row` takes the focus to its chip.
      onFocus={(event) => setLifted(phone && event.target instanceof HTMLInputElement && event.target.getAttribute('role') === 'combobox' ? event.target : null)}
      onBlur={(event) => {
        if (event.target === lifted) setLifted(null)
      }}
    >
      <Group title={t`Înregistrări`}>
        <IndicatorToggle<PopulationId>
          label={t`Ce înregistrări`}
          value={query.tip}
          onChange={(tip) => onChange(repaired({ ...query, tip, masura: POPULATIONS[tip].defaultMeasure }))}
          options={(['directe', 'contracte', 'acorduri'] as const).map((key) => ({ key, label: recordsTab(key) }))}
          // The toggle's own `sm:flex` leaves a fourth, empty cell at the sheet's width; three tight columns hold the three words, at the sheet's tap height.
          className="grid w-full grid-cols-3 sm:grid [&>button]:min-h-11 [&>button]:px-1 sm:[&>button]:min-h-10"
        />
      </Group>
      <Group title={t`Perioada`}>
        <PeriodRows query={query} answer={answer} onChange={onChange} />
      </Group>
      <Group title={t`Cine cumpără`}>
        <OrgField axis="cumparator" label={t`Instituția`} query={query} namer={namer} onChange={onChange} />
        <PlaceField axis="loc" query={query} onChange={onChange} />
      </Group>
      <Group title={t`Cine vinde`}>
        <OrgField axis="furnizor" label={t`Firma`} query={query} namer={namer} onChange={onChange} />
        <PlaceField axis="loc_firma" query={query} onChange={onChange} />
      </Group>
      <Group title={t`Ce cumpără`}>
        <CpvField query={query} namer={namer} onChange={onChange} />
        {contract ? <ProcedureField query={query} namer={namer} onChange={onChange} /> : null}
        <TitleField query={query} onChange={onChange} />
        <ValueField query={query} namer={namer} onChange={onChange} />
      </Group>
    </div>
  )
}

/** „Filtre", with how many are on. */
export function FiltersButton({ query, onClick, className }: { readonly query: Query; readonly onClick: () => void; readonly className?: string }) {
  const count = filterCount(query)
  return (
    <button type="button" onClick={onClick} className={cn('inline-flex min-h-9 items-center gap-1.5 border px-2.5 text-sm font-medium transition-colors hover:bg-muted/60', className)}>
      <SlidersHorizontal className="size-3.5" aria-hidden="true" />
      {t`Filtre`}
      {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
    </button>
  )
}

/** The panel in a sheet: from the right on a wide screen, from the bottom on a phone, with the answer's count to close on. */
export function FilterSheet({
  query,
  answer,
  namer,
  onChange,
  open,
  onOpenChange,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const records = answer.figures.data?.now?.records ?? null
  const count = filterCount(query)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        // Escape in a search with its list open closes the list (each field does it), not the sheet with what was typed.
        onEscapeKeyDown={(event) => {
          const active = document.activeElement
          if (active instanceof HTMLInputElement && active.getAttribute('aria-expanded') === 'true') event.preventDefault()
        }}
        // The close as tall as the header, a whole tap target on a phone; its ring for the keyboard only.
        closeClassName="right-2 top-1 flex size-11 items-center justify-center focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=open]:bg-transparent sm:top-1.5 sm:size-10"
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterPanel query={query} answer={answer} namer={namer} phone={phone} onChange={onChange} />
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button type="button" onClick={() => onChange(cleared(query))} disabled={count === 0} className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}>
            {t`Șterge tot`}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(TALL, 'bg-primary px-3 text-sm font-medium tabular-nums text-primary-foreground hover:bg-primary/90')}>
            {records !== null ? t`Arată ${countText(records)}` : t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
