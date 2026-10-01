import { useState, type ComponentType } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { FiltersButton } from '@/features/procurement/components/analytics/analytics-filters'
import { useAnswer, useNamer, type Answer } from '@/features/procurement/hooks/use-procurement-analytics'
import { queryOf, repaired, urlSearchOf, type AnalyticsSearch, type Query } from '@/features/procurement/lib/analytics-model'
import { headline, periodText, recordsCount, type Namer } from '@/features/procurement/lib/analytics-text'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

export interface SheetProps {
  readonly query: Query
  readonly answer: Answer
  readonly namer: Namer
  readonly onChange: (query: Query) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

/** The query the harness's address holds (the page's own keys beside `v` and `layout`), and a way to move to another. */
function useHarnessQuery(): readonly [Query, (next: Query) => void] {
  const search = useSearch({ strict: false }) as Record<string, unknown>
  const strings: AnalyticsSearch = Object.fromEntries(Object.entries(search).map(([key, value]) => [key, typeof value === 'string' || typeof value === 'number' ? String(value) : undefined]))
  const query = queryOf(strings)
  const navigate = useNavigate()
  const move = (next: Query) =>
    void navigate({
      to: '.',
      // As the page writes it: a digits-only value bare (`localitate=54975`), not quoted.
      search: (previous: Record<string, unknown>) => ({ ...(previous.v !== undefined ? { v: previous.v } : {}), ...(previous.layout !== undefined ? { layout: previous.layout } : {}), ...urlSearchOf(repaired(next)) }),
      resetScroll: false,
    })
  return [query, move] as const
}

/**
 * The page's stand-in: the question the address holds and its count, the
 * button that opens the sheet (open from the start), and the address the
 * sheet writes — the same model, hooks and names the real page uses.
 */
export function FiltersHarness({ sheet: SheetComponent }: { readonly sheet: ComponentType<SheetProps> }) {
  const [query, move] = useHarnessQuery()
  const [open, setOpen] = useState(true)
  const answer = useAnswer(query, { topN: 25, years: false })
  const namer = useNamer(query, answer)
  const records = answer.figures.data?.now?.records ?? null
  return (
    <div className="min-h-[70vh] bg-background px-4 py-8 sm:px-8" data-dev-marker={PROTOTYPE_MARKER}>
      <MonoLabel className="text-muted-foreground">{t`Prototip · filtrele`}</MonoLabel>
      <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">{headline(query, namer)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {answer.period ? periodText(answer.period, query) : '…'} · {records !== null ? recordsCount(query.tip, records) : '…'}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <FiltersButton query={query} onClick={() => setOpen(true)} />
        <Link to="/procurement/analytics" search={urlSearchOf(query)} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          {t`Aceeași întrebare pe pagina reală`}
        </Link>
      </div>
      <SheetComponent query={query} answer={answer} namer={namer} onChange={move} open={open} onOpenChange={setOpen} />
    </div>
  )
}
