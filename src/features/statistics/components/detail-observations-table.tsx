import { Button } from '@/components/ui/button'
import { Trans } from '@lingui/react/macro'
import { Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InsObservation, NativeInsObservation } from '@/schemas/ins'
import type { InsSourceDescriptor } from '@/lib/ins/source-contract'
import { validatedSourceRows } from '../lib/source-observations'
import { periodicityLabel } from '../lib/periodicity-labels'
import { ValueStatusMarker } from './detail-value-status-legend'

/** Values, identities and qualifications remain the original source fields. */
export function DetailObservationsTable({
  observations,
  sourceDescriptor,
  onSelectSource,
}: {
  readonly observations: readonly InsObservation[]
  readonly sourceDescriptor?: unknown
  readonly onSelectSource?: (observation: NativeInsObservation) => void
}) {
  let validated: ReturnType<typeof validatedSourceRows>
  try {
    validated = validatedSourceRows(sourceDescriptor, observations)
  } catch {
    return (
      <p role="alert">
        <Trans>
          Nu putem verifica identitatea și proveniența observațiilor.
        </Trans>
      </p>
    )
  }
  const { descriptor, observations: rows } = validated
  const dimensions = descriptor.dimensions
    .filter((d) => d.type === 'CLASSIFICATION' || d.type === 'TERRITORIAL')
    .sort((a, b) => a.index - b.index)
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">
              <Trans>Perioadă</Trans>
            </TableHead>
            <TableHead>
              <Trans>Teritoriu canonic</Trans>
            </TableHead>
            <TableHead>
              <Trans>Unitate</Trans>
            </TableHead>
            {dimensions.map((d) => (
              <TableHead key={d.index}>
                {d.label_ro ?? `D${d.index}`}{' '}
                <span className="block text-xs">D{d.index}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">
              <Trans>Valoare</Trans>
            </TableHead>
            {onSelectSource ? (
              <TableHead>
                <Trans>Selecție</Trans>
              </TableHead>
            ) : null}
            <TableHead>
              <Trans>Sursă și interpretare</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="sticky left-0 z-10 bg-card font-medium">
                {row.time_period.iso_period}
                <span className="block text-xs text-muted-foreground">
                  {periodicityLabel(row.time_period.periodicity)}
                </span>
              </TableCell>
              <TableCell>
                {row.dimensions.geography?.resolvedTerritory ? (
                  <>
                    {row.dimensions.geography.resolvedTerritory.code} (
                    {row.dimensions.geography.resolvedTerritory.level})
                  </>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                {row.unit.name_ro ?? row.unit.symbol ?? '—'}
                <code className="block text-xs text-muted-foreground">
                  {row.unit.code}
                </code>
              </TableCell>
              {dimensions.map((d) => {
                const member = row.classifications.find(
                  (c) => c.type_code === `D${d.index}`,
                )!
                return (
                  <TableCell key={d.index}>
                    {member.name_ro ?? '—'}
                    <code className="block text-xs text-muted-foreground">
                      {member.code}
                    </code>
                  </TableCell>
                )
              })}
              <TableCell className="text-right tabular-nums">
                {row.value === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  row.value
                )}
                {row.value_status != null ? (
                  <ValueStatusMarker status={row.value_status} />
                ) : null}
              </TableCell>
              {onSelectSource ? (
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectSource(row)}
                  >
                    <Trans>Alege această serie</Trans>
                  </Button>
                </TableCell>
              ) : null}
              <TableCell>
                <SourceProvenance row={row} descriptor={descriptor} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SourceProvenance({
  row,
  descriptor,
}: {
  readonly row: NativeInsObservation
  readonly descriptor: InsSourceDescriptor
}) {
  const geography = row.dimensions.geography
  const source = descriptor.metadata.source_url
  let sourceUrl: string | null = null
  if (typeof source === 'string') {
    try {
      const url = new URL(source)
      if (url.protocol === 'https:' || url.protocol === 'http:')
        sourceUrl = source
    } catch {
      /* Keep invalid source URLs as source text, never executable links. */
    }
  }
  return (
    <details className="min-w-52 max-w-lg">
      <summary className="cursor-pointer text-sm font-medium">
        {geography?.qualified ? (
          <Trans>Interpretare calificată</Trans>
        ) : (
          <Trans>Detalii din sursă</Trans>
        )}
      </summary>
      <div className="mt-2 space-y-2 whitespace-normal break-words text-xs">
        <p>
          <Trans>Identificator observație</Trans>:{' '}
          <code className="break-all">{row.id}</code>
        </p>
        <p>
          <Trans>Publicare</Trans>:{' '}
          <code>{descriptor.metadata.revision_id}</code>
        </p>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            <Trans>Deschide sursa INS</Trans>
          </a>
        ) : typeof source === 'string' ? (
          <p>{source}</p>
        ) : null}
        {geography ? (
          <>
            <p>
              <Trans>Rezoluție geografică</Trans>: {geography.resolution}
            </p>
            <p>
              <Trans>Coordonate geografice INS</Trans>:{' '}
              <code>{JSON.stringify(geography.pairs)}</code>
            </p>
            {geography.resolvedTerritory ? (
              <p>
                <Trans>Teritoriu rezolvat exact</Trans>:{' '}
                {geography.resolvedTerritory.code} (
                {geography.resolvedTerritory.level})
              </p>
            ) : null}
            {geography.contextTerritory ? (
              <p>
                <Trans>Context teritorial</Trans>:{' '}
                {geography.contextTerritory.code} (
                {geography.contextTerritory.level})
              </p>
            ) : null}
            {geography.flags.length ? (
              <p>
                <Trans>Marcaje din sursă</Trans>: {geography.flags.join(', ')}
              </p>
            ) : null}
            {geography.applicableRules.map((rule) => (
              <Fragment key={rule.ruleId}>
                <p>
                  <strong>{rule.ruleId}</strong>: {rule.appliesFrom} –{' '}
                  {rule.appliesTo}; {rule.flag} ({rule.kind})
                </p>
                <p>{rule.rationale}</p>
                <p className="break-all">{rule.evidenceUrl}</p>
              </Fragment>
            ))}
          </>
        ) : (
          <p>
            <Trans>Set fără dimensiune geografică.</Trans>
          </p>
        )}
        <details>
          <summary className="cursor-pointer">
            <Trans>Înregistrare și publicare originale (JSON)</Trans>
          </summary>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">
            {JSON.stringify(
              {
                observation: row,
                publication: descriptor.metadata,
                dimensions: descriptor.dimensions,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </details>
  )
}
