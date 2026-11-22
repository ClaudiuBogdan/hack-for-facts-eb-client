import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight, Minus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import logo from '@/assets/logo/logo-mark.webp'
import { buildEntityDetailsPath } from '@/lib/entity-navigation'
import { cn } from '@/lib/utils'
import { useDockDrag } from '@/features/landing/hooks/use-dock-drag'
import { TILT_PANEL_CLASS, TILT_SCENE_CLASS, TILT_SHADOW_CLASS } from './panel-tilt'

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
 * exist below `lg`, and `panel-tilt.tsx` acts on this inside the same media
 * query, so a phone always renders the list.
 */
type WindowState = 'open' | 'minimised' | 'closed'

/**
 * The panel's rows: five large town halls and a ministry, each a page a
 * first-time reader can open and find full. Named in full and described as the
 * search describes its results („Primărie · Jud. Sibiu"), so a row here and a
 * row in the dropdown read as the same kind of thing. `county: null` is
 * Bucharest, which is no county.
 */
type Institution = {
  readonly cui: string
  readonly name: string
  readonly kind: 'townHall' | 'ministry'
  readonly county: string | null
}

const INSTITUTIONS: readonly Institution[] = [
  { cui: '4270740', name: 'Municipiul Sibiu', kind: 'townHall', county: 'Sibiu' },
  { cui: '4267117', name: 'Municipiul București', kind: 'townHall', county: null },
  { cui: '4305857', name: 'Municipiul Cluj-Napoca', kind: 'townHall', county: 'Cluj' },
  { cui: '14756536', name: 'Municipiul Timișoara', kind: 'townHall', county: 'Timiș' },
  { cui: '4541580', name: 'Municipiul Iași', kind: 'townHall', county: 'Iași' },
  { cui: '4266456', name: 'Ministerul Sănătății', kind: 'ministry', county: null },
]

/**
 * A row's second line: what the institution is, and where. The county is
 * called `name` because the variable's name is part of the message id:
 * `Jud. {name}` is already translated, `Jud. {county}` would be a new string.
 */
function describe({ kind, county: name }: Institution): string {
  const what = kind === 'townHall' ? t`Primărie` : t`Minister`
  const where = name ? t`Jud. ${name}` : 'București'
  return `${what} · ${where}`
}

/**
 * Real entities, as product UI. Three-tier hierarchy, tabular CUIs.
 *
 * On desktop it is framed as a window: the perspective in `panel-tilt.tsx`
 * turns it, and the title bar says what the angle is implying — that this is a
 * separate surface holding the product, not another box in the page's own
 * plane.
 *
 * On a phone it is a list, and that is all of it. The hero is one column there,
 * so a pane angled toward a headline sitting directly above it would be angled
 * at nothing; and a title bar carrying three window controls, on a device that
 * has no windows, is a costume rather than a metaphor. The chrome and the
 * depth begin at `lg` together. Below it the list is a card in the search
 * field's own outline — the same radius and border colour — with its caption
 * on the tinted strip the search dropdown's header has (owner, 22 November
 * 2026: the square hairline box read as unfinished under the rounded field).
 *
 * The lights work, which is the whole reason they are built the way they are: a
 * control that looks like it closes something and does nothing is worse than no
 * control, so each one is a real element with a real name and a real target.
 * Close and minimise are buttons because they act on this page; zoom is a link
 * because it navigates, and a reader who middle-clicks it should get a tab.
 */
export function StartHerePanel({
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
       layout was already giving for free. */
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
          uses, and what the search field above has. */}
      <div
        ref={panelRef}
        className={cn(TILT_PANEL_CLASS, 'overflow-hidden rounded-lg border border-input bg-card lg:border-border')}
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
              aria-label={t`Închide fereastra cu instituții`}
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
              aria-label={t`Minimizează fereastra cu instituții`}
              className={LIGHT_TARGET_CLASS}
            >
              <WindowLight tone={WINDOW_LIGHTS.minimise} icon={Minus} />
            </button>
            <Link
              to="/entity-analytics"
              preload="intent"
              aria-label={t`Deschide analiza entităților`}
              className={LIGHT_TARGET_CLASS}
            >
              <WindowLight tone={WINDOW_LIGHTS.zoom} icon={ArrowUpRight} />
            </Link>
          </span>
        </div>
        {/* The list's caption and its one column label, in the page's own
            voice: sentence case, the sans, quieter than the rows. The mono is
            kept for the identifiers themselves (DESIGN.md, „mono only where
            it is necessary"). The search dropdown's header is set the same. */}
        <div className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-4 py-3 text-xs text-muted-foreground lg:bg-transparent">
          <span>
            <Trans>Instituții</Trans>
          </span>
          <span>CUI</span>
        </div>
        {/* No rules between the rows: the two-line rhythm separates them, and
            six hairlines would make a table of a short list. */}
        <ul>
          {INSTITUTIONS.map((entity) => (
            <li key={entity.cui}>
              <Link
                to={buildEntityDetailsPath(entity.cui)}
                preload="intent"
                className="group flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-card-foreground group-hover:underline">
                    {entity.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{describe(entity)}</span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {entity.cui}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {/* The way on from six examples to every institution. The zoom light
            goes to the same page, but only a reader who tries the lights finds
            that, and a phone has no lights. */}
        <Link
          to="/entity-analytics"
          preload="intent"
          className="group flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="group-hover:underline">
            <Trans>Toate instituțiile</Trans>
          </span>
          <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
        </Link>
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
          aria-label={t`Redeschide fereastra cu instituții`}
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
