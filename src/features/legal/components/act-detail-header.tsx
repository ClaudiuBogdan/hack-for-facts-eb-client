import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataStatusBadge } from '@/components/data-trust'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  legalActTypeLabel,
  legalIssuerLabel,
} from '../lib/legal-vocabulary'
import {
  legislationActionClassName,
  legislationHeaderMetaClassName,
} from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'

type Props = {
  readonly act: LegalActDetail
}

/**
 * Rung 0 of the disclosure ladder — the verdict strip.
 *
 * Two columns, not seven stacked rows. Identity on the left — status, the
 * citation people actually search for ("Legea nr. 227/2015"), the formal name,
 * and one line of classification — with the exit to the official text on the
 * right, in the space a left-aligned column leaves empty anyway. Everything
 * short enough to share a line does: act type, issuer, entry into force and the
 * aliases are one `·`-joined line rather than four.
 *
 * Status leads as an eyebrow above the title because rung 0's question is "what
 * is this, and is it alive" — and "Abrogat parțial" is the half of that answer a
 * reader cannot reconstruct from the citation.
 *
 * **The exit to the official text lives here, and only here.** It used to be an
 * underlined link 1.200px down the page, inside the publication card, which is
 * no place for the thing a reader who wants the law itself is looking for. It is
 * the one solid button above the fold.
 *
 * It carries no "we do not publish the text" disclaimer: full text is on its way
 * into the product (2026-08-04), so a standing claim that we never hold it would
 * be false on arrival. What the page still says, and must keep saying, is
 * narrower and survives that change — the publication band's PDF marker means an
 * official PDF exists on monitoruloficial.ro, never that we hold its text.
 *
 * The stat chips that used to close this header are gone: they restated the
 * amendment count from the warning below, the citation count from the "Cine îl
 * citează" row and the structure count from "Cum e structurat". Three numbers,
 * each said twice, on the screen with the least room to spare.
 *
 * The trust badge sits next to the status badge, above the fold. In mock mode
 * this page renders two acts copied verbatim from production, which is exactly
 * the case DESIGN.md §Mock-First Contract exists for: data that looks served
 * because it *was* served, on a day that has passed.
 */
export function ActDetailHeader({ act }: Props) {
  const { i18n } = useLingui()

  const den = act.canonical?.den ?? null
  const showDen = den !== null && den !== act.displayCitation
  const isMock = isLegalMockEnabled()

  const classification = [
    legalActTypeLabel(act.actType),
    act.issuerSlug ? legalIssuerLabel(act.issuerSlug) : null,
    act.entryIntoForce
      ? t`în vigoare din ${formatLegalDate(act.entryIntoForce, i18n.locale)}`
      : null,
    act.aliases.length > 0
      ? t`cunoscut și ca ${act.aliases.join(', ')}`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')

  return (
    <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-6 sm:px-6 sm:pt-6 lg:px-8">
        <Link
          to="/legislation"
          className="inline-flex items-center gap-1 text-sm text-[var(--pnrr-muted)] underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <Trans>Legislația României</Trans>
        </Link>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <LegalStatusBadge status={act.status} />
              {isMock ? <DataStatusBadge status="mock" /> : null}
            </div>

            <h1 className="mt-2.5 max-w-3xl text-balance text-[clamp(1.75rem,4vw,3rem)] font-black leading-[0.95] tracking-tight text-[var(--pnrr-fg)]">
              {act.displayCitation}
            </h1>

            {showDen ? (
              <p className="mt-2 max-w-3xl text-base leading-6 text-[var(--pnrr-fg)]">
                {den}
              </p>
            ) : null}

            {classification ? (
              <p className={cn(legislationHeaderMetaClassName, 'mt-2 text-sm')}>
                {classification}
              </p>
            ) : null}
          </div>

          {act.officialTextUrl !== null ? (
            <a
              href={act.officialTextUrl}
              target="_blank"
              rel="noopener noreferrer"
              // `self-start` keeps the stacked mobile layout from stretching the
              // button to the full column width; `lg:self-auto` hands alignment
              // back to the row, which seats it on the last identity line.
              className={cn(
                legislationActionClassName,
                'shrink-0 self-start lg:self-auto',
              )}
            >
              <Trans>Citește textul oficial</Trans>
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </header>
  )
}
