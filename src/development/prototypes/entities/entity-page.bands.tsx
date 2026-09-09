/**
 * Variant A — stacked bands in the landing's rhythm: one column, every section
 * a full-width band between rules, a compact header that pins on scroll.
 * Owned by the layout subagent.
 *
 * The building blocks (`EntityPageTop`, `EntityPageFiguresBand`,
 * `EntityPageSectionIndex`, `EntityPageSectionBands`, the two observers) are
 * exported so the rail variant composes the *same* nodes in a different
 * arrangement rather than a second copy of them. Below `lg` the two variants
 * are therefore the same page.
 *
 * Observers run in effects only: the server renders the compact header hidden
 * and no section active, and the client corrects both after hydration.
 */
import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EntityPageCompactHeader, EntityPageHeader } from './entity-page.header'
import { EntityPageLedger } from './entity-page.ledger'
import { CornerTicks, CruxMarks, Frame, MonoLabel, PROTOTYPE_MARKER, SectionRail } from './entity-page.parts'
import { EntityPageEvolution, EntityPageFaq, EntityPageReports, EntityPageSubordinates } from './entity-page.sections'
import { EntityPageStats } from './entity-page.stats'
import {
  ENTITY_PAGE_SECTIONS,
  ENTITY_PAGE_VIEW_LABELS,
  type EntityPagePieceProps,
  type EntityPageSectionId,
} from './entity-page.types'

const TOTAL = ENTITY_PAGE_SECTIONS.length

/** The id of the root node; the rail's `01 Sinteză` link points here on desktop, where the figures band is not in flow. */
export const ENTITY_PAGE_TOP_ID = 'entity-page-top'

/** Every band that stands for a section carries this attribute; the active-section observer reads it. */
const SECTION_ATTR = 'data-entity-section'

// ---------------------------------------------------------------------------
// Observers
// ---------------------------------------------------------------------------

/**
 * True once the sentinel at the end of the hero has scrolled *above* the
 * viewport. The `top < 0` guard matters on a phone with a tall hero: at load
 * the sentinel is below the fold — not intersecting either — and without the
 * guard the compact bar would appear before the reader has seen the header.
 */
export function useHeroScrolledOut(sentinelRef: RefObject<HTMLElement | null>): boolean {
  const [scrolledOut, setScrolledOut] = useState(false)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      setScrolledOut(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [sentinelRef])
  return scrolledOut
}

/**
 * Which section is under the reading line. Observes the *bands* (tagged with
 * `data-entity-section`) rather than the headings: a heading leaves the screen
 * while a long ledger is still being read, and the band is what the reader is
 * actually in. The reading line is the strip 30–40% down the viewport; with
 * bands stacked edge to edge, exactly one band crosses it at a time.
 */
export function useActiveSection(rootRef: RefObject<HTMLElement | null>): EntityPageSectionId | null {
  const [active, setActive] = useState<EntityPageSectionId | null>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const bands = Array.from(root.querySelectorAll<HTMLElement>(`[${SECTION_ATTR}]`))
    if (bands.length === 0) return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).getAttribute(SECTION_ATTR)
          if (!id) continue
          if (entry.isIntersecting) visible.add(id)
          else visible.delete(id)
        }
        const first = ENTITY_PAGE_SECTIONS.find((section) => visible.has(section.id))
        // Nothing under the line means the reader is above every section (the
        // hero); the synthesis is the first thing after it.
        setActive(first ? first.id : 'sinteza')
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    for (const band of bands) observer.observe(band)
    return () => observer.disconnect()
  }, [rootRef])
  return active
}

// ---------------------------------------------------------------------------
// Top: compact bar + hero band + sentinel
// ---------------------------------------------------------------------------

/**
 * The compact bar and the hero band, in that order. The bar sits in a
 * zero-height sticky wrapper so it overlays the page whichever way the header
 * chooses to hide it, and never pushes content down.
 */
export function EntityPageTop(props: EntityPagePieceProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const compactVisible = useHeroScrolledOut(sentinelRef)
  return (
    <>
      <div className="sticky top-0 z-30 h-0">
        <EntityPageCompactHeader {...props} visible={compactVisible} />
      </div>
      <section className="border-b" aria-label="Identitate">
        <Frame marker="hero">
          <CornerTicks />
          <EntityPageHeader {...props} />
        </Frame>
        <div ref={sentinelRef} aria-hidden="true" className="h-0" />
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// 01 — figures band
// ---------------------------------------------------------------------------

/** Section 01. The stats piece renders the `#sinteza` heading itself. */
export function EntityPageFiguresBand({
  className,
  ...props
}: EntityPagePieceProps & { readonly className?: string }) {
  return (
    <section
      className={cn('border-b bg-muted/20', className)}
      aria-labelledby="sinteza"
      {...{ [SECTION_ATTR]: 'sinteza' }}
    >
      <Frame>
        <CruxMarks />
        <EntityPageStats {...props} />
      </Frame>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Section index
// ---------------------------------------------------------------------------

/**
 * The table of contents: the seven sections as mono anchor links. In a row it
 * is the slim rail under the figures band; in a column it lives in the sticky
 * rail. `firstHref` lets the rail point `01` somewhere that is in flow on
 * desktop (the figures band there is hidden).
 */
export function EntityPageSectionIndex({
  orientation,
  active,
  firstHref = '#sinteza',
  className,
}: {
  readonly orientation: 'row' | 'column'
  readonly active: EntityPageSectionId | null
  readonly firstHref?: string
  readonly className?: string
}) {
  const row = orientation === 'row'
  return (
    <nav aria-label="Cuprins" className={className}>
      <ol
        className={cn(
          'flex',
          row ? 'flex-wrap items-center gap-x-5 gap-y-2.5' : 'flex-col gap-y-2.5',
        )}
      >
        {ENTITY_PAGE_SECTIONS.map((section, i) => {
          const isActive = section.id === active
          return (
            <li key={section.id}>
              <a
                href={i === 0 ? firstHref : `#${section.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'inline-flex items-baseline gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <MonoLabel className={cn('tabular-nums', row && 'tracking-[0.1em]')}>{section.number}</MonoLabel>
                <MonoLabel
                  className={cn(
                    'leading-relaxed',
                    row && 'tracking-[0.1em]',
                    !row && (isActive ? 'text-primary' : 'text-foreground'),
                  )}
                >
                  {section.label}
                </MonoLabel>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Sections 02–07 (or the "not rebuilt" band for other views)
// ---------------------------------------------------------------------------

type SectionBandsProps = EntityPagePieceProps & {
  /**
   * `framed`: every section is its own full-width band with its own `Frame`
   * (the stacked layout). Unframed: the sections are rows inside a frame the
   * caller owns (the rail's right column) and bleed to its side rules with
   * negative margins so the rules run edge to edge below `lg` exactly as the
   * framed ones do.
   */
  readonly framed: boolean
}

const SECTION_BODIES: ReadonlyArray<{
  readonly id: Exclude<EntityPageSectionId, 'sinteza'>
  readonly render: (props: EntityPagePieceProps) => ReactNode
}> = [
  { id: 'structura', render: (props) => <EntityPageLedger {...props} accountCategory="ch" /> },
  { id: 'venituri', render: (props) => <EntityPageLedger {...props} accountCategory="vn" /> },
  { id: 'evolutie', render: (props) => <EntityPageEvolution {...props} /> },
  { id: 'subordonate', render: (props) => <EntityPageSubordinates {...props} /> },
  { id: 'rapoarte', render: (props) => <EntityPageReports {...props} /> },
  { id: 'intrebari', render: (props) => <EntityPageFaq {...props} /> },
]

const BAND_RHYTHM = 'py-12 sm:py-14'
const UNFRAMED_BAND = cn(
  '-mx-5 border-b px-5 last:border-b-0 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0',
  BAND_RHYTHM,
)

/** One band of the page: a full-width section between rules (`framed`) or a row inside a frame the caller owns. Exported so the keep variant stacks the same bands. */
export function SectionBand({
  id,
  framed,
  children,
  labelledBy,
}: {
  readonly id: string
  readonly framed: boolean
  readonly children: ReactNode
  readonly labelledBy?: string
}) {
  const sectionAttr = { [SECTION_ATTR]: id }
  if (framed) {
    return (
      <section className="border-b" aria-labelledby={labelledBy} {...sectionAttr}>
        <Frame className={BAND_RHYTHM}>{children}</Frame>
      </section>
    )
  }
  return (
    <section className={UNFRAMED_BAND} aria-labelledby={labelledBy} {...sectionAttr}>
      {children}
    </section>
  )
}

/** The page below the figures: bands 02–07, or one band that names the view that is not rebuilt here. */
export function EntityPageSectionBands({ framed, ...props }: SectionBandsProps) {
  if (props.state.view !== 'main-info') {
    return (
      <SectionBand id="view" framed={framed} labelledBy="entity-page-view-heading">
        <MonoLabel className="block text-primary">Vizualizare</MonoLabel>
        <h2
          id="entity-page-view-heading"
          className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          {ENTITY_PAGE_VIEW_LABELS[props.state.view]}
        </h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Este o destinație de navigare, nu o secțiune a acestei pagini. În prototip nu a
          fost încă reconstruită; antetul și cifrele de sinteză rămân aceleași.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={() => props.onStateChange({ view: 'main-info' })}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
          Înapoi la {ENTITY_PAGE_VIEW_LABELS['main-info']}
        </Button>
      </SectionBand>
    )
  }

  return (
    <>
      {SECTION_BODIES.map(({ id, render }) => {
        const section = ENTITY_PAGE_SECTIONS.find((entry) => entry.id === id)
        if (!section) return null
        return (
          <SectionBand key={id} id={id} framed={framed} labelledBy={id}>
            <SectionRail id={id} number={section.number} label={section.label} total={TOTAL} />
            <div className="mt-8">{render(props)}</div>
          </SectionBand>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Variant A
// ---------------------------------------------------------------------------

export function EntityPageBands(props: EntityPagePieceProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const active = useActiveSection(rootRef)
  const isMain = props.state.view === 'main-info'

  return (
    <div
      ref={rootRef}
      id={ENTITY_PAGE_TOP_ID}
      className="relative w-full bg-background"
      data-dev-marker={PROTOTYPE_MARKER}
    >
      <EntityPageTop {...props} />
      <EntityPageFiguresBand {...props} />
      {/* The index — desktop only. On a phone the compact header carries
          orientation, and seven links in a row would wrap into a block that
          costs more than it orients. */}
      {isMain ? (
        <section className="hidden border-b lg:block" aria-label="Cuprins">
          <Frame className="py-3.5">
            <EntityPageSectionIndex orientation="row" active={active} />
          </Frame>
        </section>
      ) : null}
      <EntityPageSectionBands {...props} framed />
    </div>
  )
}
