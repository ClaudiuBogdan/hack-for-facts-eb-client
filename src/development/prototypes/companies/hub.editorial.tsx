import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { PROTOTYPE_MARKER, STATUS_ACTIVE, useCountyCounts, useHubStats } from './hub.data'
import { CountyMap } from './hub.map'
import {
  CaenBars,
  CountyGapNote,
  CountyList,
  HubSearch,
  InvestigationLinks,
  CaenCaveat,
  LoadError,
  Pending,
  SectionHead,
  SnapshotBand,
  SourcesStrip,
  StatusStrip,
  hubFacts,
} from './hub.parts'

/**
 * Editorial — the landing's own rhythm, one band per idea.
 *
 * Search first, in a hero that says what the dataset is. Then the four
 * figures. Then one section per module, each with a numbered caption and a
 * sentence that qualifies its numbers: sectors, counties, investigations,
 * sources. Reads top to bottom; nothing competes for the fold.
 */
export function HubEditorial() {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef)
  const hub = useHubStats()
  const counties = useCountyCounts()
  const stats = hub.data ?? undefined

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />

      <section className="relative border-b">
        <TwoLayerLattice idPrefix="companies-editorial" />
        <RuledFrame marker="hero" className="py-12 sm:py-16 lg:py-20">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7">
              <MonoLabel className="text-muted-foreground">
                <Trans>Firme / România</Trans>
              </MonoLabel>
              <h1 className="mt-5 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl">
                <Trans>
                  Fiecare firmă,
                  <br />
                  cu tot ce se știe despre ea
                </Trans>
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted-foreground">
                <Trans>
                  Registrul comerțului, datele fiscale ANAF și situațiile financiare anuale, la un loc.
                  Caută o firmă după nume sau CUI, sau pornește de la un domeniu ori un județ.
                </Trans>
              </p>
              <div className="mt-6">
                <HubSearch autoFocus />
              </div>
              <nav aria-label={t`Scurtături`} className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  <Trans>Sau mergi direct la</Trans>
                </MonoLabel>
                <span className="flex flex-wrap gap-x-4 sm:ml-4 sm:inline-flex sm:align-middle">
                  <Link
                    to="/companies/search"
                    search={{ status: [STATUS_ACTIVE] }}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline sm:min-h-0"
                  >
                    <Trans>Toate firmele în funcțiune</Trans>
                  </Link>
                  <Link
                    to="/procurement"
                    className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline-offset-4 hover:text-primary hover:underline sm:min-h-0"
                  >
                    <Trans>Achiziții publice</Trans>
                  </Link>
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <div className="border bg-card/80 p-5 backdrop-blur-[2px]">
                <MonoLabel className="block text-primary">
                  <Trans>Starea registrului</Trans>
                </MonoLabel>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <Trans>Toate firmele cu CUI din registrul ONRC, pe stări. Radiatele rămân în set.</Trans>
                </p>
                <div className="mt-5">
                  {hub.isPending ? (
                    <Pending rows={3} />
                  ) : stats ? (
                    <StatusStrip stats={stats} />
                  ) : (
                    <LoadError onRetry={() => void hub.refetch()} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
        <RuledFrame>
          <CruxMarks />
          {stats ? (
            <SnapshotBand facts={hubFacts(stats)} />
          ) : (
            <div className="px-5 py-7">
              {hub.isPending ? <Pending rows={2} /> : <LoadError onRetry={() => void hub.refetch()} />}
            </div>
          )}
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHead
                index={t`01 / Domenii de activitate`}
                title={
                  <Trans>
                    Ce fac
                    <br />
                    firmele în funcțiune
                  </Trans>
                }
                lede={
                  <Trans>
                    Diviziuni CAEN după activitățile înregistrate la ONRC. O firmă cu mai multe
                    activități apare în mai multe bare, așa că barele nu se adună.
                  </Trans>
                }
              />
              <div className="mt-5" data-reveal>
                <CaenCaveat />
              </div>
            </div>
            <div className="lg:col-span-7" data-reveal>
              {hub.isPending ? (
                <Pending rows={8} />
              ) : stats ? (
                <CaenBars divisions={stats.caenDivisions} limit={10} />
              ) : (
                <LoadError onRetry={() => void hub.refetch()} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-14 sm:py-16">
          <SectionHead
            index={t`02 / Pe județe`}
            title={<Trans>Unde sunt firmele în funcțiune</Trans>}
            lede={
              <Trans>
                Județul din registrul ONRC. Apasă un județ pentru lista firmelor de acolo.
              </Trans>
            }
          />
          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7" data-reveal>
              {counties.data ? (
                <CountyMap counties={counties.data.counties} />
              ) : counties.isError ? (
                <LoadError onRetry={() => void counties.refetch()} />
              ) : (
                <div className="aspect-[640/440] w-full animate-pulse rounded-sm bg-muted/60" />
              )}
            </div>
            <div className="lg:col-span-5" data-reveal>
              {counties.data ? (
                <>
                  <CountyList counties={counties.data.counties} limit={10} />
                  <CountyGapNote unplaced={counties.data.unplaced} className="mt-4" />
                </>
              ) : counties.isError ? null : (
                <Pending rows={10} />
              )}
            </div>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-14 sm:py-16">
          <SectionHead
            index={t`03 / Pornește o investigație`}
            title={<Trans>Întrebări cu care se începe</Trans>}
          />
          <InvestigationLinks className="mt-8 border" />
        </RuledFrame>
      </section>

      <section>
        <RuledFrame className="py-12 sm:py-14">
          <SourcesStrip stats={stats} />
        </RuledFrame>
      </section>
    </div>
  )
}
