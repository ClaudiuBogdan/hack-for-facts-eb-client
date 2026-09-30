import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { isNgoRegistryEnabled } from '@/config/env'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { NgoHubHero, NgoLeaderRowsPending, NgoLeadersFrame, NgoSearchShell, PendingBar } from './ngo-hub-hero'
import { NGO_HUB_LEADERS_SHOWN, WRAPS_WHERE_NARROW, ngoHubSections } from './ngo-hub-sections'

/**
 * `/ngos` while its code loads on a client navigation: the page's own
 * head — title, lede, search box, shortcuts, the pinned bar and the first
 * band's title — drawn at once from the same components, and a pulse the
 * size of each figure where the figures go. The summaries stay in the page's
 * chunk; nothing here waits for them, and nothing moves when they land.
 */
export function NgoHubPending() {
  const registry = isNgoRegistryEnabled()
  const sections = ngoHubSections()
  return (
    <div className="relative w-full overflow-x-clip bg-background" aria-busy="true">
      <NgoHubHero
        registry={registry}
        search={<NgoSearchShell />}
        leaders={
          <NgoLeadersFrame
            title={
              <>
                <Trans>Cele mai mari ONG-uri din registru</Trans>, <PendingBar className="w-8" />
              </>
            }
          >
            <NgoLeaderRowsPending rows={NGO_HUB_LEADERS_SHOWN} className="mt-4" />
            <span className="mt-3 inline-flex min-h-9 items-center text-sm" aria-hidden="true">
              <PendingBar className="w-28" />
            </span>
            <p className="mt-2 text-xs" aria-hidden="true">
              <PendingBar className="block w-full" />
              <PendingBar className="block w-2/3" />
              <PendingBar className={cn('block w-1/3', WRAPS_WHERE_NARROW)} />
            </p>
          </NgoLeadersFrame>
        }
        source={
          <p className="text-sm text-muted-foreground" aria-hidden="true">
            {/* One line; two on a phone. */}
            <Trans>Surse:</Trans> <PendingBar className="w-2/3" /> <PendingBar className="w-1/2 sm:hidden" />
          </p>
        }
      />

      <HomeSectionNav title={t`ONG-urile din România`} sections={sections} crux />

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
                  <PendingBar className={cn('block w-16', WRAPS_WHERE_NARROW)} />
                </MonoLabel>
                <MonoLabel className="block pt-3 leading-relaxed">
                  <PendingBar className="block w-24" />
                  {/* The first row's notes (a publication date) wrap on a phone too; the second row's are short. */}
                  <PendingBar className={cn('block w-12', index < 2 ? WRAPS_WHERE_NARROW : 'max-lg:hidden xl:hidden')} />
                </MonoLabel>
              </div>
            ))}
          </div>
        </RuledFrame>
      </section>

      <section className="border-b" aria-labelledby="ngo-hub-pending-counties">
        <RuledFrame className="py-14 sm:py-20">
          <HubSectionHead
            titleId="ngo-hub-pending-counties"
            index={`01 / ${sections[0]?.label ?? ''}`}
            title={<Trans>Câte ONG-uri are județul tău</Trans>}
            aside={
              // The map's switch, its place held: the labels are the page's, the year is the summary's.
              <div className="grid auto-cols-fr grid-flow-col gap-px border bg-border/70 sm:flex" aria-hidden="true">
                <span className="min-h-9 bg-background px-2 py-1.5 text-sm font-semibold leading-tight sm:px-3">{t`La 10.000 de locuitori`}</span>
                <span className="min-h-9 bg-background px-2 py-1.5 text-sm leading-tight text-muted-foreground sm:px-3">{t`Înregistrate`}</span>
                <span className="min-h-9 bg-background px-2 py-1.5 text-sm leading-tight text-muted-foreground sm:px-3">
                  <PendingBar className="w-20" />
                </span>
              </div>
            }
          />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8" aria-hidden="true">
            <div className="aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none lg:col-span-7" />
            <div className="space-y-2 lg:col-span-5 lg:col-start-8">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-9 w-full animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none" />
              ))}
            </div>
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}
