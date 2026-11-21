import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import type { LegalSearchSectionHit } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import { isConsolidationVersion, portalConsolidationNote } from '../lib/legal-versions'

type Props = {
  readonly hit: LegalSearchSectionHit
}

/**
 * The engine's highlight fragment, as TEXT: `<em>…</em>` marks the matched
 * words and becomes a `<mark>`; every other character — any other tag
 * included — is printed literally, never parsed as HTML.
 */
function highlighted(snippet: string) {
  return snippet.split(/(<em>.*?<\/em>)/g).map((part, index) => {
    const match = /^<em>(.*)<\/em>$/.exec(part)
    return match ? (
      <mark key={index} className="bg-[var(--pnrr-warning-bg)] text-inherit">
        {match[1]}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  })
}

/**
 * One provision hit under an act in the finder. On legal_v2 the hit was
 * verified against a served form; when that form is a consolidation, its
 * label goes with the snippet (LEG-X3AV) — the words come from an
 * unofficial, informative text, and the Portal's own note says which.
 */
export function LegislationSearchSnippet({ hit }: Props) {
  const { i18n } = useLingui()
  if (hit.snippet === null) return null

  const served = hit.servedForm
  const version =
    served === null
      ? null
      : {
          versionKind: served.versionKind ?? '',
          caveat: served.caveat ?? null,
          portalLabelRaw: served.portalLabelRaw ?? null,
          portalLabelDate: served.portalLabelDate ?? null,
        }
  const consolidation = version !== null && isConsolidationVersion(version)
  const note =
    consolidation && version !== null
      ? portalConsolidationNote(version, (value) => formatLegalDate(value, i18n.locale))
      : null

  return (
    <div className="border-l-2 border-[var(--pnrr-subtle)] pl-3 text-sm leading-6">
      {hit.nodeLabel !== null && (
        <p className="text-xs text-[var(--pnrr-muted)]">{hit.nodeLabel}</p>
      )}
      <p className="text-[var(--pnrr-fg)]">„{highlighted(hit.snippet)}”</p>
      {consolidation && (
        <p className="text-xs text-[var(--pnrr-muted)]">
          {note !== null ? (
            <Trans>
              Dintr-o formă consolidată neoficială, cu caracter informativ.
              Portalul Legislativ indică „{note}”.
            </Trans>
          ) : (
            <Trans>Dintr-o formă consolidată neoficială, cu caracter informativ.</Trans>
          )}
        </p>
      )}
    </div>
  )
}
