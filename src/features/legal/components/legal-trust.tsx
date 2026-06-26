import { AlertCircle, Bot, Clock, Database, FileWarning } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  CoverageInfo,
  LegalActSummary,
  LegalDataStatus,
  SourceProvenance,
} from '@/schemas/legal'
import { formatLegalDate, formatShortSha } from '../lib/legal-formatting'

type DataStatusBadgeProps = {
  readonly status: LegalDataStatus
  readonly className?: string
}

const DATA_STATUS_CLASS: Readonly<Record<LegalDataStatus, string>> = {
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  mock: 'border-blue-200 bg-blue-50 text-blue-800',
  partial: 'border-amber-200 bg-amber-50 text-amber-900',
  stale: 'border-orange-200 bg-orange-50 text-orange-800',
  blocked: 'border-red-200 bg-red-50 text-red-800',
  unverified: 'border-slate-200 bg-slate-50 text-slate-700',
}

function getLegalDataStatusLabel(status: LegalDataStatus): string {
  switch (status) {
    case 'live':
      return t`Date live`
    case 'mock':
      return t`Date mock`
    case 'partial':
      return t`Parțial`
    case 'stale':
      return t`Posibil învechit`
    case 'blocked':
      return t`Blocat`
    case 'unverified':
      return t`Neverificat`
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

export function DataStatusBadge({ status, className }: DataStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        DATA_STATUS_CLASS[status],
        className,
      )}
    >
      <Database className="h-3.5 w-3.5" aria-hidden="true" />
      {getLegalDataStatusLabel(status)}
    </span>
  )
}

type CoverageRibbonProps = {
  readonly coverage: CoverageInfo
  readonly className?: string
}

export function CoverageRibbon({ coverage, className }: CoverageRibbonProps) {
  return (
    <section
      aria-label={t`Acoperire sursă`}
      className={cn(
        'rounded-md border border-border bg-muted/35 px-4 py-3 text-sm',
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2">
          <FileWarning
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">
              <Trans>Acoperire și limite</Trans>
            </p>
            <p className="mt-1 text-muted-foreground">{coverage.note}</p>
          </div>
        </div>
        <Badge variant={coverage.hasFullText ? 'success' : 'warning'}>
          {coverage.hasFullText ? (
            <Trans>text disponibil</Trans>
          ) : (
            <Trans>coordonate de publicare</Trans>
          )}
        </Badge>
      </div>
      {coverage.freshness ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {coverage.freshness}
        </p>
      ) : null}
    </section>
  )
}

type AIProvenanceNoticeProps = {
  readonly summary: LegalActSummary
  readonly sourceUrl?: string | null
  readonly className?: string
}

export function AIProvenanceNotice({
  summary,
  sourceUrl,
  className,
}: AIProvenanceNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-950',
        className,
      )}
    >
      <div className="flex gap-2">
        <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">
            <Trans>
              Rezumat generat de AI, verificabil la sursă. Nu constituie
              consultanță juridică.
            </Trans>
          </p>
          <p className="mt-1 text-blue-900/80">
            <Trans>Model</Trans>: {summary.model ?? t`necunoscut`} ·{' '}
            <Trans>prompt</Trans>: {summary.promptVersion ?? t`necunoscut`} ·{' '}
            <Trans>încredere</Trans>:{' '}
            {summary.confidence === null
              ? t`necunoscută`
              : `${Math.round(summary.confidence * 100)}%`}
          </p>
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex font-medium underline-offset-4 hover:underline"
            >
              <Trans>Verifică la sursă</Trans>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getSourceLabel(sourceName: SourceProvenance['sourceName']): string {
  switch (sourceName) {
    case 'portal-legislativ':
      return t`Portal Legislativ`
    case 'monitorul-oficial':
      return t`Monitorul Oficial`
    default: {
      const exhaustive: never = sourceName
      return exhaustive
    }
  }
}

type SourceProvenancePanelProps = {
  readonly source: SourceProvenance
  readonly title?: string
  readonly className?: string
}

export function SourceProvenancePanel({
  source,
  title,
  className,
}: SourceProvenancePanelProps) {
  return (
    <section
      aria-label={title ?? t`Proveniență`}
      className={cn(
        'rounded-md border border-border bg-background px-4 py-3 text-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="font-medium">{title ?? <Trans>Proveniență</Trans>}</p>
          <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Sursă</Trans>
              </dt>
              <dd>{getSourceLabel(source.sourceName)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Publicat</Trans>
              </dt>
              <dd>{formatLegalDate(source.publishedAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                <Trans>Preluat</Trans>
              </dt>
              <dd>{formatLegalDate(source.retrievedAt)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">SHA-256</dt>
              <dd>{formatShortSha(source.sha256)}</dd>
            </div>
          </dl>
          {source.parserNotes ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {source.parserNotes}
            </p>
          ) : null}
          {source.sourceUrl ? (
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              <Trans>Deschide sursa</Trans>
            </a>
          ) : null}
        </div>
      </div>
    </section>
  )
}
