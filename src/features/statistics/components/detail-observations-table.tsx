import { Trans } from '@lingui/react/macro'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InsObservation } from '@/schemas/ins'
import type { CsvClassificationColumn } from '../lib/observations-csv'
import { ValueStatusMarker } from './detail-value-status-legend'

type Props = {
  readonly observations: readonly InsObservation[]
  readonly classificationColumns: readonly CsvClassificationColumn[]
}

function classificationCell(
  observation: InsObservation,
  typeCode: string,
): string {
  const match = (observation.classifications ?? []).find(
    (classification) => classification.type_code === typeCode,
  )
  return match?.name_ro ?? match?.code ?? '—'
}

/**
 * The observations table.
 *
 * Values are printed **verbatim** from the wire. They are Decimal strings, and
 * `Number(...)` would round `1234567.890123` before it ever reached the cell.
 * A `null` value is a real absence and prints as an em dash, never as `0`.
 */
export function DetailObservationsTable({
  observations,
  classificationColumns,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Sticky on horizontal overflow: the period anchors every row
                on narrow screens. */}
            <TableHead className="sticky left-0 z-10 bg-card">
              <Trans>Perioadă</Trans>
            </TableHead>
            <TableHead>
              <Trans>Teritoriu</Trans>
            </TableHead>
            <TableHead>
              <Trans>Unitate</Trans>
            </TableHead>
            {classificationColumns.map((column) => (
              <TableHead key={column.typeCode}>{column.label}</TableHead>
            ))}
            <TableHead className="text-right">
              <Trans>Valoare</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {observations.map((observation, index) => (
            <TableRow key={`${observation.time_period.iso_period}-${index}`}>
              <TableCell className="sticky left-0 z-10 bg-card font-medium">
                {observation.time_period.iso_period}
              </TableCell>
              <TableCell>{observation.territory?.name_ro ?? '—'}</TableCell>
              <TableCell>
                {observation.unit?.name_ro ?? observation.unit?.symbol ?? '—'}
              </TableCell>
              {classificationColumns.map((column) => (
                <TableCell key={column.typeCode}>
                  {classificationCell(observation, column.typeCode)}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">
                {observation.value === null ? (
                  <span className="text-muted-foreground" title="—">
                    —
                  </span>
                ) : (
                  <>
                    {observation.value}
                    {observation.value_status ? (
                      <ValueStatusMarker status={observation.value_status} />
                    ) : null}
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
