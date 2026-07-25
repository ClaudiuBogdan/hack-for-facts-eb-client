import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ProcurementRecordSummary,
  ProcurementSearchHighlight,
} from '@/schemas/procurement'
import {
  recordCpv,
  recordDate,
  recordDetailLink,
  recordNumberLabel,
  recordPrimaryMoney,
  recordStatus,
  recordSupplier,
  recordTitle,
} from '../lib/record-accessors'
import { partyLabel } from '../lib/party-links'
import { statusAccentBorderClassName, statusLabel } from '../lib/status-meta'
import { describeMoney } from '../lib/formatting'
import {
  procurementCardChevronClassName,
  procurementRecordCardClassName,
} from '../lib/procurement-theme'
import { markFromFragment, markLiteral, highlightsById } from '../lib/highlight'
import { ValueWithCurrency } from './value-with-currency'

type Props = {
  readonly record: ProcurementRecordSummary
  readonly className?: string
  /** Match fragments for THIS record, when the search engine produced them. */
  readonly highlight?: ProcurementSearchHighlight
  /**
   * The query, for a page the DATABASE answered. That path has no fragments —
   * its match is the literal query — so without this the reader gets results
   * with nothing marked at all (which is what direct acquisitions did).
   */
  readonly query?: string
}

/**
 * Render the DATABASE `text`, with the terms the search matched marked.
 *
 * `fragment` is only a hint about which substrings matched — it is capped at
 * 200 characters and is as of the index build, so it must never become the
 * text (see `lib/highlight`). Nothing is parsed as HTML: these are text
 * segments, so a title containing a tag stays the literal string.
 */
function MarkedText({
  text,
  fragment,
  query,
}: {
  readonly text: string
  readonly fragment?: string | null
  readonly query?: string
}): ReactNode {
  const segments =
    fragment != null && fragment !== ''
      ? markFromFragment(text, fragment)
      : markLiteral(text, query)
  return (
    <>
      {segments.map((segment, index) =>
        segment.marked ? (
          <mark
            key={index}
            className="rounded-[2px] bg-[#fd0] px-0.5 text-inherit dark:bg-[#fd0] dark:text-[#0b0c0c]"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  )
}

function formatCardDate(iso: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

/**
 * One search result row — the whole card is a single link to the record
 * detail (party profile links live on the detail page; no nested anchors).
 * The 5px left border is the single status accent; the grain is known from
 * the tabs above, so no icon rail repeats it per row.
 */
export function ProcurementRecordCard({ record, className, highlight, query }: Props) {
  const link = recordDetailLink(record)
  const status = recordStatus(record)
  const money = recordPrimaryMoney(record)
  const date = recordDate(record)
  const number = recordNumberLabel(record)
  const cpv = recordCpv(record)
  const supplier = recordSupplier(record)
  const title = recordTitle(record)

  const meta = [
    number,
    date ? formatCardDate(date) : null,
    cpv ? `CPV ${cpv}` : null,
    status ? statusLabel(status) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  // Compact notation pays off only in the millions — below that the full
  // figure ("20.000 RON") reads faster than "20 K RON".
  const moneyDisplay = money ? describeMoney(money) : null
  const moneyNotation =
    moneyDisplay?.kind === 'ron' && Math.abs(moneyDisplay.ron) >= 1_000_000
      ? ('compact' as const)
      : ('standard' as const)

  const body = (
    <div
      className={cn(
        'flex border-l-[5px]',
        status
          ? statusAccentBorderClassName(status)
          : 'border-l-slate-400 dark:border-l-slate-500',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="line-clamp-2 text-base font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {/* The database title always renders; the fragment only says
                which of its words to emphasise. */}
            {title !== null ? (
              <MarkedText text={title} fragment={highlight?.title} query={query} />
            ) : (
              <Trans>Untitled record</Trans>
            )}
          </p>
          {meta ? (
            <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {meta}
            </p>
          ) : null}
          <p className="mt-1 truncate text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <MarkedText
              text={partyLabel(record.authority)}
              fragment={highlight?.authorityName}
            />
            {supplier ? (
              <>
                {' → '}
                <MarkedText
                  text={partyLabel(supplier)}
                  fragment={highlight?.supplierName}
                />
              </>
            ) : null}
          </p>
          {record.grain === 'modification' && link === null ? (
            <p className="mt-1 text-xs text-[var(--pnrr-muted)]">
              <Trans>
                Not linked to a contract in the source data — no detail page.
              </Trans>
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-start gap-3">
          {money ? (
            <ValueWithCurrency
              value={money}
              notation={moneyNotation}
              className="hidden text-lg font-bold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)] sm:inline-flex"
            />
          ) : null}
          {link ? (
            <ChevronRight
              className={cn(procurementCardChevronClassName, 'mt-0.5')}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </div>
  )

  if (!link) {
    return (
      <div className={cn(procurementRecordCardClassName, 'cursor-default hover:bg-white dark:hover:bg-[var(--pnrr-card)]', className)}>
        {body}
      </div>
    )
  }

  return (
    <Link
      to={link.to}
      params={link.params}
      hash={link.hash}
      className={cn(procurementRecordCardClassName, className)}
    >
      {body}
    </Link>
  )
}

export function ProcurementRecordList({
  records,
  highlights,
  query,
  className,
}: {
  readonly records: readonly ProcurementRecordSummary[]
  /** Page match fragments; present only on a search-engine-served page. */
  readonly highlights?: readonly ProcurementSearchHighlight[]
  /** The query, so a database-served page still marks what it matched. */
  readonly query?: string
  readonly className?: string
}): ReactNode {
  const byId = highlightsById(highlights)
  return (
    <ul className={cn('space-y-3', className)}>
      {records.map((record) => {
        const highlight = byId.get(record.id)
        return (
          <li key={`${record.grain}-${record.id}`}>
            <ProcurementRecordCard
              record={record}
              {...(highlight !== undefined && { highlight })}
              {...(query !== undefined && { query })}
            />
          </li>
        )
      })}
    </ul>
  )
}
