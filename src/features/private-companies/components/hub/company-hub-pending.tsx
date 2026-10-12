import { useRouterState } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HUB_BESIDE_TITLE_CLASS, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { CompanyHubHero, CompanyLeaderRowsPending, CompanyLeadersFrame, CompanySearchShell, PendingBar } from './company-hub-hero'
import { COMPANY_HUB_LEADERS_SHOWN, LEADERS_MORE_CLASS, bandNumber, companyHubSections } from './company-hub-sections'

/** `IndicatorToggle`'s option box, so the switch's place is its size at every width. */
const SWITCH_OPTION_CLASS = 'min-h-9 bg-background px-2 py-1.5 text-sm leading-tight sm:px-3'

/**
 * `/companies` while its code loads on a client navigation: the page's own
 * head — title, lede, search box, shortcuts, the leaders' card with its
 * switch, the pinned bar and the first band's title — drawn at once from the
 * same components, and a pulse the size of each figure where the figures go.
 * The snapshot stays in the page's chunk; nothing here waits for it.
 */
export function CompanyHubPending() {
  const sections = companyHubSections()
  // The location being loaded: a link to the employees' ranking holds that switch's place as chosen.
  const byEmployees = useRouterState({ select: (state) => (state.location.search as { readonly clasament?: unknown }).clasament === 'salariati' })
  return (
    <div className="relative w-full overflow-x-clip bg-background" aria-busy="true">
      <CompanyHubHero
        search={<CompanySearchShell />}
        leaders={
          <CompanyLeadersFrame
            title={
              <>
                <Trans>Cele mai mari firme</Trans>, <PendingBar className="w-8" />
              </>
            }
            toggle={
              // The ranking's switch, its place held with its own words, in `IndicatorToggle`'s boxes.
              <div className="grid auto-cols-fr grid-flow-col gap-px border bg-border/70 sm:flex" aria-hidden="true">
                <span className={cn(SWITCH_OPTION_CLASS, byEmployees ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{t`Cifra de afaceri`}</span>
                <span className={cn(SWITCH_OPTION_CLASS, byEmployees ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{t`Salariați`}</span>
              </div>
            }
          >
            <CompanyLeaderRowsPending rows={COMPANY_HUB_LEADERS_SHOWN} className="mt-4" />
            <span className={LEADERS_MORE_CLASS} aria-hidden="true">
              <PendingBar className="w-28" />
            </span>
            {/* The footnote's lines: two on a phone and in the narrow card from lg, one between. */}
            <p className="mt-2 text-xs" aria-hidden="true">
              <PendingBar className="block w-full" />
              <PendingBar className="block w-1/3 sm:hidden lg:block" />
            </p>
          </CompanyLeadersFrame>
        }
        source={
          <p className="text-sm text-muted-foreground" aria-hidden="true">
            {/* One line; two on a phone. */}
            <Trans>Surse:</Trans> <PendingBar className="w-2/3" /> <PendingBar className="w-1/2 sm:hidden" />
          </p>
        }
      />

      <HomeSectionNav title={t`Firmele din România`} sections={sections} />

      {/* The four figures' cells, as the figures band draws them. */}
      <section className="border-b bg-muted/20" aria-hidden="true">
        <RuledFrame>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col px-5 py-6 sm:py-7',
                  index % 2 === 1 && 'border-l',
                  index >= 2 && 'border-t lg:border-t-0',
                  index >= 1 && 'lg:border-l',
                )}
              >
                <span className="text-2xl font-semibold sm:text-4xl">
                  <PendingBar className="w-28" />
                </span>
                <MonoLabel className="mt-2.5 block leading-relaxed">
                  <PendingBar className="block w-32" />
                  {/* „Firme în funcțiune" takes two lines on a phone. */}
                  {index === 0 ? <PendingBar className="block w-16 sm:hidden" /> : null}
                </MonoLabel>
                <MonoLabel className="block pt-3 leading-relaxed">
                  <PendingBar className="block w-24" />
                  {/* Every note but the new companies' („Înregistrate la ONRC în …") takes a second line; the first a third on a phone. */}
                  {index === 1 ? null : <PendingBar className="block w-20" />}
                  {index === 0 ? <PendingBar className="block w-12 sm:hidden" /> : null}
                </MonoLabel>
              </div>
            ))}
          </div>
        </RuledFrame>
      </section>

      <section className="border-b" aria-labelledby="company-hub-pending-sectors">
        <RuledFrame className="py-14 sm:py-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <HubSectionHead
                titleId="company-hub-pending-sectors"
                index={`${bandNumber(sections, 'domenii')} / ${sections[0]?.label ?? ''}`}
                title={
                  <Trans>
                    Din ce trăiește
                    <br />
                    economia
                  </Trans>
                }
                // The lede's three lines (the largest companies' share), held so the band does not grow under a reader.
                lede={
                  <span aria-hidden="true">
                    <PendingBar className="block w-full" />
                    <PendingBar className="block w-full" />
                    <PendingBar className="block w-2/3" />
                  </span>
                }
              />
              {/* The size table's caption, head and five classes, at its rows' height. */}
              <div className="mt-8" aria-hidden="true">
                <MonoLabel className="block">
                  <PendingBar className="w-2/3" />
                </MonoLabel>
                <div className="mt-3 space-y-px">
                  {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="h-10 w-full animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none" />
                  ))}
                </div>
              </div>
            </div>
            <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} aria-hidden="true">
              {/* The measure's switch, then the sectors' rows. */}
              <div className="h-9 w-full animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none sm:w-72" />
              <div className="mt-5 space-y-2">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="h-9 w-full animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none" />
                ))}
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}
