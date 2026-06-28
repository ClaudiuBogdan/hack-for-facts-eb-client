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
import { formatFlowCount, ronAmountSlice } from '../lib/formatting'
import type { Party, TopPartyRow } from '@/schemas/procurement'

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

function rowParty(row: TopPartyRow, partyKind: PartyKind): Party | null {
  return partyKind === 'authority' ? row.authority : row.supplier
}

function rowAmount(row: TopPartyRow): number | null {
  return row.amountRonSum === null ? null : Number(row.amountRonSum)
}

function rowMetric(row: TopPartyRow, metric: 'count' | 'value'): number {
  return metric === 'value' ? rowAmount(row) ?? 0 : Number(row.flowCount)
}

/**
 * Horizontal bar-list ranking of top parties (authorities or suppliers).
 * Always paired with a semantic `<table>` fallback (a11y) and text summaries.
 * Share is computed within the list; value rows with no RON sum show no share.
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
    return Math.max(...rows.map((r) => rowMetric(r, metric)))
  }, [rows, metric])
  const total = useMemo(
    () => rows.reduce((acc, r) => acc + rowMetric(r, metric), 0),
    [rows, metric],
  )
  const hasMissingAmountRows = rows.some((row) => row.amountRonSum === null)

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
      <ul className="space-y-2">
        {rows.slice(0, MAX_BARS).map((row, index) => {
          const raw = rowMetric(row, metric)
          const widthPct =
            max > 0 && raw > 0
              ? Math.max(4, Math.round((raw / max) * MAX_BAR_WIDTH_PCT))
              : 0
          const party = rowParty(row, partyKind)
          const partyLabel =
            party?.displayName ?? party?.name ?? party?.cui ?? t`Necunoscut`
          const partyTo =
            partyKind === 'authority' ? '/entities/$cui' : '/companies/$cui'
          const share =
            total > 0 && (metric === 'count' || rowAmount(row) !== null)
              ? Math.round((raw / total) * 100)
              : null
          return (
            <li key={`${party?.cui ?? index}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                {party?.cui ? (
                  <Link
                    to={partyTo}
                    params={{ cui: party.cui }}
                    className="truncate font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    {partyLabel}
                  </Link>
                ) : (
                  <span className="truncate font-medium">{partyLabel}</span>
                )}
                <span className="shrink-0 text-muted-foreground">
                  {metric === 'value' ? (
                    <ValueWithCurrency
                      value={ronAmountSlice(row.amountRonSum)}
                      notation="compact"
                    />
                  ) : (
                    `${formatFlowCount(row.flowCount)} ${t`fluxuri`}`
                  )}
                  {share !== null ? ` · ${share}%` : ''}
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
      {metric === 'value' && hasMissingAmountRows ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans>
            Barele de valoare folosesc doar sumele în RON; rândurile fără sumă
            RON rămân afișate, fără agregare numerică.
          </Trans>
        </p>
      ) : null}

      {/* Tabular fallback (a11y) */}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          <Trans>Versiune tabelară</Trans>
        </summary>
        <PartyRankingTable
          rows={rows.slice(0, MAX_BARS)}
          partyKind={partyKind}
          metric={metric}
          total={total}
        />
      </details>
    </div>
  )
}

function PartyRankingTable({
  rows,
  partyKind,
  metric,
  total,
}: {
  readonly rows: readonly TopPartyRow[]
  readonly partyKind: PartyKind
  readonly metric: 'count' | 'value'
  readonly total: number
}) {
  const to = partyKind === 'authority' ? '/entities/$cui' : '/companies/$cui'
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            {partyKind === 'authority' ? (
              <Trans>Autoritate</Trans>
            ) : (
              <Trans>Furnizor</Trans>
            )}
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
          const party = rowParty(row, partyKind)
          const partyLabel =
            party?.displayName ?? party?.name ?? party?.cui ?? t`Necunoscut`
          const raw = rowMetric(row, metric)
          const share =
            total > 0 && (metric === 'count' || rowAmount(row) !== null)
              ? `${Math.round((raw / total) * 100)}%`
              : t`indisponibil`
          return (
            <TableRow key={`${party?.cui ?? index}-${index}`}>
              <TableCell>
                {party?.cui ? (
                  <Link
                    to={to}
                    params={{ cui: party.cui }}
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
                <ValueWithCurrency
                  value={ronAmountSlice(row.amountRonSum)}
                  notation="compact"
                />
              </TableCell>
              <TableCell>{share}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
