import { FeaturedBand, LandingSearch } from './home.shared'
import {
  DomainLattice,
  FactStrip,
  GridLattice,
  MonoLabel,
  PROTOTYPE_MARKER,
  SplitSectionHeader,
  getPlatformFacts,
} from './home-refs.parts'

/**
 * Grid — the references' structure ported onto this app's own system.
 *
 * Everything structural from ui8.ai/forge, vercel.com/ai-sdk and opentrain.ai
 * is here: a continuous architectural lattice behind the hero, domains as
 * shared-border cells rather than floating cards, an asymmetric section header,
 * display-scale type with tight tracking, monospace numbering, and section
 * boundaries drawn as hairlines instead of padding.
 *
 * What is deliberately *not* here is the dark canvas and the orange accent.
 * Two of the three references are light — Vercel's AI SDK page and OpenTrain
 * are both white, and OpenTrain draws its lattice on light — so the dark skin
 * comes from Forge alone. `DESIGN.md` already quarantines PNRR's brutalist skin
 * and Parliament's GOV.UK palette to their own surfaces; a third page-level
 * skin at the front door would break that rule, and the sidebar next to it does
 * not change with the page. See the `forge` variant for what that looks like.
 */
export function LandingRefsGrid() {
  const { groups, facts } = getPlatformFacts()

  return (
    <div className="w-full bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      {/* Hero band — the lattice runs behind it and stops at the section rule. */}
      <section className="relative overflow-hidden border-b">
        <GridLattice id="refs-grid-hero" cell={120} className="text-border/40" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
          {/* Forge's asymmetric hero: content in the left seven columns, the
              lattice left showing through the right five. Grid children carry
              `min-w-0` — the search input's intrinsic width is wider than a
              five-column track, and a grid item defaults to `min-width: auto`,
              so without it the block overflows its column. */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="min-w-0 md:col-span-8">
              <MonoLabel className="text-muted-foreground">
                Transparenta.eu — banii publici ai României
              </MonoLabel>
              <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                Urmărește fiecare
                <br />
                leu public.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Bugete, contracte, investiții, legi și dosare — din surse
                oficiale, cu proveniența fiecărei cifre.
              </p>
              <LandingSearch className="mt-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Facts — real, derived at render, no fabricated telemetry. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <FactStrip facts={facts} tone="light" />
        </div>
      </section>

      {/* Domains as one continuous lattice. */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <SplitSectionHeader
            index="01 / Ce găsești aici"
            title="Fiecare sursă, într-un singur loc"
            description="Platforma acoperă banii publici de la bugetul de stat până la dosarul din instanță. Fiecare suprafață spune ce întrebare răspunde."
            labelClassName="text-muted-foreground"
            descriptionClassName="text-muted-foreground"
          />
          <div className="mt-10">
            <DomainLattice groups={groups} tone="light" />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <FeaturedBand />
        </div>
      </section>
    </div>
  )
}
