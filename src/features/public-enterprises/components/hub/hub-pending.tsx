import { t } from '@lingui/core/macro'
import { Building2, Search } from 'lucide-react'

import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeSectionNav } from '@/features/procurement/components/home/home-section-nav'
import { cn } from '@/lib/utils'
import { HUB_HEAD_ROWS, hubSections } from '../../lib/hub-sections'
import { HubHero } from './hub-hero'

/**
 * `/public-enterprises` while its code loads on a client navigation: the
 * page's own head (headline, search box, shortcuts), the pinned bar and the
 * figures' cells, drawn at once from the same components, with a pulse where
 * each figure goes. Nothing here imports the snapshot or the search, so the
 * route's eager file stays light, and nothing moves when the page lands.
 */
export function PublicEnterpriseHubPending() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" aria-busy="true">
      <HubHero
        lede={
          <>
            <Pulse className="w-full" /> <Pulse className="w-2/3" />
          </>
        }
        search={<SearchShell />}
        caveats={null}
        rankingTitleId="public-enterprises-pending-ranking-title"
        ranking={
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <MonoLabel id="public-enterprises-pending-ranking-title" className="text-primary">
                {t`Cine controlează cele mai multe`}
              </MonoLabel>
              {/* The toggle's place, its words fixed text: inert until the page lands. */}
              <div inert aria-hidden="true">
                <IndicatorToggle
                  label={t`Autoritățile`}
                  options={[
                    { key: 'stat', label: t`Statul` },
                    { key: 'judete', label: t`Județele` },
                    { key: 'local', label: t`Locale` },
                  ]}
                  value="stat"
                  onChange={() => undefined}
                />
              </div>
            </div>
            <ol className="mt-4 divide-y divide-border/70 border-y border-border/70" aria-hidden="true">
              {Array.from({ length: HUB_HEAD_ROWS }, (_, index) => (
                <li key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-2">
                  <span className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
                    <MonoLabel className="pt-0.5 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
                    <span className="min-w-0">
                      <Pulse className="block w-3/4 text-sm" />
                      <span className="mt-1 block h-1 bg-muted" />
                      <MonoLabel className="mt-1 block">
                        <Pulse className="w-1/3" />
                      </MonoLabel>
                    </span>
                  </span>
                  <Pulse className="w-8 text-sm" />
                </li>
              ))}
            </ol>
            {/* „Arată mai multe" and the note under the rows, their places held. */}
            <span className="mt-3 inline-flex min-h-11 items-center text-sm" aria-hidden="true">
              <Pulse className="w-28" />
            </span>
            <p className="mt-3 text-xs" aria-hidden="true">
              <Pulse className="block w-full" />
              <Pulse className="block w-2/3" />
            </p>
          </>
        }
        source={
          <p className="text-sm text-muted-foreground" aria-hidden="true">
            {t`Surse:`} <Pulse className="w-2/3" />
          </p>
        }
      />
      <HomeSectionNav title={t`Întreprinderi publice`} sections={hubSections()} />
      {/* The four figures' cells, as the figures band draws them. */}
      <section className="border-b bg-muted/20" aria-hidden="true">
        <RuledFrame>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={cn('flex flex-col px-5 py-6 sm:py-7', index % 2 === 1 && 'border-l', index >= 2 && 'border-t lg:border-t-0', index >= 1 && 'lg:border-l')}>
                <span className="text-2xl font-semibold sm:text-4xl">
                  <Pulse className="w-28" />
                </span>
                <MonoLabel className="mt-2.5 block leading-relaxed">
                  <Pulse className="block w-32" />
                </MonoLabel>
                <MonoLabel className="block pt-3 leading-relaxed">
                  <Pulse className="block w-24" />
                </MonoLabel>
              </div>
            ))}
          </div>
        </RuledFrame>
      </section>
    </div>
  )
}

/** A line's place: a pulse the height of the text around it (a no-break space sets it). */
function Pulse({ className }: { readonly className?: string }) {
  return <span className={cn('inline-block animate-pulse rounded-sm bg-muted align-top motion-reduce:animate-none', className)}>{' '}</span>
}

/** The search field as it first draws, without the search's code: its scope pill, its placeholder, its shortcut hint. */
function SearchShell() {
  return (
    <div className="relative w-full" aria-hidden="true">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card py-2 pl-10 pr-20">
        <Search className="pointer-events-none absolute left-3.5 top-6 size-4 -translate-y-1/2 text-muted-foreground" />
        <span className="inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-sm bg-muted px-2 text-xs font-medium text-foreground">
          <Building2 className="size-3.5 text-muted-foreground" />
          <span className="truncate">{t`Întreprinderi`}</span>
        </span>
        <span className="h-7 min-w-24 flex-1 truncate text-base leading-7 text-muted-foreground">{t`Întreprindere publică sau CUI…`}</span>
        <kbd className="absolute right-3 top-6 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:flex">
          <span className="text-xs leading-none">⌘</span>K
        </kbd>
      </div>
    </div>
  )
}
