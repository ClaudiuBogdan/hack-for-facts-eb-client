import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { ChevronRight, Loader2, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { MIN_QUERY_CHARS, useSearchResults } from '@/features/landing/hooks/use-landing-search'
import { procurementHrefOf } from '@/features/procurement/lib/home-links'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { cpvKey, cpvLevelOf, POPULATIONS, repaired, withFilter, withoutFilter, withTitle, type PopulationId, type Query } from '@/features/procurement/lib/analytics-model'
import { useCpvSearch, useNames, type Answer } from '@/features/procurement/hooks/use-procurement-analytics'
import { countText, cpvLabel, headlineParts, keyLabel, recordsTab, type Namer } from '@/features/procurement/lib/analytics-text'
import { filterCount, PROCEDURES } from '@/features/procurement/components/analytics/analytics-view'
import { SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { MonthField } from './month-field'
import { browsePlaces, kindLabel, placePath, scopeOf, searchPlaces, usePlaceIndex, type Place, type PlaceIndex, type PlaceMatches } from './places'

/**
 * The filters sheet, regrouped: five heads for the query's five questions —
 * what records, when, who buys, who sells, what — each row a label and one
 * control; a value set is a chip with its own ✕, a value unset an input.
 * A place is one search over regions, counties and localities, each named
 * with its kind first („Jud. Sibiu", „Municipiul Sibiu"), shown as its path
 * from the region down, each crumb a step back up. Every list under a search
 * takes the arrow keys. The months read in the page's language. Every tap
 * target is 40 px tall, 44 on a phone (the owner, 30 September 2026: no
 * small buttons). The sheet, the footer and the address are the page's.
 */

/** A control's height: 44 px on a phone, 40 px from `sm`. */
const TALL = 'min-h-11 sm:min-h-10'
const FIELD = `${TALL} w-full min-w-0 border bg-background px-2.5 text-sm placeholder:text-muted-foreground/70`
const OPTION = `flex ${TALL} w-full items-center justify-between gap-3 px-2.5 py-1 text-left text-sm hover:bg-muted aria-selected:bg-muted`
const CELL = `${TALL} border bg-background px-2 text-sm hover:bg-muted`
const ALL = '__toate__'

function cleared(query: Query): Query {
  return repaired({ ...query, filters: {}, titlu: null, valoare: null })
}

// ───────────────────────────────────────────────────────────── layout ──

function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <MonoLabel className="block text-muted-foreground">{title}</MonoLabel>
      <div className="mt-2.5 space-y-2">{children}</div>
    </section>
  )
}

/** A label and its control: the label column is what tells two rows of one group apart. */
function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-start gap-2">
      <span className="pt-3.5 text-xs leading-tight text-muted-foreground sm:pt-3">{label}</span>
      <div className="min-w-0 space-y-1.5">{children}</div>
    </div>
  )
}

function Chip({ label, onClear, children }: { readonly label: string; readonly onClear: () => void; readonly children?: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-1 border border-primary/50 bg-primary/5 pl-2.5', TALL)}>
      {children ?? (
        <span className="min-w-0 truncate text-sm font-medium" title={label}>
          {label}
        </span>
      )}
      <button type="button" onClick={onClear} aria-label={t`Scoate ${label}`} className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground sm:size-10">
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

/**
 * The arrow keys over the list under a search field, as a combobox: the
 * field keeps the focus (and Home and End stay the text's), the active row
 * is its `aria-activedescendant`, Enter picks it — with none active, Enter
 * picks the first, as before. A new list (`reset`) starts with none active.
 */
function useActiveOption(count: number, reset: string) {
  const id = useId()
  const listId = `${id}-list`
  const [active, setActive] = useState(-1)
  const [seen, setSeen] = useState(reset)
  if (seen !== reset) {
    setSeen(reset)
    setActive(-1)
  }
  const current = active < count ? active : -1
  useEffect(() => {
    if (current >= 0) document.getElementById(`${id}-option-${current}`)?.scrollIntoView({ block: 'nearest' })
  }, [current, id])
  return {
    listId,
    input: (open: boolean) =>
      ({
        role: 'combobox',
        'aria-expanded': open,
        'aria-controls': listId,
        'aria-autocomplete': 'list',
        'aria-activedescendant': open && current >= 0 ? `${id}-option-${current}` : undefined,
      }) as const,
    option: (index: number) => ({ id: `${id}-option-${index}`, role: 'option', 'aria-selected': index === current }) as const,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>, pick: (index: number) => void) => {
      if (count === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive(current + 1 >= count ? 0 : current + 1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive(current <= 0 ? count - 1 : current - 1)
      } else if (event.key === 'Enter' && current >= 0) {
        event.preventDefault()
        pick(current)
      }
    },
  }
}

/** The list under a search, and what it says instead of rows: it keeps the input's focus, so a tap on a row is a pick and not a blur. */
function Options({ id, label, notices, children }: { readonly id: string; readonly label: string; readonly notices?: ReactNode; readonly children?: ReactNode }) {
  return (
    <div className="max-h-80 overflow-y-auto border" onMouseDown={(event) => event.preventDefault()}>
      <ul id={id} role="listbox" aria-label={label}>
        {children}
      </ul>
      {notices}
    </div>
  )
}

function Head({ children }: { readonly children: ReactNode }) {
  return (
    <li role="presentation" className="px-2.5 pb-1 pt-2.5">
      <MonoLabel className="block text-muted-foreground">{children}</MonoLabel>
    </li>
  )
}

/**
 * What a list says while it has no rows: that it is reading (announced as
 * a status), that the read failed (announced, with the read to run again),
 * or that nothing matched — each in words, so none passes for another.
 */
function Notice({ kind, onRetry, children }: { readonly kind: 'loading' | 'failed' | 'empty'; readonly onRetry?: () => void; readonly children: ReactNode }) {
  return (
    <div role={kind === 'failed' ? 'alert' : kind === 'loading' ? 'status' : undefined} className={cn(OPTION, 'flex-wrap justify-start gap-x-3 gap-y-0 py-2 text-muted-foreground hover:bg-transparent')}>
      {kind === 'loading' ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" /> : null}
      <span className="min-w-0">{children}</span>
      {kind === 'failed' && onRetry ? (
        // Its own line when the words leave it no room; never a truncated message.
        <button type="button" onClick={onRetry} className="ml-auto min-h-8 shrink-0 font-medium text-foreground underline-offset-4 hover:underline">
          {t`Încearcă din nou`}
        </button>
      ) : null}
    </div>
  )
}

// ───────────────────────────────────────────────────────────── period ──

/** The years shown before „Arată mai multe". */
const RECENT_YEARS = 4

function PeriodRows({ query, answer, onChange }: { readonly query: Query; readonly answer: Answer; readonly onChange: (query: Query) => void }) {
  const cutoff = answer.cutoff ? answer.cutoff[POPULATIONS[query.tip].cutoff] : null
  const lastYear = cutoff ? Number(cutoff.slice(0, 4)) : null
  const years = lastYear ? Array.from({ length: lastYear - 2015 }, (_, index) => lastYear - index) : []
  const [more, setMore] = useState(false)
  const picked = query.period.kind === 'year' ? query.period.year : null
  // The recent years, or all of them: opened by the reader, or by a picked year that would be hidden.
  const open = more || (picked !== null && !years.slice(0, RECENT_YEARS).includes(picked))
  const shown = open ? years : years.slice(0, RECENT_YEARS)
  const set = (period: Query['period']) => onChange({ ...query, period })
  const active = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : '')
  const from = answer.period?.from ?? ''
  const to = answer.period?.to ?? ''
  const months = query.period.kind === 'months'
  return (
    <>
      <Row label="">
        <button type="button" onClick={() => set({ kind: 'recent' })} className={cn(CELL, 'w-full text-left', active(query.period.kind === 'recent'))}>
          {t`Ultimele 12 luni`}
        </button>
      </Row>
      <Row label={t`Anul`}>
        <div className="grid grid-cols-4 gap-1.5">
          {shown.map((year) => (
            <button key={year} type="button" onClick={() => set({ kind: 'year', year })} className={cn(CELL, 'tabular-nums', active(picked === year))}>
              {year}
            </button>
          ))}
        </div>
        {years.length > RECENT_YEARS ? (
          <button type="button" aria-expanded={open} onClick={() => setMore(!open)} className={cn(SHOW_MORE_CLASS, TALL, 'mt-0 font-normal text-muted-foreground hover:text-foreground')}>
            {open ? t`Arată mai puține` : t`Arată mai multe`}
          </button>
        ) : null}
      </Row>
      <Row label={t`Lunile`}>
        <div className="grid grid-cols-2 gap-1.5">
          <MonthField value={from} min="2007-01" max={cutoff ?? '2099-12'} active={months} label={t`De la`} className={TALL} onChange={(month) => set({ kind: 'months', from: month, to: to && to >= month ? to : month })} />
          <MonthField value={to} min="2007-01" max={cutoff ?? '2099-12'} active={months} label={t`Până la`} className={TALL} onChange={(month) => set({ kind: 'months', from: from && from <= month ? from : month, to: month })} />
        </div>
      </Row>
    </>
  )
}

// ───────────────────────────────────────────────────────────── parties ──

/** An institution or a firm: its name from the site's search, or a CUI typed as it is. */
function OrgRow({ axis, label, query, namer, onChange }: { readonly axis: 'cumparator' | 'furnizor'; readonly label: string; readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
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
  // The search hook runs its read again when asked by its key; it has no retry of its own.
  const client = useQueryClient()
  const retry = () => void client.refetchQueries({ queryKey: ['landingUniversalSearch'] })
  const { status } = search
  // Hits of the wrong family filtered out can leave a successful read with no rows: said as nothing, not as reading.
  const state = status.kind === 'results' && hits.length === 0 ? 'empty' : status.kind
  // The rows in order, for the arrow keys: the CUI as typed first, then the search's hits.
  const choices = [...(typed ? [typed] : []), ...hits.map((hit) => hit.cui)]
  const keys = useActiveOption(choices.length, term)
  const open = Boolean(typed) || term.length >= MIN_QUERY_CHARS
  const listLabel = axis === 'furnizor' ? t`Firme` : t`Instituții`
  return (
    <Row label={label}>
      {filter ? (
        <Chip label={keyLabel(axis, 'cui', filter.values[0]!, namer)} onClear={() => onChange(withoutFilter(query, axis))} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const first = choices[0]
            if (first) pick(first)
          }}
        >
          <input
            {...keys.input(open)}
            value={search.term}
            onChange={(event) => search.setTerm(event.target.value)}
            onKeyDown={(event) => keys.onKeyDown(event, (index) => pick(choices[index]!))}
            placeholder={t`Nume sau CUI`}
            aria-label={axis === 'furnizor' ? t`Caută o firmă` : t`Caută o instituție`}
            className={FIELD}
          />
          {open ? (
            <Options
              id={keys.listId}
              label={listLabel}
              notices={
                state === 'pending' || state === 'loading' ? (
                  <Notice kind="loading">{t`Se caută…`}</Notice>
                ) : state === 'error' || state === 'invalid' ? (
                  <Notice kind="failed" onRetry={retry}>
                    {t`Căutarea nu a mers.`}
                  </Notice>
                ) : state === 'empty' && !typed ? (
                  <Notice kind="empty">{t`Nimic pentru „${term}".`}</Notice>
                ) : null
              }
            >
              {typed ? (
                <li role="presentation">
                  <button type="button" {...keys.option(0)} onClick={() => pick(typed)} className={OPTION}>
                    <span className="font-mono">{`CUI ${typed}`}</span>
                  </button>
                </li>
              ) : null}
              {hits.map((hit, index) => (
                <li key={hit.id} role="presentation">
                  <button type="button" {...keys.option(index + (typed ? 1 : 0))} onClick={() => pick(hit.cui)} className={OPTION}>
                    <span className="min-w-0 truncate">{hit.title}</span>
                  </button>
                </li>
              ))}
            </Options>
          ) : null}
        </form>
      )}
    </Row>
  )
}

/** A place in a list under its level's head: its bare name, its finer kind as a tag, and its county where the scope is wider than one. */
function PlaceOption({
  place,
  index,
  withCounty,
  option,
  onPick,
}: {
  readonly place: Place
  readonly index: PlaceIndex
  readonly withCounty: boolean
  readonly option: ReturnType<ReturnType<typeof useActiveOption>['option']>
  readonly onPick: (place: Place) => void
}) {
  const kind = kindLabel(place.kind)
  const county = withCounty && place.county ? (index.byValue.get(`judet:${place.county}`)?.name ?? place.county) : null
  return (
    <li role="presentation">
      <button type="button" {...option} onClick={() => onPick(place)} className={OPTION}>
        <span className="min-w-0 truncate">{place.name}</span>
        {kind || county ? (
          <span className="flex shrink-0 items-baseline gap-2 text-xs text-muted-foreground">
            {kind ? <MonoLabel>{kind}</MonoLabel> : null}
            {county ? <span>{county}</span> : null}
          </span>
        ) : null}
      </button>
    </li>
  )
}

/** Regions or counties to browse, under their level's head: a grid of whole buttons, two to a row; a long name takes a second line rather than an ellipsis. */
function PlaceGrid({
  id,
  title,
  places,
  option,
  onPick,
}: {
  readonly id: string
  readonly title: string
  readonly places: readonly Place[]
  readonly option: ReturnType<typeof useActiveOption>['option']
  readonly onPick: (place: Place) => void
}) {
  return (
    <div onMouseDown={(event) => event.preventDefault()}>
      <MonoLabel className="block pb-1.5 pt-1 text-muted-foreground" aria-hidden="true">
        {title}
      </MonoLabel>
      <div id={id} role="listbox" aria-label={title} className="grid grid-cols-2 gap-1.5">
        {places.map((place, index) => (
          <button key={place.value} type="button" {...option(index)} onClick={() => onPick(place)} className={cn(CELL, 'py-1.5 text-left leading-snug aria-selected:border-primary/60 aria-selected:bg-muted')}>
            {place.name}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The path from the region down, each name with its kind: the crumbs before
 * the last widen the place to themselves, the ✕ removes it.
 */
function PathChip({ path, onWiden, onClear }: { readonly path: readonly Place[]; readonly onWiden: (place: Place) => void; readonly onClear: () => void }) {
  const last = path[path.length - 1]!
  return (
    <Chip label={last.label} onClear={onClear}>
      {/* A path the chip cannot hold on one line wraps to a second, every name whole; only a name longer than the line itself is cut. */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center text-sm" title={path.map((crumb) => crumb.label).join(' › ')}>
        {path.slice(0, -1).map((crumb) => (
          <span key={crumb.value} className="flex shrink-0 items-center">
            <button type="button" onClick={() => onWiden(crumb)} title={t`Doar ${crumb.label}`} className={cn(TALL, 'text-muted-foreground hover:text-foreground')}>
              {crumb.label}
            </button>
            <ChevronRight className="mx-1 size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
          </span>
        ))}
        <span className="min-w-0 max-w-full truncate font-medium">{last.label}</span>
      </span>
    </Chip>
  )
}

/**
 * A place: one search over the three levels. Before a word is typed the
 * field offers what the scope holds — the regions, a region's counties, a
 * county's largest places; a pick keeps the list open on the next level
 * down.
 */
function PlaceRow({ axis, query, onChange }: { readonly axis: 'loc' | 'loc_firma'; readonly query: Query; readonly onChange: (query: Query) => void }) {
  const filter = query.filters[axis]
  const [term, setTerm] = useState('')
  const [focused, setFocused] = useState(false)
  const typed = term.trim().length >= 2
  const { index, loading, failed, retry, countiesFailed, countiesLoading, retryCounties } = usePlaceIndex(focused || typed || filter?.level === 'judet' || filter?.level === 'localitate')
  const path = placePath(index, filter)
  const last = path[path.length - 1] ?? null
  const scope = scopeOf(path)
  const matches: PlaceMatches = typed ? searchPlaces(index, term, scope) : browsePlaces(index, scope)
  const pick = (place: Place) => {
    setTerm('')
    onChange(withFilter(query, axis, place.level, place.value))
  }
  const placeholder = scope.county ? t`Localitate din ${last?.name ?? ''}` : scope.region ? t`Județ sau localitate din ${last?.name ?? ''}` : t`Regiune, județ sau localitate`
  // Browsing regions or counties is a grid; everything else is a list under its level's head.
  const grid = !typed && !scope.county
  const none = matches.regions.length + matches.counties.length + matches.localities.length === 0
  // The localities are asked of the map's file: in a search, and in a county's own list.
  const wantsLocalities = typed || Boolean(scope.county)
  // The rows in the order they are drawn, for the arrow keys: the grid's regions or counties, or the list's three levels.
  const gridPlaces = scope.region ? matches.counties : matches.regions
  const choices: readonly Place[] = grid ? gridPlaces : [...matches.regions, ...matches.counties, ...matches.localities]
  const open = (focused || typed) && !(grid && (countiesFailed || countiesLoading))
  const keys = useActiveOption(open ? choices.length : 0, `${term}|${scope.region ?? ''}|${scope.county ?? ''}`)
  const at = (place: Place) => keys.option(choices.indexOf(place))
  return (
    <Row label={t`Locul`}>
      {last ? <PathChip path={path} onWiden={(crumb) => onChange(withFilter(query, axis, crumb.level, crumb.value))} onClear={() => onChange(withoutFilter(query, axis))} /> : null}
      {last?.level !== 'localitate' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const first = matches.regions[0] ?? matches.counties[0] ?? matches.localities[0]
            if (first) pick(first)
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
          }}
          className="space-y-1.5"
        >
          <input
            {...keys.input(open)}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.currentTarget.blur()
              else keys.onKeyDown(event, (position) => pick(choices[position]!))
            }}
            placeholder={placeholder}
            aria-label={axis === 'loc_firma' ? t`Caută locul firmei` : t`Caută locul instituției`}
            className={FIELD}
          />
          {focused || typed ? (
            grid ? (
              countiesFailed || countiesLoading ? (
                <Options
                  id={keys.listId}
                  label={t`Regiuni și județe`}
                  notices={
                    countiesLoading ? (
                      <Notice kind="loading">{t`Se încarcă regiunile și județele…`}</Notice>
                    ) : (
                      <Notice kind="failed" onRetry={retryCounties}>
                        {t`Regiunile și județele nu s-au încărcat.`}
                      </Notice>
                    )
                  }
                />
              ) : (
                <PlaceGrid id={keys.listId} title={scope.region ? t`Județe` : t`Regiuni`} places={gridPlaces} option={keys.option} onPick={pick} />
              )
            ) : (
              <Options
                id={keys.listId}
                label={t`Locuri`}
                notices={
                  wantsLocalities && loading ? (
                    <Notice kind="loading">{t`Se încarcă localitățile…`}</Notice>
                  ) : wantsLocalities && failed ? (
                    <Notice kind="failed" onRetry={retry}>
                      {t`Localitățile nu s-au încărcat.`}
                    </Notice>
                  ) : none ? (
                    <Notice kind="empty">{typed ? t`Nimic pentru „${term.trim()}".` : t`Nimic de arătat.`}</Notice>
                  ) : null
                }
              >
                {matches.regions.length > 0 ? <Head>{t`Regiuni`}</Head> : null}
                {matches.regions.map((place) => (
                  <PlaceOption key={place.value} place={place} index={index} withCounty={false} option={at(place)} onPick={pick} />
                ))}
                {matches.counties.length > 0 ? <Head>{t`Județe`}</Head> : null}
                {matches.counties.map((place) => (
                  <PlaceOption key={place.value} place={place} index={index} withCounty={false} option={at(place)} onPick={pick} />
                ))}
                {matches.localities.length > 0 ? <Head>{t`Localități`}</Head> : null}
                {matches.localities.map((place) => (
                  <PlaceOption key={place.value} place={place} index={index} withCounty={!scope.county} option={at(place)} onPick={pick} />
                ))}
              </Options>
            )
          ) : null}
        </form>
      ) : null}
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

/** A CPV code from the search as the filter it means: trailing zeros mark its level („45200000" is the group „452"). */
function cpvFilterOf(code: string): { readonly level: string; readonly value: string } | null {
  const prefix = code.replace(/0+$/u, '')
  const value = prefix.length < 2 ? code.slice(0, 2) : prefix.length >= 6 ? code : prefix
  const level = cpvLevelOf(value)
  return level ? { level: level.id, value } : null
}

function CpvRow({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
  const filter = query.filters.cpv
  const [term, setTerm] = useState('')
  const found = useCpvSearch(term)
  const prefix = filter?.values[0] ?? null
  const path = prefix ? cpvPath(prefix) : []
  const names = useNames({ orgs: [], cpv: path.map(cpvKey) })
  const local: Namer = { ...namer, names: names.data ?? namer.names }
  const asked = term.trim().length >= 3
  const fresh = (found.data ?? []).flatMap((hit) => {
    const next = cpvFilterOf(hit.value)
    return next ? [{ label: hit.label, ...next }] : []
  })
  // The last answer stays on screen while the next one is read (the read has no placeholder of its own), so typing does not flicker.
  const [kept, setKept] = useState(fresh)
  useEffect(() => {
    if (found.data) setKept(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fresh` is derived from `found.data`.
  }, [found.data])
  const hits = found.data ? fresh : kept
  const pick = (hit: { readonly level: string; readonly value: string }) => {
    setTerm('')
    setKept([])
    onChange(withFilter(query, 'cpv', hit.level, hit.value))
  }
  const keys = useActiveOption(asked ? hits.length : 0, term)
  return (
    <Row label={t`Categoria`}>
      {path.length > 0 ? (
        <ol className="space-y-1.5">
          {path.map((step, index) => {
            const last = index === path.length - 1
            const label = cpvLabel(step, local)
            return (
              <li key={step}>
                {last ? (
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
            if (hits[0]) pick(hits[0])
          }}
          className="space-y-1.5"
        >
          <input
            {...keys.input(asked)}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => keys.onKeyDown(event, (position) => pick(hits[position]!))}
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
                  <Notice kind="failed" onRetry={() => void found.refetch()}>
                    {t`Căutarea nu a mers.`}
                  </Notice>
                ) : found.isPending && hits.length === 0 ? (
                  <Notice kind="loading">{t`Se caută…`}</Notice>
                ) : found.data && fresh.length === 0 ? (
                  <Notice kind="empty">{t`Nimic pentru „${term.trim()}".`}</Notice>
                ) : null
              }
            >
              {hits.map((hit, index) => (
                <li key={hit.value} role="presentation">
                  <button type="button" {...keys.option(index)} onClick={() => pick(hit)} className={OPTION}>
                    <span className="min-w-0 truncate">{hit.label}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{hit.value}</span>
                  </button>
                </li>
              ))}
            </Options>
          ) : null}
        </form>
      ) : null}
    </Row>
  )
}

function ProcedureRow({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
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

function TitleRow({ query, onChange }: { readonly query: Query; readonly onChange: (query: Query) => void }) {
  const [value, setValue] = useState('')
  const apply = () => {
    const words = value.trim()
    if (words.length >= 3) {
      setValue('')
      onChange(withTitle(query, words.slice(0, 100)))
    }
  }
  return (
    <Row label={t`Titlul`}>
      {query.titlu ? (
        <Chip label={`„${query.titlu}"`} onClear={() => onChange(withTitle(query, null))} />
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

function lei(text: string): number | null {
  const number = Number(text.replace(/[.\s]/gu, '').replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(number) && number >= 0 ? number : null
}

function ValueRow({ query, namer, onChange }: { readonly query: Query; readonly namer: Namer; readonly onChange: (query: Query) => void }) {
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
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) apply()
          }}
        >
          <input inputMode="numeric" value={min} onChange={(event) => setMin(event.target.value)} placeholder={t`de la`} aria-label={t`Valoare de la, lei`} className={FIELD} />
          <input inputMode="numeric" value={max} onChange={(event) => setMax(event.target.value)} placeholder={t`până la`} aria-label={t`Valoare până la, lei`} className={FIELD} />
          <span className="text-xs text-muted-foreground">{t`lei`}</span>
          <button type="submit" className="sr-only">
            {t`Aplică`}
          </button>
        </form>
      )}
    </Row>
  )
}

// ────────────────────────────────────────────────────────────── panel ──

export function FableFilterPanel({
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
      onFocus={(event) => {
        if (phone && event.target instanceof HTMLInputElement && event.target.getAttribute('role') === 'combobox') setLifted(event.target)
      }}
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
        <OrgRow axis="cumparator" label={t`Instituția`} query={query} namer={namer} onChange={onChange} />
        <PlaceRow axis="loc" query={query} onChange={onChange} />
      </Group>
      <Group title={t`Cine vinde`}>
        <OrgRow axis="furnizor" label={t`Firma`} query={query} namer={namer} onChange={onChange} />
        <PlaceRow axis="loc_firma" query={query} onChange={onChange} />
      </Group>
      <Group title={t`Ce cumpără`}>
        <CpvRow query={query} namer={namer} onChange={onChange} />
        {contract ? <ProcedureRow query={query} namer={namer} onChange={onChange} /> : null}
        <TitleRow query={query} onChange={onChange} />
        <ValueRow query={query} namer={namer} onChange={onChange} />
      </Group>
    </div>
  )
}

/** The panel in the page's sheet: from the right on a wide screen, from the bottom on a phone, the answer's count to close on. */
export function FableFilterSheet({
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
        // The close as tall as the header, a whole tap target on a phone.
        closeClassName="right-2 top-1 flex size-11 items-center justify-center focus:ring-0 focus-visible:ring-2 data-[state=open]:bg-transparent sm:top-1.5 sm:size-10"
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FableFilterPanel query={query} answer={answer} namer={namer} phone={phone} onChange={onChange} />
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
