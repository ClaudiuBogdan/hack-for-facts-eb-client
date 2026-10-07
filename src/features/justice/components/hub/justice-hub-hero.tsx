import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { SHOW_MORE_CLASS } from '@/features/procurement/components/home/home-chrome'
import { HUB_SHORTCUT_LINK_CLASS } from '@/features/statistics/components/hub/hub-chrome'
import { courtShareRows } from '../../lib/hub-rows'
import { dayText } from '../../lib/judicial-format'
import { courtLevelPlural } from '../../lib/judicial-labels'
import { MAIN_LEVELS, type MainLevel } from '../../lib/hub-model'
import type { JusticeHubSnapshot } from '../../lib/hub-snapshot-types'
import { JusticeSourceLine } from '../justice-source-line'
import { ShareRows } from '../justice-rows'
import { JusticeCourtSearch } from './justice-court-search'

/**
 * The front door's head, in the hubs' language: the lattice, the question as
 * the headline, a computed lede, the court search and the shortcuts, a panel
 * beside them, and the one source line at the hero's foot.
 */
export function JusticeHubHero({
  snapshot,
  headline,
  lede,
  panel,
}: {
  readonly snapshot: JusticeHubSnapshot
  readonly headline: ReactNode
  readonly lede: ReactNode
  readonly panel: ReactNode
}) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="justice-hub" />
      <RuledFrame marker="hero" className="py-12 sm:py-16 lg:pb-24 lg:pt-20">
        <CornerTicks />
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <MonoLabel className="text-muted-foreground">
              <Trans>Justiție / Portalul instanțelor</Trans>
            </MonoLabel>
            <h1 className="mt-5 text-[clamp(2.2rem,8vw+0.6rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
              {headline}
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">{lede}</p>
            <JusticeCourtSearch courts={snapshot.courts} year={snapshot.year} className="mt-6 sm:mt-7" />
            <nav aria-label={t`Scurtături`} className="mt-4">
              <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                <Trans>Sau mergi direct la</Trans>
              </MonoLabel>
              <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:gap-y-1.5 sm:align-middle">
                <Link to="/justice/analytics" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Analize</Trans>
                </Link>
                <a href="#instante" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Toate instanțele</Trans>
                </a>
                <a href="#materii" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Ce se judecă</Trans>
                </a>
                <a href="#decizii" className={HUB_SHORTCUT_LINK_CLASS}>
                  <Trans>Hotărârile CEDO</Trans>
                </a>
              </span>
            </nav>
          </div>
          <div className="min-w-0 lg:col-span-5">{panel}</div>
          <HubSourceLine snapshot={snapshot} className="min-w-0 lg:absolute lg:inset-x-8 lg:bottom-6" />
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The hub's source line, with what a reader must know about its figures behind one marker. */
function HubSourceLine({ snapshot, className }: { readonly snapshot: JusticeHubSnapshot; readonly className?: string }) {
  const firstWhole = snapshot.year - 2
  const notes: readonly ReactNode[] = [
    <Trans key="date">
      Anul unui dosar e data din antetul lui pe portal (pentru Înalta Curte, data din arhiva ei), nu o dată de înregistrare verificată.
    </Trans>,
    <Trans key="capture">
      Portalul a fost preluat după data ultimei modificări a dosarelor. Înainte de {firstWhole} sunt doar dosarele încă active după aceea, nu tot ce au
      judecat instanțele.
    </Trans>,
    <Trans key="frozen">
      Preluarea s-a oprit: ultima modificare de pe portal e din {dayText(snapshot.asOf.portalModifiedAt)}, ultima dată din arhiva Înaltei Curți din{' '}
      {dayText(snapshot.asOf.iccjArchiveDate)}.
    </Trans>,
    <Trans key="privacy">Numele părților și soluțiile din ședințe nu sunt publicate. Persoanele sunt doar numărate.</Trans>,
  ]
  return <JusticeSourceLine asOf={snapshot.asOf.portalModifiedAt} source="both" notes={notes} className={className} />
}

/** How many courts the hero panel names, and how many its button opens. */
const PANEL_COURTS = 5
const PANEL_COURTS_OPEN = 10

/** `registru`'s panel: the busiest courts of the year, by level. */
export function JusticeTopCourtsPanel({
  snapshot,
  level,
  onLevel,
}: {
  readonly snapshot: JusticeHubSnapshot
  readonly level: MainLevel
  readonly onLevel: (level: MainLevel) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="border bg-card/80 p-5 backdrop-blur-[2px] sm:p-6" aria-labelledby="justice-hub-courts-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <MonoLabel id="justice-hub-courts-title" className="text-primary">
          <Trans>Cele mai încărcate instanțe, {snapshot.year}</Trans>
        </MonoLabel>
        <IndicatorToggle
          label={t`Nivelul instanțelor`}
          options={MAIN_LEVELS.map((key) => ({ key, label: courtLevelPlural(key) }))}
          value={level}
          onChange={onLevel}
        />
      </div>
      <ShareRows key={level} className="mt-4" rows={courtShareRows(snapshot, level, open ? PANEL_COURTS_OPEN : PANEL_COURTS)} />
      <button type="button" onClick={() => setOpen(!open)} className={SHOW_MORE_CLASS} aria-expanded={open}>
        {open ? <Trans>Arată mai puține</Trans> : <Trans>Arată mai multe</Trans>}
      </button>
      <p className="mt-3 text-xs text-muted-foreground">
        <Trans>După numărul de dosare cu data din {snapshot.year}.</Trans>
      </p>
    </section>
  )
}
