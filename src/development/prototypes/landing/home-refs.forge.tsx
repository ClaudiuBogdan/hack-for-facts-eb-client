import { FeaturedBand, LandingSearch } from './home.shared'
import {
  DomainLattice,
  FactStrip,
  GridLattice,
  MonoLabel,
  PROTOTYPE_MARKER,
  SplitSectionHeader,
  usePlatformFacts,
} from './home-refs.parts'

/**
 * Forge — the research brief taken literally: near-black canvas, one orange
 * accent, visible lattice, monospace metadata, display type.
 *
 * This exists so the trade-off is visible rather than argued. Two things to
 * judge in the screenshot, both of which the brief could not have anticipated:
 *
 * 1. The shell does not change with the page. The sidebar, the footer and the
 *    consent banner stay light, so the dark canvas is a window in a white
 *    frame. Prototyping only the body is honest about that — it is what
 *    promoting this would actually look like.
 * 2. `DESIGN.md` quarantines PNRR's brutalist skin and Parliament's GOV.UK
 *    palette to their own surfaces, with the neutral-navy system as the default
 *    everywhere else. A dark orange landing is a third page-level skin, at the
 *    front door, which is the strongest position in the app.
 *
 * The accent is set once as an inline custom property. `src/index.css` is not
 * touched: a prototype may not add a token to the shipped stylesheet.
 */

/** Forge's accent, sampled from the reference. */
const ACCENT = '#f0440a'

export function LandingRefsForge() {
  const { groups, facts } = usePlatformFacts()

  return (
    <div
      className="w-full bg-neutral-950 text-neutral-100"
      style={{ ['--refs-accent' as string]: ACCENT }}
      data-dev-marker={PROTOTYPE_MARKER}
    >
      <section className="relative overflow-hidden border-b border-white/10">
        <GridLattice id="refs-forge-hero" cell={120} className="text-white/[0.055]" />
        <div className="relative mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
          {/* Content in the left eight columns, the lattice showing through the
              right four. `min-w-0` because the search input's intrinsic width
              exceeds a narrow track and grid items default to `min-width: auto`. */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="min-w-0 md:col-span-8">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-1.5 rounded-full"
                  style={{ backgroundColor: ACCENT }}
                />
                <MonoLabel className="text-neutral-400">
                  Transparenta.eu — banii publici ai României
                </MonoLabel>
              </span>
              <h1 className="mt-5 text-5xl font-extrabold leading-[0.95] tracking-tighter text-neutral-50 sm:text-6xl lg:text-7xl">
                Urmărește fiecare
                <br />
                leu public.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-400">
                Bugete, contracte, investiții, legi și dosare — din surse
                oficiale, cu proveniența fiecărei cifre.
              </p>
              <a
                href="#domenii"
                className="mt-8 inline-flex items-center rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Vezi domeniile
              </a>
              {/* The search input is a shared component and keeps its own light
                  styling — one of the concrete costs of a dark landing. */}
              <LandingSearch className="mt-8" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <FactStrip facts={facts} tone="dark" />
        </div>
      </section>

      <section id="domenii" className="border-b border-white/10">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <SplitSectionHeader
            index="01 / Ce găsești aici"
            title="Fiecare sursă, într-un singur loc"
            description="Platforma acoperă banii publici de la bugetul de stat până la dosarul din instanță. Fiecare suprafață spune ce întrebare răspunde."
            labelClassName="text-neutral-500"
            descriptionClassName="text-neutral-400"
          />
          <div className="mt-10">
            <DomainLattice groups={groups} tone="dark" />
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
