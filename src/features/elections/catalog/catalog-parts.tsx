import type { FormEvent, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ELECTIONS_PAGE_SIZE } from '@/schemas/elections-catalog'

/**
 * The pieces the three elections pages share, on the hubs' frame
 * (`RuledFrame`, `MonoLabel`): the head, the facts list, the filter form, and
 * a list's body with its states and pager.
 */

/** The page's head: a caption, the title, and what follows it. */
export function ElectionsPageHead({
  caption,
  title,
  back,
  children,
}: {
  readonly caption: ReactNode
  readonly title: ReactNode
  readonly back?: ReactNode
  readonly children?: ReactNode
}) {
  return (
    <section className="border-b">
      <RuledFrame className="py-10 sm:py-14">
        {back ? <div className="mb-6">{back}</div> : null}
        <MonoLabel className="text-muted-foreground">{caption}</MonoLabel>
        {/* Keys run long and unspaced („ro:local:2024:2024-06-09:mayor:uat:116046"): they break anywhere rather than run off a phone. */}
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">{title}</h1>
        {children}
      </RuledFrame>
    </section>
  )
}

const BACK_LINK_CLASS =
  'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-0'

/** Back to the list of events, or to the event (and the ballot day) a contest belongs to. */
export function ElectionsBackLink({
  electionKey,
  ballotDate,
  children,
}: {
  readonly electionKey?: string
  readonly ballotDate?: string
  readonly children: ReactNode
}) {
  const body = (
    <>
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </>
  )
  return electionKey === undefined ? (
    <Link to="/alegeri" className={BACK_LINK_CLASS}>
      {body}
    </Link>
  ) : (
    <Link
      to="/alegeri/$electionKey"
      params={{ electionKey }}
      // Every key written: the root's search passes through, so an omitted key would carry over.
      search={{ data: ballotDate, functie: undefined, arie: undefined, judet: undefined, pagina: undefined }}
      className={BACK_LINK_CLASS}
    >
      {body}
    </Link>
  )
}

export interface ElectionsFact {
  readonly label: ReactNode
  /** `null`: the source reports nothing here, and the fact says so in `missing`. */
  readonly value: ReactNode | null
  readonly missing?: ReactNode
  /** A key or code: set in mono, selectable, broken anywhere. */
  readonly code?: boolean
}

/** The record's facts, label above value, every missing one named rather than left blank. */
export function ElectionsFactList({ facts, className }: { readonly facts: readonly ElectionsFact[]; readonly className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {facts.map((fact, index) => (
        <div key={index} className="min-w-0 border-t pt-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{fact.label}</dt>
          <dd className={cn('mt-1.5 text-sm text-foreground', fact.code && fact.value !== null && 'break-all font-mono text-xs')}>
            {fact.value === null ? (
              <span className="text-muted-foreground">{fact.missing ?? <Trans>Neraportat</Trans>}</span>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A read that failed: says so, offers the retry, never renders as absence. */
export function ElectionsLoadError({ children, onRetry }: { readonly children: ReactNode; readonly onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 py-6 text-sm text-muted-foreground">
      <p>{children}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <Trans>Încearcă din nou</Trans>
      </Button>
    </div>
  )
}

/**
 * A refresh that failed while an earlier answer is still on screen: the
 * failure is said and can be retried, and what stays is named as the last
 * answer received, since it can no longer be confirmed current.
 */
export function ElectionsRefreshError({ onRetry, className }: { readonly onRetry: () => void; readonly className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 border-amber-700/50 pl-4 text-sm text-muted-foreground dark:border-amber-300/50', className)}>
      <p>
        <Trans>Datele nu s-au putut actualiza. Se afișează ultimul răspuns primit.</Trans>
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <Trans>Încearcă din nou</Trans>
      </Button>
    </div>
  )
}

/** The API answered and has no such record: distinct from a failed read, which says nothing about it. */
export function ElectionsRecordMissing({ title, children, notice }: { readonly title: ReactNode; readonly children: ReactNode; readonly notice?: ReactNode }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-14">
        <div role="status" className="max-w-[60ch]">
          <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{children}</p>
          {notice}
          <div className="mt-4">
            <ElectionsBackLink>
              <Trans>Toate alegerile</Trans>
            </ElectionsBackLink>
          </div>
        </div>
      </RuledFrame>
    </section>
  )
}

export const FILTER_FIELD_CLASS = 'flex min-w-0 flex-col gap-1.5'
export const FILTER_LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

/**
 * A list's filters as one form: the reader sets them, then applies them, and
 * the list starts again from its first page. Every field sends one exact
 * value; an empty field sends none.
 */
export function ElectionsFilterForm({
  label,
  active,
  onApply,
  onClear,
  children,
}: {
  readonly label: string
  readonly active: boolean
  readonly onApply: () => void
  readonly onClear: () => void
  readonly children: ReactNode
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onApply()
  }
  return (
    <form role="search" aria-label={label} onSubmit={submit} className="mt-8 grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" className="min-h-9">
          <Trans>Aplică filtrele</Trans>
        </Button>
        {active ? (
          <Button type="button" variant="ghost" size="sm" className="min-h-9" onClick={onClear}>
            <Trans>Șterge filtrele</Trans>
          </Button>
        ) : null}
      </div>
    </form>
  )
}

/** The list's rows, dimmed while the next page replaces them. */
function ElectionsRows({ busy, label, children }: { readonly busy: boolean; readonly label: string; readonly children: ReactNode }) {
  return (
    <ul aria-label={label} aria-busy={busy || undefined} className={cn('mt-6 divide-y divide-border/70 border-y border-border/70 transition-opacity', busy && 'opacity-60')}>
      {children}
    </ul>
  )
}

/** The link that makes a whole row its target, ringed around the row. */
export const ROW_LINK_CLASS =
  "text-sm font-medium leading-snug text-foreground underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring"

export const ROW_CLASS = 'group relative flex flex-col gap-1.5 px-1 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6'

/** A page past the list's last one: the API answered with no rows there, and the reader is offered the first. */
function ElectionsPageBeyondEnd({ total, onFirstPage }: { readonly total: number; readonly onFirstPage: () => void }) {
  const pages = Math.max(1, Math.ceil(total / ELECTIONS_PAGE_SIZE))
  return (
    <div role="status" className="mt-6 space-y-3 border-y border-border/70 py-6 text-sm text-muted-foreground">
      <p>
        <Trans>
          Pagina aceasta nu are rânduri. Lista are <Plural value={pages} one="o pagină" few="# pagini" other="# de pagini" />.
        </Trans>
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onFirstPage}>
        <Trans>Mergi la prima pagină</Trans>
      </Button>
    </div>
  )
}

/** The shared pager over the API's own page and total; only when there is more than one page. */
function ElectionsPager({ page, total, onPageChange }: { readonly page: number; readonly total: number; readonly onPageChange: (page: number) => void }) {
  if (total <= ELECTIONS_PAGE_SIZE) return null
  return (
    <Pagination
      currentPage={page}
      pageSize={ELECTIONS_PAGE_SIZE}
      totalCount={total}
      onPageChange={onPageChange}
      // The bands are ruled, not carded: the pager closes the list on its rule.
      className="mt-4 rounded-none border-0 bg-transparent p-0 shadow-none md:p-0"
    />
  )
}

/** A list's head count, from the API's exact total; while the next page loads, its place is held. */
export function ElectionsCount({ children, pending }: { readonly children: ReactNode; readonly pending: boolean }) {
  return (
    <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
      {pending ? <span className="inline-block h-[0.8em] w-28 animate-pulse rounded-sm bg-muted align-middle" aria-hidden="true" /> : children}
      {pending ? <span className="sr-only">{t`Se încarcă`}</span> : null}
    </p>
  )
}

/** A list read as its page shows it: the API's page, whether it is this address's or still the previous one's, and whether its last read failed. */
export interface ElectionsListQuery<Item> {
  readonly data: { readonly items: readonly Item[]; readonly total: number } | undefined
  readonly isPlaceholderData: boolean
  readonly isError: boolean
  readonly isRefetchError: boolean
  readonly refetch: () => unknown
}

function ElectionsListPending({ label }: { readonly label: string }) {
  return (
    <div className="mt-6" aria-busy="true">
      <HubPending rows={8} />
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * A list's body. An empty list, a page past the end and the pager's range
 * are said only of this address's own answer: while it is read, the
 * previous address's rows may stay, dimmed and named as the earlier ones,
 * with no pager, and an earlier empty answer shows as loading. A refresh
 * that fails keeps the last answer under a notice and its retry.
 */
export function ElectionsListBody<Item>({
  query,
  page,
  label,
  loadingLabel,
  loadError,
  emptyTitle,
  emptyDescription,
  onPageChange,
  renderItem,
}: {
  readonly query: ElectionsListQuery<Item>
  readonly page: number
  readonly label: string
  readonly loadingLabel: string
  readonly loadError: ReactNode
  readonly emptyTitle: string
  readonly emptyDescription?: string
  readonly onPageChange: (page: number) => void
  readonly renderItem: (item: Item) => ReactNode
}) {
  const { data } = query
  const retry = () => void query.refetch()
  if (!data) {
    return query.isError ? <ElectionsLoadError onRetry={retry}>{loadError}</ElectionsLoadError> : <ElectionsListPending label={loadingLabel} />
  }
  if (query.isPlaceholderData) {
    if (data.items.length === 0) return <ElectionsListPending label={loadingLabel} />
    return (
      <>
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          <Trans>Se încarcă pagina cerută. Rândurile de mai jos sunt cele afișate anterior.</Trans>
        </p>
        <ElectionsRows busy label={label}>
          {data.items.map(renderItem)}
        </ElectionsRows>
      </>
    )
  }
  return (
    <>
      {query.isRefetchError ? <ElectionsRefreshError onRetry={retry} className="mt-6" /> : null}
      {data.items.length > 0 ? (
        <>
          <ElectionsRows busy={false} label={label}>
            {data.items.map(renderItem)}
          </ElectionsRows>
          <ElectionsPager page={page} total={data.total} onPageChange={onPageChange} />
        </>
      ) : data.total > 0 ? (
        <ElectionsPageBeyondEnd total={data.total} onFirstPage={() => onPageChange(1)} />
      ) : (
        <EmptyState className="mt-6" title={emptyTitle} description={emptyDescription} />
      )}
    </>
  )
}
