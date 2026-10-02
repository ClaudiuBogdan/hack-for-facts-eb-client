import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisStats } from '@/schemas/company-analytics'
import type { ResolvedQuestion } from '../../api/company-analytics-plan'
import { localeOf } from '../../lib/company-analytics-format'
import { factsOf, type Fact } from '../../lib/company-analytics-view'

/**
 * The figures band: the companies the question counts, those that filed for
 * the year, the measure's sum and who reported it, and how much of the
 * year's statements carry a reported value (`factsOf`). A sum nobody
 * reported is said as such — never a 0; a scaled figure carries its exact
 * value under it. Turnover, net result and employees follow in a second row
 * where the year offers them. Static figures, not counted up: the digits
 * are the API's, every one of them.
 */

function FactCell({ fact, index, small = false }: { readonly fact: Fact; readonly index: number; readonly small?: boolean }) {
  return (
    <div className={cn('flex flex-col px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
      <dt className="order-2 mt-2.5 flex flex-1 flex-col">
        <MonoLabel className="block leading-relaxed text-foreground">{fact.label}</MonoLabel>
        <span className="mt-auto block space-y-0.5 pt-3 text-xs leading-relaxed text-muted-foreground">
          {fact.notes.map((note) => (
            <span key={note} className="block break-words tabular-nums">
              {note}
            </span>
          ))}
        </span>
      </dt>
      <dd className={cn('order-1 font-semibold tabular-nums tracking-tight text-foreground', small ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl')}>
        {fact.value}
        {fact.unit ? <span className={cn('ml-1.5 font-medium tracking-normal text-muted-foreground', small ? 'text-sm sm:text-base' : 'text-base sm:text-xl')}>{fact.unit}</span> : null}
      </dd>
    </div>
  )
}

function Band({ facts, small = false }: { readonly facts: readonly Fact[]; readonly small?: boolean }) {
  const columns = facts.length === 1 ? 'grid-cols-1' : facts.length === 2 ? 'grid-cols-2' : facts.length === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
  return (
    <dl className={cn('grid', columns)}>
      {facts.map((fact, index) => (
        <FactCell key={fact.key} fact={fact} index={index} small={small} />
      ))}
    </dl>
  )
}

export function AnalyticsFigures({
  stats,
  question,
  isError,
  onRetry,
}: {
  readonly stats: CompanyAnalysisStats | undefined
  readonly question: ResolvedQuestion | null
  readonly isError: boolean
  readonly onRetry: () => void
}) {
  const { i18n } = useLingui()
  const facts = stats && question ? factsOf(stats, question, localeOf(i18n.locale)) : null
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        {isError ? (
          <div className="py-6">
            <HubLoadError onRetry={onRetry} />
          </div>
        ) : !facts ? (
          <div className="h-36 animate-pulse" aria-hidden="true" />
        ) : (
          <>
            <Band facts={facts.main} />
            {facts.more.length > 0 ? (
              <div className="border-t">
                <Band facts={facts.more} small />
              </div>
            ) : null}
          </>
        )}
      </RuledFrame>
    </section>
  )
}
