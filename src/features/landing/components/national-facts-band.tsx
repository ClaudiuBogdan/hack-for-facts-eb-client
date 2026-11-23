import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useLingui } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn, getUserLocale } from '@/lib/utils'
import { NATIONAL_FACTS, type NationalFactLink } from '@/features/landing/lib/national-facts'
import { CountUpValue } from './count-up'
import { CruxMarks } from './hero-chrome'
import { ScrambleText } from './scramble-text'

/**
 * Facts — dense band. The scale of the thing being watched: what the country
 * produces, what it spends, what it borrows, who it is for. Four official
 * figures — the 2025 economy and budget, the population at 1 January 2026 —
 * each carrying its source and period, because `DESIGN.md` §Data Trust
 * requires that beside every claim. Each tile is also a link to the
 * platform's own page on the same data: the tile is the claim, the page is its
 * evidence.
 *
 * A description list, because that is what it is — four terms and their
 * values, not four decorative tiles. `dt` precedes `dd` in the DOM as the spec
 * requires; `order` puts the value on top.
 */
export function NationalFactsBand() {
  const { i18n } = useLingui()
  const locale = getUserLocale() === 'en' ? 'en' : 'ro'
  return (
    <section className="border-b bg-muted/20" aria-label={t`România în cifre`}>
      <RuledFrame>
        <CruxMarks />
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {NATIONAL_FACTS.map((fact, i) => (
            <div
              key={fact.key}
              data-reveal
              className={cn(
                'group relative flex flex-col px-5 py-6 transition-colors hover:bg-muted/50 sm:py-7',
                i % 2 === 1 && 'border-l',
                i >= 2 && 'border-t lg:border-t-0',
                i >= 1 && 'lg:border-l',
              )}
            >
              {/* Both lines live in the `dt` because a `dl` group admits only
                  `dt` and `dd`. A group is also `dt` *then* `dd`, which is why
                  the term is first here and the tile reorders them: `order-*`
                  on the flex column puts the number above the label without
                  the markup having to lie about which is which. The tile
                  stretches to the row height, so `mt-auto` drops the
                  attribution to the bottom-left corner and it lines up across
                  all four regardless of how many lines the label takes. */}
              <dt className="order-2 mt-2.5 flex flex-1 flex-col">
                <MonoLabel className="block leading-relaxed text-foreground">
                  <FactLink link={fact.link}>{i18n._(fact.label)}</FactLink>
                </MonoLabel>
                <MonoLabel className="mt-auto block pt-6 leading-relaxed text-muted-foreground">
                  <ScrambleText>{i18n._(fact.source)}</ScrambleText>
                </MonoLabel>
                {/* The cue that the tile leads somewhere. In the `dt` for the
                    same reason as the lines above, placed against the tile.
                    Where a pointer hovers it waits for hover or focus; a touch
                    screen has neither, so there it always shows. */}
                <ArrowUpRight
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-2 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
                />
              </dt>
              <dd className="order-1 flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                <CountUpValue value={fact.value} digits={fact.digits} locale={locale} />
                {/* The unit never breaks across lines — 'mld.' alone on one
                    line and 'lei' on the next reads as two facts. */}
                <span className="shrink-0 whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">
                  {i18n._(fact.unit)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </RuledFrame>
    </section>
  )
}

/**
 * The label as a link, its hit area stretched over the whole tile by the
 * `::after` overlay — the link stays inside the `dt`, so the list stays a
 * valid `dl`, and its name is the label alone. The focus ring draws on that
 * overlay, around the tile.
 */
const FACT_LINK_CLASS =
  'after:absolute after:inset-0 focus-visible:outline-hidden focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring'

function FactLink({ link, children }: { readonly link: NationalFactLink; readonly children: ReactNode }) {
  if ('dataset' in link) {
    return (
      <Link to="/ins/seturi/$cod" params={{ cod: link.dataset }} preload="intent" className={FACT_LINK_CLASS}>
        {children}
      </Link>
    )
  }
  return (
    <Link to="/national-budget/analytics" search={link.budget as never} preload="intent" className={FACT_LINK_CLASS}>
      {children}
    </Link>
  )
}
