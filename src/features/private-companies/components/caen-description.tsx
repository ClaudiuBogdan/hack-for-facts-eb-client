import { t } from '@lingui/core/macro'
import type { CompanyAnalysisCaen } from '@/schemas/company-analytics'
import { caenDescriptionLines, caenText } from '../lib/company-analytics-text'

/** Alternatives belong to catalog revisions; they never claim the company's source revision. */
export function CaenDescription({ caen }: { readonly caen: CompanyAnalysisCaen }) {
  const lines = caenDescriptionLines(caen)
  if (caen.revision !== null || lines.length === 0) return <span>{caenText(caen)}</span>
  if (caen.descriptionStatus === 'CONSENSUS') return (
    <span className="block">
      <span className="block">{caen.code} · {lines[0]?.label}</span>
      <span className="block text-xs text-muted-foreground" title={lines[0]?.revisions.join(', ')}>{t`Revizie nepublicată`}</span>
    </span>
  )
  return (
    <span className="block space-y-1">
      <span className="block">{caen.code} · <span className="text-xs text-muted-foreground">{t`Revizie nepublicată — denumiri diferite`}</span></span>
      {lines.map((line) => (
        <span key={line.revisions.join(',')} className="block break-words text-xs leading-relaxed" title={line.label ?? undefined}>
          <span className="text-muted-foreground">{line.revisions.join(', ')} · </span>{line.label ?? t`fără denumire în nomenclator`}
        </span>
      ))}
    </span>
  )
}
