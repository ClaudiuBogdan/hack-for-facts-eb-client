import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Input } from '@/components/ui/input'
import { LegalStatusBadge } from './legal-status-badge'
import { resolveLegalActs } from '../api/legal-resolve-api'
import { legalActStatusSchema } from '@/schemas/legal'

const DEBOUNCE_MS = 250
const MIN_QUERY_LENGTH = 3

/**
 * Citation/alias lookup — the deterministic front door to an act page.
 *
 * `legalResolve(dim: "act")` is a resolver, not a ranking: every candidate it
 * returns is rendered and the user picks. **Ambiguity is the feature** —
 * 'codul fiscal' names two acts, and silently taking the first would put the
 * wrong law behind a confident click. Zero hits get a format hint, not an
 * empty box.
 */
export function LegalCitationLookup({ className }: { readonly className?: string }) {
  const navigate = useNavigate()
  const listboxId = useId()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [query])

  const enabled = debounced.length >= MIN_QUERY_LENGTH
  const hitsQuery = useQuery({
    queryKey: ['legal', 'resolve', debounced],
    queryFn: ({ signal }) => resolveLegalActs(debounced, { signal }),
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const hits = hitsQuery.data ?? []

  // Light dismiss: clicking outside closes the candidate list.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const go = (actId: string) => {
    setOpen(false)
    setQuery('')
    void navigate({ to: '/legislation/acts/$actId', params: { actId } })
  }

  return (
    <div ref={rootRef} className={className}>
      <label
        className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]"
        htmlFor={`${listboxId}-input`}
      >
        <Trans>Citare sau nume uzual</Trans>
      </label>
      <div className="relative mt-1.5">
        <Input
          id={`${listboxId}-input`}
          role="combobox"
          aria-expanded={open && enabled}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder={t`ex. Legea 227/2015 sau codul fiscal`}
          value={query}
          autoComplete="off"
          className="h-12 w-full rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        {open && enabled && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={t`Acte găsite`}
            className="absolute z-20 mt-1 w-full rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] shadow-md"
          >
            {hitsQuery.isLoading && (
              <p className="px-3 py-2.5 text-sm text-[var(--pnrr-muted)]">
                <Trans>Se caută…</Trans>
              </p>
            )}
            {hitsQuery.isError && (
              <p className="px-3 py-2.5 text-sm text-[var(--pnrr-muted)]">
                <Trans>Căutarea nu a răspuns — încearcă din nou.</Trans>
              </p>
            )}
            {hitsQuery.isSuccess && hits.length === 0 && (
              <p className="px-3 py-2.5 text-sm text-[var(--pnrr-muted)]">
                <Trans>
                  Niciun act găsit — încearcă numărul și anul (ex. 227/2015).
                </Trans>
              </p>
            )}
            {hits.length > 1 && (
              <p className="border-b border-[var(--pnrr-subtle)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
                <Trans>{hits.length} potriviri — alege actul exact</Trans>
              </p>
            )}
            {hits.map((hit) => {
              const parsedStatus = legalActStatusSchema.safeParse(hit.hint)
              return (
                <button
                  key={`${hit.value}-${hit.label}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => go(hit.value)}
                  className="flex w-full items-center justify-between gap-3 border-b border-[var(--pnrr-subtle)] px-3 py-2.5 text-left text-sm text-[var(--pnrr-fg)] last:border-b-0 hover:bg-[var(--pnrr-hover)] focus-visible:bg-[var(--pnrr-hover)] focus-visible:outline-none"
                >
                  <span className="truncate font-semibold">{hit.label}</span>
                  {parsedStatus.success ? (
                    <LegalStatusBadge status={parsedStatus.data} />
                  ) : hit.hint !== null ? (
                    <span className="shrink-0 text-xs text-[var(--pnrr-muted)]">{hit.hint}</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
