import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { HeartHandshake, Search } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { LEADER_ROW_CLASS } from './ngo-hub-sections'
import { REGISTRY_STATUS_VALUE, registrySearch } from './registry-figures'

/**
 * The hub's head without its data. The title, the lede, the search's place,
 * the shortcuts and the pinned bar's bands are the page's own words, so the
 * page and its loading state (`ngo-hub-pending.tsx`) both draw them from
 * here: a client navigation shows the head at once, and the page arrives
 * into the same places. Nothing here imports the summaries or the search.
 */

export function NgoHubHero({
  registry,
  search,
  leaders,
  source,
}: {
  /** Whether the NGO pages' API is on: the search (whose rows open NGO profiles) and the registry shortcuts exist only with it. */
  readonly registry: boolean
  readonly search: ReactNode
  readonly leaders: ReactNode
  /** The sources in a line, at the head's foot, as the procurement hub's head says its own; the full line closes the page. */
  readonly source: ReactNode
}) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="ngo-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <MonoLabel className="text-muted-foreground">
              <Trans>ONG-uri / România</Trans>
            </MonoLabel>
            <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              {/* The space keeps the heading's text „ONG-urile din România" for search engines and screen readers. */}
              <Trans>
                ONG-urile{' '}
                <br />
                din România
              </Trans>
            </h1>
            {/* A width in rem, not ch: `ch` is the font's own, so the fallback's narrower box broke the lede a line longer until Inter arrived. */}
            <p className="mt-5 max-w-[37.5rem] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              <Trans>Asociațiile și fundațiile din registrul Ministerului Justiției, și banii sectorului non-profit din situațiile financiare.</Trans>
            </p>
            {registry ? (
              <>
                <div className="mt-6 sm:mt-7">{search}</div>
                <nav aria-label={t`Scurtături`} className="mt-4">
                  <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                    <Trans>Sau mergi direct la</Trans>
                  </MonoLabel>
                  <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                    <Link to="/ngos/registry" search={registrySearch()} className={HUB_SHORTCUT_LINK_CLASS}>
                      <Trans>Tot registrul</Trans>
                    </Link>
                    <Link
                      to="/ngos/registry"
                      search={registrySearch({ publicUtility: 'yes', status: REGISTRY_STATUS_VALUE.registered })}
                      className={HUB_SHORTCUT_LINK_CLASS}
                    >
                      <Trans>De utilitate publică</Trans>
                    </Link>
                  </span>
                </nav>
              </>
            ) : null}
          </div>
          <div className="min-w-0 lg:col-span-5">{leaders}</div>
          {/* The sources close the head, apart from what it says: under the leaders on a phone; from a wide screen, at the head's foot, just above its bottom rule, however tall the leaders' card is — as on /procurement. */}
          <div className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6">{source}</div>
        </div>
        {/* The crux on the head's bottom rule, where the pinned bar begins; above the bar, which would cover its lower half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The year's largest NGOs in their card: the title, the rows, then what follows them. */
export function NgoLeadersFrame({ title, children }: { readonly title: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="ngo-hub-leaders-title">
      <MonoLabel id="ngo-hub-leaders-title" className="text-primary">
        {title}
      </MonoLabel>
      {children}
    </section>
  )
}

/** The search field as it first renders, before its code: the same box, scope pill and words (`NgoHubSearch`), not yet typeable. */
export function NgoSearchShell() {
  return (
    <div className="relative w-full" aria-hidden="true">
      {/* As the field: it wraps below ~340 px, the words under the pill, so a phone's shell is as tall as the field that replaces it. */}
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card py-2 pl-10 pr-20">
        <Search className="pointer-events-none absolute left-3.5 top-6 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* The search's scope pill (`ScopePill`), drawn here: its module would bring the search's code into this shell. */}
        <span className="inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-sm bg-muted px-2 text-xs font-medium text-foreground">
          <HeartHandshake className="size-3.5 text-muted-foreground" />
          <span className="truncate">{t`ONG-uri`}</span>
        </span>
        <span className="h-7 min-w-24 flex-1 truncate text-base leading-7 text-muted-foreground">{t`Numele organizației sau CUI…`}</span>
        {/* The field's shortcut hint, as its first render draws it (the modifier is corrected after hydration). */}
        <kbd className="absolute right-3 top-6 hidden -translate-y-1/2 items-center gap-0.5 rounded-sm border bg-muted px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground sm:flex">
          <span className="text-xs leading-none">⌘</span>K
        </kbd>
      </div>
    </div>
  )
}

/** A line's place: a pulse the height of the text around it (a no-break space sets it). `block` for a line of its own. */
export function PendingBar({ className }: { readonly className?: string }) {
  return <span className={cn('inline-block animate-pulse rounded-sm bg-muted align-top motion-reduce:animate-none', className)}>{'\u00a0'}</span>
}

/**
 * The leaders' rows before the figures arrive: each the height of a
 * leader's, from the same grid and the same type — two name lines on a
 * phone, as the leaders keep, and the revenue bar's track — so the card does
 * not move when they land.
 */
export function NgoLeaderRowsPending({ rows, className }: { readonly rows: number; readonly className?: string }) {
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={LEADER_ROW_CLASS}>
          <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              <PendingBar className="block w-3/4" />
              <PendingBar className="block w-1/2 sm:hidden" />
            </span>
            {/* The revenue bar's track, its length not known yet. */}
            <span className="mt-1 block h-1 bg-muted" />
            <MonoLabel className="mt-1 block">
              <PendingBar className="w-1/3" />
            </MonoLabel>
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold">
              <PendingBar className="w-20" />
            </span>
            <MonoLabel className="block">
              <PendingBar className="w-10" />
            </MonoLabel>
          </span>
        </li>
      ))}
    </ol>
  )
}
