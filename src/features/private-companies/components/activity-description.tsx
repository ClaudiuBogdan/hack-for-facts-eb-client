import { t } from '@lingui/core/macro'
import type { CompanyAnalysisActivity } from '@/schemas/company-analytics'
import { activityText } from '../lib/company-activity-text'
import { caenDescriptionLines } from '../lib/company-analytics-text'

/**
 * A selected activity's code and name: an ONRC class with the exact catalog
 * label of its own revision; an ANAF fiscal code with the text every catalog
 * revision agrees on, or — when they differ — each alternative beside the
 * catalog revisions that give it, never claimed as the company's revision.
 * The source tag (ONRC Rev.N, or ANAF with its revision unpublished) is the
 * caller's, beside it.
 */
export function ActivityDescription({ activity }: { readonly activity: CompanyAnalysisActivity }) {
  const code = activity.code ?? '—'
  const lines =
    activity.source === 'ANAF' && activity.descriptionStatus === 'CONFLICT'
      ? caenDescriptionLines({ code, revision: null, label: null, descriptionStatus: 'CONFLICT', descriptions: activity.descriptions })
      : []
  if (lines.length === 0) {
    if (activity.source === 'ANAF') return <span>{activity.descriptionStatus === 'CONSENSUS' && activity.label ? `${code} · ${activity.label}` : code}</span>
    return <span>{activityText(activity)}</span>
  }
  return (
    <span className="block space-y-1">
      <span className="block">
        {code} · <span className="text-xs text-muted-foreground">{t`denumiri diferite între reviziile nomenclatorului`}</span>
      </span>
      {lines.map((line) => (
        <span key={line.revisions.join(',')} className="block break-words text-xs leading-relaxed" title={line.label ?? undefined}>
          <span className="text-muted-foreground">{line.revisions.join(', ')} · </span>
          {line.label ?? t`fără denumire în nomenclator`}
        </span>
      ))}
    </span>
  )
}
