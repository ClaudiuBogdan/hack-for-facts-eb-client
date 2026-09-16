import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
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
  SourcesStrip,
  StatusStrip,
  hubFacts,
} from './hub.parts'

/**
 * Compact — one screen, tiled.
 *
 * A short header with the search, the four figures as a strip under it, then
 * a grid of tiles separated by hairlines: sectors, counties with a small map,
 * status, investigations. Least scrolling of the three; the map is an aid to
 * the list rather than a centrepiece. For a reader who comes back often.
 */
export function HubCompact() {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef)
  const hub = useHubStats()
  const counties = useCountyCounts()
  const stats = hub.data ?? undefined
  const facts = stats ? hubFacts(stats) : []

  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <RevealStyles />

      <section className="border-b">
        <RuledFrame className="py-8 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div className="min-w-0">
              <MonoLabel className="text-muted-foreground">
                <Trans>Firme / România</Trans>
              </MonoLabel>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tighter text-foreground sm:text-4xl">
                <Trans>Firme</Trans>
              </h1>
            </div>
            <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
              <Trans>
                Registrul ONRC, datele fiscale ANAF și situațiile financiare anuale, pentru fiecare
                firmă cu CUI. Caută după nume sau CUI.
              </Trans>
            </p>
          </div>
          <div className="mt-6 max-w-3xl">
            <HubSearch autoFocus />
          </div>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t pt-5">
            {facts.length === 0
              ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-9 w-40 animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
                ))
              : facts.map((fact) => {
                  const body = (
                    <>
                      <dd className="order-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                        {fact.value}
                      </dd>
                      <dt className="order-2">
                        <MonoLabel className="text-muted-foreground">{fact.label}</MonoLabel>
                      </dt>
                    </>
                  )
                  return fact.search ? (
                    <Link
                      key={fact.key}
                      to="/companies/search"
                      search={fact.search}
                      className="flex flex-col gap-1 underline-offset-4 hover:[&>dd]:underline"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div key={fact.key} className="flex flex-col gap-1">
                      {body}
                    </div>
                  )
                })}
          </dl>
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-0">
          <div className="grid grid-cols-1 gap-px bg-border/70 lg:grid-cols-12">
            <Tile className="lg:col-span-7">
              <TileHead title={<Trans>Domenii de activitate (CAEN)</Trans>}>
                <CaenCaveat />
              </TileHead>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <Trans>Firme în funcțiune, după activitățile înregistrate. O firmă poate fi în mai multe bare.</Trans>
              </p>
              <div className="mt-4">
                {hub.isPending ? (
                  <Pending rows={12} />
                ) : stats ? (
                  <CaenBars divisions={stats.caenDivisions} limit={12} />
                ) : (
                  <LoadError onRetry={() => void hub.refetch()} />
                )}
              </div>
            </Tile>
            <Tile className="lg:col-span-5">
              <TileHead title={<Trans>Pe județe</Trans>}>
                <Link
                  to="/companies/search"
                  search={{ status: [STATUS_ACTIVE] }}
                  className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
                >
                  <Trans>Toate firmele</Trans>
                </Link>
              </TileHead>
              <div className="mt-4">
                {counties.data ? (
                  <>
                    <CountyMap counties={counties.data.counties} labels={false} />
                    <CountyList counties={counties.data.counties} limit={6} className="mt-5" />
                    <CountyGapNote unplaced={counties.data.unplaced} className="mt-4" />
                  </>
                ) : counties.isError ? (
                  <LoadError onRetry={() => void counties.refetch()} />
                ) : (
                  <Pending rows={8} />
                )}
              </div>
            </Tile>
            <Tile className="lg:col-span-12">
              <TileHead title={<Trans>Starea registrului</Trans>} />
              <div className="mt-4">
                {hub.isPending ? (
                  <Pending rows={2} />
                ) : stats ? (
                  <StatusStrip stats={stats} />
                ) : (
                  <LoadError onRetry={() => void hub.refetch()} />
                )}
              </div>
            </Tile>
          </div>
        </RuledFrame>
      </section>

      <section className="border-b">
        <RuledFrame className="py-8 sm:py-10">
          <MonoLabel className="block text-primary">
            <Trans>Pornește o investigație</Trans>
          </MonoLabel>
          <InvestigationLinks className="mt-4 border" dense />
        </RuledFrame>
      </section>

      <section>
        <RuledFrame className="py-10">
          <SourcesStrip stats={stats} />
        </RuledFrame>
      </section>
    </div>
  )
}

function Tile({ className, children }: { readonly className?: string; readonly children: ReactNode }) {
  return (
    <div className={cn('bg-background px-5 py-6 sm:px-6', className)} data-reveal>
      {children}
    </div>
  )
}

function TileHead({ title, children }: { readonly title: ReactNode; readonly children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </div>
  )
}
