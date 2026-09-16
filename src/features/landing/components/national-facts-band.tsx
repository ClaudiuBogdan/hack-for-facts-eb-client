import { useLingui } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn, getUserLocale } from '@/lib/utils'
import { NATIONAL_FACTS } from '@/features/landing/lib/national-facts'
import { CountUpValue } from './count-up'
import { CruxMarks } from './hero-chrome'
import { ScrambleText } from './scramble-text'

/**
 * Facts — dense band. The scale of the thing being watched: what the country
 * produces, what it spends, what it borrows, who it is for. Four official 2025
 * figures, each carrying its source and period, because `DESIGN.md` §Data
 * Trust requires that beside every claim.
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
                'flex flex-col px-5 py-6 sm:py-7',
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
                  {i18n._(fact.label)}
                </MonoLabel>
                <MonoLabel className="mt-auto block pt-6 leading-relaxed text-muted-foreground">
                  <ScrambleText>{i18n._(fact.source)}</ScrambleText>
                </MonoLabel>
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
