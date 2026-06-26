import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  ExternalLink,
  FileCheck2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataStatusBadge,
  EvidenceTrail,
  FreshnessBadge,
} from '@/components/provenance/source-provenance'
import type { SnapshotProvenance } from '@/schemas/ngos'
import {
  formatRoDate,
  formatRoNumber,
  snapshotAuthorityLabel,
} from './ngo-formatting'

type NgoSnapshotPageProps = {
  readonly provenance: SnapshotProvenance
  readonly fromLabel?: string
}

function SnapshotStatusBadge({ status }: { readonly status: string }) {
  if (status.includes('name_only')) {
    return <DataStatusBadge variant="name_only" />
  }
  if (status === 'pending') {
    return <DataStatusBadge variant="partial" />
  }
  if (status === 'accepted') {
    return <DataStatusBadge variant="live" />
  }
  return <DataStatusBadge variant="unverified" label={status} />
}

export function NgoSnapshotPage({
  provenance,
  fromLabel,
}: NgoSnapshotPageProps) {
  const { snapshot } = provenance
  const authorityLabel =
    provenance.authorityLabel || snapshotAuthorityLabel(snapshot)

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="outline" className="w-fit">
          <Link to="/ong-uri" search={{}}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            <Trans>Inapoi la ONG-uri</Trans>
          </Link>
        </Button>
        {fromLabel ? (
          <Badge variant="secondary">
            <Trans>Deschis din</Trans>: {fromLabel}
          </Badge>
        ) : null}
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <SnapshotStatusBadge status={snapshot.status} />
              <FreshnessBadge
                date={snapshot.sourceDeclaredSnapshotDate}
                stale={
                  snapshot.sourceDeclaredSnapshotDate === '2023-12-11' ||
                  snapshot.sourceDeclaredSnapshotDate === '2024-04-10'
                }
              />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
                {authorityLabel}
              </h1>
              <p className="text-muted-foreground">{snapshot.sourceId}</p>
            </div>
          </div>
          {snapshot.sourceUrl ? (
            <Button asChild variant="outline">
              <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                <Trans>Sursa oficiala</Trans>
              </a>
            </Button>
          ) : null}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardDescription>
              <Trans>Randuri sursa</Trans>
            </CardDescription>
            <CardTitle className="font-mono text-2xl">
              {formatRoNumber(snapshot.rowCount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardDescription>
              <Trans>Randuri evidence</Trans>
            </CardDescription>
            <CardTitle className="font-mono text-2xl">
              {formatRoNumber(provenance.evidenceRows.length)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardDescription>
              <Trans>Acceptat la</Trans>
            </CardDescription>
            <CardTitle className="text-base">
              {formatRoDate(snapshot.acceptedAt)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="rounded-lg shadow-none">
          <CardHeader className="p-4">
            <CardDescription>
              <Trans>Parser</Trans>
            </CardDescription>
            <CardTitle className="text-base">
              {snapshot.parserVersion ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" aria-hidden />
              <Trans>Metadate instantaneu</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>Informatii pastrate pentru custodie si reproducere.</Trans>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table containerClassName="rounded-lg border">
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Trans>Camp</Trans>
                  </TableHead>
                  <TableHead>
                    <Trans>Valoare</Trans>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>source_snapshot_id</TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {snapshot.sourceSnapshotId}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>content_sha256</TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {snapshot.contentSha256 ?? '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>schema_fingerprint</TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {snapshot.schemaFingerprint ?? '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>header_fingerprint</TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {snapshot.headerFingerprint ?? '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>content_length_bytes</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatRoNumber(snapshot.contentLengthBytes)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5" aria-hidden />
              <Trans>Validare</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {provenance.validationIssues.length > 0 ? (
              provenance.validationIssues.map((issue) => (
                <Alert key={`${issue.code}-${issue.severity}`} className="border-amber-200 bg-amber-50/50">
                  <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />
                  <AlertTitle className="text-amber-900">
                    {issue.code}
                  </AlertTitle>
                  <AlertDescription className="text-amber-900/80">
                    {issue.message}
                    {issue.count != null ? ` (${formatRoNumber(issue.count)})` : ''}
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans>Fara probleme de validare pentru acest instantaneu.</Trans>
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>
            <Trans>Randuri de evidence</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Randurile care leaga acest instantaneu de profiluri sau referinte.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvidenceTrail
            evidence={provenance.evidenceRows}
            snapshotsById={{ [snapshot.sourceSnapshotId]: snapshot }}
            defaultOpen
          />
        </CardContent>
      </Card>
    </main>
  )
}
