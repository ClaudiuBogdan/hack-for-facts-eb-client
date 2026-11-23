import { useEffect, useRef, type RefObject } from 'react'
import type { CSSProperties } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { MessageDescriptor } from '@lingui/core'
import logo from '@/assets/logo/logo-mark.webp'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useIsMobile } from '@/hooks/use-mobile'
import { useFirstVisit } from '@/features/landing/lib/first-visit'
import { visibleGroups } from '@/features/landing/lib/landing-groups'
import { searchTermFromAddress } from '@/features/landing/lib/address-search-term'
import type { FieldCell } from '@/features/landing/lib/pixel-art'
import { SmearFilters, countUpWithin, stopCounting } from './count-up'
import { CornerTicks, RomanianFlag, TwoLayerLattice } from './hero-chrome'
import { PictureRevealStyles, usePictureReveal } from './image-reveal'
import { LightMaterialStyles } from './light-material'
import { NationalFactsBand } from './national-facts-band'
import { PanelTiltStyles, usePanelTilt } from './panel-tilt'
import { PeopleArtStyles } from './people-art'
import { PeopleBand } from './people-band'
import { PixelFieldCanvas, useCanvasFieldMotion } from './pixel-canvas'
import { scrambleWithin, stopScrambling } from './scramble-text'
import { ScrollLight, ScrollLightStyles, useScrollLight } from './scroll-light'
import { SectionsMenu } from './sections-menu'
import { DeferredLandingSearch } from './search/deferred-landing-search'
import { SectionLight, SectionLightStyles, useSectionLight } from './section-light'
import { ShardDefs } from './shards'
import { StartHerePanel } from './start-here-panel'
import { SurfaceIndex } from './surface-index'
import { BudgetMapSection } from './budget-map/budget-map-section'

/**
 * The landing page.
 *
 * Information architecture came from the first prototype round: a grouped
 * table of contents over every surface the app serves. Everything below is the
 * craft laid over it, and each item is a decision rather than a tweak:
 *
 * - **The hero headline area.** A tighter display scale (`clamp`, leading 0.92)
 *   with the lead paragraph held to about sixty characters, and the search
 *   given the left column rather than floating centred.
 * - **The search and its results.** Rebuilt rather than restyled, against the
 *   same prop contract as the shipped `EntitySearchInput`, with the state
 *   machine and the folded matcher in files beside it.
 * - **A two-layer lattice.** A 24px minor grid under the 120px major one, both
 *   dissolving toward the edges through a radial mask, so the background stops
 *   reading as flat wallpaper and starts reading as a drawing surface.
 * - **Frame rules.** Vertical hairlines at the content-frame edges and
 *   full-bleed horizontal rules at section boundaries, so every band belongs to
 *   one system.
 * - **Real product UI in the hero.** The right column lists actual entities
 *   with their CUIs — the only honest version of "put the product on the
 *   page", since this app has no platform-stats endpoint.
 * - **Margin field motion.** An intro wave shortly after load, and a ripple
 *   from the click. Both are drawn into a canvas rather than animated as
 *   elements — see `pixel-canvas.tsx` for why 1,943 cells a side made that
 *   the only option.
 *
 * The decisions each part records are in its own module. The promotion record
 * is `docs/design/landing/design.md`.
 */

/** The three heaviest surfaces, reachable without scrolling. */
const SHORTCUTS: readonly { readonly label: MessageDescriptor; readonly to: LinkProps['to'] }[] = [
  { label: msg`Achiziții publice`, to: '/procurement' },
  { label: msg`Buget național`, to: '/national-budget' },
  { label: msg`Legislație`, to: '/legislation' },
]

/**
 * Fades each pixel field out before it reaches the content column. Inline
 * style rather than an arbitrary Tailwind value, which would carry the
 * gradient literal into the stylesheet.
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

/**
 * The field owns no layout of its own, so the hero decides how wide it is and
 * what sits under it.
 *
 * Autofocus is desktop-only. On a phone, focusing on mount raises the keyboard
 * over the page before the reader has seen it; `scrollToTopOnFocus` is the
 * mobile counterpart, keeping the field above the keyboard once they do tap it.
 *
 * A search link (`/?q=`, the site's `SearchAction`) opens with the field
 * filled. The address seeds the field and no more: typing does not write it
 * back. The field is keyed on the term, so a new term (another link, Back)
 * starts it afresh, and anything else in the address — the map's `harta` —
 * leaves the reader's draft alone.
 */
function HeroSearch({ inputRef }: { readonly inputRef: RefObject<HTMLInputElement | null> }) {
  const isMobile = useIsMobile()
  const initialTerm = searchTermFromAddress(useSearch({ from: '/', select: (search) => search.q }))
  return (
    // The placeholder names three things people look for, not the search's
    // whole reach, to stay short: it is 209px wide and the field has 218px of
    // text room at 390px. Narrower phones cut it at the end.
    <DeferredLandingSearch
      key={initialTerm ?? ''}
      initialTerm={initialTerm}
      inputRef={inputRef}
      placeholder={t`Caută primării, firme, legi…`}
      autoFocus={!isMobile}
      scrollToTopOnFocus={isMobile}
    />
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

/** No root: handed to the entrance hooks on a return visit, so they find nothing to arm. */
const NO_ROOT: RefObject<HTMLDivElement | null> = { current: null }

/**
 * `fieldCell` is the module the margin field is quantised to. It stays a prop
 * rather than a constant because the renderer is indifferent to it — 12px is
 * what this page settled on, and 24px still draws correctly if it is ever
 * wanted back.
 */
export function LandingPage({ fieldCell = 12 }: { readonly fieldCell?: FieldCell }) {
  const { i18n } = useLingui()
  const groups = visibleGroups()
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
  // Entrances play the first time the page is on screen and not when the
  // reader comes back to it (`first-visit.ts`).
  const firstVisit = useFirstVisit()
  useCanvasFieldMotion(heroRef, { cell: fieldCell, intro: firstVisit })
  // One root, lent to every effect that needs the page's geometry. None of them
  // owns it, which is what lets the page decide which of them run at all.
  const rootRef = useRef<HTMLDivElement>(null)
  useScrollLight(rootRef)
  // The hero is deliberately not a group: it is on screen at load, so "first
  // time in view" would mean "at load", and hiding server-rendered text at load
  // is the failure this is built to avoid. The hero keeps its own entrance.
  const entranceRoot = firstVisit ? rootRef : NO_ROOT
  useRevealOnView(entranceRoot, startArrivalEffects)
  usePictureReveal(entranceRoot)
  useSectionLight(rootRef)
  // Module state outlives the component, so an unmount mid-flight would leave
  // both loops ticking against nodes that are no longer in the document.
  useEffect(() => () => {
    stopScrambling()
    stopCounting()
  }, [])

  return (
    /* `overflow-x-clip`, and only the x. The corner ticks and the crux marks
       are centred on the frame's vertical rules, and below the frame's own
       1152px those rules sit on the viewport edge — so half of each mark hangs
       outside it. Measured at 390: `scrollWidth` 396 against a 390 viewport,
       which on a phone is a page that pans sideways by six pixels, and the
       layout viewport grows to match so every fixed element is drawn 6px too
       wide. `clip` rather than `hidden` because it is not a scroll container:
       the search dropdown still runs past the hero, and nothing here reaches
       sideways on purpose — the margin fields already clip themselves.

       `ss03` is Inter's round commas and quotes, for the whole page: the
       comma in a figure („19,04") and in a heading, and the comma under every
       „ș" and „ț". Already in the font the page downloads, and a comma keeps
       its width (quotation marks come out a little wider). */
    <div
      ref={rootRef}
      data-entrances={firstVisit ? undefined : 'played'}
      className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']"
    >
      <LightMaterialStyles />
      <ScrollLightStyles />
      <SectionLightStyles />
      <RevealStyles />
      <PictureRevealStyles />
      <PeopleArtStyles />
      <ShardDefs />
      <PanelTiltStyles />
      <SmearFilters />
      <ScrollLight />
      <SectionLight />
      {/* Hero — open band. It does *not* clip: with five results the search
          panel ran 194px past the section and was cut off mid-row. Nothing
          here needs the section to clip — the lattice is a self-bounded `svg`,
          and each margin field already sits in its own `overflow-hidden`
          wrapper, which is what the mask is applied to. */}
      <section ref={heroRef} className="relative border-b">
        <TwoLayerLattice idPrefix="landing-hero" />
        {/* The grid pixelating at the margins — filled cells on the same 24px
            module the minor lattice is drawn on, so it reads as one system
            rather than a texture laid over one.

            The lattice is counted from the frame, so the field
            is too: this box is the container whose width each canvas reads to
            find the same lines (`PixelFieldCanvas`).

            Shown only from 1800px up; why 1800, and how script asks the same
            question without measuring, is in `lib/margin-field.ts`. Change the
            class and that module together (a test holds them equal). */}
        <div
          aria-hidden="true"
          className="@container pointer-events-none absolute inset-0 hidden min-[1800px]:block"
        >
          {/* Clipped to 1.45x the margin beside the 1152px frame, so the tail
              carries a little past the frame while the squares stay in the
              margin. The overflow is a proportion of the margin rather than a
              fixed 150px: at 1506 a fixed clip ran over the first 140px of
              the headline. The mask reaches zero at roughly 76% of that width
              and the frame edge sits at 69%, so whatever crosses into the
              content column is down to about a tenth of its weight. */}
          <div
            className="absolute inset-y-0 left-0 w-[calc((100%-72rem)/2*1.45)] overflow-hidden"
            style={FIELD_MASK.left}
          >
            <PixelFieldCanvas edge="left" cell={fieldCell} className="top-0" />
          </div>
          <div
            className="absolute inset-y-0 right-0 w-[calc((100%-72rem)/2*1.45)] overflow-hidden"
            style={FIELD_MASK.right}
          >
            <PixelFieldCanvas edge="right" cell={fieldCell} className="top-0" />
          </div>
        </div>
        {/* Less below than above from `lg`: the hero is then 618px, inside
            the margin fields' 624 (`fieldGeometry`), so the tiles reach the
            bottom rule. At 96px it was 650 and they stopped 26px short. */}
        <RuledFrame marker="hero" className="py-12 sm:py-20 lg:pt-24 lg:pb-16">
          <CornerTicks />
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 lg:col-span-7">
              {/* The brand, not a slogan about the brand. The mark is the one
                  already in the sidebar, so the landing and the shell agree.
                  The mark is centred against the text block, but the wordmark,
                  the separator and the country sit on a shared baseline. */}
              <span className="flex items-center gap-2.5">
                <img src={logo} alt="" aria-hidden="true" className="size-5 shrink-0 rounded-sm" />
                {/* Spacing is deliberately uneven: the flag belongs to
                    "România", so it sits close to the word it qualifies and
                    well clear of the wordmark. */}
                <span className="flex items-baseline">
                  <span className="text-sm font-semibold tracking-tight text-foreground">
                    Transparenta.eu
                  </span>
                  <RomanianFlag className="ml-4" />
                  <MonoLabel className="ml-1.5 text-muted-foreground">România</MonoLabel>
                </span>
              </span>
              {/* Extra-bold and tightly tracked, which is the headline's voice.
                  Tracking also closes the gaps between words, so they are given
                  back (`word-spacing`), and the lines sit far enough apart for
                  the circumflex of „î" to clear the descender above it. */}
              <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[0.96] tracking-[-0.04em] text-foreground [word-spacing:0.06em] sm:text-6xl lg:text-7xl">
                <Trans>
                  Date publice,
                  <br />
                  pe înțeles
                </Trans>
              </h1>
              <p className="mt-5 max-w-[46ch] text-balance text-lg leading-relaxed tracking-normal text-muted-foreground sm:text-xl">
                <Trans>
                  Din surse oficiale, pentru decizii informate.
                </Trans>
              </p>
              <div className="mt-6 sm:mt-7">
                <HeroSearch inputRef={searchInputRef} />
              </div>
              {/* Balances the column against the taller panel, and gives the
                  three heaviest surfaces a direct route out of the hero. The
                  label is a sentence that runs into the links, so it is set in
                  their voice (plain text, not a mono caption) and shares their
                  baseline. It sits on its own line below `sm`, where keeping it
                  inline pushed one shortcut onto a second row on its own.

                  On a phone each shortcut is a 44px row rather than a 20px line
                  of text: these are the first things a thumb reaches for after
                  the search, and 20px is under the 24 WCAG 2.2 §2.5.8 asks for.

                  The icon button opens every section, for a reader whose
                  section is not one of the three. It closes the row on a wide
                  screen. On a phone the three links fill the row, so it sits
                  at the end of the label's line; its negative margins keep
                  either line from growing around a 44px (32px) button. */}
              <nav
                aria-label={t`Scurtături`}
                className="mt-4 flex flex-wrap items-center justify-between sm:flex-nowrap sm:items-baseline sm:justify-start sm:gap-x-4"
              >
                <span className="text-sm text-muted-foreground">
                  <Trans>Sau mergi direct la</Trans>
                </span>
                <span className="order-last flex basis-full flex-wrap gap-x-4 sm:order-none sm:basis-auto sm:gap-x-5 sm:gap-y-1.5">
                  {SHORTCUTS.map((shortcut) => (
                    <Link
                      key={shortcut.to}
                      to={shortcut.to}
                      preload="intent"
                      className="inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary sm:min-h-0"
                    >
                      {i18n._(shortcut.label)}
                    </Link>
                  ))}
                </span>
                <SectionsMenu groups={groups} className="-my-2 -mr-3 sm:-my-1.5 sm:-ml-1 sm:mr-0 sm:self-center" />
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
        </RuledFrame>
      </section>

      <NationalFactsBand />

      {/* Index — dense band. It follows the figures directly: the hero has
          already said what the platform is, so nothing introduces the list. */}
      <section className="border-b">
        <RuledFrame className="py-14">
          <SurfaceIndex groups={groups} />
        </RuledFrame>
      </section>

      {/* The campaign card („Provocări") is hidden for now, by the owner's
          choice; `CampaignLandingShareCard` is kept for when it returns. */}
      {/* The map, full width: every primărie's budget, loaded in the
          background as the reader approaches it. */}
      <BudgetMapSection />

      {/* The people — the page's last band. No `border-b`: the footer's top
          rule closes it, and a second one here would double it. */}
      <section>
        <RuledFrame className="py-14 sm:py-16">
          <PeopleBand />
        </RuledFrame>
      </section>
    </div>
  )
}
