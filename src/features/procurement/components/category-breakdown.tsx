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
import { categoryRowLabel } from '../lib/cpv-labels'
import { formatFlowCount } from '../lib/formatting'
import type { CategoryRow } from '@/schemas/procurement'

type Props = {
  readonly rows: readonly CategoryRow[]
  readonly className?: string
  readonly emptyLabel?: string
}

const PALETTE = [
  '#1f4e79',
  '#2d6a9f',
  '#3d8bbd',
  '#5ba6c8',
  '#7fbfd6',
  '#a8d3df',
  '#cfe1e8',
  '#e3eef3',
]

/**
 * CPV division breakdown. Visual donut (pure CSS conic-gradient) + semantic
 * table fallback (a11y). Slice labels link to `/achizitii/cpv/$code`.
 */
export function CategoryBreakdown({ rows, className, emptyLabel }: Props) {
  const totalRon = useMemo(() => {
    return rows.reduce((acc, row) => acc + (row.amount.ron ?? 0), 0)
  }, [rows])
  const hasNativeOnlyRows = rows.some(
    (row) => row.amount.ron === null && row.amount.nativeValue !== null,
  )

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {emptyLabel ?? t`Nicio categorie.`}
      </p>
    )
  }

  const segments = rows.map((row, index) => {
    const pct =
      row.amount.ron !== null && totalRon > 0
        ? (row.amount.ron / totalRon) * 100
        : null
    return {
      row,
      color: PALETTE[index % PALETTE.length],
      pct,
    }
  })

  const conicGradient = segments
    .map((seg, index) => {
      const start = segments
        .slice(0, index)
        .reduce((a, s) => a + (s.pct ?? 0), 0)
      const end = start + (seg.pct ?? 0)
      return `${seg.color} ${start}% ${end}%`
    })
    .join(', ') || '#e5e7eb 0% 100%'

  return (
    <div className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full"
          role="img"
          aria-label={t`Repartizarea pe categorii CPV`}
          style={{ background: `conic-gradient(${conicGradient})` }}
        />
        <ul className="flex-1 space-y-1.5 text-sm" aria-hidden>
          {segments.map((seg, index) => (
            <li key={`${seg.row.divisionCode}-${index}`} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: seg.color }}
                />
                <Link
                  to="/achizitii/cpv/$code"
                  params={{ code: seg.row.divisionCode }}
                  className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                >
                  {categoryRowLabel(seg.row)}
                </Link>
              </span>
              <span className="text-muted-foreground">
                {seg.pct === null ? t`neînsumat` : `${Math.round(seg.pct)}%`} ·{' '}
                <ValueWithCurrency value={seg.row.amount} notation="compact" />
              </span>
            </li>
          ))}
        </ul>
      </div>
      {hasNativeOnlyRows ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans>
            Valorile non-RON sunt afișate în moneda nativă și nu intră în
            procentele agregate.
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
                <Trans>Diviziune CPV</Trans>
              </TableHead>
              <TableHead>
                <Trans>Categorie</Trans>
              </TableHead>
              <TableHead>
                <Trans>Fluxuri</Trans>
              </TableHead>
              <TableHead>
                <Trans>Valoare</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.divisionCode}>
                <TableCell>
                  <Link
                    to="/achizitii/cpv/$code"
                    params={{ code: row.divisionCode }}
                    className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    {row.divisionCode}
                  </Link>
                </TableCell>
                <TableCell>{categoryRowLabel(row)}</TableCell>
                <TableCell>{formatFlowCount(row.flowCount)}</TableCell>
                <TableCell>
                  <ValueWithCurrency value={row.amount} notation="compact" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  )
}
