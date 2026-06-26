import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { ArrowRight, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CaseSearchRow } from '@/schemas/justice'
import {
  formatJusticeDate,
  getJusticeCourtLevelLabel,
  getJusticePartyKindLabel,
} from '../lib/justice-format'

type CaseResultsTableProps = {
  readonly rows: readonly CaseSearchRow[]
  readonly from: string
}

export function CaseResultsTable({ rows, from }: CaseResultsTableProps) {
  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                <Trans>Instanță</Trans>
              </TableHead>
              <TableHead scope="col">
                <Trans>Dosar</Trans>
              </TableHead>
              <TableHead scope="col">
                <Trans>Categorie</Trans>
              </TableHead>
              <TableHead scope="col">
                <Trans>Stadiu</Trans>
              </TableHead>
              <TableHead scope="col">
                <Trans>Părți publicabile</Trans>
              </TableHead>
              <TableHead scope="col" className="text-right">
                <Trans>Detalii</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.caseId}>
                <TableCell className="min-w-[180px]">
                  <div className="font-medium">{row.courtName ?? row.institutionCode}</div>
                  <div className="text-xs text-muted-foreground">
                    {getJusticeCourtLevelLabel(row.courtLevel)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">{row.caseNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    <Trans>Deschis</Trans> {formatJusticeDate(row.sourceOpenedAt)}
                  </div>
                </TableCell>
                <TableCell>{row.categoryName ?? '—'}</TableCell>
                <TableCell>
                  <div>{row.stageName ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    <Trans>Ultima ședință</Trans>{' '}
                    {formatJusticeDate(row.latestHearingAt)}
                  </div>
                  {row.hasAppeal ? (
                    <Badge variant="outline" className="mt-1">
                      <Trans>cu apel</Trans>
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <PublishablePartyPreview row={row} from={from} />
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/justitie/dosare/$caseId"
                      params={{ caseId: row.caseId }}
                      search={{ from }}
                    >
                      <Trans>Deschide</Trans>
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article key={row.caseId} className="border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-mono text-sm font-semibold">{row.caseNumber}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {row.courtName ?? row.institutionCode}
                </p>
              </div>
              {row.hasAppeal ? (
                <Badge variant="outline">
                  <Trans>apel</Trans>
                </Badge>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  <Trans>Categorie</Trans>
                </dt>
                <dd>{row.categoryName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  <Trans>Stadiu</Trans>
                </dt>
                <dd>{row.stageName ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">
                  <Trans>Părți</Trans>
                </dt>
                <dd>
                  <PublishablePartyPreview row={row} from={from} />
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link
                to="/justitie/dosare/$caseId"
                params={{ caseId: row.caseId }}
                search={{ from }}
              >
                <Trans>Deschide dosarul</Trans>
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}

type PublishablePartyPreviewProps = {
  readonly row: CaseSearchRow
  readonly from: string
}

function PublishablePartyPreview({ row, from }: PublishablePartyPreviewProps) {
  return (
    <div className="space-y-1">
      {row.namedPartiesPreview.length > 0 ? (
        row.namedPartiesPreview.map((party) => (
          <div key={`${row.caseId}-${party.nameKey}-${party.role}`} className="text-sm">
            <Link
              to="/justitie/cautare"
              search={{
                partyKey: party.nameKey,
                court: row.institutionCode,
                from,
              }}
              className="font-medium hover:underline"
            >
              {party.displayName}
            </Link>
            <span className="text-muted-foreground">
              {' '}
              · {party.role} · {getJusticePartyKindLabel(party.partyKind)}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          <Trans>Fără părți publicabile în previzualizare</Trans>
        </p>
      )}
      {row.personPartyCount > 0 ? (
        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden />
          <Trans>{row.personPartyCount} persoane fizice agregate</Trans>
        </div>
      ) : null}
    </div>
  )
}
