import { useEffect, useRef, useState, type RefObject } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight, Minus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import leu from '@/assets/images/landing-leu.webp'
import leuAvif from '@/assets/images/landing-leu.avif'
import atlas from '@/assets/images/landing-atlas.webp'
import atlasAvif from '@/assets/images/landing-atlas.avif'
import justitia from '@/assets/images/landing-justitia.webp'
import justitiaAvif from '@/assets/images/landing-justitia.avif'
import logo from '@/assets/logo/logo.png'
import { PREDEFINED_ENTITIES } from '@/lib/constants/predefined-entities'
import { buildPreferredEntityPath } from '@/lib/entity-navigation'
import { CampaignLandingShareCard } from '@/features/campaigns/buget/components/CampaignAccessShareCard'
import { ParliamentPromoCard } from '@/features/parliament/components/parliament-promo-card'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { scraperDatasetCatalog } from '@/lib/scraper-references'
import { useDockDrag } from './home-refs.dock-drag'
import { MonoLabel } from './home-refs.mono-label'
import { RevealStyles, useRevealOnView } from './home-refs.reveal'
import {
  GroupPicture,
  PICTURE_ATTR,
  PictureRevealStyles,
  usePictureReveal,
} from './home-refs.image-reveal'
import { ScrambleText, scrambleWithin, stopScrambling } from './home-refs.scramble'
import { CountUpValue, SmearFilters, countUpWithin, stopCounting } from './home-refs.count-up'
import { NATIONAL_FACTS } from './home-refs.national-facts'
import type { FieldCell } from './home-refs.pixel-art'
import { PixelFieldCanvas, useCanvasFieldMotion } from './home-refs.pixel-canvas'
import {
  PanelTiltStyles,
  TILT_PANEL_CLASS,
  TILT_SCENE_CLASS,
  TILT_SHADOW_CLASS,
  usePanelTilt,
} from './home-refs.panel-tilt'
import {
  FOOTER_SCENE_CLEAR_PX,
  FooterScene,
  FooterSceneStyles,
  useFooterScene,
} from './home-refs.footer-scene'
import { LightMaterialStyles } from './home-refs.light-material'
import {
  SECTION_LIGHT_ATTR,
  SectionLight,
  SectionLightStyles,
  useSectionLight,
} from './home-refs.section-light'
import { ScrollLight, ScrollLightStyles, useScrollLight } from './home-refs.scroll-light'
import { PeopleBand } from './home-refs.people'
import { LandingSearch } from './home-refs.search'
import { localEntityMatches } from './home-refs.search-local'
import { LANDING_GROUPS, visibleGroups } from './home.data'
import type { LandingEntry, LandingGroup } from './home.data'

/**
 * The landing page.
 *
 * Information architecture came from round one (`landing/home`): a grouped
 * table of contents over every surface the app serves. Everything below is the
 * craft laid over it, and each item is a decision rather than a tweak:
 *
 * - **The hero headline area.** A tighter display scale (`clamp`, leading 0.92)
 *   with the lead paragraph held to about sixty characters, and the search
 *   given the left column rather than floating centred.
 * - **The search and its results.** Rebuilt rather than restyled. The earlier
 *   pass reached into the shipped `EntitySearchInput` with `[&_input]:`
 *   descendant selectors, because it is shared with campaigns and the floating
 *   search and could not be edited — a hack that outranked the component's own
 *   classes and would have broken silently the moment its internals changed. It
 *   is now `home-refs.search.tsx`, written against the same prop contract so it
 *   can replace the shipped one, with the state machine and the folded matcher
 *   in files beside it.
 * - **A two-layer lattice.** A 24px minor grid under the 120px major one, both
 *   dissolving toward the edges through a radial mask, so the background stops
 *   reading as flat wallpaper and starts reading as a drawing surface.
 * - **Frame rules.** Vertical hairlines at the content-frame edges and
 *   full-bleed horizontal rules at section boundaries, so every band belongs to
 *   one system.
 * - **Real product UI in the hero.** The right column lists actual entities
 *   with their CUIs — the only honest version of the references' "put the
 *   product on the page", since this app has no platform-stats endpoint.
 * - **Index cell hover.** Border and index number pick up the single accent and
 *   an arrow fades in. No lift, no shadow.
 * - **Margin field motion.** An intro wave shortly after load, and a ripple
 *   from the click. Both are drawn into a canvas rather than animated as
 *   elements — see `home-refs.pixel-canvas.tsx` for why 1,943 cells a side
 *   made that the only option.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** Small monospace label. Numbering and section names only — never fake telemetry. */
/**
 * What this platform holds — deliberately kept apart from the national figures
 * in the strip above.
 *
 * The two are different universes. `NATIONAL_FACTS` describes the country; these
 * describe our coverage of it, and the institution count in particular is a
 * subset — principal ordonatori de credite that reported budget execution, not
 * a census of Romanian public institutions. Printed in the same row as a
 * national total, a reader would divide one by the other and get a number that
 * means nothing. So they live in the provenance band, under a heading that says
 * what they are.
 *
 * Everything except the institution count is derived at render from the domain
 * list and the scraper catalog, so it cannot drift out of date.
 */
function getPlatformCoverage() {
  const groups = visibleGroups()
  const surfaces = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const hidden = LANDING_GROUPS.reduce(
    (sum, group) => sum + group.entries.filter((entry) => entry.gate?.() === false).length,
    0,
  )
  return {
    groups,
    coverage: [
      // The one figure here that is not derived. It is the real `totalCount`
      // from `entityAnalytics` for 2024 aggregated principal reporting, so it
      // carries its year; promotion should fetch it rather than inherit this.
      { value: '3.295', label: 'instituții cu execuție 2024' },
      { value: String(scraperDatasetCatalog.length), label: 'seturi de date' },
      {
        value: String(scraperDatasetCatalog.filter((dataset) => dataset.apiReady).length),
        label: 'servite live',
      },
      { value: String(surfaces), label: 'suprafețe' },
      { value: String(groups.length), label: 'domenii' },
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

/**
 * Fades each pixel field out before it reaches the content column. Inline
 * style rather than an arbitrary Tailwind value, which would carry the
 * gradient literal into full-checkout CSS.
 */
const FIELD_MASK = {
  left: {
    maskImage: 'linear-gradient(to right, #000 0%, #000 24%, transparent 76%)',
    WebkitMaskImage: 'linear-gradient(to right, #000 0%, #000 24%, transparent 76%)',
  },
  right: {
    maskImage: 'linear-gradient(to left, #000 0%, #000 24%, transparent 76%)',
    WebkitMaskImage: 'linear-gradient(to left, #000 0%, #000 24%, transparent 76%)',
  },
} satisfies Record<'left' | 'right', CSSProperties>

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

/**
 * The tricolour, as the separator in the wordmark.
 *
 * Drawn rather than set as 🇷🇴: regional-indicator flags do not render on
 * Windows, which falls back to the letters "RO", and the emoji's size and
 * baseline vary by platform font — which a mark aligned against a 14px
 * wordmark cannot afford.
 *
 * The polish is in three details. It holds the official 3:2 ratio at 12×8, so
 * it reads as a flag and not as a coloured chip. The corners are rounded by a
 * hair — enough to stop it looking like a raw rectangle, not so much that it
 * becomes a pill. And it carries an inset hairline rather than an outset
 * border, so the stroke sits inside the silhouette and the blue band still has
 * an edge against a dark background. The viewBox is drawn at 3× the rendered
 * size to keep those corners crisp.
 */
function RomanianFlag({ className }: { readonly className?: string }) {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 36 24"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      <clipPath id="ro-flag">
        <rect width="36" height="24" rx="3" />
      </clipPath>
      <g clipPath="url(#ro-flag)">
        <rect width="12" height="24" fill="#002B7F" />
        <rect x="12" width="12" height="24" fill="#FCD116" />
        <rect x="24" width="12" height="24" fill="#CE1126" />
        <rect
          width="36"
          height="24"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.22"
          strokeWidth="3"
        />
      </g>
    </svg>
  )
}

/**
 * The content frame, ruled on both edges so bands read as one column.
 *
 * `marker` labels a frame for code outside the render tree — the hero's is the
 * region the ripple refuses to start in, so the field answers clicks on the
 * margin it lives in and stays still for clicks on the content.
 */
function Frame({
  children,
  className,
  marker,
}: {
  readonly children: ReactNode
  readonly className?: string
  readonly marker?: string
}) {
  return (
    <div data-frame={marker} className={cn('relative mx-auto w-full max-w-6xl px-5 sm:px-8', className)}>
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
    </span>
  )
}

/**
 * The crossing mark that sits where the hero's bottom rule meets each side of
 * the frame — the bottom pair of corner ticks, opened out into a full cross and
 * given the brand blue so the frame closes on a deliberate mark rather than
 * trailing off.
 *
 * Rendered by the band *below* the hero rather than by the hero itself. That
 * began as a workaround — the hero used to clip its overflow, so a cross
 * centred on its bottom edge lost its lower half — and the clip is gone now,
 * removed so the search dropdown could extend past the section. The mark stays
 * here anyway: both frames are the same width, so the two corners coincide
 * exactly, and owning the mark from the band it opens is the more honest
 * arrangement of the two.
 */
function CruxMarks() {
  // Centred on where the lines actually cross, which is half a pixel off the
  // box edges the marks are anchored to: the frame's rule occupies x 0..1 and
  // the band's top rule y -1..0, so their centres are at 0.5 and -0.5. The
  // half-pixel margins take out that offset — without them a 2px arm sits
  // visibly proud of a 1px line.
  const arm = 'absolute -translate-x-1/2 -translate-y-1/2 bg-primary'
  const left = 'left-0 top-0 ml-[0.5px] -mt-[0.5px]'
  const right = 'right-0 top-0 mr-[0.5px] -mt-[0.5px] translate-x-1/2'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, left, 'h-3 w-0.5')} />
      <span className={cn(arm, left, 'h-0.5 w-3')} />
      <span className={cn(arm, right, 'h-3 w-0.5')} />
      <span className={cn(arm, right, 'h-0.5 w-3')} />
    </span>
  )
}

/**
 * The field owns no layout of its own, so the hero decides how wide it is and
 * what sits under it. That is the whole reason it could be rebuilt instead of
 * overridden.
 *
 * Autofocus is desktop-only. On a phone, focusing on mount raises the keyboard
 * over the page before the reader has seen it; `scrollToTopOnFocus` is the
 * mobile counterpart, keeping the field above the keyboard once they do tap it.
 *
 * The fallback is the one thing here that is prototype-only. The GraphQL server
 * lives in another repo, so on this harness the search usually cannot reach it
 * and the dropdown can only be seen failing — which makes the states worth
 * looking at impossible to look at. `import.meta.env.DEV` keeps it out of a
 * build, and results that come from it are labelled as such in the dropdown.
 */
function RefinedSearch({
  inputRef,
}: {
  readonly inputRef: RefObject<HTMLInputElement | null>
}) {
  const isMobile = useIsMobile()

  return (
    // The placeholder is kept short deliberately: at 375px the field has about
    // thirty characters after the magnifier's padding, and the longer wording
    // truncated mid-word.
    <LandingSearch
      inputRef={inputRef}
      placeholder="Caută o instituție sau CUI..."
      selectionBehavior="navigate-to-preferred-entity"
      autoFocus={!isMobile}
      scrollToTopOnFocus={isMobile}
      fallback={import.meta.env.DEV ? localEntityMatches : undefined}
    />
  )
}

/**
 * The three window lights, in the order macOS puts them: close, minimise, zoom.
 *
 * Three saturated hues on a page whose colour rule is one accent, and circles in
 * a system that avoids fully rounded shapes. Both are deliberate: this is the
 * one element on the landing that is pretending to be something else, and the
 * lights are the single detail that does the pretending. Diluted to the brand
 * blue or squared off, they stop reading as a window and become three dots.
 *
 * If the trade stops being worth it, macOS's own answer is already the
 * system-friendly one: an unfocused window renders these grey, so
 * `bg-muted-foreground/30` on all three is an authentic monochrome variant
 * rather than a compromise.
 */
const WINDOW_LIGHTS = {
  close: 'bg-[#ff5f57]',
  minimise: 'bg-[#febc2e]',
  zoom: 'bg-[#28c840]',
} as const

/**
 * One light: a 24px target with a 12px dot inside it.
 *
 * The dot stays 12px because that is what makes it read as a window light —
 * bigger and it is three coloured buttons. The target around it is 24px because
 * WCAG 2.2 §2.5.8 asks for that much, and the three sit edge to edge with no
 * gap so their centres land 24px apart and none of them overlap. The wrapper
 * pulls the row back by the 6px of padding this adds, so the dots end up
 * exactly where they were when they were three inert spans.
 *
 * The glyph appears on hover of the row, as macOS does it — you see what the
 * lights do when you go near them, not before. It carries no meaning on its
 * own; the accessible name on the control does that.
 *
 * Drawn rather than typed. The ✕, − and ↗ characters were each a different
 * font's idea of the shape at 9px — different weights, different optical
 * sizes, and the arrow a good deal heavier than the other two — where three
 * marks sitting in a row have to look like one set. As icons they share a
 * geometry and a stroke.
 *
 * 8px inside the 12px dot, which puts the drawn mark near 6.7px and leaves the
 * ring of colour macOS leaves. Stroke 3 is the number that makes it 1px: these
 * are drawn in a 24-unit box and scaled to 8, so the stroke scales by a third
 * with everything else.
 */
function WindowLight({ tone, icon: Icon }: { readonly tone: string; readonly icon: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-3 items-center justify-center rounded-full', tone)}
    >
      <Icon
        strokeWidth={3}
        className="size-2 text-black/55 opacity-0 group-hover/lights:opacity-100 group-focus-visible/light:opacity-100 motion-safe:transition-opacity"
      />
    </span>
  )
}

/** Shared by the two buttons and the one link, which differ only in what they do. */
const LIGHT_TARGET_CLASS =
  'group/light flex size-6 items-center justify-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'

/**
 * What the window is doing. Desktop-only: the title bar that sets it does not
 * exist below `lg`, and `home-refs.panel-tilt.tsx` acts on this inside the same
 * media query, so a phone always renders the list.
 */
type WindowState = 'open' | 'minimised' | 'closed'

/**
 * Real entities, as product UI. Three-tier hierarchy, tabular CUIs.
 *
 * On desktop it is framed as a window: the perspective in
 * `home-refs.panel-tilt.tsx` turns it, and the title bar says what the angle is
 * implying — that this is a separate surface holding the product, not another
 * box in the page's own plane.
 *
 * On a phone it is a list, and that is all of it. The hero is one column there,
 * so a pane angled toward a headline sitting directly above it would be angled
 * at nothing; and a title bar carrying three window controls, on a device that
 * has no windows, is a costume rather than a metaphor. The chrome, the corners
 * and the depth all begin at `lg` together, because they are one idea and half
 * of it is worse than none of it.
 *
 * The lights work, which is the whole reason they are built the way they are: a
 * control that looks like it closes something and does nothing is worse than no
 * control, so each one is a real element with a real name and a real target.
 * Close and minimise are buttons because they act on this page; zoom is a link
 * because it navigates, and a reader who middle-clicks it should get a tab.
 */
function StartHerePanel({
  panelRef,
  searchInputRef,
}: {
  readonly panelRef: RefObject<HTMLDivElement | null>
  readonly searchInputRef: RefObject<HTMLInputElement | null>
}) {
  const [windowState, setWindowState] = useState<WindowState>('open')
  const minimiseRef = useRef<HTMLButtonElement>(null)
  const restoreRef = useRef<HTMLButtonElement>(null)
  /*
   * The scene is the box the minimised icon is dragged inside.
   *
   * It is the right one because while minimised it is `h-full` against a
   * stretched column, so it is exactly the space the window vacated — the icon
   * can be put anywhere the window used to be and nowhere it was not.
   *
   * The offset lives here rather than in the icon, so it survives the icon:
   * reopen and minimise again and the icon comes back where it was left, which
   * is what a reader who moved it there deliberately expects. This panel does
   * not unmount, only the button inside it does.
   */
  const sceneRef = useRef<HTMLDivElement>(null)
  const { offset, isDragging, wasDragged, dragHandlers } = useDockDrag({
    handleRef: restoreRef,
    boundsRef: sceneRef,
  })
  /*
   * Where focus goes after the click, set by the handler and spent by the
   * effect below.
   *
   * It has to be a two-step: every one of these controls destroys itself, so
   * focusing the successor synchronously would aim at an element React has not
   * rendered yet, and doing nothing would drop focus onto <body> and lose a
   * keyboard reader entirely. A ref rather than state because nothing renders
   * it, and it must not fire on mount — the search field is already focused
   * there and stealing it back would scroll the page on load.
   */
  const pendingFocus = useRef<'search' | 'restore' | 'minimise' | undefined>(undefined)

  useEffect(() => {
    const target = pendingFocus.current
    if (target === undefined) return
    pendingFocus.current = undefined
    if (target === 'search') searchInputRef.current?.focus()
    else if (target === 'restore') restoreRef.current?.focus()
    else minimiseRef.current?.focus()
  }, [windowState, searchInputRef])

  return (
    /* No margin here, and that is the considered position rather than an
       omission — measured, the panel sits symmetrically already.

       The gap from the search field to the panel is the hero grid's own column
       gap, at 32px. The gap from the panel to the vertical rule the frame
       paints at its border-box edge is the frame's own right padding, also at
       32px. They are equal at every width because both come from the same
       spacing scale, so anything added on this side breaks a symmetry the
       layout was already giving for free.

       Two attempts at improving it are why this is written down: a negative
       margin to run the panel up to the rule closed the right gap to zero, and
       a positive one opened it to 44 and then 56 against an unchanged 32 on
       the left. */
    <div
      ref={sceneRef}
      className={cn(
        TILT_SCENE_CLASS,
        // Only while minimised, and only where the window exists. The column
        // stretches to the hero's height, so `h-full` gives this something to
        // put a bottom edge against; at rest neither class is here and the
        // scene is the plain block it has always been.
        windowState === 'minimised' && 'lg:flex lg:h-full lg:items-end lg:justify-end',
      )}
      data-window={windowState}
    >
      {/* The shadow the panel casts on the page. Its own element so it keeps its
          own geometry and is not carried through the panel's rotation. */}
      <div aria-hidden="true" className={TILT_SHADOW_CLASS} />
      {/* `overflow-hidden` so the rows clip to the rounded corners rather than
          squaring them off at the top and bottom of the list. 8px is the
          system's ceiling on radius, which is also about what a macOS window
          uses — the one place those two agree. */}
      {/* Square and unclipped below `lg`: the radius is here to make a window
          corner, and with no window to corner it is a softened list that no
          longer agrees with the flat-edged blocks beneath it. */}
      <div
        ref={panelRef}
        className={cn(TILT_PANEL_CLASS, 'border bg-card lg:overflow-hidden lg:rounded-lg')}
      >
        {/* The title bar, and the only place the window can be closed from —
            which is why it and the states it sets are both scoped to `lg`. */}
        <div className="group/lights hidden items-center border-b bg-muted/40 px-4 py-3 lg:flex">
          {/* Cancels the 6px each 24px target adds around its 12px dot, so the
              row keeps the height and the left edge it had before. Applied to
              the group and not between the targets: a negative margin between
              them would overlap the hit areas and undo the 24px. */}
          <span className="-my-1.5 -ml-1.5 flex items-center">
            <button
              type="button"
              onClick={() => {
                pendingFocus.current = 'search'
                setWindowState('closed')
              }}
              aria-label="Închide fereastra cu instituții"
              className={LIGHT_TARGET_CLASS}
            >
              <WindowLight tone={WINDOW_LIGHTS.close} icon={X} />
            </button>
            <button
              ref={minimiseRef}
              type="button"
              onClick={() => {
                pendingFocus.current = 'restore'
                setWindowState('minimised')
              }}
              aria-label="Minimizează fereastra cu instituții"
              className={LIGHT_TARGET_CLASS}
            >
              <WindowLight tone={WINDOW_LIGHTS.minimise} icon={Minus} />
            </button>
            <Link
              to="/entity-analytics"
              preload="intent"
              aria-label="Deschide analiza entităților"
              className={LIGHT_TARGET_CLASS}
            >
              <WindowLight tone={WINDOW_LIGHTS.zoom} icon={ArrowUpRight} />
            </Link>
          </span>
        </div>
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
      {/* What a minimised window is: the app's own icon, the size of a dock
          tile, and clicking it gives the window back.

          It starts at the bottom right of the column the window vacated, which
          is where a dock is and, on this page, the corner furthest from
          everything the hero wants read first — a minimised window should be
          retrievable without competing with the headline it was minimised away
          from. From there it can be dragged anywhere inside that column, or
          nudged with the arrow keys, and it stays where it is put.

          Mounted only in this state and only at `lg`, so there is never a
          reopen control on a phone for a window a phone cannot have closed. */}
      {windowState === 'minimised' ? (
        <button
          ref={restoreRef}
          type="button"
          {...dragHandlers}
          /* `translate` and not `transform`: the entrance below animates the
             transform, and two owners of one property is the bug this file has
             already paid for once on the panel. They compose. */
          style={{ translate: `${offset.x}px ${offset.y}px` }}
          onClick={() => {
            // The click at the end of a drag is the drag, not the button.
            if (wasDragged()) return
            pendingFocus.current = 'minimise'
            setWindowState('open')
          }}
          aria-label="Redeschide fereastra cu instituții"
          className={cn(
            'group hidden size-14 touch-none select-none items-center justify-center rounded-full border bg-card shadow-sm transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-90 motion-safe:duration-300 lg:flex',
            isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
        >
          <img
            src={logo}
            alt=""
            /* Or the browser starts its own drag of the image and the pointer
               ends up carrying a ghost of the logo instead of the icon. */
            draggable={false}
            className="size-7 rounded-sm transition-transform group-hover:scale-105 motion-reduce:transition-none"
          />
        </button>
      ) : null}
    </div>
  )
}

function RefinedCell({ entry, index }: { readonly entry: LandingEntry; readonly index: number }) {
  const Icon = entry.icon
  return (
    // The cell arrives, not its text: fading the title and the blurb separately
    // inside a bordered box leaves the box sitting there empty first, which
    // reads as a loading state rather than as an entrance.
    <div data-reveal className="-ml-px -mt-px border-l border-t">
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
type GroupImage = {
  readonly src: string
  /** The same picture in AVIF, offered ahead of the WebP. */
  readonly avif: string
  /** The art's own pixels. See `GroupPicture` — the cell reserves the box. */
  readonly width: number
  readonly height: number
  /**
   * Whether the picture is cropped to its cell or fitted inside it.
   *
   * The choice is about whether a crop reads as framing or as damage. Justitia
   * is a figure running out of frame already, so a top-anchored crop reads as a
   * portrait. The leu is a complete object on a pedestal — crop it and it looks
   * broken, so it is fitted and the card shows through around it. Both are
   * cut-outs on transparency; neither brings a ground of its own.
   */
  readonly fit: 'cover' | 'contain'
  /** `object-position`. Load-bearing under `cover`, where the crop decides what survives. */
  readonly position: string
  /** Which side of the entries the picture sits on. */
  readonly side: 'left' | 'right'
  /**
   * The box on mobile, where the picture runs full width and has no sibling row
   * to take its height from. Roughly the source's own proportions, or a fitted
   * subject sits in mostly empty card.
   */
  readonly mobileAspect: string
}

/**
 * Illustrations, keyed by group. Skin rather than content, so they live here
 * and not in `home.data.ts`, which round one shares and which describes what
 * the surfaces *are*.
 *
 * Two things worth carrying with this map.
 *
 * Allegory generates safely; real institutions do not. A Justitia, a stone lion
 * and an Atlas have no referent to get wrong. A rendered Palace of the
 * Parliament that is almost right would undercut the one thing this platform
 * sells — that what you are shown is the actual record.
 *
 * And these are cropped to their alpha bounding box before encoding. Under
 * `contain` it is the empty margin in the file, not any CSS, that decides how
 * large the subject renders; trimming it there enlarges the subject at every
 * breakpoint, where a CSS scale could only do the same by risking a clip
 * wherever the cell is narrowest.
 */
const GROUP_IMAGES: Record<string, GroupImage | undefined> = {
  // The leu, in both senses — the stone lion and the currency. The widest group
  // at four entries, so its cell comes out the tallest and narrowest of the
  // three, which is what a seated figure on a pedestal wants.
  bani: {
    src: leu,
    avif: leuAvif,
    width: 760,
    height: 942,
    fit: 'contain',
    position: '50% 50%',
    side: 'left',
    // 4:5 against the source's own 0.807, so mobile barely letterboxes.
    mobileAspect: 'aspect-4/5',
  },
  // On the right, so the three pictures alternate down the page rather than
  // stacking along one edge.
  //
  // The span is derived from the visible entry count rather than written here,
  // which matters most for this group: Întreprinderi publice sits behind a
  // mock-data gate, so it is three entries tall today and four when that gate
  // opens.
  institutii: {
    src: atlas,
    avif: atlasAvif,
    width: 760,
    height: 1250,
    /*
     * The only one of the three that is cropped on desktop rather than fitted,
     * because it is the only one whose proportions fight the cell.
     *
     * The desktop cell comes out about square — 363x365 beside three entries —
     * and this source is 0.608. Under 'contain' that fits to height and renders
     * the figure 221px wide in a 363px box, a small statue marooned in white
     * space. 'cover' fills it, at the price of the pedestal.
     *
     * Worth the price: what is lost is the base, and what survives is the globe
     * and the figure carrying it, which is the whole of what the picture is
     * for. '15%' rather than '0%' because anchoring the top gives the globe the
     * entire upper half and pushes the head to the middle; a little lower
     * trades the crown of the globe — which stays legible as a sphere even
     * clipped — for the head, the shoulders and a knee.
     */
    fit: 'cover',
    position: '50% 15%',
    side: 'right',
    /*
     * 4:5, which crops on a phone exactly as it does on the desktop row.
     *
     * It was 3:5 — near enough the source's own 0.608 that mobile got the whole
     * figure, pedestal included, which was the point. Measured on a 390x844
     * screen that box is 582px tall: 69% of the viewport for one decorative
     * picture, with the entries it illustrates pushed off the bottom entirely.
     * 4:5 brings it to 423 — half the screen — and costs the pedestal, which
     * the desktop crop had already given up.
     */
    mobileAspect: 'aspect-4/5',
  },
  // Anchored to the very top. Centring lands on drapery, and anything below the
  // top edge slices the head off at desktop widths, where the cell is at its
  // shortest and the visible window is a thin band. The source carries a little
  // air above the head, so '0%' reads as headroom rather than a crop.
  lege: {
    src: justitia,
    avif: justitiaAvif,
    width: 760,
    height: 1140,
    fit: 'cover',
    position: '50% 0%',
    side: 'left',
    mobileAspect: 'aspect-4/3',
  },
}

/**
 * Rows a picture spans, by how many entries it stands beside — it has to reach
 * the bottom of the stack.
 *
 * A table of literals rather than an interpolated class, because Tailwind
 * generates only what it can see written out. Derived from the *visible* entry
 * count at render, not stored per image: a gate can drop an entry, and a span
 * fixed at authoring time would leave the picture hanging short of the group.
 */
const ROW_SPAN: Record<number, string | undefined> = {
  1: 'sm:row-span-1',
  2: 'sm:row-span-2',
  3: 'sm:row-span-3',
  4: 'sm:row-span-4',
  5: 'sm:row-span-5',
  6: 'sm:row-span-6',
}

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
        const image = GROUP_IMAGES[group.key]
        const columns = columnsFor(group.entries.length)
        // An illustrated group closes its own rectangle: the picture spans
        // every row of a narrow first column and the entries stack beside it,
        // so `columnsFor` and its fillers do not apply.
        const fillers = image ? 0 : (columns - (group.entries.length % columns)) % columns
        return (
          <section key={group.key} aria-labelledby={`group-${group.key}`}>
            <div data-reveal className="flex items-center gap-3">
              <MonoLabel className="text-primary">{String(groupIndex + 1).padStart(2, '0')}</MonoLabel>
              {/* A heading, not a styled span: the index is the page's outline.
                  Its accessible name comes from the `sr-only` copy inside
                  `ScrambleText`, so `aria-labelledby` above keeps resolving to
                  the real title while the visible copy is still noise. */}
              <h3 id={`group-${group.key}`}>
                <MonoLabel className="text-foreground">
                  <ScrambleText>{group.title}</ScrambleText>
                </MonoLabel>
              </h3>
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              <MonoLabel className="text-muted-foreground/60 tabular-nums">
                {String(group.entries.length).padStart(2, '0')}
              </MonoLabel>
            </div>
            <div
              {...{ [SECTION_LIGHT_ATTR]: '' }}
              className={cn(
                'mt-4 grid grid-cols-1 border',
                image
                  ? image.side === 'right'
                    ? 'sm:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]'
                    : 'sm:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'
                  : cn('sm:grid-cols-2', columns === 3 && 'lg:grid-cols-3'),
              )}
            >
              {image ? (
                /* The cell's height comes from the two entries beside it, which
                   is a track height a percentage cannot resolve against — so
                   `h-full` on the image would leave it at its natural 1100px
                   and blow the row open. Absolute inside a clipped cell instead.
                   The aspect ratio is only for the stacked mobile layout, where
                   there is no sibling row to take height from; 4:3 rather than
                   3:2 because a portrait subject needs the height back once it
                   is running full-bleed. */
                <div
                  {...{ [PICTURE_ATTR]: '' }}
                  className={cn(
                    'relative -ml-px -mt-px overflow-hidden border-l border-t sm:aspect-auto',
                    image.mobileAspect,
                    ROW_SPAN[group.entries.length],
                    // The picture stays first in the DOM either way, so it
                    // leads on mobile. Placing it explicitly in the second
                    // column is what sends it right: the entries then auto-fill
                    // the column it left empty, which row-major flow would
                    // otherwise have scattered across both.
                    image.side === 'right' && 'sm:col-start-2 sm:row-start-1',
                  )}
                >
                  <GroupPicture
                    src={image.src}
                    avif={image.avif}
                    fit={image.fit}
                    position={image.position}
                    width={image.width}
                    height={image.height}
                  />
                </div>
              ) : null}
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

/**
 * Everything that happens when a block arrives, beyond the fade itself.
 *
 * Declared at module scope so its identity is stable across renders, which is
 * what keeps the reveal's effect from tearing down and rebuilding its observers
 * on every render.
 */
function startArrivalEffects(block: Element, delay: number) {
  scrambleWithin(block, delay)
  countUpWithin(block, delay)
}

/**
 * `fieldCell` is the module the margin field is quantised to. It stays a prop
 * rather than a constant because the renderer is indifferent to it — 12px is
 * what this page settled on, and 24px still draws correctly if it is ever
 * wanted back.
 */
function RefinedLanding({ fieldCell = 12 }: { readonly fieldCell?: FieldCell }) {
  const { groups, coverage } = getPlatformCoverage()
  // The hero is the field's host: the canvases are found inside it and a click
  // is measured against it.
  const heroRef = useRef<HTMLElement | null>(null)
  // The hero's entity panel, turned in its own perspective and squared up on
  // scroll. Its own ref: the tilt is written on that element and nowhere else.
  const entityPanelRef = useRef<HTMLDivElement>(null)
  usePanelTilt(entityPanelRef)
  // Where focus goes when the panel's close button removes the panel from under
  // it: the field the hero is built around, and the one the window points at.
  const searchInputRef = useRef<HTMLInputElement>(null)
  useCanvasFieldMotion(heroRef, { cell: fieldCell })
  // One root, lent to every effect that needs the page's geometry. None of them
  // owns it, which is what lets the page decide which of them run at all.
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollLight(rootRef)
  // The hero is deliberately not a group: it is on screen at load, so "first
  // time in view" would mean "at load", and hiding server-rendered text at load
  // is the failure this is built to avoid. The hero keeps its own entrance.
  useRevealOnView(rootRef, startArrivalEffects)
  usePictureReveal(rootRef)
  useSectionLight(rootRef)
  useFooterScene(rootRef)
  // Module state outlives the component, so an unmount mid-flight would leave
  // both loops ticking against nodes that are no longer in the document.
  useEffect(() => () => {
    stopScrambling()
    stopCounting()
  }, [])

  return (
    <div ref={rootRef} className="relative w-full bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <LightMaterialStyles />
      <ScrollLightStyles />
      <SectionLightStyles />
      <FooterSceneStyles />
      <RevealStyles />
      <PictureRevealStyles />
      <PanelTiltStyles />
      <SmearFilters />
      <ScrollLight />
      <SectionLight />
      {/* Hero — open band. */}
      {/* The hero does *not* clip. It used to, and the search dropdown paid for
          it: with five results the panel ran 194px past the section and was cut
          off mid-row. Nothing here needs the section to clip — the lattice is a
          self-bounded `svg`, and each margin field already sits in its own
          `overflow-hidden` wrapper, which is what the mask is applied to. The
          clip was inherited from an earlier version where the fields were
          direct children. */}
      <section ref={heroRef} className="relative border-b">
        <TwoLayerLattice idPrefix="refined-hero" />
        {/* The grid pixelating at the margins — filled cells on the same 24px
            module the minor lattice is drawn on, so it reads as one system
            rather than a texture laid over one.

            Shown only from 1800px up. The threshold is about the margin beside
            the 1152px frame, not about "desktop": at 1506 that margin is 148px,
            which is too narrow to hold the field without crowding the headline,
            and narrow enough that the particle tail — which starts 240px in —
            is clipped away entirely, leaving the square band alone and the
            animation compressed into a fraction of its schedule. By 1800 the
            margin is around 290px and both the tail and the timing have room.
            Below it the hero simply keeps the plain lattice. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden min-[1800px]:block"
        >
          {/* Clipped to 1.45x the margin beside the 1152px frame, so the tail
              carries a little past the frame while the squares stay in the
              margin.

              The overflow is a *proportion* of the margin rather than a fixed
              150px, which is what it used to be. At 1920 that fixed value was
              a fraction of a 360px margin and looked right; at 1506 the margin
              is only 148px, so the clip came out at 298px while the headline
              starts at 156px — the field ran over the first 140px of the
              headline. Scaling with the margin keeps the same relationship at
              every width.

              The mask reaches zero at roughly 76% of that width, and the frame
              edge sits at 69%, so whatever crosses into the content column is
              down to about a tenth of its weight. The field is drawn at its
              natural 24px scale rather than stretched, because scaling would
              break alignment with the lattice underneath. */}
          <div
            className="absolute inset-y-0 left-0 w-[calc((100%-72rem)/2*1.45)] overflow-hidden"
            style={FIELD_MASK.left}
          >
            <PixelFieldCanvas edge="left" cell={fieldCell} className="left-0 top-0" />
          </div>
          <div
            className="absolute inset-y-0 right-0 w-[calc((100%-72rem)/2*1.45)] overflow-hidden"
            style={FIELD_MASK.right}
          >
            <PixelFieldCanvas edge="right" cell={fieldCell} className="right-0 top-0" />
          </div>
        </div>
        <Frame marker="hero" className="py-12 sm:py-20 lg:py-24">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              {/* The brand, not a slogan about the brand. The mark is the one
                  already in the sidebar, so the landing and the shell agree. */}
              {/* The mark is centred against the text block, but the wordmark,
                  the separator and the country sit on a shared baseline — with
                  `items-center` the 10px uppercase label centres on its own box
                  and rides high against the 14px wordmark beside it. */}
              <span className="flex items-center gap-2.5">
                <img
                  src={logo}
                  alt=""
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-sm"
                />
                {/* Spacing is deliberately uneven: the flag belongs to
                    "România", so it sits close to the word it qualifies and
                    well clear of the wordmark. An equal gap on both sides made
                    it read as a separator floating between two equals. */}
                <span className="flex items-baseline">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    Transparenta.eu
                  </span>
                  <RomanianFlag className="ml-4" />
                  <MonoLabel className="ml-1.5 text-muted-foreground">România</MonoLabel>
                </span>
              </span>
              {/* The base size is fluid rather than fixed. `decizii informate`
                  is a much longer line than the headline it replaced, and at a
                  flat 2.75rem it measured 313px against a 309px column at 360px
                  and a 280px one at 320px — so it overflowed on every phone
                  narrower than an iPhone 14. The clamp keeps 2.75rem wherever
                  it fits and scales down only where it does not; `sm:` and up
                  are unaffected. */}
              <h1 className="mt-6 text-[clamp(2.35rem,8.4vw+0.75rem,2.75rem)] font-extrabold leading-[0.92] tracking-tighter text-foreground sm:text-6xl lg:text-7xl">
                Date publice,
                <br />
                decizii informate
              </h1>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Transformăm date publice în informații clare, pentru a înțelege
                și decide mai bine.
              </p>
              <div className="mt-6 sm:mt-7">
                <RefinedSearch inputRef={searchInputRef} />
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
            {/* `self-stretch` against the grid's `items-start`: with the window
                minimised this column has only the reopen icon in it, and an
                icon cannot be at the bottom of a box the height of an icon.
                Stretched, it is as tall as the hero, and at rest it changes
                nothing — the panel is the taller of the two columns, so the
                row's height is already its own. */}
            <div className="min-w-0 lg:col-span-5 lg:self-stretch">
              <StartHerePanel panelRef={entityPanelRef} searchInputRef={searchInputRef} />
            </div>
          </div>
        </Frame>
      </section>

      {/* Facts — dense band. The scale of the thing being watched: what the
          country produces, what it spends, what it borrows, who it is for.
          Four official 2025 figures, each carrying its source and period,
          because `DESIGN.md` §Data Trust requires that beside every claim.

          A description list, because that is what it is — four terms and their
          values, not four decorative tiles. `dt` precedes `dd` in the DOM as
          the spec requires; `order` puts the value on top. */}
      <section className="border-b bg-muted/20" aria-label="România în cifre">
        <Frame>
          <CruxMarks />
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {NATIONAL_FACTS.map((fact, i) => (
              <div
                key={fact.label}
                data-reveal
                className={cn(
                  'flex flex-col px-5 py-6 sm:py-7',
                  i % 2 === 1 && 'border-l',
                  i >= 2 && 'border-t lg:border-t-0',
                  i >= 1 && 'lg:border-l',
                )}
              >
                <dd className="order-1 flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  <CountUpValue value={fact.value} digits={fact.digits} />
                  {/* The unit never breaks across lines — 'mld.' alone on one
                      line and 'lei' on the next reads as two facts. */}
                  <span className="shrink-0 whitespace-nowrap text-sm font-medium tracking-normal text-muted-foreground">
                    {fact.unit}
                  </span>
                </dd>
                {/* Both lines live in the `dt` because a `dl` group admits only
                    `dt` and `dd`. The tile stretches to the row height, so
                    `mt-auto` drops the attribution to the bottom-left corner
                    and it lines up across all four regardless of how many lines
                    the label above it takes. */}
                <dt className="order-2 mt-2.5 flex flex-1 flex-col">
                  <MonoLabel className="block leading-relaxed text-foreground">
                    {fact.label}
                  </MonoLabel>
                  <MonoLabel className="mt-auto block pt-6 leading-relaxed text-muted-foreground">
                    <ScrambleText>{fact.source}</ScrambleText>
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
              <MonoLabel className="block text-primary" data-reveal>
                01 / Ce găsești aici
              </MonoLabel>
              <h2
                data-reveal
                className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              >
                Fiecare sursă,
                <br />
                într-un singur loc
              </h2>
            </div>
            <p
              data-reveal
              className="text-base leading-relaxed text-muted-foreground lg:col-span-6 lg:col-start-7"
            >
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

      {/* Provenance — the home of every figure that describes *us* rather than
          the country. Saying "5 servite live" out of 23 registered datasets only
          works next to the sentence that explains it; left in the strip it reads
          as a shortfall. `DESIGN.md` §Data Trust makes stating it at all a
          requirement.

          It used to close the page. `03 / Oameni` now follows it, because the
          two are the same claim in two forms — where the data comes from, then
          who stands behind it — and the second is weaker anywhere else. */}
      <section className="border-b">
        <Frame className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <MonoLabel className="block text-primary" data-reveal>
                02 / Proveniență
              </MonoLabel>
              <h2
                data-reveal
                className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                Fiecare cifră
                <br />
                își spune sursa
              </h2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <p data-reveal className="text-base leading-relaxed text-muted-foreground">
                Datele vin din surse oficiale — ANAF, Ministerul Finanțelor,
                SEAP, Monitorul Oficial, INS. Unele seturi sunt încă în curs de
                conectare și sunt marcate ca atare acolo unde apar. Nicio cifră
                nu este prezentată fără să spună de unde vine și din ce
                perioadă.
              </p>
              <ul data-reveal className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5">
                {coverage.map((item) => (
                  <li key={item.label}>
                    <MonoLabel className="text-muted-foreground">
                      <span className="text-foreground tabular-nums">
                        {item.value}
                      </span>{' '}
                      {item.label}
                    </MonoLabel>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Frame>
      </section>

      {/* People — open band. The page's only faces, and the one place it speaks
          in the first person. `home-refs.people.tsx` carries the shape and the
          two alternatives it beat; everything in it below the founder is still
          stand-in, and no longer labelled as such on screen. */}
      <section className="border-b">
        <Frame className="py-14 sm:py-16">
          <PeopleBand />
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

      {/* The footer, and the page's one picture.

          `relative` so the scene has something to be absolute against, and the
          content carries `z-10` so the range rises *behind* the last rows of
          text rather than over them. This is a proposal for `AppFooter`, which
          the dev harness also renders below it — two footers stacked is the
          harness, not the design. */}
      <footer className="relative overflow-hidden border-t">
        <FooterScene />
        <Frame className="pointer-events-none relative z-10 pt-14">
          {/* Padding rather than a height, so the footer is as tall as its own
              text plus room for the vista. The figure comes from the scene, so
              the two cannot drift apart: the text stops above the highest
              cloud, and the peaks rise behind it.

              The frame does not take pointer events and its two content blocks
              do. Its box covers the whole footer, padding included, so as a
              `z-10` positioned element it swallowed every click meant for the
              sky underneath — the clouds could not be grabbed anywhere the
              padding reached, which was everywhere. */}
          <div style={{ paddingBottom: FOOTER_SCENE_CLEAR_PX }}>
            <div className="pointer-events-auto grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="" className="size-5 rounded-sm" />
                  <span className="font-semibold text-foreground">
                    Transparenta.eu
                  </span>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Banii publici, deciziile și documentele care le însoțesc —
                  într-un singur loc, cu sursa și data lângă fiecare cifră.
                </p>
              </div>
              {/*
                * One navigation landmark for the footer, not one per column.
                *
                * A nav per column takes its name from the column, and "Legal"
                * is also the name of a nav in the app shell's own footer. Two
                * landmarks with the same role and the same name are
                * indistinguishable in the landmark list a screen reader offers,
                * which is the one place landmarks are actually used.
                *
                * 'display: contents' because the columns are grid children of
                * the block above and a real box here would break the row. The
                * column titles stay visual — the lists inside carry the
                * structure, and inventing an 'h2' outline in the footer to sit
                * under the page's 'h3' group headings would be worse.
                */}
              <nav aria-label="Navigare footer" className="contents">
                {FOOTER_COLUMNS.map((column) => (
                  <div key={column.title}>
                    <MonoLabel className="text-muted-foreground/70">
                      {column.title}
                    </MonoLabel>
                    <ul className="mt-4 space-y-2.5">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            to={link.to}
                            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>
            <div className="pointer-events-auto mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <MonoLabel className="text-muted-foreground/70">
                © {new Date().getFullYear()} Transparenta.eu
              </MonoLabel>
              <MonoLabel className="text-muted-foreground/70">
                Date din surse oficiale
              </MonoLabel>
            </div>
          </div>
        </Frame>
      </footer>
    </div>
  )
}

/**
 * Footer navigation, kept to routes this app actually has.
 *
 * Deliberately short. A landing footer that lists every surface competes with
 * the index the page has just spent its whole length building.
 */
const FOOTER_COLUMNS = [
  {
    title: 'Platformă',
    links: [
      { label: 'Analiza entităților', to: '/entity-analytics' },
      { label: 'Hărți', to: '/map' },
      { label: 'Grafice', to: '/charts' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Politica de confidențialitate', to: '/privacy' },
      { label: 'Termeni și condiții', to: '/terms' },
    ],
  },
] satisfies readonly {
  readonly title: string
  readonly links: readonly { readonly label: string; readonly to: LinkProps['to'] }[]
}[]

/**
 * The landing.
 *
 * One version again. The combobox was settled on Base UI over three
 * alternatives, and the panel is settled joined to the field over the floating
 * one it was compared against — both losing options are gone rather than left
 * behind as choices nobody will make, and both comparisons are kept in
 * `docs/design/landing-search-comparison.md` so neither gets reopened from
 * scratch.
 */
export const LandingRefs = RefinedLanding
