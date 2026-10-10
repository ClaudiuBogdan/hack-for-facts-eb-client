import type { ReactNode } from 'react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { HubFigure } from '../../lib/company-hub-analytics'

/**
 * The hub's figures band in the INS hub's cell (`HubFiguresBand`), over the
 * API's own digits: the value as text, never counted up from a float. Each
 * cell is `div > dt + dd` with the term as the link, so the whole cell
 * answers hover; a scaled figure names its exact value as the cell's title.
 */

const COLUMNS: Readonly<Record<number, string>> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-2 lg:grid-cols-3' }

export function HubFigureCells({
  figures,
  link,
}: {
  readonly figures: readonly HubFigure[]
  /** Wraps a figure's term in its link; the caller owns the route. */
  readonly link: (figure: HubFigure, label: ReactNode, className: string) => ReactNode
}) {
  return (
    <dl className={cn('grid', COLUMNS[figures.length] ?? 'grid-cols-2 lg:grid-cols-4')} data-testid="company-hub-figure-cells">
      {figures.map((figure, index) => {
        const [note, exact] = figure.notes
        return (
          <div
            key={figure.key}
            data-reveal
            data-figure={figure.key}
            title={exact}
            className={cn(
              'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/40 sm:py-7',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t lg:border-t-0',
              index >= 1 && 'lg:border-l',
            )}
          >
            <dt className="order-2 mt-2.5 flex flex-1 flex-col">
              {link(
                figure,
                <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>,
                'after:absolute after:inset-0 after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring',
              )}
              {note ? <MonoLabel className="mt-auto block pt-3 leading-relaxed text-muted-foreground">{note}</MonoLabel> : null}
            </dt>
            <dd className="order-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
              {figure.value}
              {figure.unit ? <span className="ml-1.5 text-base font-medium tracking-normal text-muted-foreground sm:text-xl">{figure.unit}</span> : null}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
