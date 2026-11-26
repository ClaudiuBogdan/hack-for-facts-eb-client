import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import { formatLegalDate } from '../lib/legal-format'
import { isConsolidationVersion, portalConsolidationNote } from '../lib/legal-versions'
import type { ProvisionGroup } from '../lib/search-marks'

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
 * A provision that matched, under its act in the finder: its label, a link to that provision in the act's text
 * (`?doc=…&nod=…`) when the engine names its path, then the engine's fragments of it, quoted as served: never cut
 * by the label, whose words may open another provision („Articolul 1" before „Articolul 10…", review astra-client-11).
 * On legal_v2 the hit was verified against a served form; when that form is a consolidation, its label goes with
 * the fragments (LEG-X3AV): the words come from an unofficial, informative text, and the Portal's own note says which.
 */
export function LegislationSearchProvision({ actId, group }: { readonly actId: string; readonly group: ProvisionGroup }) {
  const { i18n } = useLingui()
  const served = group.servedForm
  const version =
    served === null
      ? null
      : { versionKind: served.versionKind ?? '', caveat: served.caveat ?? null, portalLabelRaw: served.portalLabelRaw ?? null, portalLabelDate: served.portalLabelDate ?? null }
  const consolidation = version !== null && isConsolidationVersion(version)
  const note = consolidation && version !== null ? portalConsolidationNote(version, (value) => formatLegalDate(value, i18n.locale)) : null
  const label = group.label ?? t`Prevedere`

  return (
    <div className="border-l-2 border-border pl-3">
      {group.nodePath !== null ? (
        <Link
          to="/legislation/acts/$actId"
          params={{ actId }}
          search={{ doc: group.documentId, nod: group.nodePath }}
          className="relative inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 after:absolute after:-inset-x-2 after:-inset-y-3.5 after:content-[''] hover:underline"
        >
          {label}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      ) : (
        <p className="text-xs font-medium text-foreground">{label}</p>
      )}
      {group.fragments.map((fragment) => (
        <p key={fragment} className="mt-1 line-clamp-3 max-w-[75ch] text-sm leading-6 text-foreground/90">
          „{highlighted(fragment)}”
        </p>
      ))}
      {consolidation ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {note !== null ? (
            <Trans>
              Dintr-o formă consolidată neoficială, cu caracter informativ.
              Portalul Legislativ indică „{note}”.
            </Trans>
          ) : (
            <Trans>Dintr-o formă consolidată neoficială, cu caracter informativ.</Trans>
          )}
        </p>
      ) : null}
    </div>
  )
}
