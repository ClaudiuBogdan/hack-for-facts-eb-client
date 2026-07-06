import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { ChevronRight, FileDiff, FileSignature, FileText, ShoppingCart, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcurementRecordSummary } from '@/schemas/procurement'
import {
  recordCpv,
  recordDate,
  recordDetailLink,
  recordNumberLabel,
  recordPrimaryMoney,
  recordStatus,
  recordSupplier,
  recordTitle,
  uiGrainOf,
} from '../lib/record-accessors'
import { partyLabel } from '../lib/party-links'
import { grainSingularLabelEn } from '../lib/enum-labels'
import { statusAccentBorderClassName, statusLabel } from '../lib/status-meta'
import {
  procurementCardChevronClassName,
  procurementRecordCardClassName,
} from '../lib/procurement-theme'
import { ValueWithCurrency } from './value-with-currency'

type Props = {
  readonly record: ProcurementRecordSummary
  readonly className?: string
}

const GRAIN_ICONS: Record<ReturnType<typeof uiGrainOf>, LucideIcon> = {
  procedures: FileText,
  contracts: FileSignature,
  direct_acquisitions: ShoppingCart,
  modifications: FileDiff,
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
 * Left border carries the status tone; the icon rail names the grain.
 */
export function ProcurementRecordCard({ record, className }: Props) {
  const grain = uiGrainOf(record)
  const link = recordDetailLink(record)
  const status = recordStatus(record)
  const money = recordPrimaryMoney(record)
  const date = recordDate(record)
  const number = recordNumberLabel(record)
  const cpv = recordCpv(record)
  const supplier = recordSupplier(record)
  const Icon = GRAIN_ICONS[grain]

  const meta = [
    number,
    date ? formatCardDate(date) : null,
    cpv ? `CPV ${cpv}` : null,
    status ? statusLabel(status) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const body = (
    <div
      className={cn(
        'flex border-l-[5px]',
        status
          ? statusAccentBorderClassName(status)
          : 'border-l-slate-400 dark:border-l-slate-500',
      )}
    >
      <div className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-[#b1b4b6] px-2 py-5 text-center dark:border-[var(--pnrr-border)]">
        <Icon className="h-5 w-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]" strokeWidth={2} aria-hidden />
        <span className="text-xs font-bold leading-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {grainSingularLabelEn(grain)}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-base font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {recordTitle(record) ?? <Trans>Untitled record</Trans>}
          </p>
          {meta ? (
            <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {meta}
            </p>
          ) : null}
          <p className="mt-1 truncate text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {partyLabel(record.authority)}
            {supplier ? <> → {partyLabel(supplier)}</> : null}
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
              notation="compact"
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
  className,
}: {
  readonly records: readonly ProcurementRecordSummary[]
  readonly className?: string
}): ReactNode {
  return (
    <ul className={cn('space-y-3', className)}>
      {records.map((record) => (
        <li key={`${record.grain}-${record.id}`}>
          <ProcurementRecordCard record={record} />
        </li>
      ))}
    </ul>
  )
}
