import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { cn } from '@/lib/utils'
import type { LegalRecentChange } from '@/schemas/legal'
import { formatLegalDate } from '../../lib/legal-format'
import { joinVerbs, sourcelessHead, type ChangeBlock } from '../../lib/legal-changes-blocks'
import { legalEventKindLabel } from '../../lib/legal-vocabulary'
import { LegalStatusBadge } from '../legal-status-badge'

/**
 * The Modificări page's lists (owner, 28 November 2026): one block per act that makes the change — its date, what it
 * is about, every act it changes with that act's status — and plain rows for the new laws and the undated changes.
 */

const linkClass = 'font-medium text-foreground underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground'

function ActLink({ actId, children }: { readonly actId: string; readonly children: ReactNode }) {
  return (
    <Link to="/legislation/acts/$actId" params={{ actId }} className={linkClass}>
      {children}
    </Link>
  )
}

/** „de la 25 septembrie 2026" for a change in force; a future date in the accent. */
function DateWords({ date, today, locale }: { readonly date: string; readonly today: string; readonly locale: string }) {
  return date > today ? (
    <span className="font-medium text-amber-700 dark:text-amber-400">{t`intră în vigoare la ${formatLegalDate(date, locale)}`}</span>
  ) : (
    <span className="text-muted-foreground">{t`de la ${formatLegalDate(date, locale)}`}</span>
  )
}

export function ChangeBlocks({ blocks, today, locale }: { readonly blocks: readonly ChangeBlock[]; readonly today: string; readonly locale: string }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block) => (
        <article key={block.key} className="rounded-lg border bg-card px-4 py-3">
          <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm">
            {block.source !== null ? <ActLink actId={block.source.actId}>{block.source.displayCitation}</ActLink> : <span className="font-medium">{sourcelessHead(block.kind ?? '')}</span>}
            {block.date !== null ? (
              <>
                {/* Hidden on a phone, where the date wraps under the name and the dot would end a line. */}
                <span aria-hidden="true" className="hidden text-muted-foreground sm:inline">
                  ·
                </span>
                <DateWords date={block.date} today={today} locale={locale} />
              </>
            ) : null}
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

/**
 * One row per event: the act, its status, the kind as a noun (a participle would need the act's grammatical gender,
 * which the feed does not give) with the act that made it when one is recorded, and the date.
 */
export function ChangeRows({ rows, today, locale }: { readonly rows: readonly LegalRecentChange[]; readonly today: string; readonly locale: string }) {
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
              <span aria-hidden="true" className="text-muted-foreground">
                ·
              </span>
              {row.effectiveDate > today ? (
                <DateWords date={row.effectiveDate} today={today} locale={locale} />
              ) : (
                <span className="text-muted-foreground">{formatLegalDate(row.effectiveDate, locale)}</span>
              )}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function ChangesSkeleton({ className }: { readonly className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/40 motion-reduce:animate-none" />
      ))}
    </div>
  )
}
