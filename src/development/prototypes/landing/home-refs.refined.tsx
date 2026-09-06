import type { CSSProperties, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import logo from '@/assets/logo/logo.png'
import { EntitySearchInput } from '@/components/entities/EntitySearch'
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
import { buildPreferredEntityPath } from '@/lib/entity-navigation'
import { CampaignLandingShareCard } from '@/features/campaigns/buget/components/CampaignAccessShareCard'
import { ParliamentPromoCard } from '@/features/parliament/components/parliament-promo-card'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { scraperDatasetCatalog } from '@/lib/scraper-references'
import { LANDING_GROUPS, visibleGroups } from './home.data'
import type { LandingEntry, LandingGroup } from './home.data'

/**
 * Refined — the same architecture as `grid`, polished.
 *
 * Nothing structural changes: same grouped index, same real fact strip, same
 * light system. What changes is craft, and it is worth reading as a list
 * because each item is a decision rather than a tweak:
 *
 * - **The hero headline area.** A tighter display scale (`clamp`, leading 0.92)
 *   with the lead paragraph held to about sixty characters, and the search
 *   given the left column rather than floating centred.
 * - **The search input.** Restyled *locally* — `EntitySearchInput` is shared
 *   with campaigns and the floating search, so it is reached with an arbitrary
 *   variant on the wrapper instead of being edited. Its shipped
 *   `rounded-3xl` + shadow ramp is the one element that read as off-system in
 *   every earlier screenshot.
 * - **A two-layer lattice.** A 24px minor grid under the 120px major one, both
 *   dissolving toward the edges through a radial mask, so the background stops
 *   reading as flat wallpaper and starts reading as a drawing surface.
 * - **Frame rules.** Vertical hairlines at the content-frame edges and
 *   full-bleed horizontal rules at section boundaries, so every band belongs to
 *   one system.
 * - **Real product UI in the hero.** The right column lists actual entities
 *   with their CUIs — the only honest version of the references' "put the
 *   product on the page", since this app has no platform-stats endpoint.
 * - **Cell hover.** Border and index number pick up the single accent and an
 *   arrow fades in. No lift, no shadow.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** Small monospace label. Numbering and section names only — never fake telemetry. */
function MonoLabel({
  children,
  className,
}: {
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <span
      className={cn('font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em]', className)}
    >
      {children}
    </span>
  )
}

/**
 * The metric strip, carrying only figures this codebase can stand behind:
 * everything is derived at render from the domain list and the scraper
 * catalog, both local and real. Fabricated telemetry on a public-money
 * product is a data-trust violation, not decoration.
 */
function getPlatformFacts() {
  const groups = visibleGroups()
  const surfaces = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const hidden = LANDING_GROUPS.reduce(
    (sum, group) => sum + group.entries.filter((entry) => entry.gate?.() === false).length,
    0,
  )
  return {
    groups,
    facts: [
      { value: String(surfaces), label: 'suprafețe publice' },
      { value: String(groups.length), label: 'domenii' },
      { value: String(scraperDatasetCatalog.length), label: 'seturi de date înregistrate' },
      {
        value: String(scraperDatasetCatalog.filter((dataset) => dataset.apiReady).length),
        label: 'servite live',
      },
    ],
    hidden,
  }
}

/** The three heaviest surfaces, reachable without scrolling. */
const SHORTCUTS: readonly { label: string; to: LinkProps['to'] }[] = [
  { label: 'Achiziții publice', to: '/procurement' },
  { label: 'Buget național', to: '/budget-explorer' },
  { label: 'Legislație', to: '/legislation' },
]

/** Dissolve the lattice toward the edges. Inline style: a Tailwind arbitrary
 *  value here would carry a gradient literal into full-checkout CSS. */
const LATTICE_MASK: CSSProperties = {
  maskImage: 'radial-gradient(115% 85% at 25% 0%, #000 20%, transparent 78%)',
  WebkitMaskImage: 'radial-gradient(115% 85% at 25% 0%, #000 20%, transparent 78%)',
}

/** Major rule every 120px, minor every 24px beneath it. */
function TwoLayerLattice({ idPrefix }: { readonly idPrefix: string }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-foreground"
      style={LATTICE_MASK}
    >
      <defs>
        <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.03" />
        </pattern>
        <pattern id={`${idPrefix}-major`} width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.11" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${idPrefix}-minor)`} />
      <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
    </svg>
  )
}

/** The content frame, ruled on both edges so bands read as one column. */
function Frame({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={cn('relative mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border" />
      {children}
    </div>
  )
}

/** Forge's crosshairs, at the corners of the hero frame. */
function CornerTicks() {
  const arm = 'absolute size-2 border-foreground/25'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, '-left-px -top-px border-l border-t')} />
      <span className={cn(arm, '-right-px -top-px border-r border-t')} />
      <span className={cn(arm, '-bottom-px -left-px border-b border-l')} />
      <span className={cn(arm, '-bottom-px -right-px border-b border-r')} />
    </span>
  )
}

/**
 * The shipped input is reached with an arbitrary *variant* — a descendant
 * selector, which outranks the component's own utility classes — rather than
 * by editing a component three other surfaces depend on.
 */
function RefinedSearch() {
  const isMobile = useIsMobile()
  return (
    <div
      className={cn(
        // Shape and weight: flat and bordered instead of rounded-3xl on a shadow ramp.
        '[&_input]:rounded-lg [&_input]:border-input [&_input]:bg-card [&_input]:shadow-none',
        '[&_input]:transition-colors [&_input]:hover:border-ring/50 [&_input]:focus:border-ring',
        // Height and right padding only. The left padding is left alone: the
        // magnifier is absolutely positioned at `sm:left-7` in a 32px box, so
        // anything under ~80px puts the icon on top of the placeholder.
        '[&_input]:py-5 md:[&_input]:text-base sm:[&_input]:pr-6',
        // The results dropdown carries the same rounding; bring it along.
        '[&_.rounded-3xl]:rounded-lg [&_.shadow-2xl]:shadow-md',
      )}
    >
      {/* The placeholder is kept short deliberately: at 375px the field has
          about thirty characters left after the magnifier's 80px of padding,
          and the longer wording truncated mid-word. */}
      <EntitySearchInput
        placeholder="Caută o instituție sau CUI..."
        selectionBehavior="navigate-to-preferred-entity"
        autoFocus={!isMobile}
        scrollToTopOnFocus={isMobile}
      />
    </div>
  )
}

/** Real entities, as product UI. Three-tier hierarchy, tabular CUIs. */
function StartHerePanel() {
  return (
    <div className="border bg-card">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <MonoLabel className="text-muted-foreground">Începe de aici</MonoLabel>
        <MonoLabel className="text-muted-foreground/60">CUI</MonoLabel>
      </div>
      <ul>
        {PREDEFINED_ENTITIES.slice(0, 6).map((entity) => (
          <li key={entity.cui}>
            <Link
              to={buildPreferredEntityPath({
                cui: entity.cui,
                entityType: entity.entity_type,
                isUat: entity.is_uat,
              })}
              preload="intent"
              className="group flex items-baseline justify-between gap-3 border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-card-foreground group-hover:underline">
                  {entity.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {entity.uat?.county_name}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {entity.cui}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RefinedCell({ entry, index }: { readonly entry: LandingEntry; readonly index: number }) {
  const Icon = entry.icon
  return (
    <div className="-ml-px -mt-px border-l border-t">
      <Link
        to={entry.to}
        preload="intent"
        className="group flex h-full flex-col p-5 transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center justify-between">
          <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          <MonoLabel className="text-muted-foreground/50 transition-colors group-hover:text-primary">
            {String(index).padStart(2, '0')}
          </MonoLabel>
        </span>
        <span className="mt-4 flex items-baseline gap-1.5 text-base font-semibold tracking-tight text-foreground">
          {entry.title}
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </span>
        <span className="mt-1.5 block text-sm leading-snug text-muted-foreground">
          {entry.blurb}
        </span>
      </Link>
    </div>
  )
}

/**
 * A group's widest column count: whichever of three or two leaves fewer empty
 * cells, preferring three on a tie.
 *
 * `DESIGN.md` requires the lattice to close as a rectangle, so a short final
 * row has to be filled rather than left ragged. At a fixed three columns that
 * rule produced the sparsest parts of the page — `Politică` was one tile beside
 * two blanks, `Banii publici` put PNRR alone on a second row. Choosing the
 * count per group keeps the rule and removes the holes: 4 → 2×2, 2 → 1×2,
 * 3 and 6 → three across.
 */
const columnsFor = (length: number) => {
  const fillersAt = (columns: number) => (columns - (length % columns)) % columns
  return fillersAt(2) < fillersAt(3) ? 2 : 3
}

function RefinedLattice({ groups }: { readonly groups: readonly LandingGroup[] }) {
  let running = 0
  return (
    <div className="space-y-12">
      {groups.map((group, groupIndex) => {
        const start = running
        running += group.entries.length
        const columns = columnsFor(group.entries.length)
        const fillers = (columns - (group.entries.length % columns)) % columns
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`}>
            <div className="flex items-center gap-3">
              <MonoLabel className="text-primary">{String(groupIndex + 1).padStart(2, '0')}</MonoLabel>
              {/* A heading, not a styled span: the index is the page's outline. */}
              <h3 id={`group-${group.key}`}>
                <MonoLabel className="text-foreground">{group.title}</MonoLabel>
              </h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <MonoLabel className="text-muted-foreground/60 tabular-nums">
                {String(group.entries.length).padStart(2, '0')}
              </MonoLabel>
            </div>
            <div
              className={cn(
                'mt-4 grid grid-cols-1 border sm:grid-cols-2',
                columns === 3 && 'lg:grid-cols-3',
              )}
            >
              {group.entries.map((entry, i) => (
                <RefinedCell key={entry.title} entry={entry} index={start + i + 1} />
              ))}
              {Array.from({ length: fillers }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    '-ml-px -mt-px hidden border-l border-t',
                    columns === 3 ? 'lg:block' : 'sm:block',
                  )}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function LandingRefsRefined() {
  const { groups, facts } = getPlatformFacts()

  return (
    <div className="w-full bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      {/* Hero — open band. */}
      <section className="relative overflow-hidden border-b">
        <TwoLayerLattice idPrefix="refined-hero" />
        <Frame className="py-12 sm:py-20 lg:py-24">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              {/* The brand, not a slogan about the brand. The mark is the one
                  already in the sidebar, so the landing and the shell agree. */}
              <span className="flex items-center gap-2.5">
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-sm"
                />
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Transparenta.eu
                </span>
                <span aria-hidden="true" className="text-muted-foreground/50">
                  ·
                </span>
                <MonoLabel className="text-muted-foreground">România</MonoLabel>
              </span>
              <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                Banii publici,
                <br />
                la vedere.
              </h1>
              <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Bugete, contracte, investiții, legi și dosare — din surse
                oficiale, cu proveniența fiecărei cifre.
              </p>
              <div className="mt-6 sm:mt-7">
                <RefinedSearch />
              </div>
              {/* Balances the column against the taller panel, and gives the
                  three heaviest surfaces a direct route out of the hero. The
                  label sits on its own line below `sm`, where keeping it inline
                  pushed one shortcut onto a second row on its own. */}
              <nav aria-label="Scurtături" className="mt-4">
                <MonoLabel className="block text-muted-foreground/70 sm:inline sm:align-middle">
                  Sau mergi direct la
                </MonoLabel>
                <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 sm:ml-4 sm:mt-0 sm:inline-flex sm:align-middle">
                  {SHORTCUTS.map((shortcut) => (
                    <Link
                      key={shortcut.label}
                      to={shortcut.to}
                      preload="intent"
                      className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                    >
                      {shortcut.label}
                    </Link>
                  ))}
                </span>
              </nav>
            </div>
            <div className="min-w-0 lg:col-span-5">
              <StartHerePanel />
            </div>
          </div>
        </Frame>
      </section>

      {/* Facts — dense band. A description list, because that is what it is:
          four terms and their values, not four decorative tiles. */}
      <section className="border-b bg-muted/20" aria-label="Acoperirea platformei">
        <Frame>
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {facts.map((fact, i) => (
              <div
                key={fact.label}
                className={cn(
                  'px-5 py-6 sm:py-7',
                  i % 2 === 1 && 'border-l',
                  i >= 2 && 'border-t lg:border-t-0',
                  i >= 1 && 'lg:border-l',
                )}
              >
                <dd className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  {fact.value}
                </dd>
                <dt className="mt-2">
                  <MonoLabel className="block leading-relaxed text-muted-foreground">
                    {fact.label}
                  </MonoLabel>
                </dt>
              </div>
            ))}
          </dl>
        </Frame>
      </section>

      {/* Statement — open band. */}
      <section className="border-b">
        <Frame className="py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MonoLabel className="text-primary">01 / Ce găsești aici</MonoLabel>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Fiecare sursă,
                <br />
                într-un singur loc
              </h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground lg:col-span-6 lg:col-start-7">
              Platforma acoperă banii publici de la bugetul de stat până la
              dosarul din instanță. Fiecare suprafață spune ce întrebare
              răspunde — și de unde vin cifrele.
            </p>
          </div>
        </Frame>
      </section>

      {/* Index — dense band. */}
      <section className="border-b">
        <Frame className="py-14">
          <RefinedLattice groups={groups} />
        </Frame>
      </section>

      {/* Provenance — the closing statement. This band exists because the fact
          strip above says "5 servite live" out of 23 registered datasets, and a
          number like that has to be explained rather than left to be read as a
          shortfall. `DESIGN.md` §Data Trust makes saying so a requirement. */}
      <section className="border-b">
        <Frame className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MonoLabel className="text-primary">02 / Proveniență</MonoLabel>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Fiecare cifră
                <br />
                își spune sursa
              </h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground lg:col-span-6 lg:col-start-7">
              Datele vin din surse oficiale — ANAF, Ministerul Finanțelor, SEAP,
              Monitorul Oficial, INS. Unele seturi sunt încă în curs de
              conectare și sunt marcate ca atare acolo unde apar. Nicio cifră nu
              este prezentată fără să spună de unde vine și din ce perioadă.
            </p>
          </div>
        </Frame>
      </section>

      <section>
        <Frame className="py-12">
          <div className="space-y-4">
            <CampaignLandingShareCard className="w-full" />
            <ParliamentPromoCard className="w-full" />
          </div>
        </Frame>
      </section>
    </div>
  )
}
