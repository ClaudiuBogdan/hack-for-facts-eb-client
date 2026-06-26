import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { BadgeCheck, CircleHelp, TriangleAlert, CircleSlash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { EvidenceRecord, NgoIdentityBasis } from '@/schemas/ngos'
import {
  resolveConfidenceTier,
  type ConfidenceTier,
  type IdentityConfidenceInput,
} from './resolve-confidence-tier'

type BadgeSize = 'sm' | 'md'

type IdentityConfidenceBadgeProps = {
  readonly input: IdentityConfidenceInput
  readonly size?: BadgeSize
  readonly showConfidence?: boolean
  readonly className?: string
}

function formatConfidence(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value)
}

function tierCopy(
  tier: ConfidenceTier,
  input: IdentityConfidenceInput,
): { label: string; tooltip: string; variant: 'success' | 'warning' | 'secondary' } {
  switch (tier) {
    case 'confirmed':
      if (input.basis === 'external_projection') {
        return {
          label: t`Confirmat (proiecție externă)`,
          tooltip: t`CUI confirmat prin proiecția unui alt domeniu.`,
          variant: 'success',
        }
      }
      return {
        label: t`Identitate confirmată prin CUI`,
        tooltip: t`Datele sunt asociate unui CUI confirmat în registrul central.`,
        variant: 'success',
      }
    case 'candidate':
      return {
        label: t`Posibilă potrivire`,
        tooltip: t`Candidat neconfirmat dintr-un caz de revizuire; verifică încrederea.`,
        variant: 'warning',
      }
    case 'rejected':
      return {
        label: t`Potrivire respinsă`,
        tooltip: t`Potrivirea a fost respinsă în revizuire.`,
        variant: 'secondary',
      }
    case 'unconfirmed':
    default:
      return {
        label: t`Identitate neconfirmată — referință din registru`,
        tooltip: t`Înregistrare din registru public, neasociată unui CUI confirmat.`,
        variant: 'warning',
      }
  }
}

function tierIcon(tier: ConfidenceTier, className?: string) {
  const base = cn('h-3.5 w-3.5', className)
  if (tier === 'confirmed') return <BadgeCheck className={base} aria-hidden />
  if (tier === 'candidate') return <CircleHelp className={base} aria-hidden />
  if (tier === 'rejected') return <CircleSlash className={base} aria-hidden />
  return <TriangleAlert className={base} aria-hidden />
}

export function IdentityConfidenceBadge({
  input,
  size = 'md',
  showConfidence = false,
  className,
}: IdentityConfidenceBadgeProps) {
  const tier = resolveConfidenceTier(input)
  const { label, tooltip, variant } = tierCopy(tier, input)
  const confidencePct =
    showConfidence && input.confidence != null && input.confidence > 0
      ? formatConfidence(input.confidence)
      : null

  const ariaLabel = confidencePct
    ? `${label} (${confidencePct})`
    : label

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={variant}
            className={cn(
              'inline-flex items-center gap-1.5',
              size === 'sm' && 'px-2 py-0.5 text-[11px]',
              tier === 'unconfirmed' && 'border-amber-300',
              className,
            )}
            role="status"
            aria-label={ariaLabel}
          >
            {tierIcon(tier)}
            <span>{label}</span>
            {confidencePct ? (
              <span className="font-mono text-[11px] tabular-nums">
                {confidencePct}
              </span>
            ) : null}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// UnconfirmedReferencesZone — amber-bordered section separation wrapper.
// ---------------------------------------------------------------------------

type UnconfirmedReferencesZoneProps = {
  readonly heading?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

export function UnconfirmedReferencesZone({
  heading,
  children,
  className,
}: UnconfirmedReferencesZoneProps) {
  return (
    <section
      aria-label={t`Referințe neconfirmate`}
      className={cn(
        'border-l-4 border-amber-300 bg-amber-50/40 px-4 py-4 dark:bg-amber-950/10',
        className,
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 text-amber-700" aria-hidden />
        <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
          {heading ?? <Trans>Referințe neconfirmate</Trans>}
        </h3>
      </header>
      <p className="mb-3 text-sm text-amber-900/80 dark:text-amber-200/80">
        <Trans>
          Aceste înregistrări provin din registre publice (MJ, SGG) și nu au
          fost asociate unui CUI confirmat. Sunt afișate ca referințe, nu ca
          identitatea confirmată a organizației.
        </Trans>
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// IdentityRowMeta — row-level review_status/confidence + review-case link.
// ---------------------------------------------------------------------------

const reviewStatusLabels: Readonly<Record<string, ReactNode>> = {
  accepted: <Trans>acceptat</Trans>,
  review_pending: <Trans>în revizuire</Trans>,
  rejected: <Trans>respins</Trans>,
  unmatched: <Trans>fără potrivire</Trans>,
  pending: <Trans>în așteptare</Trans>,
  needs_more_evidence: <Trans>necesită dovezi suplimentare</Trans>,
}

type IdentityRowMetaProps = {
  readonly evidence?: Pick<
    EvidenceRecord,
    'identityBasis' | 'reviewStatus' | 'confidence'
  >
  readonly basis?: NgoIdentityBasis
  readonly reviewStatus?: EvidenceRecord['reviewStatus']
  readonly confidence?: number | null
  readonly linkReviewCaseId?: string | null
  readonly className?: string
}

export function IdentityRowMeta({
  evidence,
  basis,
  reviewStatus,
  confidence,
  linkReviewCaseId,
  className,
}: IdentityRowMetaProps) {
  const effectiveBasis = evidence?.identityBasis ?? basis
  const effectiveReview = evidence?.reviewStatus ?? reviewStatus
  const effectiveConfidence = evidence?.confidence ?? confidence
  const tier = resolveConfidenceTier({
    basis: effectiveBasis ?? 'none',
    reviewStatus: effectiveReview,
    confidence: effectiveConfidence,
    linkReviewCaseId,
  })

  const reviewLabel = effectiveReview
    ? (reviewStatusLabels[effectiveReview] ?? effectiveReview)
    : null

  const confidencePct =
    effectiveConfidence != null && effectiveConfidence > 0
      ? formatConfidence(effectiveConfidence)
      : null

  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      <IdentityConfidenceBadge
        input={{
          basis: effectiveBasis ?? 'none',
          reviewStatus: effectiveReview,
          confidence: effectiveConfidence,
          linkReviewCaseId,
        }}
        size="sm"
        showConfidence
      />
      {reviewLabel ? (
        <span className="text-muted-foreground">
          <Trans>Stare revizuire</Trans>: {reviewLabel}
        </span>
      ) : null}
      {confidencePct ? (
        <span className="font-mono tabular-nums text-muted-foreground">
          <Trans>Încredere</Trans>: {confidencePct}
        </span>
      ) : null}
      {linkReviewCaseId ? (
        <a
          href={`#review-case-${linkReviewCaseId}`}
          className="text-xs underline-offset-2 hover:underline"
        >
          <Trans>Vezi cazul de revizuire</Trans>
        </a>
      ) : null}
      {tier === 'candidate' ? (
        <span className="text-amber-800 dark:text-amber-200">
          <Trans>Posibilă potrivire — nu este identitate confirmată.</Trans>
        </span>
      ) : null}
    </div>
  )
}
