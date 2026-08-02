import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataStatusBadge } from '@/components/data-trust'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  legalActTypeLabel,
  legalIssuerLabel,
} from '../lib/legal-vocabulary'
import {
  legislationHeaderMetaClassName,
  legislationHeaderStatClassName,
  legislationHeaderStatLabelClassName,
  legislationHeaderStatValueClassName,
} from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'

type Props = {
  readonly act: LegalActDetail
}

/**
 * Rung 0 of the disclosure ladder — the verdict strip.
 *
 * Keeps the module skin (2px rules, zero radius, tabular figures) but drops the
 * landing page's oversized hero: a detail page opens on the act, not on a
 * banner. The title is the citation people actually search for
 * ("Legea nr. 227/2015"); `den` sits beneath it as the act's formal name.
 *
 * Stat chips render only when they carry a fact — an act cited by nobody shows
 * no citation chip rather than a zero.
 *
 * The trust badge sits next to the status badge, above the fold. In mock mode
 * this page renders two acts copied verbatim from production, which is exactly
 * the case DESIGN.md §Mock-First Contract exists for: data that looks served
 * because it *was* served, on a day that has passed.
 */
export function ActDetailHeader({ act }: Props) {
  const { i18n } = useLingui()
  const number = (value: number) => formatLegalNumber(value, i18n.locale)

  const den = act.canonical?.den ?? null
  const showDen = den !== null && den !== act.displayCitation
  const isMock = isLegalMockEnabled()

  return (
    <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8 lg:px-8">
        <Link
          to="/legislation"
          className="inline-flex items-center gap-1 text-sm text-[var(--pnrr-muted)] underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <Trans>Legislația României</Trans>
        </Link>

        <h1 className="mt-4 max-w-4xl text-balance text-[clamp(1.9rem,4.5vw,3.25rem)] font-black leading-[0.95] tracking-tight text-[var(--pnrr-fg)]">
          {act.displayCitation}
        </h1>

        {showDen ? (
          <p className="mt-3 max-w-3xl text-lg leading-7 text-[var(--pnrr-fg)]">
            {den}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <LegalStatusBadge status={act.status} />
          {isMock ? <DataStatusBadge status="mock" /> : null}
          <span className={legislationHeaderMetaClassName}>
            {[
              legalActTypeLabel(act.actType),
              act.issuerSlug ? legalIssuerLabel(act.issuerSlug) : null,
            ]
              .filter((part): part is string => part !== null)
              .join(' · ')}
            {act.entryIntoForce ? (
              <>
                {' · '}
                <Trans>
                  în vigoare din {formatLegalDate(act.entryIntoForce, i18n.locale)}
                </Trans>
              </>
            ) : null}
          </span>
        </div>

        {act.aliases.length > 0 ? (
          <p className="mt-3 text-sm text-[var(--pnrr-muted)]">
            <Trans>Cunoscut și ca</Trans>{' '}
            <span className="font-semibold text-[var(--pnrr-fg)]">
              {act.aliases.join(' · ')}
            </span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {act.amendedAfterPublication > 0 ? (
            <div className={legislationHeaderStatClassName}>
              <span className={legislationHeaderStatValueClassName}>
                {number(act.amendedAfterPublication)}
              </span>
              <span className={legislationHeaderStatLabelClassName}>
                <Trans>modificări</Trans>
              </span>
            </div>
          ) : null}
          {act.inDegree > 0 ? (
            <div className={legislationHeaderStatClassName}>
              <span className={legislationHeaderStatValueClassName}>
                {number(act.inDegree)}
              </span>
              <span className={legislationHeaderStatLabelClassName}>
                <Trans>acte îl citează</Trans>
              </span>
            </div>
          ) : null}
          {act.structure.length > 0 ? (
            <div className={cn(legislationHeaderStatClassName)}>
              <span className={legislationHeaderStatValueClassName}>
                {number(act.structure.length)}
              </span>
              <span className={legislationHeaderStatLabelClassName}>
                <Trans>elemente de structură</Trans>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
