import type { ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Check, Minus, X } from 'lucide-react'
import { z } from 'zod'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { mapDirectAcquisition } from '@/features/procurement/api/graphql/procurement-mappers'
import { readNames } from '@/features/procurement/api/procurement-direct-purchase-api'
import { DirectPurchaseBlock } from '@/features/procurement/components/direct-purchase/direct-purchase-block'
import { DirectPurchaseContextBand } from '@/features/procurement/components/direct-purchase/direct-purchase-context'
import { DirectPurchaseHead } from '@/features/procurement/components/direct-purchase/direct-purchase-head'
import { ProcurementDirectPurchasePage } from '@/features/procurement/components/direct-purchase/procurement-direct-purchase-page'
import { procurementDirectPurchaseQueryOptions, useProcurementDirectPurchaseContext } from '@/features/procurement/hooks/use-procurement-direct-purchase'
import { cpvKey, dayOf, familyOf, mapDirectPurchase, redoOf, type DirectPurchase } from '@/features/procurement/lib/direct-purchase-model'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { cn } from '@/lib/utils'
import { DA_FIXTURES } from './direct-purchase.fixtures'
import { DA_CHANGES, type DaChangeId } from './direct-purchase.changes'
import type { RawDaFixture } from './direct-purchase.types'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'
const DEFAULT_RECORD = 'flori'

function useFixtureKey(): string {
  const search = useSearch({ strict: false }) as { readonly da?: unknown }
  const key = typeof search.da === 'string' ? search.da : DEFAULT_RECORD
  return DA_FIXTURES[key] ? key : DEFAULT_RECORD
}

function RecordPicker() {
  const key = useFixtureKey()
  const navigate = useNavigate()
  return (
    <div className="border-b bg-muted/40">
      <RuledFrame className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
        <MonoLabel className="text-muted-foreground">Înregistrarea</MonoLabel>
        <select
          value={key}
          onChange={(event) => void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, da: event.target.value }) })}
          className="h-9 max-w-full rounded-sm border bg-background px-2 text-sm"
        >
          {Object.entries(DA_FIXTURES).map(([id, record]) => (
            <option key={id} value={id}>
              {record.label}
            </option>
          ))}
        </select>
      </RuledFrame>
    </div>
  )
}

// ─────────────────────────────────────── azi: the page on today's API ──

/** The promoted page, reading the dev API as it answers today. */
export function DaToday() {
  const fixture = DA_FIXTURES[useFixtureKey()]!
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ProcurementDirectPurchasePage id={fixture.id} />
    </div>
  )
}

// ─────────────────────────────── tinta: the page on what the API must serve ──

/**
 * The purchase as the fixed API would answer it: the record with its CUI
 * recovered, its detail linked, its lines with other institutions' prices and
 * repeats — the names read live, as the page reads them.
 */
function useTargetPurchase(fixture: RawDaFixture): DirectPurchase | null {
  const raw = { ...fixture.record, authority: { ...fixture.record.authority, cui: fixture.target.authorityCui } }
  const record = mapDirectAcquisition(raw)
  const detail = fixture.target.detail
  const cuis = [record.authority.cui, record.supplier.cui].filter((cui): cui is string => Boolean(cui))
  const codes = [...new Set([record.cpvCode, ...(detail?.items ?? []).map((item) => item.cpvCode)].map(cpvKey).filter((code): code is string => code !== null))]
  const names = useQuery({
    queryKey: ['prototype', 'direct-purchase', 'names', fixture.id],
    queryFn: ({ signal }) => readNames(cuis, codes, record.authority.cui, signal),
    staleTime: 60 * 60 * 1000,
  })
  if (!names.data) return null
  const purchase = mapDirectPurchase(record, detail, fixture.target.availability, names.data)
  if (!purchase.detail) return purchase
  const items = purchase.detail.items.map((item) => ({ ...item, peers: fixture.target.peers[String(item.index)] ?? null, repeats: fixture.target.repeats[String(item.index)] ?? null }))
  return { ...purchase, detail: { ...purchase.detail, items } }
}

interface DiffRow {
  readonly field: string
  readonly today: string
  readonly target: string
  /** The change (1-based, as the `api` view numbers them) that closes the gap. */
  readonly change: number
}

/** This record's fields as the dev API serves them now, and as the fixed API must. */
function diffRowsOf(fixture: RawDaFixture, live: DirectPurchase | null | undefined): readonly DiffRow[] {
  const target = fixture.target
  const now = (read: (purchase: DirectPurchase) => string) => (live === undefined ? '…' : live === null ? 'missing' : read(live))
  const lines = target.detail?.items.length ?? 0
  const peers = Object.keys(target.peers).length
  const repeats = Object.values(target.repeats).filter((count) => count > 0).length
  return [
    { field: 'detailAvailability', today: now((purchase) => purchase.availability), target: target.availability, change: 1 },
    {
      field: 'detail read by',
      // Read by da_id today, null for these records; once the detail is served, it is read by the key the target names.
      today: !target.detailJoin ? '—' : live === undefined ? '…' : linked(live) ? 'served' : 'da_details.da_id — null for this record',
      target: target.detailJoin ? `attrs.direct_acquisition_id = da_details.source_ref „${target.detailJoin.sourceRef}" (${target.detailJoin.sourceSystem})` : '—',
      change: 1,
    },
    { field: 'detail.items', today: now((purchase) => String(purchase.detail?.items.length ?? 0)), target: String(lines), change: 2 },
    { field: 'authority.cui', today: now((purchase) => purchase.authority.cui ?? 'null'), target: target.authorityCui ?? 'null', change: 3 },
    { field: 'stateText', today: 'not served', target: target.stateText ?? 'null', change: 4 },
    { field: 'items[].peers', today: 'not served', target: peers ? `${peers} of ${lines} lines` : 'none from three institutions up', change: 5 },
    { field: 'items[].repeats', today: 'not served', target: repeats ? `${repeats} of ${lines} lines` : 'none', change: 5 },
  ]
}

/** A field still to change: read, and different from the target in substance (a field the target leaves empty is not owed). */
function differs(row: DiffRow): boolean {
  if (row.today === '…' || row.today === 'served' || row.today === row.target) return false
  return !(row.today === 'not served' && (row.target === 'null' || row.target.startsWith('none')))
}

/** For the server session: what this record needs, field by field (closed by default, over the page). */
function ApiDiff({ fixture }: { readonly fixture: RawDaFixture }) {
  const live = useQuery(procurementDirectPurchaseQueryOptions(fixture.id))
  const rows = diffRowsOf(fixture, live.isPending ? undefined : (live.data ?? null))
  const owed = rows.filter(differs)
  return (
    <div className="border-b bg-muted/20">
      <RuledFrame className="py-3">
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            <span className="font-medium text-foreground">API for this record</span> · id {fixture.id} ·{' '}
            {live.isPending ? 'reading the dev API…' : owed.length ? `${owed.length} of ${rows.length} fields still differ from the target` : 'the dev API serves the target'}
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b px-2 py-1.5 font-medium">Field</th>
                  <th className="border-b px-2 py-1.5 font-medium">Dev API now</th>
                  <th className="border-b px-2 py-1.5 font-medium">Must serve</th>
                  <th className="border-b px-2 py-1.5 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.map((row) => (
                  <tr key={row.field} className={cn(!differs(row) && 'text-muted-foreground')}>
                    <td className="border-b border-border/60 px-2 py-1.5">{row.field}</td>
                    <td className={cn('border-b border-border/60 px-2 py-1.5', differs(row) && 'text-amber-800 dark:text-amber-300')}>{row.today}</td>
                    <td className="border-b border-border/60 px-2 py-1.5">{row.target}</td>
                    <td className="border-b border-border/60 px-2 py-1.5 text-right">
                      <a href={`?v=api#change-${row.change}`} className="underline-offset-4 hover:underline">
                        {row.change}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </RuledFrame>
    </div>
  )
}

/**
 * The context band reads the live API. While the dev API still files this
 * purchase without its institution's CUI, the pair's and the institution's
 * counts leave it (and every purchase filed like it) out — said over the
 * band, so the target is not read as contradicting itself.
 */
function LiveContextNote({ fixture }: { readonly fixture: RawDaFixture }) {
  const live = useQuery(procurementDirectPurchaseQueryOptions(fixture.id))
  if (!fixture.target.authorityCui || !live.data || live.data.authority.cui === fixture.target.authorityCui) return null
  return (
    <RuledFrame className="pb-6">
      <p className="max-w-[80ch] rounded-sm border border-dashed border-amber-600/50 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <span className="font-medium">Prototype note:</span> the context below is read live. The dev API still files this purchase without its institution&apos;s
        CUI, so the pair&apos;s and the institution&apos;s counts leave it out, with every purchase filed the same way (change 3). Once the CUI is recovered,
        this purchase counts among the pair&apos;s.
      </p>
    </RuledFrame>
  )
}

function TargetSheet({ fixture, purchase }: { readonly fixture: RawDaFixture; readonly purchase: DirectPurchase }) {
  const context = useProcurementDirectPurchaseContext(purchase)
  const day = dayOf(purchase)
  return (
    <>
      <DirectPurchaseHead purchase={purchase} redo={redoOf(purchase, context.data ?? null)} />
      <RuledFrame className="py-10 sm:py-14">
        <DirectPurchaseBlock purchase={purchase} year={context.data?.year ?? (day ? Number(day.slice(0, 4)) : null)} className="max-w-4xl" />
      </RuledFrame>
      <LiveContextNote fixture={fixture} />
      <DirectPurchaseContextBand purchase={purchase} context={{ data: context.data, isError: context.isError, retry: () => void context.refetch() }} />
    </>
  )
}

/** The same page, fed what the fixed API must serve for this record. */
export function DaTarget() {
  const fixture = DA_FIXTURES[useFixtureKey()]!
  const purchase = useTargetPurchase(fixture)
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RecordPicker />
      <ApiDiff fixture={fixture} />
      {purchase ? (
        <TargetSheet fixture={fixture} purchase={purchase} />
      ) : (
        <RuledFrame className="py-14">
          <HubPending rows={8} />
        </RuledFrame>
      )}
    </div>
  )
}

// ────────────────────────────────── api: what to change, checked live ──

/** `blocked`: the change cannot be seen until another lands (the lines, until the detail is linked); `failed`: the dev API did not answer — not a verdict. */
type Verdict = 'fixed' | 'open' | 'blocked' | 'n/a' | 'reading' | 'failed'

/** The detail is linked once the API finds it: served, or found and failing on its lines (the page then reads it as unavailable for now). */
const linked = (purchase: DirectPurchase | null | undefined) => purchase?.availability === 'AVAILABLE' || purchase?.availability === 'TEMPORARILY_UNAVAILABLE'

const PAIR_PAGE = 100
const PAIR_PAGES = 2

const PAIR_ORDER_QUERY = /* GraphQL */ `
  query PrototypeDirectPurchasePairOrder($filter: ProcurementDirectAcquisitionsFilter!, $page: Int!, $pageSize: Int!) {
    procurementDirectAcquisitions(filter: $filter, sort: date_desc, page: $page, pageSize: $pageSize) {
      total
      items { id publicationDate finalizationDate }
    }
  }
`

const pairPageSchema = z.object({
  procurementDirectAcquisitions: z.object({
    total: z.number().nullable(),
    items: z.array(z.object({ id: z.string(), publicationDate: z.string().nullable(), finalizationDate: z.string().nullable() })),
  }),
})

/** The pair's list by date, read whole: its rows, the undated ones, and the rows out of the page's own day order. */
interface PairOrder {
  readonly rows: number
  readonly undated: number
  readonly misplaced: number
}

async function readPairPage(record: RawDaFixture['record'], page: number, signal: AbortSignal) {
  const filter = { authorityCui: { eq: record.authority.cui }, supplierCui: { eq: record.supplier.cui } }
  const raw = await graphqlQuery<unknown>(PAIR_ORDER_QUERY, { filter, page, pageSize: PAIR_PAGE }, { operationName: 'PrototypeDirectPurchasePairOrder', signal })
  return pairPageSchema.parse(raw).procurementDirectAcquisitions
}

/**
 * Out of order: a dated row after an undated one, or a row whose day (the
 * finalization date, else the publication date — the day the page shows) is
 * later than a row's above it. Two pages at most: both pairs checked fit.
 */
async function readPairOrder(record: RawDaFixture['record'], signal: AbortSignal): Promise<PairOrder> {
  const first = await readPairPage(record, 1, signal)
  const pages = Math.min(PAIR_PAGES, Math.ceil((first.total ?? first.items.length) / PAIR_PAGE))
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => readPairPage(record, index + 2, signal)))
  const days = [first, ...rest].flatMap((page) => page.items).map((row) => (row.finalizationDate ?? row.publicationDate)?.slice(0, 10) ?? null)
  const firstUndated = days.indexOf(null)
  const misplaced = days.filter(
    (day, index) => day !== null && ((firstUndated !== -1 && index > firstUndated) || days.slice(0, index).some((earlier) => earlier !== null && earlier < day)),
  ).length
  return { rows: days.length, undated: days.filter((day) => day === null).length, misplaced }
}

/** The order is checked on the records outside the catalogue: the undated rows are the exports' and the notifications'. */
function checksOrder(fixture: RawDaFixture): boolean {
  return familyOf(fixture.record.sourceSystem) !== 'catalog' && Boolean(fixture.record.authority.cui && fixture.record.supplier.cui)
}

/** Whether the live API already serves what this record needs from a change. `order`: undefined while read, null when the read failed. */
function verdictOf(change: DaChangeId, fixture: RawDaFixture, today: DirectPurchase | null | undefined, read: { readonly pending: boolean; readonly failed: boolean }, order: PairOrder | null | undefined): Verdict {
  if (change === 'undated-rows') {
    if (!checksOrder(fixture)) return 'n/a'
    if (order === undefined) return 'reading'
    if (order === null) return 'failed'
    return order.misplaced === 0 ? 'fixed' : 'open'
  }
  if (read.failed) return 'failed'
  if (read.pending) return 'reading'
  const target = fixture.target
  switch (change) {
    case 'detail-join':
      if (!target.detail) return 'n/a'
      return linked(today) ? 'fixed' : 'open'
    case 'item-id':
      if (!target.detail) return 'n/a'
      // The lines are read only once the detail is found: until then this change cannot be seen.
      if (!linked(today)) return 'blocked'
      return today?.availability === 'AVAILABLE' && today.detail?.items.length === target.detail.items.length ? 'fixed' : 'open'
    case 'cui-in-name':
      if (fixture.record.authority.cui || !target.authorityCui) return 'n/a'
      return today?.authority.cui === target.authorityCui ? 'fixed' : 'open'
    case 'outcome': {
      const reason = target.detail?.supplierRejectionReason ?? target.detail?.caRejectionReason ?? null
      if (!reason) return fixture.record.status === 'cancelled' ? 'open' : 'n/a'
      const kind = today?.outcome.kind
      return kind === 'firm-refused' || kind === 'institution-refused' ? 'fixed' : 'open'
    }
    case 'line-prices':
      return Object.keys(target.peers).length > 0 || Object.values(target.repeats).some((count) => count > 0) ? 'open' : 'n/a'
  }
}

function VerdictMark({ verdict }: { readonly verdict: Verdict }) {
  if (verdict === 'reading') return <span className="text-muted-foreground">…</span>
  if (verdict === 'n/a') return <Minus className="mx-auto size-4 text-muted-foreground/60" aria-label="not applicable" />
  if (verdict === 'blocked') return <span className="text-xs text-muted-foreground">blocked by 1</span>
  if (verdict === 'failed') return <span className="text-xs text-rose-700 dark:text-rose-300">read failed</span>
  return verdict === 'fixed' ? <Check className="mx-auto size-4 text-emerald-700 dark:text-emerald-300" aria-label="fixed" /> : <X className="mx-auto size-4 text-amber-700 dark:text-amber-300" aria-label="open" />
}

function Cell({ children, className }: { readonly children?: ReactNode; readonly className?: string }) {
  return <td className={cn('border-b border-border/70 px-2 py-2.5 align-top', className)}>{children}</td>
}

/** Every record against every change, read live: the API session's checklist. */
export function DaApi() {
  const fixtures = Object.entries(DA_FIXTURES)
  const reads = useQueries({ queries: fixtures.map(([, fixture]) => procurementDirectPurchaseQueryOptions(fixture.id)) })
  const orders = useQueries({
    queries: fixtures.map(([key, fixture]) => ({
      queryKey: ['prototype', 'direct-purchase', 'pair-order', key],
      queryFn: ({ signal }: { readonly signal: AbortSignal }) => readPairOrder(fixture.record, signal),
      enabled: checksOrder(fixture),
      staleTime: 10 * 60 * 1000,
    })),
  })
  // An unread order is never „fixed": undefined while it is read, null when the read failed.
  const orderOf = (index: number): PairOrder | null | undefined => (orders[index]?.isError ? null : orders[index]?.data)
  const verdicts = fixtures.map(([, fixture], index) =>
    DA_CHANGES.map((change) => verdictOf(change.id, fixture, reads[index]?.data, { pending: reads[index]?.isPending ?? true, failed: reads[index]?.isError ?? false }, orderOf(index))),
  )
  const open = DA_CHANGES.map((_, column) => verdicts.filter((row) => row[column] === 'open').length)
  // Blocked is not fixed: said beside the open count, so a column of „blocked by 1" does not read as done.
  const blocked = DA_CHANGES.map((_, column) => verdicts.filter((row) => row[column] === 'blocked').length)
  const pending = DA_CHANGES.map((_, column) => verdicts.some((row) => row[column] === 'reading'))
  return (
    <div className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RuledFrame className="py-10 sm:py-14">
        <MonoLabel className="block text-muted-foreground">For the server session</MonoLabel>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">What the direct-purchase page needs from the API</h1>
        <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-muted-foreground">
          Each record read live from the dev API, against each change. ✓ the API serves it; ✗ still open for this record; — not relevant to it. The
          „tinta" view shows the page once all are served; the fixtures in <code className="font-mono text-sm">direct-purchase.fixtures.ts</code> hold the
          exact answer each record needs.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b px-2 py-2 font-medium text-muted-foreground">Record</th>
                <th className="border-b px-2 py-2 font-medium text-muted-foreground">Today</th>
                {DA_CHANGES.map((change, index) => (
                  <th key={change.id} className="border-b px-2 py-2 text-center align-bottom font-medium text-muted-foreground">
                    <a href={`#change-${index + 1}`} className="underline-offset-4 hover:underline">
                      <span className="block font-mono text-xs">{index + 1}</span>
                      {change.title}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fixtures.map(([key, fixture], index) => {
                const read = reads[index]
                return (
                  <tr key={key}>
                    <Cell>
                      <a href={`?v=tinta&da=${key}`} className="font-medium underline-offset-4 hover:underline">
                        {fixture.label}
                      </a>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">id {fixture.id}</span>
                    </Cell>
                    <Cell className="text-xs text-muted-foreground">
                      {read?.isPending ? '…' : read?.data ? `${read.data.availability} · CUI ${read.data.authority.cui ?? 'null'}` : read?.isError ? 'error' : 'missing'}
                    </Cell>
                    {DA_CHANGES.map((change, column) => {
                      const order = change.id === 'undated-rows' ? orderOf(index) : undefined
                      return (
                        <Cell key={change.id} className="text-center">
                          <VerdictMark verdict={verdicts[index]![column]!} />
                          {order ? (
                            <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                              {order.misplaced} of {order.rows} out of order
                            </span>
                          ) : null}
                        </Cell>
                      )
                    })}
                  </tr>
                )
              })}
              <tr>
                <Cell className="font-medium">Open</Cell>
                <Cell />
                {open.map((count, index) => (
                  <Cell key={DA_CHANGES[index]!.id} className="text-center font-semibold tabular-nums">
                    {pending[index] ? '…' : blocked[index] ? `${count} · ${blocked[index]} blocked` : count}
                  </Cell>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <ol className="mt-12 max-w-[80ch] space-y-10">
          {DA_CHANGES.map((change, index) => (
            <li key={change.id} id={`change-${index + 1}`} className="scroll-mt-24">
              <MonoLabel className="block text-muted-foreground">
                {index + 1} · {change.severity}
              </MonoLabel>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{change.title}</h2>
              <dl className="mt-3 space-y-3 text-sm leading-relaxed">
                <div>
                  <dt className="font-medium">Today</dt>
                  <dd className="text-muted-foreground">{change.today}</dd>
                </div>
                <div>
                  <dt className="font-medium">Serve</dt>
                  <dd className="text-muted-foreground">{change.target}</dd>
                </div>
                <div>
                  <dt className="font-medium">Where</dt>
                  <dd className="text-muted-foreground">{change.where}</dd>
                </div>
                <div>
                  <dt className="font-medium">Checked here by</dt>
                  <dd className="text-muted-foreground">{change.check}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </RuledFrame>
    </div>
  )
}

