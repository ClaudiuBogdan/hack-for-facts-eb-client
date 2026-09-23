import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Autocomplete } from '@base-ui/react/autocomplete'
import type { BaseUIEvent } from '@base-ui/react/types'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Loader2, Search, X } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Message, Skeleton, resultRowClass } from '@/features/landing/components/search/search-parts'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import { fetchRegistryPage, type RegistryRecord } from '../registry/api'
import { registryQuery, registrySearch } from './registry-figures'

/** Rows the dropdown shows; the registry holds the rest. */
const SUGGESTIONS = 6
/** Shorter names match too much of 141,000 entries to be worth a request. */
const MIN_LENGTH = 3

/** A registry status other than „Înregistrat", said on the row: a donor needs to see it before opening. */
function statusNote(status: string): string | null {
  switch (status) {
    case 'Radiat':
      return t`radiat`
    case 'Dizolvata':
      return t`dizolvat`
    case 'In Lichidare':
      return t`în lichidare`
    default:
      return null
  }
}

/**
 * The hub's search: the registry by name, or by registry number
 * (`3446/A/2026`, looked up exactly), in the site search's chrome. Each row
 * opens the registry entry; Enter with no row chosen opens the registry
 * list for the query.
 *
 * The site's universal index is not used here: its NGO documents come from
 * other sources, and most of them have no registry entry to open.
 */
export function NgoRegistrySearch({ className }: { readonly className?: string }) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const highlightedRef = useRef<RegistryRecord | undefined>(undefined)
  const query = term.trim()
  const debounced = useDebouncedValue(query, 250)
  const enabled = debounced.length >= MIN_LENGTH
  const results = useQuery({
    queryKey: ['ngo-hub-registry-search', debounced],
    queryFn: ({ signal }) => fetchRegistryPage(registrySearch(registryQuery(debounced)), signal, SUGGESTIONS),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  })
  const current = results.data !== undefined && !results.isPlaceholderData && debounced === query
  const rows = query.length >= MIN_LENGTH ? (results.data?.edges.map((edge) => edge.node) ?? []) : []
  // A failed read is not busy: it says so and offers the retry, until the retry is under way.
  const failed = query.length >= MIN_LENGTH && results.isError && !results.data
  const busy = query.length >= MIN_LENGTH && (results.isFetching || (!current && !results.isError))
  const listSearch = registrySearch(registryQuery(query))
  const open = isOpen && query.length > 0
  const found = rows.length

  const openList = () => {
    if (query.length === 0) return
    setIsOpen(false)
    void navigate({ to: '/ong-uri/registru', search: listSearch })
  }

  let message: string | null = null
  if (query.length > 0 && query.length < MIN_LENGTH) message = t`Scrie cel puțin ${MIN_LENGTH} litere.`
  else if (failed) message = t`Registrul nu a răspuns.`
  else if (current && rows.length === 0) message = t`Niciun ONG cu „${query}” în registru.`

  return (
    <Autocomplete.Root
      items={rows}
      // The rows are the registry's answer, in its order.
      filter={null}
      value={term}
      onValueChange={(next, details) => {
        // A row is a link that navigates; its text does not belong in the field.
        if (details.reason === 'item-press') return
        setTerm(next)
        setIsOpen(true)
      }}
      open={open}
      onOpenChange={setIsOpen}
      itemToStringValue={(record: RegistryRecord) => record.name}
      onItemHighlighted={(record) => {
        highlightedRef.current = record
      }}
      openOnInputClick={false}
      // No row is preselected: Enter on its own opens the list of every match.
      autoHighlight={false}
    >
      <div className={cn('relative w-full', className)}>
        <Autocomplete.InputGroup
          aria-label={t`Caută în registru`}
          className={cn(
            'flex min-h-12 items-center rounded-lg border border-input bg-card py-2 pl-10 pr-12 transition-[border-color,box-shadow] duration-150',
            'hover:border-foreground/30 focus-within:border-foreground/55 focus-within:shadow-lg data-popup-open:border-foreground/55 data-popup-open:shadow-lg',
            'data-popup-open:data-[popup-side=bottom]:rounded-b-none data-popup-open:data-[popup-side=bottom]:border-b-0',
            'data-popup-open:data-[popup-side=top]:rounded-t-none data-popup-open:data-[popup-side=top]:border-t-0',
          )}
        >
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-6 size-4 -translate-y-1/2 text-muted-foreground" />
          <Autocomplete.Input
            onFocus={() => setIsOpen(true)}
            onKeyDown={(event: BaseUIEvent<KeyboardEvent<HTMLInputElement>>) => {
              // Nothing acts while an IME is composing a word.
              if (event.nativeEvent.isComposing || event.keyCode === 229) {
                event.preventBaseUIHandler()
                return
              }
              // Escape in two stages: the first closes the list (Base UI), the second empties the field.
              if (event.key === 'Escape' && !open) {
                setTerm('')
                return
              }
              if (event.key !== 'Enter') return
              // A highlighted row opens (Base UI presses it) only while the list answers what is in the field;
              // a row left from the previous query must not open. Otherwise Enter opens the registry list for the field.
              if (highlightedRef.current && current) return
              event.preventDefault()
              event.preventBaseUIHandler()
              openList()
            }}
            // The outline is the field's, drawn by the group.
            className="h-7 min-w-24 flex-1 bg-transparent text-base text-foreground outline-hidden! placeholder:text-muted-foreground"
            placeholder={t`Numele organizației sau numărul din registru`}
            aria-label={t`Numele organizației sau numărul din registru`}
            enterKeyHint="search"
          />
          <div className="absolute right-3 top-6 flex -translate-y-1/2 items-center gap-1.5">
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground" /> : null}
            {term.length > 0 ? (
              <Autocomplete.Clear
                aria-label={t`Șterge căutarea`}
                tabIndex={0}
                className="relative rounded-sm p-1 text-muted-foreground transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </Autocomplete.Clear>
            ) : null}
          </div>
        </Autocomplete.InputGroup>
        <p aria-live="polite" className="sr-only">
          {message ?? (current && found > 0 ? plural(found, { one: '# rezultat', few: '# rezultate', other: '# de rezultate' }) : '')}
        </p>
      </div>

      <Autocomplete.Portal>
        <Autocomplete.Positioner align="start" className="z-30 outline-hidden">
          <Autocomplete.Popup
            aria-busy={busy || undefined}
            className={cn(
              'flex max-h-[var(--available-height)] w-[var(--anchor-width)] max-w-[var(--available-width)] flex-col overflow-hidden rounded-lg border border-foreground/55 bg-card shadow-lg',
              'data-[side=bottom]:rounded-t-none data-[side=bottom]:border-t-0 data-[side=top]:rounded-b-none data-[side=top]:border-b-0',
              'transition-opacity duration-150 data-starting-style:opacity-0 motion-reduce:transition-none',
            )}
          >
            <div className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-3">
              <MonoLabel className="text-muted-foreground">
                <Trans>Registrul național ONG</Trans>
              </MonoLabel>
              <MonoLabel className="text-muted-foreground">
                <Trans>Nr. registru</Trans>
              </MonoLabel>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <Autocomplete.List className={cn('transition-opacity motion-reduce:transition-none', busy && rows.length > 0 && 'opacity-50')}>
                {(record: RegistryRecord) => (
                  <Autocomplete.Item
                    key={record.id}
                    value={record}
                    className={resultRowClass}
                    onClick={() => setIsOpen(false)}
                    render={<Link to="/ong-uri/registru/$recordId" params={{ recordId: record.id }} preload={false} />}
                  >
                    <RegistryRow record={record} />
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
              {failed ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {message}{' '}
                  <button
                    type="button"
                    // Keeps the caret in the field, so the list stays open for the answer.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void results.refetch()}
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    <Trans>Încearcă din nou</Trans>
                  </button>
                </p>
              ) : message ? (
                <Message>{message}</Message>
              ) : rows.length === 0 && busy ? (
                <Skeleton />
              ) : null}
            </div>
            {rows.length > 0 ? (
              <Link
                to="/ong-uri/registru"
                search={listSearch}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Trans>Toate rezultatele din registru</Trans>
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}

function RegistryRow({ record }: { readonly record: RegistryRecord }) {
  const status = statusNote(record.sourceRegistryStatus)
  const place = [record.locality, record.county].filter(Boolean).join(' · ')
  return (
    <>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-card-foreground group-data-highlighted:text-primary">
          {record.nameWithheld ? t`Nume în curs de verificare` : record.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {[record.legalForm, place].filter(Boolean).join(' · ')}
          {status ? <span className="font-medium text-foreground"> · {status}</span> : null}
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{record.registryNumber}</span>
    </>
  )
}
