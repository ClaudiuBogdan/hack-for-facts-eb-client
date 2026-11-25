import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { LegalAnalyticsHead } from '@/schemas/legal-analytics'
import { LegalAnalyticsError } from '../../api/legal-analytics-api'
import { analyticsNotes } from '../../lib/analytics-notes-text'

/** The notes, visible at the foot of the page. */
export function AnalyticsCaveats({
  head,
  population = 'flux',
}: {
  readonly head: LegalAnalyticsHead | undefined
  /** The question's population: the notes give the flow's shares only on the flow. */
  readonly population?: 'flux' | 'stoc'
}) {
  return (
    <section aria-label={t`De știut despre aceste cifre`} className="border-t pt-6">
      <MonoLabel className="block text-muted-foreground">{t`De știut`}</MonoLabel>
      <ul className="mt-3 max-w-[80ch] list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
        {analyticsNotes(head, population).map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}

/**
 * A view that could not be answered. Before the first layer is published (or while the server is busy) the API
 * answers 503: that is a designed state, said calmly. A question the layer cannot answer (400) says so; anything
 * else is a failure.
 */
export function AnalyticsProblem({ error }: { readonly error: unknown }) {
  const kind = error instanceof LegalAnalyticsError ? error.kind : 'failed'
  if (kind === 'unavailable') {
    return (
      <div className="border border-dashed p-8" role="status">
        <p className="font-medium text-foreground">{t`Analiza se pregătește`}</p>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          {t`Cifrele analizei nu sunt încă publicate pe acest server sau serverul e ocupat. Încearcă din nou peste câteva minute; actele, căutarea și Monitorul Oficial funcționează.`}
        </p>
      </div>
    )
  }
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {kind === 'invalid'
        ? t`Întrebarea nu se potrivește cu datele publicate (un filtru necunoscut). Scoate filtrele și încearcă din nou.`
        : t`Nu am putut încărca această parte a analizei.`}
    </p>
  )
}
