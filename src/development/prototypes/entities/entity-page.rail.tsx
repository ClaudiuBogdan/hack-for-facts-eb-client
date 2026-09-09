/**
 * Variant B — desktop two-column: a sticky left rail (identity, headline
 * figures, section index, period) and scrolling bands on the right. Collapses
 * to the stacked layout below `lg`. Owned by the layout subagent.
 *
 * One DOM at every width, arranged by breakpoints — not the stacked tree
 * hidden beside a desktop one. Two trees would carry every section id twice,
 * and a hash link resolves to the first (hidden) one and scrolls nowhere; a
 * JS breakpoint would server-render the wrong arrangement and swap after
 * hydration. Below `lg` the frame (`max-w-6xl`, 1152px) is wider than the
 * viewport, so the sections' negative-margin rules run edge to edge and the
 * page is pixel-for-pixel the stacked variant.
 */
import { useRef } from 'react'
import { cn, formatNumber } from '@/lib/utils'
import {
  ENTITY_PAGE_TOP_ID,
  EntityPageFiguresBand,
  EntityPageSectionBands,
  EntityPageSectionIndex,
  EntityPageTop,
  useActiveSection,
} from './entity-page.bands'
import { CruxMarks, Frame, MonoLabel, normalizeEntityDisplayName, PROTOTYPE_MARKER } from './entity-page.parts'
import { splitCompactMoney } from './entity-page.stats'
import type { EntityPagePieceProps } from './entity-page.types'

type RailFigure = {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly unit: string
}

/**
 * The four figures for the rail, stacked. Built here from `data` rather than
 * by forcing the stats band into one column: its cells carry a delta line and
 * a provenance line each, which stacked four times would fill the rail on
 * their own. The rail says the provenance once, at the bottom.
 */
function buildRailFigures({ data, state }: Pick<EntityPagePieceProps, 'data' | 'state'>): readonly RailFigure[] {
  const population = data.entity.uat?.population ?? null
  const money = (amount: number) =>
    splitCompactMoney({ amount, normalization: state.normalization, population })
  const totalIncome = data.entity.totalIncome ?? 0
  const totalExpenses = data.entity.totalExpenses ?? 0
  const budgetBalance = data.entity.budgetBalance ?? totalIncome - totalExpenses
  const balance = money(Math.abs(budgetBalance))

  const figures: RailFigure[] = [
    { key: 'income', label: 'Venituri', ...money(totalIncome) },
    { key: 'expenses', label: 'Cheltuieli', ...money(totalExpenses) },
    {
      key: 'balance',
      label: `Sold · ${budgetBalance >= 0 ? 'Excedent' : 'Deficit'}`,
      ...balance,
    },
  ]
  if (population) {
    figures.push({ key: 'population', label: 'Populație', value: formatNumber(population), unit: 'locuitori' })
  } else {
    figures.push({
      key: 'subordinates',
      label: 'Instituții subordonate',
      value: formatNumber(data.subordinatesTotal),
      unit: 'instituții',
    })
  }
  return figures
}

function RailAside({
  active,
  ...props
}: EntityPagePieceProps & { readonly active: ReturnType<typeof useActiveSection> }) {
  const { data, state } = props
  const figures = buildRailFigures({ data, state })
  const isMain = state.view === 'main-info'
  return (
    <aside
      aria-label="Sinteză"
      className="hidden lg:sticky lg:top-16 lg:col-span-4 lg:block lg:self-start lg:py-14 lg:pr-8"
    >
      {/* Identity, small: the hero has already said it big. */}
      <div>
        <MonoLabel className="block text-muted-foreground">
          {data.entityKindLabel} · <span className="tabular-nums">CUI {data.entity.cui}</span>
        </MonoLabel>
        <p className="mt-2 text-base font-semibold leading-snug tracking-tight text-foreground">
          {normalizeEntityDisplayName(data.entity.name)}
        </p>
      </div>

      {/* The figures, one under the other, as a description list with a rule
          between each pair. `dt` precedes `dd` in the DOM; `order` puts the
          value on top. */}
      <dl className="mt-5 border-y">
        {figures.map((figure, i) => (
          <div key={figure.key} className={cn('flex flex-col py-3', i > 0 && 'border-t')}>
            <dd className="order-1 flex flex-wrap items-baseline gap-x-1.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {figure.value}
              <span className="shrink-0 whitespace-nowrap text-xs font-medium tracking-normal text-muted-foreground">
                {figure.unit}
              </span>
            </dd>
            <dt className="order-2 mt-1.5">
              <MonoLabel className="block leading-relaxed text-foreground">{figure.label}</MonoLabel>
            </dt>
          </div>
        ))}
      </dl>

      {isMain ? (
        <EntityPageSectionIndex
          orientation="column"
          active={active}
          firstHref={`#${ENTITY_PAGE_TOP_ID}`}
          className="mt-5"
        />
      ) : null}

      {/* Period and provenance, once, under the figures they describe. */}
      <div className="mt-5 border-t pt-4">
        <MonoLabel className="block leading-relaxed text-foreground">
          {data.period.label}
        </MonoLabel>
        <MonoLabel className="mt-1 block leading-relaxed text-muted-foreground">
          {data.period.provenance}
        </MonoLabel>
      </div>
    </aside>
  )
}

export function EntityPageRail(props: EntityPagePieceProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const active = useActiveSection(rootRef)

  return (
    <div
      ref={rootRef}
      id={ENTITY_PAGE_TOP_ID}
      className="relative w-full bg-background"
      data-dev-marker={PROTOTYPE_MARKER}
    >
      <EntityPageTop {...props} />
      {/* Below `lg` the figures are the band they are in the stacked layout;
          from `lg` they move into the rail. */}
      <EntityPageFiguresBand {...props} className="lg:hidden" />
      <section className="border-b">
        <Frame>
          {/* The hero closes on the crux marks at every width: the figures
              band carries them below `lg`, this frame carries them above. */}
          <span className="hidden lg:block">
            <CruxMarks />
          </span>
          <div className="lg:grid lg:grid-cols-12">
            <RailAside {...props} active={active} />
            {/* One rule between the columns, on the column that spans the
                full height; the sticky rail is shorter than the page and a
                rule on it would end mid-way. */}
            <div className="min-w-0 lg:col-span-8 lg:-mr-8 lg:border-l lg:pl-8 lg:pr-8">
              <EntityPageSectionBands {...props} framed={false} />
            </div>
          </div>
        </Frame>
      </section>
    </div>
  )
}
