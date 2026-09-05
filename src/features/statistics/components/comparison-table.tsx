import { Link } from '@tanstack/react-router'
import type { NativeComparisonMatrix } from '../lib/native-comparison'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getComparisonCell,
  type ComparisonMatrix,
} from '../lib/comparison-series'
import { COMPARISON_PALETTE_CLASS } from './comparison-palette'
import {
  comparisonLevelLabel,
  hasMixedComparisonLevels,
  type ComparisonSeriesDescriptor,
} from '../lib/comparison-format'

/** The em-dash cell for "this territory reported nothing for this period". */
const MISSING_MARK = '—'

type Props = {
  readonly matrix: ComparisonMatrix | NativeComparisonMatrix
  readonly series: readonly ComparisonSeriesDescriptor[]
  readonly selectedPeriod: string | null
}

/**
 * One row per selected territory, one column per period.
 *
 * This is the table view the dataviz relief rule requires: every number the
 * charts encode in colour is also readable as text, so identity is never
 * carried by colour alone.
 *
 * Values are printed VERBATIM from the wire — they are Decimal strings, and
 * routing them through `Number()` for display would silently round the long
 * ones. Only the charts parse them.
 *
 * A missing cell renders `—` and its `aria-label` names the period, so a
 * screen-reader user hears "fără date pentru 2024" rather than an unlabelled
 * dash. A value is never borrowed from an adjacent period to fill the hole.
 */
export function ComparisonTable({ matrix, series, selectedPeriod }: Props) {
  const mixedLevels = hasMixedComparisonLevels(series)
  const labelBySiruta = new Map(
    series.map((entry) => [entry.code, entry.label]),
  )
  const colorBySiruta = new Map(
    series.map((entry) => [entry.code, entry.color]),
  )
  const levelByCode = new Map(series.map((entry) => [entry.code, entry.level]))

  return (
    <div className={COMPARISON_PALETTE_CLASS}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <caption className="sr-only">
            {t`Tabel de comparație: valorile indicatorului pentru fiecare teritoriu și perioadă.`}
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="min-w-48">
                <Trans>Teritoriu</Trans>
              </TableHead>
              {matrix.periods.map((period) => (
                <TableHead
                  key={period.isoPeriod}
                  scope="col"
                  className={
                    period.isoPeriod === selectedPeriod
                      ? 'text-right font-semibold text-foreground'
                      : 'text-right'
                  }
                >
                  {period.isoPeriod}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.rows.map((row) => {
              const label = labelBySiruta.get(row.code) ?? row.name ?? row.code
              const level = levelByCode?.get(row.code)
              const native =
                'descriptor' in matrix
                  ? matrix.rows.find((entry) => entry.code === row.code)
                  : null
              const unavailable =
                native &&
                native.availability !== 'SERIES' &&
                native.availability !== 'EMPTY'

              return (
                <TableRow key={row.code}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: colorBySiruta.get(row.code) }}
                      />
                      <span>{label}</span>
                      {mixedLevels && level ? (
                        <span className="rounded-sm border border-border/70 px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {comparisonLevelLabel(level)}
                        </span>
                      ) : null}
                    </span>
                    {native ? (
                      <div className="mt-1 space-y-1 text-xs font-normal text-muted-foreground">
                        {native.availability === 'AMBIGUOUS' ? (
                          <p>
                            <Trans>
                              Mai multe serii sursă. Alege coordonatele înainte
                              de comparație.
                            </Trans>
                          </p>
                        ) : null}
                        {native.availability === 'QUALIFIED' ? (
                          <p>
                            <Trans>
                              Geografie istorică sau calificată. Verifică
                              observațiile sursă.
                            </Trans>
                          </p>
                        ) : null}
                        {native.availability === 'SERIES' &&
                        Object.keys(native.cells).length === 0 ? (
                          <p>
                            <Trans>Fără date pentru frecvența aleasă.</Trans>
                          </p>
                        ) : null}
                        {'descriptor' in matrix ? (
                          <Link
                            to="/statistici/seturi/$cod"
                            params={{ cod: matrix.descriptor.code }}
                            search={{
                              teritoriu:
                                level === 'LAU'
                                  ? `siruta:${row.code}`
                                  : `cod:${row.code}`,
                              ...(native.sourceSelection ??
                                matrix.sharedSelection),
                            }}
                            className="underline"
                          >
                            <Trans>Vezi observațiile sursă</Trans>
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </TableCell>

                  {matrix.periods.map((period) => {
                    const cell = getComparisonCell(row, period.isoPeriod)
                    const hasValue = cell !== null && cell.value !== null

                    return (
                      <TableCell
                        key={period.isoPeriod}
                        className={
                          period.isoPeriod === selectedPeriod
                            ? 'text-right tabular-nums font-medium'
                            : 'text-right tabular-nums'
                        }
                      >
                        {unavailable ? (
                          <span aria-label={t`Serie indisponibilă`}>—</span>
                        ) : hasValue ? (
                          cell.value
                        ) : (
                          <span
                            className="text-muted-foreground"
                            aria-label={t`Fără date pentru ${period.isoPeriod}`}
                          >
                            {MISSING_MARK}
                          </span>
                        )}
                        {cell?.valueStatus ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            [{cell.valueStatus}]
                          </span>
                        ) : null}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {matrix.unitSymbol ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <Trans>Unitate de măsură: {matrix.unitSymbol}</Trans>
        </p>
      ) : null}
    </div>
  )
}
