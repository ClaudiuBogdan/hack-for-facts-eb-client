import { useLingui } from '@lingui/react'
import { Plural, Trans } from '@lingui/react/macro'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legislationAlertShellClassName } from '../lib/legislation-theme'

type Variant = 'banner' | 'row'

/** The expression kinds that are the act's text as published. */
const PUBLISHED_FORM_KINDS: ReadonlySet<string> = new Set(['original', 'corp', 'stub-header'])

type Props = {
  readonly act: LegalActDetail
  /**
   * `row` — compact footer rows inside the summary card, separated by the
   * same hairline as the AI-provenance row (user decision 2026-08-11: the
   * warnings qualify the summary, so they live ON the summary, and the card
   * is one element instead of three). `banner` — the standalone amber strip,
   * kept for acts that have warnings but no summary to attach them to.
   */
  readonly variant?: Variant
}

/**
 * The warnings that qualify the plain-language summary.
 *
 * This is the most important content on the page's lead. The summary is
 * generated from the document we hold, and for 10.033 acts that document is
 * the text *as first published* — the Codul Fiscal's body is dated 2015-09-10
 * and 295 amendment references have been recorded since, yet its summary still states the 2015
 * VAT rates in the flat, confident register of a summary. A reader who acts
 * on that is misled by us, not by the source.
 *
 * Each warning shows only its HEADLINE by default (user decision 2026-08-11:
 * the text is the page's main content, everything above it earns its lines).
 * The headline alone carries the qualifying fact — "22 de referințe de modificare",
 * "sursele nu sunt de acord" — and the explanation opens on demand. In the
 * `row` variant the amber field is gone too: the triangle carries the signal,
 * at the same volume as the card's other footer row.
 */
function CollapsedWarning({
  headline,
  variant,
  children,
}: {
  readonly headline: ReactNode
  readonly variant: Variant
  readonly children: ReactNode
}) {
  if (variant === 'row') {
    return (
      <details className="group border-t border-[var(--pnrr-subtle)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-2.5 sm:px-6 [&::-webkit-details-marker]:hidden">
          <AlertTriangle
            className="h-3.5 w-3.5 shrink-0 text-[var(--pnrr-warning-fg)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--pnrr-fg)]">
            {headline}
          </span>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--pnrr-muted)] transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        {/* Body left edge sits under the headline text: px + icon + gap.
            `ml-0!` beats the app-global unlayered `details > :not(summary)`
            margin, which would shove the body 1rem past that alignment. */}
        <p className="ml-0! max-w-prose px-5 pb-3 pl-[2.625rem] text-sm leading-6 text-[var(--pnrr-muted)] sm:px-6 sm:pl-[2.875rem]">
          {children}
        </p>
      </details>
    )
  }
  return (
    <details className={`group ${legislationAlertShellClassName}`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm font-bold text-[var(--pnrr-fg)]">
          {headline}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[var(--pnrr-muted)] transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <p className="ml-0! max-w-prose pb-3 pl-7 text-sm leading-6 text-[var(--pnrr-muted)]">
        {children}
      </p>
    </details>
  )
}

export function ActWarnings({ act, variant = 'banner' }: Props) {
  const { i18n } = useLingui()
  const number = (value: number) => formatLegalNumber(value, i18n.locale)

  const versionKind = act.canonical?.versionKind ?? ''
  const publishedForm = PUBLISHED_FORM_KINDS.has(versionKind)
  const publishedOn =
    act.canonical?.versionDate ?? act.canonical?.firstPublicationDate ?? null
  const republishedOn =
    versionKind === 'republicare' ? (act.canonical?.versionDate ?? null) : null
  const isStale = act.amendedAfterPublication > 0
  const isContradicted = act.statusEvidence.contradictedAbrogations > 0

  if (!isStale && !isContradicted) return null

  const warnings = (
    <>
      {isStale ? (
        <CollapsedWarning
          variant={variant}
          headline={
            // The count is of incoming modification/completion REFERENCES,
            // not of distinct amending acts or amendment events (I-22: the
            // Codul Fiscal's 295 come from 216 acts), and of every date: it
            // is not dated against the text shown. Law 95/2006's text is its
            // 2015 republication and 106 of its 292 references come from
            // earlier sources; even 45 published-form texts (1990 decisions
            // published in 1992 or 1999, "corp" bodies of later
            // republications) have earlier-dated ones. So no "since
            // publication".
            <Plural
              value={act.amendedAfterPublication}
              one="O referință de modificare sau completare înregistrată pentru act."
              few="# referințe de modificare sau completare înregistrate pentru act."
              other="# de referințe de modificare sau completare înregistrate pentru act."
            />
          }
        >
          {!publishedForm ? (
            republishedOn ? (
              <Trans>
                Rezumatul și structura de mai jos descriu actul așa cum a fost
                republicat la {formatLegalDate(republishedOn, i18n.locale)}.
                Referințele sunt numărate pentru întregul act, deci pot fi și
                anterioare republicării. Nu deținem textul consolidat la zi —
                pentru versiunea în vigoare, consultă textul oficial.
              </Trans>
            ) : (
              <Trans>
                Referințele sunt numărate pentru întregul act, nu față de
                versiunea de mai jos, deci pot fi și anterioare ei. Nu deținem
                textul consolidat la zi — pentru versiunea în vigoare, consultă
                textul oficial.
              </Trans>
            )
          ) : publishedOn ? (
            <Trans>
              Rezumatul și structura de mai jos descriu actul așa cum a fost
              publicat la {formatLegalDate(publishedOn, i18n.locale)}. Nu
              deținem textul consolidat la zi — pentru versiunea în vigoare,
              consultă textul oficial.
            </Trans>
          ) : (
            <Trans>
              Rezumatul și structura de mai jos descriu actul așa cum a fost
              publicat inițial. Nu deținem textul consolidat la zi — pentru
              versiunea în vigoare, consultă textul oficial.
            </Trans>
          )}
        </CollapsedWarning>
      ) : null}

      {isContradicted ? (
        <CollapsedWarning
          variant={variant}
          headline={<Trans>Sursele nu sunt de acord despre ce s-a abrogat.</Trans>}
        >
          <Trans>
            Am găsit {number(act.statusEvidence.contradictedAbrogations)}{' '}
            semnale de abrogare care se contrazic între ele. Statutul afișat
            este cea mai bună interpretare a noastră, nu o certitudine.
          </Trans>
        </CollapsedWarning>
      ) : null}
    </>
  )

  // Row variant: the rows draw their own top hairlines — no wrapper needed.
  if (variant === 'row') return warnings

  return <div className="flex flex-col gap-2">{warnings}</div>
}
