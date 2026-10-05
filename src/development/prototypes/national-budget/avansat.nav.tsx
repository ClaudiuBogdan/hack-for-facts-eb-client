import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { t } from '@lingui/core/macro'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Search, X } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { approvedTotalsOptions } from '@/features/national-budget/analytics/hooks/use-national-budget-analytics'
import { useWindowSize } from '@/hooks/useWindowSize'
import { plotOf } from '@/features/national-budget/analytics/lib/exact'
import { SECTION_ROOT, isSubtotal, parentOf, treeLines } from '@/features/national-budget/analytics/lib/lines'
import { cn } from '@/lib/utils'
import type { BudgetApprovedEdition, BudgetNationalCatalog } from '@/schemas/national-budget-api'
import { labelOf } from './avansat.execution'
import { creditTypeOf } from './avansat.law'
import { DEFAULTS, TABS, itemOfRand, randOfItem, type AdvancedState, type BudgetKey, type Dupa } from './avansat.state'
import { BUDGET_COMPONENTS, QUESTIONS, SECTION_OF, componentLabel, isExecution, lawChapters } from './avansat.view'

/**
 * The contents: everything the page answers, in a side panel the search
 * opens („Caută", `/`, Ctrl/⌘ K), from the right as the filters are, from the
 * bottom on a phone. The bulletins' lines as their tree, the budgets, the
 * law's views and chapters, the ministries, the ready questions. Where the
 * reader stands is marked and its branch open; the filter on top, focused on
 * opening, searches it all.
 */

type Change = (patch: Partial<AdvancedState>) => void

export const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('ro-RO')

/**
 * Every word typed must begin a word of the name (or, failing that, sit inside
 * it): „inv" finds „Învățământ", not every name with an i, n and v in order.
 */
export function rank(search: string, label: string): number {
  const text = plain(label)
  const words = text.split(/[^\p{L}\p{N}]+/u)
  const tokens = plain(search).split(/\s+/u).filter(Boolean)
  if (tokens.length === 0) return 1
  let score = 0
  for (const token of tokens) {
    if (words.some((word) => word.startsWith(token))) score += 1
    else if (text.includes(token)) score += 0.4
    else return 0
  }
  // A name that begins with what was typed comes first: „sanatate" → „Sănătate" before „Fondul de sănătate".
  return score / tokens.length + (text.startsWith(tokens.join(' ')) ? 0.5 : 0)
}

type NavNode = {
  readonly id: string
  readonly label: string
  readonly patch: Partial<AdvancedState>
  readonly active: boolean
  readonly children: readonly NavNode[]
}

type NavSection = {
  readonly id: string
  readonly title: string
  readonly nodes: readonly NavNode[]
  /** Folded until the reader opens it. */
  readonly folded?: boolean
  /** What the section holds now, beside its title while folded. */
  readonly now?: string
}

type Execution = 'cheltuieli' | 'venituri' | 'sold'

/** The tab a population opens on: the one the reader is on, when the population has it. */
function keepTab(state: AdvancedState, tip: Execution): Dupa {
  return isExecution(state.tip) && TABS[tip].includes(state.dupa) ? state.dupa : TABS[tip][0]!
}

/** A line is followed: on the budgets or time tab it stays there; from the categories (which show every line) it goes to its history. */
function lineGo(state: AdvancedState, tip: 'cheltuieli' | 'venituri', itemId: string): Partial<AdvancedState> {
  const stay = state.tip === tip && (state.dupa === 'timp' || state.dupa === 'bugete')
  return { tip, rand: randOfItem(itemId), dupa: stay ? state.dupa : 'timp' }
}

/** A section's lines as the bulletin's tree, in its order; the subtotal of transfers stays out. */
function lineNodes(catalog: BudgetNationalCatalog, state: AdvancedState, tip: 'cheltuieli' | 'venituri'): readonly NavNode[] {
  const section = SECTION_OF[tip]
  const root = SECTION_ROOT[section]
  const items = catalog.execution.seriesItems.filter((item) => item.section === section && !isSubtotal(item.itemId)).map((item) => item.itemId)
  const present = new Set(items)
  const order = treeLines({ section, sectionItems: items, present }).map((row) => row.itemId)
  const parentIn = (itemId: string) => {
    let parent = parentOf(itemId)
    while (parent && parent !== root && !present.has(parent)) parent = parentOf(parent)
    return parent ?? root
  }
  const focus = state.tip === tip && state.dupa !== 'categorii' ? itemOfRand(state.rand) : null
  const build = (parent: string): readonly NavNode[] =>
    order
      .filter((itemId) => parentIn(itemId) === parent)
      .map((itemId) => {
        const children = build(itemId)
        return { id: `line:${itemId}`, label: labelOf(catalog, itemId), patch: lineGo(state, tip, itemId), active: focus === itemId, children }
      })
  return build(root)
}

/** The newest (or chosen) law's ministries, largest first; read without holding the page. */
function useMinistries(catalog: BudgetNationalCatalog, edition: BudgetApprovedEdition | null) {
  const client = useQueryClient()
  const { data } = useQuery({
    ...approvedTotalsOptions(client, catalog.snapshots.approved, {
      totals: ['AUTHORITY_EXPENDITURE_5001'],
      editionIds: edition ? [edition.id] : [],
      creditTypes: [creditTypeOf(DEFAULTS)],
      measures: ['APPROVED'],
    }),
    enabled: edition !== null,
  })
  return (data ?? []).flatMap((cell) => (cell.authority ? [{ code: cell.authority.code, name: cell.authority.name, lei: plotOf(cell.value) ?? 0 }] : [])).sort((a, b) => b.lei - a.lei)
}

function useNavSections({
  catalog,
  state,
  edition,
  lawYear,
}: {
  readonly catalog: BudgetNationalCatalog
  readonly state: AdvancedState
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
}): readonly NavSection[] {
  const ministries = useMinistries(catalog, edition)
  const execution = isExecution(state.tip)
  const population = (tip: Execution, label: string, children: readonly NavNode[]): NavNode => ({
    id: `tip:${tip}`,
    label,
    patch: { tip, rand: null, dupa: keepTab(state, tip) },
    active: state.tip === tip && !state.rand,
    children,
  })
  const budgetTip: Execution = execution ? (state.tip as Execution) : 'cheltuieli'
  const budgetTab: Dupa = execution && state.dupa !== 'bugete' ? state.dupa : TABS[budgetTip][0]!
  const budget = (key: BudgetKey | null): NavNode => ({
    id: `budget:${key ?? 'all'}`,
    label: key ? componentLabel(key) : t`Toate (bugetul general consolidat)`,
    patch: { tip: budgetTip, dupa: budgetTab, buget: key },
    active: execution && state.dupa !== 'bugete' && state.buget === key,
    children: [],
  })
  const law = (id: string, label: string, patch: Partial<AdvancedState>, active: boolean, children: readonly NavNode[] = []): NavNode => ({
    id,
    label,
    patch: { tip: 'lege', ...patch },
    active,
    children,
  })
  const chapters = state.tip === 'lege' && state.dupa === 'capitole'
  const spendingChapters = chapters && state.linie === 'cheltuieli'
  return [
    {
      id: 'executie',
      title: t`Execuția · buletinele MF`,
      nodes: [
        population('cheltuieli', t`Cheltuieli`, lineNodes(catalog, state, 'cheltuieli')),
        population('venituri', t`Venituri`, lineNodes(catalog, state, 'venituri')),
        population('sold', t`Deficit`, []),
        {
          id: 'bugete',
          label: t`Fiecare buget, alături`,
          patch: { tip: budgetTip, dupa: 'bugete' },
          active: execution && state.dupa === 'bugete',
          children: [],
        },
      ],
    },
    {
      id: 'buget',
      title: t`Bugetul citit`,
      // Folded while the page reads the consolidated budget; its title says which one it reads.
      folded: !(execution && state.buget),
      now: execution && state.buget ? componentLabel(state.buget) : t`consolidat`,
      nodes: [budget(null), ...BUDGET_COMPONENTS.map(budget)],
    },
    {
      id: 'lege',
      title: t`Legea pe ${lawYear}`,
      nodes: [
        law('lege:fonduri', t`Ce aprobă, pe fonduri`, { dupa: 'fonduri' }, state.tip === 'lege' && state.dupa === 'fonduri'),
        law(
          'lege:capitole',
          t`Pe domenii (capitole)`,
          { dupa: 'capitole', linie: 'cheltuieli', clasificare: 'capitole', rand: null },
          spendingChapters && state.clasificare === 'capitole' && !state.rand,
          // The chapters' codes (*01) are the state budget's: a chapter opens there, whichever fund was read.
          lawChapters()
            .filter((chapter) => chapter.linie === 'cheltuieli')
            .map((chapter) =>
              law(
                `lege:capitol:${chapter.code}`,
                chapter.label,
                { dupa: 'capitole', fond: 'stat', linie: 'cheltuieli', clasificare: 'capitole', rand: chapter.code },
                spendingChapters && state.rand === chapter.code,
              ),
            ),
        ),
        law(
          'lege:titluri',
          t`Pe feluri de cheltuieli (titluri)`,
          { dupa: 'capitole', linie: 'cheltuieli', clasificare: 'titluri', rand: null },
          spendingChapters && state.clasificare === 'titluri' && !state.rand,
        ),
        law(
          'lege:venituri',
          t`Venituri prevăzute`,
          { dupa: 'capitole', linie: 'venituri', rand: null },
          chapters && state.linie === 'venituri',
          // The revenue chapters all open the law's revenue table: they are here to be found („TVA").
          lawChapters()
            .filter((chapter) => chapter.linie === 'venituri')
            .map((chapter) => law(`lege:venit:${chapter.code}`, chapter.label, { dupa: 'capitole', fond: 'stat', linie: 'venituri', rand: null }, false)),
        ),
        law('lege:legi', t`Lege după lege`, { dupa: 'legi' }, state.tip === 'lege' && state.dupa === 'legi'),
      ],
    },
    {
      id: 'ministere',
      title: t`Ministerele`,
      nodes: [
        {
          id: 'ministere:aprobat',
          label: t`Aprobat în lege`,
          patch: { tip: 'ministere', dupa: 'aprobat', rand: null },
          active: state.tip === 'ministere' && state.dupa === 'aprobat' && !state.rand,
          children: ministries.map((ministry) => ({
            id: `minister:${ministry.code}`,
            label: ministry.name,
            patch: { tip: 'ministere', dupa: 'aprobat', rand: ministry.code },
            active: state.tip === 'ministere' && state.dupa === 'aprobat' && state.rand === ministry.code,
            children: [],
          })),
        },
        { id: 'ministere:platit', label: t`Plătit, raportat la ANAF`, patch: { tip: 'ministere', dupa: 'platit' }, active: state.tip === 'ministere' && state.dupa === 'platit', children: [] },
      ],
    },
    {
      id: 'intrebari',
      title: t`Întrebări gata făcute`,
      folded: true,
      nodes: QUESTIONS.map((question) => ({ id: `question:${question.id}`, label: question.text(), patch: { ...DEFAULTS, ...question.state }, active: false, children: [] })),
    },
  ]
}

const holdsActive = (node: NavNode): boolean => node.active || node.children.some(holdsActive)

// ─────────────────────────────────────────────────────────────── the tree ──

const ROW = 'flex min-h-10 w-full items-center gap-1 text-left text-sm leading-snug lg:min-h-8'

function NodeRow({
  node,
  depth,
  open,
  onToggle,
  onGo,
}: {
  readonly node: NavNode
  readonly depth: number
  readonly open: boolean
  readonly onToggle: () => void
  readonly onGo: (patch: Partial<AdvancedState>) => void
}) {
  const opens = node.children.length > 0
  return (
    <div className={cn(ROW, 'rounded-[2px]', node.active && 'bg-primary/10')} style={{ paddingLeft: `${depth * 0.75}rem` }}>
      {opens ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? t`Închide ${node.label}` : t`Deschide ${node.label}`}
          className="inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn('size-3.5 transition-transform motion-reduce:transition-none', open && 'rotate-90')} aria-hidden="true" />
        </button>
      ) : (
        <span className="size-7 shrink-0" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => onGo(node.patch)}
        aria-current={node.active ? 'page' : undefined}
        className={cn(
          'min-w-0 flex-1 py-1.5 pr-2 text-left',
          node.active ? 'font-semibold text-foreground' : holdsActive(node) ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span className="line-clamp-2">{node.label}</span>
      </button>
    </div>
  )
}

function Branch({
  nodes,
  depth,
  toggles,
  onToggle,
  onGo,
}: {
  readonly nodes: readonly NavNode[]
  readonly depth: number
  readonly toggles: ReadonlyMap<string, boolean>
  readonly onToggle: (id: string, open: boolean) => void
  readonly onGo: (patch: Partial<AdvancedState>) => void
}) {
  return (
    <ul>
      {nodes.map((node) => {
        // A branch holding the reader's place opens by itself, and so does the place itself; the reader's own toggle wins.
        const open = toggles.get(node.id) ?? (node.children.length > 0 && holdsActive(node))
        return (
          <li key={node.id}>
            <NodeRow node={node} depth={depth} open={open} onToggle={() => onToggle(node.id, !open)} onGo={onGo} />
            {open && node.children.length > 0 ? <Branch nodes={node.children} depth={depth + 1} toggles={toggles} onToggle={onToggle} onGo={onGo} /> : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Every node with the names above it, for the filter. */
function flatten(sections: readonly NavSection[]) {
  const out: { readonly node: NavNode; readonly path: readonly string[] }[] = []
  const walk = (nodes: readonly NavNode[], path: readonly string[]) => {
    for (const node of nodes) {
      out.push({ node, path })
      walk(node.children, [...path, node.label])
    }
  }
  for (const section of sections) walk(section.nodes, [section.title])
  return out
}

function Matches({ sections, query, onGo }: { readonly sections: readonly NavSection[]; readonly query: string; readonly onGo: (patch: Partial<AdvancedState>) => void }) {
  const hits = flatten(sections)
    .map((entry) => ({ ...entry, score: rank(query, entry.node.label) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
  if (hits.length === 0) return <p className="px-2 py-3 text-sm text-muted-foreground">{t`Nimic cu acest nume.`}</p>
  return (
    <ul className="space-y-0.5">
      {hits.map(({ node, path }) => (
        <li key={node.id}>
          <button type="button" onClick={() => onGo(node.patch)} className="flex min-h-10 w-full flex-col items-start justify-center rounded-[2px] px-2 py-1 text-left hover:bg-muted lg:min-h-0">
            <span className="text-sm text-foreground">{node.label}</span>
            <span className="text-xs text-muted-foreground">{path.join(' › ')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The navigator itself: the filter, then the sections. */
export function Navigator({ sections, onGo, inputRef }: { readonly sections: readonly NavSection[]; readonly onGo: Change; readonly inputRef?: RefObject<HTMLInputElement | null> }) {
  const [query, setQuery] = useState('')
  const [toggles, setToggles] = useState<ReadonlyMap<string, boolean>>(new Map())
  const root = useRef<HTMLDivElement>(null)
  const place = flatten(sections).find((entry) => entry.node.active)?.node.id ?? null
  // The reader's place stays in view in the rail: scrolled to, never the page itself.
  useEffect(() => {
    const marked = root.current?.querySelector<HTMLElement>('[aria-current="page"]')
    const scroller = marked?.closest<HTMLElement>('[data-nav-scroll]')
    if (!marked || !scroller) return
    const top = marked.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    if (top < 80 || top > scroller.clientHeight - 80) scroller.scrollTop += top - scroller.clientHeight / 3
  }, [place])
  const toggle = (id: string, open: boolean) => setToggles((previous) => new Map(previous).set(id, open))
  const go = (patch: Partial<AdvancedState>) => {
    setQuery('')
    onGo(patch)
  }
  const first = query.trim()
    ? flatten(sections)
        .map((entry) => ({ entry, score: rank(query, entry.node.label) }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.entry.node
    : undefined
  return (
    <div ref={root}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && first) go(first.patch)
            if (event.key === 'Escape') setQuery('')
          }}
          placeholder={t`Caută în cuprins`}
          aria-label={t`Caută în cuprins`}
          className="h-10 w-full border bg-background pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-foreground/50 lg:h-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t`Golește căutarea`}
            className="absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 border px-1 font-mono text-[0.65rem] leading-4 text-muted-foreground lg:inline">/</kbd>
        )}
      </div>
      <div className="mt-4">
        {query.trim() ? (
          <Matches sections={sections} query={query} onGo={go} />
        ) : (
          <div className="space-y-5">
            {sections.map((section) => (
              <Section key={section.id} section={section} toggles={toggles} onToggle={toggle} onGo={go} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  section,
  toggles,
  onToggle,
  onGo,
}: {
  readonly section: NavSection
  readonly toggles: ReadonlyMap<string, boolean>
  readonly onToggle: (id: string, open: boolean) => void
  readonly onGo: (patch: Partial<AdvancedState>) => void
}) {
  const open = toggles.get(`section:${section.id}`) ?? !section.folded
  const heading: ReactNode = <MonoLabel className="text-muted-foreground">{section.title}</MonoLabel>
  return (
    <section aria-label={section.title}>
      {section.folded !== undefined ? (
        <button type="button" onClick={() => onToggle(`section:${section.id}`, !open)} aria-expanded={open} className="flex min-h-10 w-full items-center gap-1 text-left lg:min-h-0">
          <ChevronRight className={cn('size-3 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', open && 'rotate-90')} aria-hidden="true" />
          {heading}
          {section.now && !open ? <span className="ml-1 truncate text-xs font-medium text-foreground">{section.now}</span> : null}
        </button>
      ) : (
        <h2 className="px-2">{heading}</h2>
      )}
      {open ? (
        <div className="mt-1.5">
          <Branch nodes={section.nodes} depth={0} toggles={toggles} onToggle={onToggle} onGo={onGo} />
        </div>
      ) : null}
    </section>
  )
}

// ───────────────────────────────────────────────────────────── the panel ──

/** The contents' sections, read only while the panel is open (the ministries are a read of their own). */
function Contents({
  catalog,
  state,
  edition,
  lawYear,
  onGo,
  inputRef,
}: {
  readonly catalog: BudgetNationalCatalog
  readonly state: AdvancedState
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
  readonly onGo: Change
  readonly inputRef: RefObject<HTMLInputElement | null>
}) {
  const sections = useNavSections({ catalog, state, edition, lawYear })
  return <Navigator sections={sections} onGo={onGo} inputRef={inputRef} />
}

/** The contents in a side panel, as the filters are: from the right, from the bottom on a phone; `/` or Ctrl/⌘ K open it. */
export function ContentsSheet({
  open,
  onOpenChange,
  catalog,
  state,
  edition,
  lawYear,
  onGo,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly catalog: BudgetNationalCatalog
  readonly state: AdvancedState
  readonly edition: BudgetApprovedEdition | null
  readonly lawYear: number
  readonly onGo: Change
}) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpenChange])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        onOpenAutoFocus={(event) => {
          // The search opened it: the filter takes the focus.
          event.preventDefault()
          input.current?.focus()
        }}
        className={cn('flex flex-col gap-0 p-0', phone ? 'h-[88vh] rounded-t-2xl' : 'w-full sm:max-w-md')}
      >
        <div className="border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Cuprins`}</SheetTitle>
        </div>
        <div data-nav-scroll className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <Contents
            catalog={catalog}
            state={state}
            edition={edition}
            lawYear={lawYear}
            inputRef={input}
            onGo={(patch) => {
              onOpenChange(false)
              onGo(patch)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * The way into the contents: an action, as the bar's tabs and „Filtre" are
 * (an icon and a word), not a field to type in. The keys (`/`, Ctrl/⌘ K) are
 * in its title; on a phone it is the icon alone, its name for screen readers.
 */
export function SearchButton({ onClick, className }: { readonly onClick: () => void; readonly className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={t`Caută în cuprins: un rând, un buget, un capitol, un minister (/)`}
      aria-keyshortcuts="/ Control+K Meta+K"
      className={cn(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-[2px] text-sm font-medium text-foreground transition-colors hover:bg-muted sm:-ml-2 sm:min-h-9 sm:px-2',
        className,
      )}
    >
      <Search className="size-4 text-primary" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{t`Caută`}</span>
    </button>
  )
}
