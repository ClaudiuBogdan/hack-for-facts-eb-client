import { useState, type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { SlidersHorizontal, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { procurementHrefOf } from '@/features/procurement/lib/home-links'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { POPULATIONS, cpvKey, cpvLevelOf, repaired, withFilter, withoutFilter, type AxisId, type PopulationId, type Query } from './analytics.model'
import { useCounties, useLocalities, useNames, type Answer } from './analytics.data'
import { PROCEDURES, useCpvSearch } from './analytics.parts'
import { countText, cpvLabel, keyLabel, populationLabel, type Namer } from './analytics.text'

/**
 * Every filter the query takes, in one panel, in a sheet: from the right on a
 * wide screen, from the bottom on a phone. The quick row above the answer
 * stays for the common moves; this is the whole set, each axis at every level
 * it has. A change applies at once (the address is the state).
 */

const FIELD = 'h-9 w-full min-w-0 border bg-background px-2 text-sm placeholder:text-muted-foreground/70'
const OPTION = 'flex w-full items-baseline justify-between gap-3 px-2 py-1.5 text-left text-sm hover:bg-muted'
const ALL = '__toate__'

/** How many filters a query holds: its axes, its title words, its value range. */
export function filterCount(query: Query): number {
  return Object.keys(query.filters).length + (query.titlu ? 1 : 0) + (query.valoare ? 1 : 0)
}

function cleared(query: Query): Query {
  return repaired({ ...query, filters: {}, titlu: null, valoare: null })
}

function Section({ title, onClear, children }: { readonly title: string; readonly onClear?: (() => void) | null; readonly children: ReactNode }) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <MonoLabel className="text-muted-foreground">{title}</MonoLabel>
        {onClear ? (
          <button type="button" onClick={onClear} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="size-3" aria-hidden="true" />
            {t`Șterge`}
          </button>
        ) : null}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}

function Picked({ label, onClear }: { readonly label: string; readonly onClear: () => void }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 border border-primary/50 bg-primary/5 px-2 text-sm">
      <span className="min-w-0 truncate font-medium">{label}</span>
      <button type="button" onClick={onClear} aria-label={t`Scoate ${label}`} className="shrink-0 text-muted-foreground hover:text-foreground">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

function Options({ children }: { readonly children: ReactNode }) {
  return <ul className="max-h-64 overflow-y-auto border">{children}</ul>
}

// ──────────────────────────────────────────────────────────── fields ──

function PeriodField({ query, answer, onChange }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void }) {
  const cutoff = answer.cutoff ? answer.cutoff[POPULATIONS[query.tip].cutoff] : null
  const lastYear = cutoff ? Number(cutoff.slice(0, 4)) : null
  const years = lastYear ? Array.from({ length: lastYear - 2015 }, (_, index) => lastYear - index) : []
  const [from, setFrom] = useState(answer.period?.from ?? '')
  const [to, setTo] = useState(answer.period?.to ?? '')
  const set = (period: Query['period']) => onChange({ ...query, period })
  // Two months, applied when the focus leaves the pair (or on Enter): moving from one to the other applies nothing half-typed.
  const months = (start: string, end: string) => {
    if (!/^\d{4}-\d{2}$/u.test(start) || !/^\d{4}-\d{2}$/u.test(end) || start > end) return
    if (answer.period && start === answer.period.from && end === answer.period.to) return
    set({ kind: 'months', from: start, to: end })
  }
  const active = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-muted')
  return (
    <>
      <button type="button" onClick={() => set({ kind: 'recent' })} className={cn('h-9 w-full border px-2 text-left text-sm', active(query.period.kind === 'recent'))}>
        {t`Ultimele 12 luni`}
      </button>
      <div className="grid grid-cols-4 gap-1">
        {years.map((year) => (
          <button key={year} type="button" onClick={() => set({ kind: 'year', year })} className={cn('h-8 border text-sm tabular-nums', active(query.period.kind === 'year' && query.period.year === year))}>
            {year}
          </button>
        ))}
      </div>
      <form
        className="grid grid-cols-2 gap-1"
        onSubmit={(event) => {
          event.preventDefault()
          months(from, to)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) months(from, to)
        }}
      >
        <input type="month" value={from} min="2016-01" max={cutoff ?? undefined} onChange={(event) => setFrom(event.target.value)} aria-label={t`De la`} className={cn(FIELD, 'px-1', query.period.kind === 'months' && 'border-primary')} />
        <input type="month" value={to} min="2016-01" max={cutoff ?? undefined} onChange={(event) => setTo(event.target.value)} aria-label={t`Până la`} className={cn(FIELD, 'px-1', query.period.kind === 'months' && 'border-primary')} />
        <button type="submit" className="sr-only">
          {t`Aplică`}
        </button>
      </form>
    </>
  )
}

/** An institution or a firm: its name from the site's search, or a CUI typed as it is. */
function OrgField({ axis, query, namer, onChange }: { readonly axis: 'cumparator' | 'furnizor'; readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const filter = query.filters[axis]
  const search = useSearchResults({ docTypes: ['organization', 'public_enterprise', 'company'], suggestions: false })
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
  if (filter) return <Picked label={keyLabel(axis, 'cui', filter.values[0]!, namer)} onClear={() => onChange(withoutFilter(query, axis))} />
  return (
    <>
      <input
        value={search.term}
        onChange={(event) => search.setTerm(event.target.value)}
        placeholder={t`Nume sau CUI`}
        aria-label={axis === 'furnizor' ? t`Caută o firmă` : t`Caută o instituție`}
        className={FIELD}
      />
      {term.length >= 2 ? (
        <Options>
          {typed ? (
            <li>
              <button type="button" onClick={() => pick(typed)} className={OPTION}>
                <span className="font-mono">{`CUI ${typed}`}</span>
              </button>
            </li>
          ) : null}
          {hits.map((hit) => (
            <li key={hit.id}>
              <button type="button" onClick={() => pick(hit.cui)} className={OPTION}>
                <span className="min-w-0 truncate">{hit.title}</span>
              </button>
            </li>
          ))}
          {hits.length === 0 && !typed ? <li className="px-2 py-1.5 text-sm text-muted-foreground">{search.status.kind === 'empty' ? t`Nimic găsit.` : '…'}</li> : null}
        </Options>
      ) : null}
    </>
  )
}

/** A place: the region, the county, the locality — each finer pick replacing the coarser one. */
function PlaceField({ axis, query, namer, onChange }: { readonly axis: 'loc' | 'loc_firma'; readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const filter = query.filters[axis]
  const geography = useCounties()
  const regions = geography.data?.regions ?? []
  const counties = geography.data?.counties ?? []
  const [term, setTerm] = useState('')
  const localities = useLocalities(filter?.level === 'judet' || filter?.level === 'localitate')
  const locality = filter?.level === 'localitate' ? filter.values[0]! : null
  const county = filter?.level === 'judet' ? filter.values[0]! : locality ? (localities?.get(locality)?.county ?? null) : null
  const region = filter?.level === 'regiune' ? filter.values[0]! : county ? (counties.find((item) => item.countyCode === county)?.region ?? null) : null
  const countyName = (code: string, name: string) => namer.counties.get(code) ?? name
  const shownCounties = counties.filter((item) => !region || item.region === region)
  const found =
    county && localities && term.trim().length >= 2
      ? [...localities.entries()].filter(([, place]) => place.county === county && place.kind !== 'judet' && place.name.toLocaleLowerCase('ro-RO').includes(term.trim().toLocaleLowerCase('ro-RO'))).slice(0, 8)
      : []
  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        <Select value={region ?? ALL} onValueChange={(value) => onChange(value === ALL ? withoutFilter(query, axis) : withFilter(query, axis, 'regiune', value))}>
          <SelectTrigger className="h-9 min-w-0 rounded-none text-sm" aria-label={t`Regiunea`}>
            <SelectValue placeholder={t`Regiunea`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t`Toate regiunile`}</SelectItem>
            {regions.map((item) => (
              <SelectItem key={item.region} value={item.region}>
                {item.region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={county ?? ALL}
          onValueChange={(value) => onChange(value === ALL ? (region ? withFilter(query, axis, 'regiune', region) : withoutFilter(query, axis)) : withFilter(query, axis, 'judet', value))}
        >
          <SelectTrigger className="h-9 min-w-0 rounded-none text-sm" aria-label={t`Județul`}>
            <SelectValue placeholder={t`Județul`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t`Toate județele`}</SelectItem>
            {shownCounties.map((item) => (
              <SelectItem key={item.countyCode} value={item.countyCode}>
                {countyName(item.countyCode, item.countyName)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {locality ? (
        <Picked label={localities?.get(locality)?.name ?? locality} onClear={() => onChange(county ? withFilter(query, axis, 'judet', county) : withoutFilter(query, axis))} />
      ) : county ? (
        <>
          <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t`Localitatea`} aria-label={t`Caută o localitate`} className={FIELD} />
          {found.length > 0 ? (
            <Options>
              {found.map(([code, place]) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => {
                      setTerm('')
                      onChange(withFilter(query, axis, 'localitate', code))
                    }}
                    className={OPTION}
                  >
                    <span className="min-w-0 truncate">{place.name}</span>
                  </button>
                </li>
              ))}
            </Options>
          ) : null}
        </>
      ) : null}
    </>
  )
}

/** A CPV pick from its path: division › group › class › category › code, each step a click back up. */
function cpvPath(prefix: string): readonly string[] {
  const steps = [2, 3, 4, 5].filter((length) => length < prefix.length).map((length) => prefix.slice(0, length))
  // A step ending in 0 is no level of its own (45000000 is the division's own code, not a group „450").
  return [...steps.filter((step) => step.length === 2 || !step.endsWith('0')), prefix]
}

/** A CPV code from the search as the filter it means: trailing zeros mark its level („45200000" is the group „452"). */
function cpvFilterOf(code: string): { readonly level: string; readonly value: string } | null {
  const prefix = code.replace(/0+$/u, '')
  const value = prefix.length < 2 ? code.slice(0, 2) : prefix.length >= 6 ? code : prefix
  const level = cpvLevelOf(value)
  return level ? { level: level.id, value } : null
}

function CpvField({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const filter = query.filters.cpv
  const [term, setTerm] = useState('')
  const found = useCpvSearch(term)
  const prefix = filter?.values[0] ?? null
  const path = prefix ? cpvPath(prefix) : []
  const names = useNames({ orgs: [], cpv: path.map(cpvKey) })
  const local: Namer = { ...namer, names: names.data ?? namer.names }
  return (
    <>
      {path.length > 0 ? (
        <ol className="space-y-1">
          {path.map((step, index) => {
            const last = index === path.length - 1
            const label = cpvLabel(step, local)
            return (
              <li key={step} style={{ paddingLeft: `${index * 0.75}rem` }}>
                {last ? (
                  <Picked label={`${step} · ${label}`} onClear={() => onChange(index > 0 ? withFilter(query, 'cpv', cpvLevelOf(path[index - 1]!)!.id, path[index - 1]!) : withoutFilter(query, 'cpv'))} />
                ) : (
                  <button type="button" onClick={() => onChange(withFilter(query, 'cpv', cpvLevelOf(step)!.id, step))} className="block w-full truncate text-left text-sm text-muted-foreground hover:text-foreground">
                    <span className="font-mono text-xs">{step}</span> {label}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      ) : null}
      <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={t`„drumuri", „medicamente", 45233120`} aria-label={t`Caută o categorie`} className={FIELD} />
      {term.trim().length >= 3 && (found.data ?? []).length > 0 ? (
        <Options>
          {(found.data ?? []).map((hit) => {
            const next = cpvFilterOf(hit.value)
            if (!next) return null
            return (
              <li key={hit.value}>
                <button
                  type="button"
                  onClick={() => {
                    setTerm('')
                    onChange(withFilter(query, 'cpv', next.level, next.value))
                  }}
                  className={OPTION}
                >
                  <span className="min-w-0 truncate">{hit.label}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{next.value}</span>
                </button>
              </li>
            )
          })}
        </Options>
      ) : null}
    </>
  )
}

function ProcedureField({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const picked = query.filters.procedura?.values[0] ?? null
  return (
    <Select value={picked ?? ALL} onValueChange={(value) => onChange(value === ALL ? withoutFilter(query, 'procedura') : withFilter(query, 'procedura', 'tip', value))}>
      <SelectTrigger className="h-9 rounded-none text-sm" aria-label={t`Procedura`}>
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
  )
}

function TitleField({ query, onChange }: { readonly query: Query; readonly onChange: (query: Query) => void }) {
  const [value, setValue] = useState(query.titlu ?? '')
  const apply = () => {
    const words = value.trim()
    if (words.length >= 3 && words !== query.titlu) onChange({ ...query, titlu: words.slice(0, 100) })
    else if (words === '' && query.titlu) onChange({ ...query, titlu: null })
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <input value={value} onChange={(event) => setValue(event.target.value)} onBlur={apply} placeholder={t`„laptop", „deszăpezire"`} aria-label={t`Titlul conține`} className={FIELD} />
    </form>
  )
}

function lei(text: string): number | null {
  const number = Number(text.replace(/[.\s]/gu, '').replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(number) && number >= 0 ? number : null
}

function ValueField({ query, onChange }: { readonly query: Query; readonly onChange: (query: Query) => void }) {
  const [min, setMin] = useState(query.valoare?.min != null ? String(query.valoare.min) : '')
  const [max, setMax] = useState(query.valoare?.max != null ? String(query.valoare.max) : '')
  const apply = () => {
    const low = lei(min)
    const high = lei(max)
    const next = low === null && high === null ? null : { min: low, max: high }
    if (JSON.stringify(next) !== JSON.stringify(query.valoare)) onChange({ ...query, valoare: next })
  }
  return (
    <form
      className="grid grid-cols-2 gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        apply()
      }}
    >
      <input inputMode="numeric" value={min} onChange={(event) => setMin(event.target.value)} onBlur={apply} placeholder={t`de la`} aria-label={t`Valoare de la, lei`} className={FIELD} />
      <input inputMode="numeric" value={max} onChange={(event) => setMax(event.target.value)} onBlur={apply} placeholder={t`până la`} aria-label={t`Valoare până la, lei`} className={FIELD} />
      <button type="submit" className="sr-only">
        {t`Aplică`}
      </button>
    </form>
  )
}

// ───────────────────────────────────────────────────────────── panel ──

export function FilterPanel({
  query,
  answer,
  namer,
  onChange,
  className,
}: {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly className?: string
}) {
  const clear = (axis: AxisId) => (query.filters[axis] ? () => onChange(withoutFilter(query, axis)) : null)
  const contract = POPULATIONS[query.tip].grain === 'contract'
  const period = answer.period ? `${answer.period.from}..${answer.period.to}` : 'none'
  return (
    <div className={cn('divide-y divide-border/70', className)}>
      <Section title={t`Înregistrări`}>
        <IndicatorToggle<PopulationId>
          label={t`Ce înregistrări`}
          value={query.tip}
          onChange={(tip) => onChange(repaired({ ...query, tip, masura: POPULATIONS[tip].defaultMeasure }))}
          options={(['directe', 'contracte', 'acorduri'] as const).map((key) => ({ key, label: populationLabel(key) }))}
          className="grid w-full grid-cols-3"
        />
      </Section>
      <Section title={t`Perioada`} onClear={query.period.kind !== 'recent' ? () => onChange({ ...query, period: { kind: 'recent' } }) : null}>
        <PeriodField key={period} query={query} answer={answer} onChange={onChange} />
      </Section>
      <Section title={t`Instituția`} onClear={clear('cumparator')}>
        <OrgField axis="cumparator" query={query} namer={namer} onChange={onChange} />
      </Section>
      <Section title={t`Locul instituției`} onClear={clear('loc')}>
        <PlaceField axis="loc" query={query} namer={namer} onChange={onChange} />
      </Section>
      <Section title={t`Firma`} onClear={clear('furnizor')}>
        <OrgField axis="furnizor" query={query} namer={namer} onChange={onChange} />
      </Section>
      <Section title={t`Locul firmei`} onClear={clear('loc_firma')}>
        <PlaceField axis="loc_firma" query={query} namer={namer} onChange={onChange} />
      </Section>
      <Section title={t`Categoria`} onClear={clear('cpv')}>
        <CpvField query={query} namer={namer} onChange={onChange} />
      </Section>
      {contract ? (
        <Section title={t`Procedura`} onClear={clear('procedura')}>
          <ProcedureField query={query} namer={namer} onChange={onChange} />
          </Section>
      ) : null}
      <Section title={t`Titlul conține`} onClear={query.titlu ? () => onChange({ ...query, titlu: null }) : null}>
        <TitleField key={query.titlu ?? ''} query={query} onChange={onChange} />
      </Section>
      <Section title={t`Valoarea, lei`} onClear={query.valoare ? () => onChange({ ...query, valoare: null }) : null}>
        <ValueField key={JSON.stringify(query.valoare)} query={query} onChange={onChange} />
      </Section>
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={phone ? 'bottom' : 'right'} onOverlayClick={() => onOpenChange(false)} className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}>
        <div className="border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterPanel query={query} answer={answer} namer={namer} onChange={onChange} />
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button type="button" onClick={() => onChange(cleared(query))} disabled={filterCount(query) === 0} className="h-10 border px-3 text-sm hover:bg-muted disabled:opacity-40">
            {t`Șterge tot`}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 bg-primary px-3 text-sm font-medium tabular-nums text-primary-foreground hover:bg-primary/90">
            {records !== null ? t`Arată ${countText(records)}` : t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
