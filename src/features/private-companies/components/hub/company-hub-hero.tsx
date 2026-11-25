import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Building2, Search } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { urlSearchOfText } from '../../lib/company-analytics-search'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import { LEADER_META_CLASS, LEADER_ROW_CLASS } from './company-hub-sections'

/** A shortcut under the search, as the landing sets its own: medium weight, the accent on hover, no underline. */
const SHORTCUT_LINK_CLASS = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0'

/** The companies in business in the analysis, on its own year: the loading state's, drawn before the snapshot is read. */
const IN_BUSINESS = urlSearchOfText({ stare: STATUS_ACTIVE })

/**
 * The hub's head without its data. The title, the lede, the search's place,
 * the shortcuts and the leaders' card are the page's own words, so the page
 * and its loading state (`company-hub-pending.tsx`) both draw them from here:
 * a client navigation shows the head at once, and the page arrives into the
 * same places. Nothing here imports the snapshot or the search.
 */

export function CompanyHubHero({
  search,
  inBusiness,
  leaders,
}: {
  readonly search: ReactNode
  /** The companies in business in the analysis, on the hub's year; the loading state, before the snapshot, has none and opens the analysis's own. */
  readonly inBusiness?: Record<string, unknown>
  readonly leaders: ReactNode
}) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="companies-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Centred against the leaders' card from a wide screen, where the card is the taller of the two: the
              head no longer ends in an empty block under the shortcuts (owner, 25 November 2026). */}
          <div className="min-w-0 lg:col-span-7 lg:self-center">
            {/* The title names the dataset: every company in the trade register, the state's own included, so
                not „private". Nothing stands over it: a caption there said the same words. Two lines at every
                width, the break written so no width decides it. Set as the landing's headline is: the tight
                tracking closes the gaps between words too, so they are given back (`word-spacing`). */}
            <h1 className="text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em] sm:text-6xl lg:text-7xl">
              <Trans>
                Firmele din
                <br />
                România
              </Trans>
            </h1>
            {/* What is in it, then where it comes from. The site's tracking is set for 14px text: at 20px
                under a tight headline it reads loose. */}
            <p className="mt-5 max-w-[46ch] text-balance text-lg leading-relaxed tracking-normal text-muted-foreground sm:text-xl">
              <Trans>Cifră de afaceri, profit și salariați, din registrul comerțului și bilanțurile anuale.</Trans>
            </p>
            <div className="mt-6 sm:mt-7">{search}</div>
            {/* The landing's shortcut row: the label is a sentence that runs into the links, so it is set in
                their voice (plain text, not a mono caption) and shares their baseline; on a phone it has its
                own line and each shortcut is a 44px row. The links carry a context of their own: their English
                is shorter than the same words elsewhere, so the row holds one line on a desktop. */}
            <nav aria-label={t`Scurtături`} className="mt-4 flex flex-wrap items-baseline gap-x-4 sm:gap-x-5 sm:gap-y-1.5">
              <span className="basis-full text-sm text-muted-foreground sm:basis-auto">
                <Trans>Sau mergi direct la</Trans>
              </span>
              <Link to="/companies/analytics" search={inBusiness ?? IN_BUSINESS} preload="intent" className={SHORTCUT_LINK_CLASS}>
                <Trans context="companies hub shortcut">Toate firmele în funcțiune</Trans>
              </Link>
              <Link to="/companies/analytics" preload="intent" className={SHORTCUT_LINK_CLASS}>
                <Trans context="companies hub shortcut">Analiza bilanțurilor</Trans>
              </Link>
              <Link to="/procurement" preload="intent" className={SHORTCUT_LINK_CLASS}>
                <Trans context="companies hub shortcut">Achiziții publice</Trans>
              </Link>
            </nav>
          </div>
          {/* No sources line here: each figure under the head names its source, and the full line closes the page. */}
          <div className="min-w-0 lg:col-span-5">{leaders}</div>
        </div>
        {/* The crux on the head's bottom rule, where the pinned bar begins; above the bar, which would cover its lower half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The year's largest companies in their card: the title and the ranking's switch, the rows, then what follows them. */
export function CompanyLeadersFrame({ title, toggle, children }: { readonly title: ReactNode; readonly toggle: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="hub-leaders-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* The card's heading, in the page's own voice: words, not a code. */}
        <h2 id="hub-leaders-title" className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        {toggle}
      </div>
      {children}
    </section>
  )
}

/** The search field as it first renders, before its code: the same box, scope pill and words (`HubSearch`), not yet typeable. */
export function CompanySearchShell() {
  return (
    <div className="relative w-full" aria-hidden="true">
      {/* As the field: it wraps below ~340 px, the words under the pill, so a phone's shell is as tall as the field that replaces it. */}
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card py-2 pl-10 pr-20">
        <Search className="pointer-events-none absolute left-3.5 top-6 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* The search's scope pill (`ScopePill`), drawn here: its module would bring the search's code into this shell. */}
        <span className="inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-sm bg-muted px-2 text-xs font-medium text-foreground">
          <Building2 className="size-3.5 text-muted-foreground" />
          <span className="truncate">{t`Firme`}</span>
        </span>
        <span className="h-7 min-w-24 flex-1 truncate text-base leading-7 text-muted-foreground">{t`Nume sau CUI...`}</span>
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
 * leader's, from the same grid and the same type, with the bar's track, so
 * the card does not move when they land.
 */
export function CompanyLeaderRowsPending({ rows, className }: { readonly rows: number; readonly className?: string }) {
  return (
    <ol className={cn('divide-y divide-border/70 border-y border-border/70', className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={LEADER_ROW_CLASS}>
          <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</MonoLabel>
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              <PendingBar className="block w-3/4" />
            </span>
            {/* The figure's bar's track, its length not known yet. */}
            <span className="mt-1 block h-1 bg-muted" />
            <span className={cn('mt-1 block', LEADER_META_CLASS)}>
              <PendingBar className="w-1/2" />
            </span>
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold">
              <PendingBar className="w-20" />
            </span>
            <span className={cn('block', LEADER_META_CLASS)}>
              <PendingBar className="w-10" />
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
