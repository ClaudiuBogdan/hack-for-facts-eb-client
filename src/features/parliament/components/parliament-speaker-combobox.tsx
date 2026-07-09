import { useState } from 'react'
import { X } from 'lucide-react'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import {
  useParliamentMember,
  useParliamentMembers,
} from '../hooks/use-parliament-data'
import { formatMemberName, getChamberLabel } from '../lib/formatting'

const INPUT_CLASS =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

/** Matches shown under the input — one page of the members directory. */
const RESULT_LIMIT = 8
const MIN_QUERY_LENGTH = 2

type Props = {
  readonly value: string | undefined
  readonly onChange: (mandateKey: string | undefined) => void
  readonly inputId: string
}

/**
 * Speaker picker for the stenograme filters: type a name (diacritic-tolerant —
 * the members directory search handles folding), pick a match, and the
 * mandateKey is committed to the URL. The selected state shows the resolved
 * member (via the cached member query) with an X to clear. Search-driven
 * against the paged members directory — the full roster is never loaded.
 */
export function ParliamentSpeakerCombobox({ value, onChange, inputId }: Props) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 300)

  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH
  const results = useParliamentMembers(
    enabled ? { q: debouncedQuery, pageSize: RESULT_LIMIT } : {},
  )
  const selected = useParliamentMember(value ?? '')

  if (value) {
    const member = selected.data
    const label = member
      ? formatMemberName(member.firstName, member.lastName)
      : value
    return (
      <div className="flex items-center justify-between gap-2 border-2 border-[#1d70b8] bg-white px-3 py-2 dark:border-[var(--pnrr-blue)] dark:bg-[var(--pnrr-card)]">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {label}
          </p>
          {member ? (
            <p className="truncate text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {getChamberLabel(member.chamber)} · {member.groupName}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label="Elimină vorbitorul selectat"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[#505a5f] hover:text-[#0b0c0c] dark:text-[var(--pnrr-muted)] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    )
  }

  const members = enabled ? (results.data?.members ?? []).slice(0, RESULT_LIMIT) : []

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Caută după nume (ex. Popescu)…"
        className={INPUT_CLASS}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {enabled ? (
        results.isLoading ? (
          <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Se caută…
          </p>
        ) : members.length > 0 ? (
          <ul className="divide-y divide-[#b1b4b6] border-2 border-[#b1b4b6] dark:divide-[var(--pnrr-border)] dark:border-[var(--pnrr-border)]">
            {members.map((member) => (
              <li key={member.memberId}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(member.memberId)
                    setQuery('')
                  }}
                  className="flex w-full flex-col items-start gap-0.5 bg-white px-3 py-2 text-left hover:bg-[#f3f2f1] dark:bg-[var(--pnrr-card)] dark:hover:bg-[var(--pnrr-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pnrr-blue)]"
                >
                  <span className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                    {formatMemberName(member.firstName, member.lastName)}
                  </span>
                  <span className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    {getChamberLabel(member.chamber)} · {member.groupName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Niciun parlamentar găsit pentru „{debouncedQuery}”.
          </p>
        )
      ) : (
        <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          Tastați cel puțin {MIN_QUERY_LENGTH} litere pentru a căuta.
        </p>
      )}
    </div>
  )
}
