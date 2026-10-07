import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { HUB_RANKING_ID } from '../../lib/hub-sections'

/**
 * The hub's head, in the procurement, INS and NGO hubs' shape: the lattice,
 * what the page is as the headline, a computed lede, the search scoped to
 * public enterprises and the shortcuts, the ranked panel at the right and
 * the sources at the foot. Its figures and its search come in as slots, so
 * the page's pending state draws the same head before the page's code and
 * snapshot have loaded.
 */
export function HubHero({
  lede,
  search,
  caveats,
  ranking,
  rankingTitleId,
  source,
}: {
  readonly lede: ReactNode
  readonly search: ReactNode
  readonly caveats: ReactNode
  readonly ranking: ReactNode
  readonly rankingTitleId: string
  readonly source: ReactNode
}) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="public-enterprises-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex min-h-11 items-center justify-between gap-4 sm:min-h-0">
              <MonoLabel className="text-muted-foreground">{t`Întreprinderi publice / România`}</MonoLabel>
              {caveats}
            </div>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              <Trans>
                Firmele statului{' '}
                <br />
                și ale primăriilor
              </Trans>
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{lede}</p>
            <div className="mt-6 sm:mt-7">{search}</div>
            <nav aria-label={t`Scurtături`} className="mt-4">
              <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">{t`Sau mergi direct la`}</MonoLabel>
              <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                <a href="#control" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Autoritățile`}
                </a>
                <a href="#judete" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Județele`}
                </a>
                <Link to="/companies" preload="intent" className={HUB_SHORTCUT_LINK_CLASS}>
                  {t`Toate firmele`}
                </Link>
              </span>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <section id={HUB_RANKING_ID} className="scroll-mt-16 border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby={rankingTitleId}>
              {ranking}
            </section>
          </div>
          <div className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6">{source}</div>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

