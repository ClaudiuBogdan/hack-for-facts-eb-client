import type { ReactNode } from 'react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { CountUpValue } from '@/features/landing/components/count-up'
import { cn } from '@/lib/utils'

/**
 * The analysis page's headline figures: the hubs' figures band (`HubFiguresBand`), with one difference. A share
 * that rounds to 0% or 100% without being it is printed as the formatter says it („<0,1%", „>99,9%"), as
 * static text: a figure that counts up can only print a number, and a number there would be 0,0% or 100,0%.
 */

export type AnalysisFigure = {
  readonly key: string
  /** A number counts up; a text (a bounded share) is printed as it is. */
  readonly value: { readonly kind: 'number'; readonly value: number; readonly digits: number; readonly unit?: '%' } | { readonly kind: 'text'; readonly text: string }
  readonly label: ReactNode
  readonly note: ReactNode
  readonly href: string
}

export function AnalysisFigures({ figures }: { readonly figures: readonly AnalysisFigure[] }) {
  return (
    <dl className={cn('grid', figures.length === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4')}>
      {figures.map((figure, index) => (
        <div
          key={figure.key}
          data-reveal
          data-testid={`analysis-figure-${figure.key}`}
          className={cn(
            'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/40 sm:py-7',
            index % 2 === 1 && 'border-l',
            index >= 2 && 'border-t lg:border-t-0',
            index >= 1 && 'lg:border-l',
          )}
        >
          <dt className="order-2 mt-2.5 flex flex-1 flex-col">
            <a href={figure.href} className='after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring'>
              <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
            </a>
            {figure.note ? <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{figure.note}</MonoLabel> : null}
          </dt>
          <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {figure.value.kind === 'text' ? (
              figure.value.text
            ) : (
              <>
                <CountUpValue value={figure.value.value} digits={figure.value.digits} locale="ro" />
                {figure.value.unit ?? null}
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
