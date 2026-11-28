import { useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Check, SlidersHorizontal, X } from 'lucide-react'
import { FIELD, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LegalStatusBadge } from '@/features/legal/components/legal-status-badge'
import { LegislationShell } from '@/features/legal/components/legislation-shell'
import { useLegislationFreshness } from '@/features/legal/hooks/use-legislation'
import { useLegislationFrontier } from '@/features/legal/hooks/use-legislation-frontier'
import { formatLegalDate, formatLegalNumber, localIsoDate } from '@/features/legal/lib/legal-format'
import { legalEventKindLabel } from '@/features/legal/lib/legal-vocabulary'
import { fetchChangesCount, fetchChangesPage, narrowKinds, type ChangesQuery } from './changes.api'
import { CHANGE_KINDS, NEW_LAW_KINDS, groupChanges, joinVerbs, sourcelessHead, type ChangeBlock, type ChangeRow } from './changes.model'

/**
 * The Modificări page, redesigned (owner, 27–28 November 2026; spec
 * docs/superpowers/specs/2026-11-28-legislation-changes-redesign-design.md): for watching what is changing. Three
 * tabs — changes to existing acts (default), new laws and approved ordinances, undated changes; on the first, what
 * comes into force soon on top, then one block per act that makes the change, with what that act is about. State
 * lives here; the address keys are the promotion's.
 */

type Tab = 'schimbari' | 'legi-noi' | 'fara-data'

const PAGE = 20
const kindsOf = (tab: Tab): readonly string[] => (tab === 'legi-noi' ? NEW_LAW_KINDS : CHANGE_KINDS)

const linkClass = 'font-medium text-foreground underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground'

function ActLink({ actId, children, className }: { readonly actId: string; readonly children: ReactNode; readonly className?: string }) {
  return (
    <Link to="/legislation/acts/$actId" params={{ actId }} className={cn(linkClass, className)}>
      {children}
    </Link>
  )
}

/** The changes of one tab's query, page after page, under one key. */
function useChangeList(q: ChangesQuery, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['legal', 'changes-prototype', q],
    queryFn: ({ pageParam, signal }) => fetchChangesPage(q, { first: PAGE, ...(pageParam !== undefined && { after: pageParam }), signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.endCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

function useCount(q: ChangesQuery, enabled = true) {
  return useQuery({
    queryKey: ['legal', 'changes-prototype-count', q],
    queryFn: ({ signal }) => fetchChangesCount(q, { signal }),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled,
  })
}

export function ChangesPrototype() {
  const { measuredAt, dataStatus } = useLegislationFrontier('changes')
  return (
    <LegislationShell activeTab="modificari" measuredAt={measuredAt} dataStatus={dataStatus}>
      <ChangesBody />
    </LegislationShell>
  )
}

function ChangesBody() {
  const { i18n } = useLingui()
  const today = localIsoDate()
  const tomorrow = localIsoDate(1)
  const frontier = useLegislationFreshness().data?.latestEffectiveChangeDate ?? null

  const [tab, setTab] = useState<Tab>('schimbari')
  const [chosen, setChosen] = useState<readonly string[]>([])
  const [since, setSince] = useState('')
  const [until, setUntil] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)

  const kinds = narrowKinds(kindsOf(tab), chosen)
  const rangeEnd = until !== '' && until < today ? until : today
  const filtered = chosen.some((k) => kindsOf(tab).includes(k)) || (tab !== 'fara-data' && (since !== '' || until !== ''))

  // The three tabs' totals, unfiltered.
  const changesTotal = useCount({ kinds: CHANGE_KINDS, until: today })
  const newTotal = useCount({ kinds: NEW_LAW_KINDS })
  const undatedTotal = useCount({ kinds: CHANGE_KINDS, undatedOnly: true })

  const listQuery: ChangesQuery =
    tab === 'fara-data'
      ? { kinds, undatedOnly: true }
      : tab === 'legi-noi'
        ? { kinds, ...(since !== '' && { since }), ...(until !== '' && { until }) }
        : { kinds, ...(since !== '' && { since }), until: rangeEnd }
  const list = useChangeList(listQuery)
  const filteredCount = useCount(listQuery, filtered)
  const upcoming = useQuery({
    queryKey: ['legal', 'changes-prototype-upcoming', kinds, tomorrow],
    queryFn: ({ signal }) => fetchChangesPage({ kinds, since: tomorrow }, { first: 50, signal }),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'schimbari',
  })

  const rows = list.data?.pages.flatMap((page) => page.items) ?? []
  const n = (value: number) => formatLegalNumber(value, i18n.locale)
  const total = (q: { readonly isSuccess: boolean; readonly data?: number | null }) => (q.isSuccess && typeof q.data === 'number' ? q.data : null)

  const tabs: ReadonlyArray<{ readonly id: Tab; readonly label: string; readonly count: number | null }> = [
    { id: 'schimbari', label: t`Schimbări ale actelor`, count: total(changesTotal) },
    { id: 'legi-noi', label: t`Legi noi și OUG aprobate`, count: total(newTotal) },
    { id: 'fara-data', label: t`Fără dată`, count: total(undatedTotal) },
  ]

  const chooseTab = (next: Tab) => {
    setTab(next)
    setChosen([])
  }
  const clearAll = () => {
    setChosen([])
    setSince('')
    setUntil('')
  }

  const upcomingRows = upcoming.data?.items ?? []

  return (
    <div className="flex flex-col gap-5">
      {frontier !== null ? (
        <p className="text-sm text-muted-foreground">{t`Cea mai nouă schimbare intrată în vigoare din date: ${formatLegalDate(frontier, i18n.locale)}.`}</p>
      ) : null}

      <div className="flex items-end justify-between gap-x-3 border-b">
        {/* One line on every width: on a phone the tabs scroll sideways inside their row, the page never does. */}
        <div role="tablist" aria-label={t`Ce schimbări`} className="-mb-px flex min-w-0 gap-x-5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => chooseTab(item.id)}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 text-sm transition-colors',
                tab === item.id ? 'border-foreground font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
              {item.count !== null ? <span className="tabular-nums text-muted-foreground">{n(item.count)}</span> : null}
            </button>
          ))}
        </div>
        <button
          ref={filterButton}
          type="button"
          aria-haspopup="dialog"
          onClick={() => setPanelOpen(true)}
          className={cn(
            'mb-1.5 inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:border-foreground/30',
            filtered ? 'border-primary/50 bg-primary/5' : 'bg-card',
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {filtered ? t`Filtre (activ)` : t`Filtre`}
        </button>
      </div>

      {filtered ? (
        <ActiveFilters tab={tab} chosen={chosen} since={since} until={until} onKinds={setChosen} onRange={() => (setSince(''), setUntil(''))} onClear={clearAll} locale={i18n.locale} />
      ) : null}

      {tab === 'schimbari' && upcomingRows.length > 0 ? (
        <section aria-labelledby="changes-upcoming" className="flex flex-col gap-2">
          <h2 id="changes-upcoming" className="text-sm font-semibold">
            {t`Urmează să intre în vigoare`} <span className="font-normal tabular-nums text-muted-foreground">{n(upcomingRows.length)}</span>
          </h2>
          <Blocks blocks={groupChanges(upcomingRows)} today={today} locale={i18n.locale} />
        </section>
      ) : null}

      <section aria-labelledby="changes-list" className="flex flex-col gap-2">
        <h2 id="changes-list" className="text-sm font-semibold">
          {tab === 'schimbari' ? t`Intrate în vigoare` : tab === 'legi-noi' ? t`Legi noi și ordonanțe aprobate` : t`Schimbări fără dată de intrare în vigoare`}
          {filtered && filteredCount.isSuccess && typeof filteredCount.data === 'number' ? (
            <span className="font-normal tabular-nums text-muted-foreground"> {t`${n(filteredCount.data)} după filtre`}</span>
          ) : null}
        </h2>

        {list.isPending ? <ListSkeleton /> : null}
        {list.isError && !list.isFetchNextPageError ? (
          <div className="rounded-lg border p-4 text-sm">
            <p>{t`Nu am putut încărca schimbările.`}</p>
            <button type="button" onClick={() => void list.refetch()} className="mt-2 underline underline-offset-2">
              {t`Încearcă din nou`}
            </button>
          </div>
        ) : null}
        {list.isSuccess && rows.length === 0 ? <p className="text-sm text-muted-foreground">{t`Nicio schimbare nu corespunde filtrelor.`}</p> : null}

        {list.isSuccess && rows.length > 0 ? (
          tab === 'schimbari' ? (
            <Blocks blocks={groupChanges(rows)} today={today} locale={i18n.locale} />
          ) : (
            <Rows rows={rows} today={today} locale={i18n.locale} />
          )
        ) : null}

        {list.isFetchNextPageError ? <p className="text-sm text-muted-foreground">{t`Pagina următoare nu s-a încărcat.`}</p> : null}
        {list.hasNextPage ? (
          <div>
            <button
              type="button"
              disabled={list.isFetching}
              onClick={() => void list.fetchNextPage()}
              className="inline-flex h-10 items-center rounded-lg border bg-card px-4 text-sm font-medium transition-colors hover:border-foreground/30 disabled:opacity-50"
            >
              {list.isFetchingNextPage ? t`Se încarcă…` : t`Încarcă mai multe`}
            </button>
          </div>
        ) : null}
        {tab === 'schimbari' && rows.length > 0 ? <p className="text-xs text-muted-foreground">{t`Descrierea fiecărui act vine din rezumatul făcut automat al textului lui.`}</p> : null}
      </section>

      <ChangesPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        returnFocus={() => filterButton.current?.focus()}
        tab={tab}
        chosen={chosen}
        onKinds={setChosen}
        since={since}
        until={until}
        onSince={setSince}
        onUntil={setUntil}
        today={today}
        onClear={clearAll}
      />
    </div>
  )
}

function dateLine(date: string | null, today: string, locale: string): ReactNode {
  if (date === null) return null
  return date > today ? (
    <span className="font-medium text-amber-700 dark:text-amber-400">{t`intră în vigoare la ${formatLegalDate(date, locale)}`}</span>
  ) : (
    <span className="text-muted-foreground">{t`de la ${formatLegalDate(date, locale)}`}</span>
  )
}

function Blocks({ blocks, today, locale }: { readonly blocks: readonly ChangeBlock[]; readonly today: string; readonly locale: string }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block) => (
        <article key={block.key} className="rounded-lg border bg-card px-4 py-3">
          <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm">
            {block.source !== null ? <ActLink actId={block.source.actId}>{block.source.displayCitation}</ActLink> : <span className="font-medium">{sourcelessHead(block.kind ?? '')}</span>}
            {block.date !== null ? <span aria-hidden="true" className="hidden text-muted-foreground sm:inline">·</span> : null}
            {dateLine(block.date, today, locale)}
          </h3>
          {block.source?.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{block.source.description}</p> : null}
          <ul className="mt-2 flex flex-col gap-1">
            {block.lines.map((line) => (
              <li key={line.actId} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                {block.source !== null ? <span className="text-muted-foreground">{joinVerbs(line.kinds)}</span> : null}
                <ActLink actId={line.actId}>{line.displayCitation}</ActLink>
                <LegalStatusBadge status={line.status} />
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}

function Rows({ rows, today, locale }: { readonly rows: readonly ChangeRow[]; readonly today: string; readonly locale: string }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {rows.map((row) => (
        <li key={row.eventId} className="flex flex-wrap items-baseline gap-x-2 px-4 py-2.5 text-sm">
          <ActLink actId={row.actId}>{row.displayCitation}</ActLink>
          <LegalStatusBadge status={row.status} />
          <span className="text-muted-foreground">
            {legalEventKindLabel(row.eventKind)}
            {row.sourceAct !== null ? (
              <>
                {' '}
                {t`prin`} <ActLink actId={row.sourceAct.actId}>{row.sourceAct.displayCitation}</ActLink>
              </>
            ) : null}
          </span>
          {row.effectiveDate !== null ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              {row.effectiveDate > today ? dateLine(row.effectiveDate, today, locale) : <span className="text-muted-foreground">{formatLegalDate(row.effectiveDate, locale)}</span>}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/40 motion-reduce:animate-none" />
      ))}
    </div>
  )
}

function rangeLabel(since: string, until: string, locale: string): string {
  if (since !== '' && until !== '') return `${formatLegalDate(since, locale)} – ${formatLegalDate(until, locale)}`
  return since !== '' ? t`din ${formatLegalDate(since, locale)}` : t`până la ${formatLegalDate(until, locale)}`
}

function ActiveFilters({
  tab,
  chosen,
  since,
  until,
  onKinds,
  onRange,
  onClear,
  locale,
}: {
  readonly tab: Tab
  readonly chosen: readonly string[]
  readonly since: string
  readonly until: string
  readonly onKinds: (next: readonly string[]) => void
  readonly onRange: () => void
  readonly onClear: () => void
  readonly locale: string
}) {
  const chip = (key: string, label: string, clear: () => void) => (
    <button
      key={key}
      type="button"
      onClick={clear}
      aria-label={t`Scoate ${label}`}
      className="group inline-flex h-7 items-center gap-1.5 rounded-sm bg-muted pl-2.5 pr-2 text-sm hover:bg-muted-foreground/20"
    >
      {label}
      <X className="size-3.5 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
    </button>
  )
  return (
    <div role="group" aria-label={t`Filtre active`} className="flex flex-wrap items-center gap-2">
      {chosen.filter((k) => kindsOf(tab).includes(k)).map((k) => chip(k, legalEventKindLabel(k), () => onKinds(chosen.filter((x) => x !== k))))}
      {tab !== 'fara-data' && (since !== '' || until !== '') ? chip('range', rangeLabel(since, until, locale), onRange) : null}
      <button type="button" onClick={onClear} className="px-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {t`Scoate toate filtrele`}
      </button>
    </div>
  )
}

function ChangesPanel({
  open,
  onOpenChange,
  returnFocus,
  tab,
  chosen,
  onKinds,
  since,
  until,
  onSince,
  onUntil,
  today,
  onClear,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly returnFocus: () => void
  readonly tab: Tab
  readonly chosen: readonly string[]
  readonly onKinds: (next: readonly string[]) => void
  readonly since: string
  readonly until: string
  readonly onSince: (value: string) => void
  readonly onUntil: (value: string) => void
  readonly today: string
  readonly onClear: () => void
}) {
  const toggle = (kind: string) => onKinds(chosen.includes(kind) ? chosen.filter((k) => k !== kind) : [...chosen, kind])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeClassName={SHEET_CLOSE}
        className="w-full overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus()
        }}
      >
        <SheetHeader>
          <SheetTitle>{t`Filtre`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 divide-y">
          <Group title={t`Felul schimbării`}>
            <div className="grid grid-cols-2 gap-x-1">
              {kindsOf(tab).map((kind) => {
                const on = chosen.includes(kind)
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(kind)}
                    className="flex min-h-11 w-full items-start gap-2.5 rounded-sm px-2 py-3 text-left text-sm leading-5 hover:bg-muted sm:min-h-9 sm:py-2"
                  >
                    <span
                      aria-hidden="true"
                      className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/30 bg-background')}
                    >
                      {on ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className={cn('min-w-0 break-words', on && 'font-medium')}>{legalEventKindLabel(kind)}</span>
                  </button>
                )
              })}
            </div>
          </Group>
          {tab !== 'fara-data' ? (
            <Group title={t`Când intră în vigoare`}>
              <Row label={t`De la`}>
                <input type="date" aria-label={t`De la`} className={FIELD} value={since} max={until !== '' ? until : undefined} onChange={(event) => onSince(event.target.value)} />
              </Row>
              <Row label={t`Până la`}>
                <input type="date" aria-label={t`Până la`} className={FIELD} value={until} min={since !== '' ? since : undefined} max={tab === 'schimbari' ? today : undefined} onChange={(event) => onUntil(event.target.value)} />
              </Row>
              {tab === 'schimbari' ? <p className="text-xs text-muted-foreground">{t`Perioada privește schimbările intrate deja în vigoare; cele care urmează sunt mereu sus.`}</p> : null}
            </Group>
          ) : (
            <p className="py-4 text-xs text-muted-foreground">{t`Schimbările fără dată nu pot fi alese după perioadă.`}</p>
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => onOpenChange(false)} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            {t`Vezi schimbările`}
          </button>
          <button type="button" onClick={onClear} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {t`Scoate toate filtrele`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
