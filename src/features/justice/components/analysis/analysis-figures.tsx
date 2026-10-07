import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand } from '@/features/statistics/components/hub/hub-figures'
import { useAnalysisFigures } from '../../hooks/use-justice-analysis'
import type { Question } from '../../lib/analysis-model'
import { analysisFacts } from './analysis-view'

/** The figures band, in the profiles' cells: the value large, the term and its change under it. */
export function AnalysisFigures({ question }: { readonly question: Question }) {
  const { i18n } = useLingui()
  const figures = useAnalysisFigures(question)
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {figures.isError && !figures.data ? (
          <div className="py-6">
            <HubLoadError onRetry={figures.retry} />
          </div>
        ) : !figures.data ? (
          <div className="h-32 animate-pulse" aria-hidden="true" />
        ) : (
          <HubFiguresBand facts={analysisFacts(question, figures.data)} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
        )}
      </RuledFrame>
    </section>
  )
}
