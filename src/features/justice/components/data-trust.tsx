import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, Database, Info, Scale, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type {
  JusticeConfidence,
  JusticeDataStatus,
  JusticeProvenance,
} from '@/schemas/justice'
import {
  buildJusticeCoverageChips,
  formatJusticeDate,
  getJusticeConfidenceStatusLabel,
  getJusticeConfidenceTierLabel,
  getJusticeDataStatusLabel,
  getJusticeSourceLabel,
} from '../lib/justice-format'

type DataStatusBadgeProps = {
  readonly status: JusticeDataStatus | 'unavailable'
  readonly className?: string
}

export function DataStatusBadge({ status, className }: DataStatusBadgeProps) {
  const label =
    status === 'unavailable' ? (
      <Trans>Indisponibil</Trans>
    ) : (
      getJusticeDataStatusLabel(status)
    )
  const variant =
    status === 'live'
      ? 'success'
      : status === 'partial' || status === 'stale' || status === 'unverified'
        ? 'warning'
        : status === 'unavailable'
          ? 'destructive'
          : 'secondary'

  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      <Database className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Badge>
  )
}

type FreshnessBadgeProps = {
  readonly provenance: JusticeProvenance
  readonly className?: string
}

export function FreshnessBadge({ provenance, className }: FreshnessBadgeProps) {
  const date = provenance.lastModifiedAt ?? provenance.retrievedAt
  return (
    <Badge variant="outline" className={cn('gap-1 font-normal', className)}>
      <Info className="h-3.5 w-3.5" aria-hidden />
      <Trans>Actualizat</Trans> {formatJusticeDate(date)}
    </Badge>
  )
}

type CoverageRibbonProps = {
  readonly provenance: JusticeProvenance
  readonly className?: string
  readonly children?: ReactNode
}

export function CoverageRibbon({
  provenance,
  className,
  children,
}: CoverageRibbonProps) {
  return (
    <section
      className={cn(
        'border border-border bg-muted/35 px-4 py-3 sm:px-5',
        className,
      )}
      aria-label={t`Acoperire date justiție`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <DataStatusBadge status={provenance.status} />
            <FreshnessBadge provenance={provenance} />
            <Badge variant="outline" className="font-normal">
              {getJusticeSourceLabel(provenance.source)}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {provenance.coverageNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {buildJusticeCoverageChips(provenance).map((chip) => (
            <Badge key={chip.key} variant="secondary" className="font-normal">
              {chip.label}
            </Badge>
          ))}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  )
}

type PrivacyBoundaryNoticeProps = {
  readonly variant?:
    | 'persons-suppressed'
    | 'candidate-link'
    | 'metadata-only'
    | 'incidental-text'
  readonly className?: string
}

export function PrivacyBoundaryNotice({
  variant = 'persons-suppressed',
  className,
}: PrivacyBoundaryNoticeProps) {
  const body =
    variant === 'candidate-link' ? (
      <Trans>
        Legăturile companie-dosar sunt candidați pe bază de nume publicabil.
        Persoanele fizice nu sunt afișate nominal.
      </Trans>
    ) : variant === 'incidental-text' ? (
      <Trans>
        Rezumatele procedurale pot conține text incident din portal. Nu oferim
        căutare full-text și nu extindem identități din acest text.
      </Trans>
    ) : variant === 'metadata-only' ? (
      <Trans>
        Afișăm metadata publică despre dosare, nu documente sau căutare în textul
        soluțiilor.
      </Trans>
    ) : (
      <Trans>
        Persoanele fizice apar doar ca număr agregat pe rol. Nu există câmp de
        căutare după persoane.
      </Trans>
    )

  return (
    <div
      className={cn(
        'flex gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="leading-relaxed">{body}</p>
    </div>
  )
}

type IdentityConfidenceBadgeProps = {
  readonly confidence: JusticeConfidence
  readonly className?: string
}

export function IdentityConfidenceBadge({
  confidence,
  className,
}: IdentityConfidenceBadgeProps) {
  return (
    <Badge variant="outline" className={cn('gap-1 font-normal', className)}>
      <Scale className="h-3.5 w-3.5" aria-hidden />
      {confidence.tier} · {getJusticeConfidenceTierLabel(confidence.tier)} ·{' '}
      {getJusticeConfidenceStatusLabel(confidence.validationStatus)}
    </Badge>
  )
}

type SourceProvenanceDisclosureProps = {
  readonly provenance: JusticeProvenance
  readonly className?: string
}

export function SourceProvenanceDisclosure({
  provenance,
  className,
}: SourceProvenanceDisclosureProps) {
  return (
    <details
      className={cn(
        'border border-border bg-background px-4 py-3 text-sm',
        className,
      )}
    >
      <summary className="cursor-pointer font-medium text-foreground">
        <Trans>Detalii sursă și acoperire</Trans>
      </summary>
      <dl className="mt-3 grid gap-3 text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="font-medium text-foreground">
            <Trans>Sursă</Trans>
          </dt>
          <dd>{getJusticeSourceLabel(provenance.source)}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">
            <Trans>Actualizare</Trans>
          </dt>
          <dd>{formatJusticeDate(provenance.lastModifiedAt)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-foreground">
            <Trans>Notă acoperire</Trans>
          </dt>
          <dd>{provenance.coverageNote}</dd>
        </div>
      </dl>
    </details>
  )
}

type JusticeUnavailablePanelProps = {
  readonly message: string
  readonly className?: string
}

export function JusticeUnavailablePanel({
  message,
  className,
}: JusticeUnavailablePanelProps) {
  return (
    <div
      className={cn(
        'border border-dashed border-border bg-muted/20 px-4 py-6 text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-foreground">
            <Trans>Datele live nu sunt conectate încă</Trans>
          </h2>
          <p className="text-muted-foreground">{message}</p>
          <Button variant="outline" size="sm" type="button" disabled>
            <Trans>Conexiune API în pregătire</Trans>
          </Button>
        </div>
      </div>
    </div>
  )
}
