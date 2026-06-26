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
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { MonthlyPoint } from '@/schemas/procurement'

type Props = {
  readonly points: readonly MonthlyPoint[]
  readonly className?: string
  readonly metric?: 'amount' | 'count'
  readonly emptyLabel?: string
}

/**
 * Monthly bar chart with amount-present vs amount-missing split, always
 * paired with a semantic `<table>` fallback (a11y). Stale/suspended sync is
 * surfaced by the surrounding `CoverageRibbon`, not here.
 */
export function SpendOverTime({
  points,
  className,
  metric = 'amount',
  emptyLabel,
}: Props) {
  const max = useMemo(() => {
    if (points.length === 0) return 0
    if (metric === 'amount') {
      return Math.max(...points.map((p) => p.amountPresent))
    }
    return Math.max(...points.map((p) => p.flowCount))
  }, [points, metric])

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyLabel ?? t`Nicio dată lunară.`}
      </p>
    )
  }

  return (
    <div className={className}>
      <ul className="flex items-end gap-1.5" aria-hidden style={{ height: 160 }}>
        {points.map((p) => {
          const value = metric === 'amount' ? p.amountPresent : p.flowCount
          const heightPct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
          return (
            <li
              key={p.month}
              className="flex h-full flex-1 flex-col items-center gap-1"
              title={
                metric === 'amount'
                  ? `${p.month}: ${formatCurrency(value, 'standard', 'RON')}`
                  : `${p.month}: ${formatNumber(value)} ${t`fluxuri`}`
              }
            >
              <div
                className="flex w-full flex-col justify-end"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {p.month.slice(5)}
              </span>
            </li>
          )
        })}
      </ul>
      {points.some((p) => p.amountMissingCount > 0) ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans>
            Unele luni conțin înregistrări cu valoare lipsă (afișate separat,
            neînsumate).
          </Trans>
        </p>
      ) : null}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">
          <Trans>Versiune tabelară</Trans>
        </summary>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Trans>Lună</Trans>
              </TableHead>
              <TableHead>
                <Trans>Fluxuri</Trans>
              </TableHead>
              <TableHead>
                <Trans>Valoare prezentă</Trans>
              </TableHead>
              <TableHead>
                <Trans>Valori lipsă</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((p) => (
              <TableRow key={p.month}>
                <TableCell>{p.month}</TableCell>
                <TableCell>{formatNumber(p.flowCount)}</TableCell>
                <TableCell>{formatCurrency(p.amountPresent, 'standard', 'RON')}</TableCell>
                <TableCell>{formatNumber(p.amountMissingCount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  )
}
