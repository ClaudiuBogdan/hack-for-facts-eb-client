import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ValueWithCurrency } from './value-with-currency'
import { formatFlowCount } from '../lib/formatting'
import type { TopPartyRow } from '@/schemas/procurement'

type PartyKind = 'authority' | 'supplier'

type Props = {
  readonly rows: readonly TopPartyRow[]
  readonly partyKind: PartyKind
  readonly metric: 'count' | 'value'
  readonly className?: string
  readonly emptyLabel?: string
}

const MAX_BARS = 8
const MAX_BAR_WIDTH_PCT = 100

/**
 * Horizontal bar-list ranking of top parties (authorities or suppliers).
 * Always paired with a semantic `<table>` fallback (a11y) and text summaries.
 * Spend share is shown only when the capability gate allows it
 * (`shareOfTotal` is null otherwise — no mixed-currency totals).
 */
export function PartyRankingChart({
  rows,
  partyKind,
  metric,
  className,
  emptyLabel,
}: Props) {
  const max = useMemo(() => {
    if (rows.length === 0) return 0
    return Math.max(
      ...rows.map((r) => (metric === 'value' ? r.amount.ron ?? 0 : r.flowCount)),
    )
  }, [rows, metric])
  const hasNativeOnlyRows = rows.some(
    (row) => row.amount.ron === null && row.amount.nativeValue !== null,
  )

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyLabel ?? t`Nicio înregistrare.`}
      </p>
    )
  }

  return (
    <div className={className}>
      {/* Visual bar-list */}
      <ul className="space-y-2" aria-hidden>
        {rows.slice(0, MAX_BARS).map((row, index) => {
          const raw = metric === 'value' ? row.amount.ron ?? 0 : row.flowCount
          const widthPct =
            max > 0 && raw > 0
              ? Math.max(4, Math.round((raw / max) * MAX_BAR_WIDTH_PCT))
              : 0
          const partyLabel = row.party.displayName ?? row.party.name ?? row.party.cui ?? t`Necunoscut`
          return (
            <li key={`${row.party.cui ?? index}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{partyLabel}</span>
                <span className="shrink-0 text-muted-foreground">
                  {metric === 'value' ? (
                    <ValueWithCurrency value={row.amount} notation="compact" />
                  ) : (
                    `${formatFlowCount(row.flowCount)} ${t`fluxuri`}`
                  )}
                  {row.shareOfTotal !== null ? ` · ${Math.round(row.shareOfTotal * 100)}%` : ''}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {metric === 'value' && hasNativeOnlyRows ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans>
            Barele de valoare folosesc doar RON; valorile non-RON rămân
            afișate separat, fără agregare numerică.
          </Trans>
        </p>
      ) : null}

      {/* Tabular fallback (a11y) */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          <Trans>Versiune tabelară</Trans>
        </summary>
        <PartyRankingTable rows={rows.slice(0, MAX_BARS)} partyKind={partyKind} />
      </details>
    </div>
  )
}

function PartyRankingTable({
  rows,
  partyKind,
}: {
  readonly rows: readonly TopPartyRow[]
  readonly partyKind: PartyKind
}) {
  const to = partyKind === 'authority' ? '/entities/$cui' : '/companies/$cui'
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            {partyKind === 'authority' ? <Trans>Autoritate</Trans> : <Trans>Furnizor</Trans>}
          </TableHead>
          <TableHead>
            <Trans>Fluxuri</Trans>
          </TableHead>
          <TableHead>
            <Trans>Valoare</Trans>
          </TableHead>
          <TableHead>
            <Trans>Cota</Trans>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const partyLabel = row.party.displayName ?? row.party.name ?? row.party.cui ?? t`Necunoscut`
          return (
            <TableRow key={`${row.party.cui ?? index}-${index}`}>
              <TableCell>
                {row.party.cui ? (
                  <Link
                    to={to}
                    params={{ cui: row.party.cui }}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    {partyLabel}
                  </Link>
                ) : (
                  partyLabel
                )}
              </TableCell>
              <TableCell>{formatFlowCount(row.flowCount)}</TableCell>
              <TableCell>
                <ValueWithCurrency value={row.amount} notation="compact" />
              </TableCell>
              <TableCell>
                {row.shareOfTotal !== null ? `${Math.round(row.shareOfTotal * 100)}%` : t`indisponibil`}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
