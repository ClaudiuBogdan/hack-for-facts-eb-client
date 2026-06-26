import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type {
  EvidenceRecord,
  NgoIdentityBasis,
  NgoReviewStatus,
  SourceSnapshot,
  ValidationIssue,
} from '@/schemas/ngos'
import { IdentityConfidenceBadge } from '@/components/identity'

// ---------------------------------------------------------------------------
// DataStatusBadge — live | mock | partial | stale | blocked | unverified
// ---------------------------------------------------------------------------

export type DataStatusVariant =
  | 'live'
  | 'mock'
  | 'partial'
  | 'stale'
  | 'blocked'
  | 'unverified'
  | 'name_only'

type DataStatusBadgeProps = {
  readonly variant: DataStatusVariant
  readonly label?: ReactNode
  readonly className?: string
}

const dataStatusCopy: Readonly<Record<DataStatusVariant, ReactNode>> = {
  live: <Trans>În direct</Trans>,
  mock: <Trans>Date demonstrative</Trans>,
  partial: <Trans>Parțial</Trans>,
  stale: <Trans>Posibil depășit</Trans>,
  blocked: <Trans>Blocat</Trans>,
  unverified: <Trans>Neverificat</Trans>,
  name_only: <Trans>Doar referință</Trans>,
}

export function DataStatusBadge({ variant, label, className }: DataStatusBadgeProps) {
  const badgeVariant =
    variant === 'stale' || variant === 'partial' || variant === 'name_only'
      ? 'warning'
      : variant === 'blocked'
        ? 'destructive'
        : 'secondary'
  return (
    <Badge variant={badgeVariant} className={cn('gap-1', className)} role="status">
      {label ?? dataStatusCopy[variant]}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// FreshnessBadge — human-readable snapshot date + stale styling
// ---------------------------------------------------------------------------

type FreshnessBadgeProps = {
  readonly date: string | null
  readonly stale?: boolean
  readonly label?: ReactNode
  readonly className?: string
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export function FreshnessBadge({ date, stale, label, className }: FreshnessBadgeProps) {
  const formatted = formatDate(date)
  if (!formatted) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)} role="status">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
        <Trans>Data instantaneu: necunoscută</Trans>
      </Badge>
    )
  }
  return (
    <Badge
      variant={stale ? 'warning' : 'secondary'}
      className={cn('gap-1', className)}
      role="status"
      aria-label={
        stale
          ? String(t`Date posibil depășite: ${formatted}`)
          : String(t`Actualizat: ${formatted}`)
      }
    >
      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
      <span>{label ?? <Trans>Data instantaneu</Trans>}: {formatted}</span>
      {stale ? (
        <span aria-hidden>
          · <Trans>posibil depășit</Trans>
        </span>
      ) : null}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// PrivacyBoundaryNotice — explains aggregation/redaction/non-display
// ---------------------------------------------------------------------------

type PrivacyBoundaryNoticeProps = {
  readonly children?: ReactNode
  readonly className?: string
}

export function PrivacyBoundaryNotice({
  children,
  className,
}: PrivacyBoundaryNoticeProps) {
  return (
    <Alert className={cn('border-amber-200 bg-amber-50/50', className)}>
      <ShieldAlert className="h-4 w-4 text-amber-700" aria-hidden />
      <AlertTitle className="text-amber-900">
        <Trans>Notă de confidențialitate</Trans>
      </AlertTitle>
      <AlertDescription className="text-amber-900/80">
        {children ?? (
          <Trans>
            Înregistrările sunt agregate sau redactate pentru a proteja
            persoanele fizice; detaliile individuale sunt afișate doar când sunt
            esențiale și de interes public.
          </Trans>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ---------------------------------------------------------------------------
// SourceCitationChip — inline "Sursă: <authority> · <date>" chip → drawer
// ---------------------------------------------------------------------------

export type CitationRef = {
  readonly sourceSnapshotId: string
  readonly authorityLabel: string
  readonly snapshotDate: string | null
  readonly reviewStatus?: NgoReviewStatus
  readonly confidence?: number | null
  readonly identityBasis?: NgoIdentityBasis
}

type SourceCitationChipProps = {
  readonly citation: CitationRef
  readonly onOpen?: (snapshotId: string) => void
  readonly className?: string
}

export function SourceCitationChip({
  citation,
  onOpen,
  className,
}: SourceCitationChipProps) {
  const dateText = formatDate(citation.snapshotDate) ?? t`fără dată`
  const ariaLabel = t`Vezi sursa: ${citation.authorityLabel}, ${dateText}`
  return (
    <button
      type="button"
      onClick={() => onOpen?.(citation.sourceSnapshotId)}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={ariaLabel}
    >
      <span className="font-medium text-foreground">
        <Trans>Sursă</Trans>:
      </span>
      <span>{citation.authorityLabel}</span>
      <span aria-hidden>·</span>
      <span>{dateText}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// SourceProvenanceDrawer — Sheet showing full snapshot provenance
// ---------------------------------------------------------------------------

type SourceProvenanceDrawerProps = {
  readonly snapshot: SourceSnapshot | null
  readonly authorityLabel: string
  readonly validationIssues?: readonly ValidationIssue[]
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly fromLabel?: string
}

function truncate(value: string | null, length = 16): string | null {
  if (!value) return null
  return value.length > length ? `${value.slice(0, length)}…` : value
}

function ProvenanceRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <dt className="col-span-1 text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-all font-mono text-xs">{value}</dd>
    </div>
  )
}

export function SourceProvenanceDrawer({
  snapshot,
  authorityLabel,
  validationIssues = [],
  open,
  onOpenChange,
  fromLabel,
}: SourceProvenanceDrawerProps) {
  const shaTruncated = truncate(snapshot?.contentSha256 ?? null, 16)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>
            <Trans>Sursa datelor</Trans>
          </SheetTitle>
          <SheetDescription>
            {authorityLabel}
            {snapshot ? ` · ${snapshot.sourceId}` : ''}
          </SheetDescription>
        </SheetHeader>

        {!snapshot ? (
          <p className="px-1 text-sm text-muted-foreground">
            <Trans>Nu am putut încărca detaliile sursei.</Trans>
          </p>
        ) : (
          <div className="space-y-4 px-1">
            <dl className="divide-y">
              <ProvenanceRow
                label={<Trans>Autoritate</Trans>}
                value={`${authorityLabel} (${snapshot.sourceId})`}
              />
              <ProvenanceRow
                label={<Trans>URL sursă</Trans>}
                value={
                  snapshot.sourceUrl ? (
                    <a
                      href={snapshot.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                    >
                      {snapshot.sourceUrl}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <ProvenanceRow
                label={<Trans>Data instantaneu</Trans>}
                value={formatDate(snapshot.sourceDeclaredSnapshotDate) ?? '—'}
              />
              <ProvenanceRow
                label={<Trans>Acceptat la</Trans>}
                value={formatDate(snapshot.acceptedAt) ?? '—'}
              />
              <ProvenanceRow
                label={<Trans>Stare</Trans>}
                value={
                  <span>
                    {snapshot.status}
                    {snapshot.isCurrent ? ` · ${t`curent`}` : ''}
                  </span>
                }
              />
              <ProvenanceRow
                label={<Trans>Rânduri</Trans>}
                value={
                  snapshot.rowCount != null
                    ? new Intl.NumberFormat('ro-RO').format(snapshot.rowCount)
                    : '—'
                }
              />
              <ProvenanceRow
                label={<Trans>Dimensiune (bytes)</Trans>}
                value={
                  snapshot.contentLengthBytes != null
                    ? new Intl.NumberFormat('ro-RO').format(
                        snapshot.contentLengthBytes,
                      )
                    : '—'
                }
              />
              <ProvenanceRow
                label={<Trans>Versiune parser</Trans>}
                value={snapshot.parserVersion ?? '—'}
              />
              <ProvenanceRow
                label={<Trans>Amprentă schemă</Trans>}
                value={truncate(snapshot.schemaFingerprint, 20) ?? '—'}
              />
              <ProvenanceRow
                label={<Trans>Amprentă antet</Trans>}
                value={truncate(snapshot.headerFingerprint, 20) ?? '—'}
              />
              <ProvenanceRow
                label={<Trans>SHA-256 conținut</Trans>}
                value={
                  <span className="inline-flex items-center gap-1">
                    {shaTruncated ?? '—'}
                    {snapshot.contentSha256 ? (
                      <CopyButton
                        onCopy={() =>
                          navigator.clipboard.writeText(snapshot.contentSha256 ?? '')
                        }
                        ariaLabel={t`Copiază SHA-256 conținut`}
                        copiedLabel={t`SHA-256 copiat`}
                      />
                    ) : null}
                  </span>
                }
              />
            </dl>

            {validationIssues.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  <Trans>Probleme de validare</Trans>
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {validationIssues.map((issue) => (
                    <li
                      key={`${issue.code}-${issue.severity}`}
                      className="flex gap-2"
                    >
                      <Badge
                        variant={
                          issue.severity === 'blocker'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="shrink-0"
                      >
                        {issue.severity}
                      </Badge>
                      <span>
                        {issue.message}
                        {issue.count != null
                          ? ` (${new Intl.NumberFormat('ro-RO').format(issue.count)})`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                <Trans>Fără probleme de validare pentru acest instantaneu.</Trans>
              </p>
            )}

            <Button asChild variant="outline" size="sm">
              <Link
                to="/ong-uri/sursa/$snapshotId"
                params={{ snapshotId: snapshot.sourceSnapshotId }}
                search={fromLabel ? { from: fromLabel } : {}}
              >
                <Trans>Vezi sursa completă</Trans>
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// EvidenceTrail — collapsible grouped table of all evidence rows
// ---------------------------------------------------------------------------

type EvidenceTrailProps = {
  readonly evidence: readonly EvidenceRecord[]
  readonly snapshotsById?: Readonly<Record<string, SourceSnapshot>>
  readonly authorityLabels?: Readonly<Record<string, string>>
  readonly defaultOpen?: boolean
  readonly onCitationOpen?: (snapshotId: string) => void
  readonly className?: string
}

const evidenceKindLabels: Readonly<Record<string, ReactNode>> = {
  legal_registry: <Trans>Registru legal (MJ)</Trans>,
  sector_membership: <Trans>Apartenență sectorială (RUEIS)</Trans>,
  accreditation: <Trans>Acreditare (ANOFM)</Trans>,
  social_service_provider: <Trans>Furnizor servicii sociale</Trans>,
  social_service: <Trans>Serviciu social licențiat</Trans>,
  public_utility: <Trans>Utilitate publică (SGG)</Trans>,
  fiscal_status: <Trans>Stare fiscală</Trans>,
  financial_indicator: <Trans>Indicator financiar</Trans>,
  funding_projection: <Trans>Proiecție fonduri</Trans>,
  name_only_reference: <Trans>Referință din registru</Trans>,
}

const reviewStatusLabels: Readonly<Record<NgoReviewStatus, ReactNode>> = {
  accepted: <Trans>acceptat</Trans>,
  review_pending: <Trans>în revizuire</Trans>,
  rejected: <Trans>respins</Trans>,
  unmatched: <Trans>fără potrivire</Trans>,
}

function groupEvidence(evidence: readonly EvidenceRecord[]) {
  const groups = new Map<string, EvidenceRecord[]>()
  for (const row of evidence) {
    const list = groups.get(row.evidenceKind) ?? []
    list.push(row)
    groups.set(row.evidenceKind, list)
  }
  return Array.from(groups.entries())
}

export function EvidenceTrail({
  evidence,
  snapshotsById = {},
  authorityLabels = {},
  defaultOpen = false,
  onCitationOpen,
  className,
}: EvidenceTrailProps) {
  const [open, setOpen] = useState(defaultOpen)
  const groups = groupEvidence(evidence)

  if (evidence.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>Nicio dovadă înregistrată pentru această organizație.</Trans>
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? <Trans>Ascunde dovada</Trans> : <Trans>Arată dovada</Trans>}
          <span className="text-muted-foreground">({evidence.length})</span>
        </Button>
      </div>
      {open ? (
        <div className="space-y-4">
          {groups.map(([kind, rows]) => (
            <div key={kind} className="space-y-1">
              <h4 className="text-sm font-semibold">
                {evidenceKindLabels[kind] ?? kind}
              </h4>
              <Table containerClassName="rounded-md border">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">
                      <Trans>Bază identitate</Trans>
                    </TableHead>
                    <TableHead scope="col">
                      <Trans>Stare</Trans>
                    </TableHead>
                    <TableHead scope="col">
                      <Trans>Încredere</Trans>
                    </TableHead>
                    <TableHead scope="col">
                      <Trans>Data instantaneu</Trans>
                    </TableHead>
                    <TableHead scope="col">
                      <Trans>Sursă</Trans>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const snapshot = snapshotsById[row.sourceSnapshotId]
                    const isNameOnly =
                      row.identityBasis === 'name_review' ||
                      row.identityBasis === 'none'
                    return (
                      <TableRow
                        key={`${row.sourceSnapshotId}-${row.sourceRecordKey}`}
                        className={isNameOnly ? 'bg-amber-50/40' : undefined}
                      >
                        <TableCell>
                          <IdentityConfidenceBadge
                            input={{
                              basis: row.identityBasis,
                              reviewStatus: row.reviewStatus,
                              confidence: row.confidence,
                            }}
                            size="sm"
                            showConfidence
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {reviewStatusLabels[row.reviewStatus] ?? row.reviewStatus}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.confidence != null
                            ? new Intl.NumberFormat('ro-RO', {
                                style: 'percent',
                                maximumFractionDigits: 0,
                              }).format(row.confidence)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(
                            snapshot?.sourceDeclaredSnapshotDate ?? null,
                          ) ?? '—'}
                        </TableCell>
                        <TableCell>
                          <SourceCitationChip
                            citation={{
                              sourceSnapshotId: row.sourceSnapshotId,
                              authorityLabel:
                                authorityLabels[row.sourceId] ?? row.sourceId,
                              snapshotDate:
                                snapshot?.sourceDeclaredSnapshotDate ?? null,
                              reviewStatus: row.reviewStatus,
                              confidence: row.confidence,
                              identityBasis: row.identityBasis,
                            }}
                            onOpen={onCitationOpen}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// StaleSnapshotNotice — domain Alert wrapper
// ---------------------------------------------------------------------------

type StaleSnapshotNoticeProps = {
  readonly snapshotDate?: string | null
  readonly className?: string
}

export function StaleSnapshotNotice({
  snapshotDate,
  className,
}: StaleSnapshotNoticeProps) {
  const dateText = formatDate(snapshotDate ?? null)
  return (
    <Alert className={cn('border-amber-200 bg-amber-50/50', className)}>
      <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden />
      <AlertTitle className="text-amber-900">
        <Trans>Datele pot fi depășite</Trans>
      </AlertTitle>
      <AlertDescription className="text-amber-900/80">
        <Trans>
          Datele provin dintr-un instantaneu oficial
          {dateText ? ` (${dateText})` : ''} și pot fi depășite; așteptăm o
          sursă oficială mai nouă.
        </Trans>
      </AlertDescription>
    </Alert>
  )
}

// Re-exported for convenience under provenance namespace.
export { CheckCircle2, CircleDashed } from 'lucide-react'
