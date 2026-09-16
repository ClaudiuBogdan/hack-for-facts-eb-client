import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronDown, X } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { useConsentDraft } from '@/features/privacy/hooks/use-consent-draft'
import {
  ESSENTIAL_CATEGORY,
  OPTIONAL_CATEGORIES,
  cookieStateFor,
  type CookieState,
} from '@/features/privacy/lib/consent-categories'
import { CookieIllustration } from './cookie-illustration'

/**
 * The consent card.
 *
 * - **Non-modal, and says so.** `role="dialog"` with `aria-modal="false"`, no
 *   backdrop, no focus trap. The page behind it is usable, which is what a
 *   reader who has not decided yet is entitled to. A consent question does not
 *   expire, so it is not a toast with a timer either.
 * - **Refusing is as easy as accepting.** Two buttons of one size on one row.
 *   The filled one is "accept", the bordered one is "essential only", and both
 *   are one click. There is a third way — choose — but it is a disclosure
 *   inside the card, not a trip to another page.
 * - **Closing is honest.** The × means "not now": nothing is stored, the
 *   privacy-safe defaults apply, and the question comes back next visit. Its
 *   accessible name says exactly that.
 * - **The picture answers the click.** A whole cookie while the question is
 *   open; bitten when everything is accepted, plain when only the essentials
 *   are. Then the card leaves.
 * - **One accent.** The filled button is the page's navy; everything else is
 *   the neutral scale.
 */

type CardView = 'ask' | 'choose' | 'saved'
type CardPhase = 'entering' | 'open' | 'leaving'

const PHASE_ATTR = 'data-phase'

/** DESIGN.md §Entrance recipe: opacity and a rise, strong ease-out, short delay. */
const ENTER_MS = 640
const ENTER_DELAY_MS = 120
/** Leaving is quicker than arriving — the reader has already moved on. */
export const LEAVE_MS = 240
/** How long the confirmation stays before the card goes. Long enough to read one line. */
export const SAVED_HOLD_MS = 1900
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

const CSS = `
[${PHASE_ATTR}='entering'] {
  opacity: 0;
  translate: 0 20px;
}
[${PHASE_ATTR}='open'] {
  opacity: 1;
  translate: none;
  transition:
    opacity ${ENTER_MS}ms ${EASE} ${ENTER_DELAY_MS}ms,
    translate ${ENTER_MS}ms ${EASE} ${ENTER_DELAY_MS}ms;
}
[${PHASE_ATTR}='leaving'] {
  opacity: 0;
  translate: 0 12px;
  transition:
    opacity ${LEAVE_MS}ms ease-in,
    translate ${LEAVE_MS}ms ease-in;
}
/* The disclosure's rows arrive together, staggered by their index. An
   animation rather than a transition: Radix mounts the content on open, so
   there is no earlier state to transition from. */
@keyframes tpz-consent-row-in {
  from { opacity: 0; translate: 0 6px; }
  to { opacity: 1; translate: none; }
}
.tpz-consent-row {
  animation: tpz-consent-row-in 360ms ${EASE} backwards;
  animation-delay: calc(var(--tpz-row) * 60ms);
}

@media (prefers-reduced-motion: reduce) {
  [${PHASE_ATTR}] { opacity: 1; translate: none; transition: none; }
  [${PHASE_ATTR}='leaving'] { opacity: 0; }
  .tpz-consent-row { animation: none; }
}
`

export function ConsentCardStyles() {
  return <style>{CSS}</style>
}

/** What the confirmation says, by what was decided. Called at render. */
function savedCopy(state: CookieState): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'bitten':
      return {
        title: t`Mulțumim.`,
        body: t`Statisticile și rapoartele de erori sunt pornite. Le oprești oricând din Setări cookie-uri.`,
      }
    case 'plain':
      return {
        title: t`Doar esențialul.`,
        body: t`Fără statistici, fără rapoarte detaliate de erori. Te răzgândești oricând din Setări cookie-uri.`,
      }
    default:
      return {
        title: t`Notat.`,
        body: t`Pornești sau oprești fiecare opțiune oricând din Setări cookie-uri.`,
      }
  }
}

/**
 * The card itself. Owns its view and the entrance/exit phases; the host decides
 * when it exists.
 *
 * `onGone` fires once the leave transition has finished, so the host can
 * unmount it without cutting the fade.
 */
export function ConsentCard({ onGone }: { readonly onGone: () => void }) {
  const { i18n } = useLingui()
  const { draft, patch, save, essentialOnly, everything } = useConsentDraft()
  const [view, setView] = useState<CardView>('ask')
  const [phase, setPhase] = useState<CardPhase>('entering')
  // The decision the confirmation is showing. Read once at the click rather
  // than derived from storage, so the picture answers the button that was
  // pressed even if a second tab changes the stored answer meanwhile.
  const [decided, setDecided] = useState<CookieState>('whole')
  const titleId = useId()
  const descriptionId = useId()
  const cardRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Set when Escape collapses the disclosure, so focus returns to the trigger
  // once the switches it was on have unmounted rather than falling to <body>.
  const restoreTriggerFocus = useRef(false)
  // Whatever had focus when the card arrived, so a keyboard reader who moved
  // into the card is put back there when it leaves rather than dropped on
  // <body>. Read once at mount; the card is the only thing that moves focus
  // between then and its departure.
  const focusBefore = useRef<Element | null>(null)
  const location = useLocation()
  const redirect = `${location.pathname}${location.searchStr ?? ''}`

  // Two frames after mount, so the 'entering' state has been painted and the
  // switch to 'open' is a transition rather than an initial style. Only from
  // 'entering': a reader who dismisses within those two frames must not have
  // the card reopened under them.
  useEffect(() => {
    focusBefore.current = document.activeElement
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        setPhase((current) => (current === 'entering' ? 'open' : current)),
      )
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'leaving') return
    const timer = setTimeout(() => {
      const card = cardRef.current
      const previous = focusBefore.current
      if (card?.contains(document.activeElement) && previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true })
      }
      onGone()
    }, LEAVE_MS)
    return () => clearTimeout(timer)
  }, [phase, onGone])

  // The pressed button unmounts with the ask view, which would drop focus to
  // the body. The card takes it instead: its accessible name is now the
  // confirmation, so moving focus reads the answer out.
  useEffect(() => {
    if (view !== 'saved') return
    cardRef.current?.focus({ preventScroll: true })
    const timer = setTimeout(() => setPhase('leaving'), SAVED_HOLD_MS)
    return () => clearTimeout(timer)
  }, [view])

  useEffect(() => {
    if (view !== 'ask' || !restoreTriggerFocus.current) return
    restoreTriggerFocus.current = false
    triggerRef.current?.focus()
  }, [view])

  // Escape is "not now", the same as the ×, but only when nothing else owns
  // the key: not after a dialog or menu has already handled it, and not while
  // focus is inside some other widget. With the disclosure open, Escape
  // closes the disclosure first — the same one-level-at-a-time rule as
  // everywhere else.
  useEffect(() => {
    if (view === 'saved') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const active = document.activeElement
      const focusIsElsewhere = active && active !== document.body && !cardRef.current?.contains(active)
      if (focusIsElsewhere) return
      if (view === 'choose') {
        restoreTriggerFocus.current = true
        setView('ask')
      } else setPhase('leaving')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const decide = (action: () => void, outcome: CookieState) => {
    action()
    setDecided(outcome)
    setView('saved')
  }

  const cookieState: CookieState = view === 'saved' ? decided : 'whole'
  const isChoosing = view === 'choose'
  const saved = savedCopy(decided)

  return (
    <section
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      {...{ [PHASE_ATTR]: phase }}
      className={cn(
        'fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem]',
        // Never taller than the viewport: with the disclosure open on a phone
        // held sideways the card outgrows the screen, and a fixed element
        // that overflows the top cannot be scrolled to.
        'max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-h-[calc(100dvh-3rem)]',
        // Border and a floating-layer shadow, per DESIGN.md §Elevation: this
        // is one of the surfaces that genuinely floats.
        'rounded-lg border bg-background text-foreground shadow-lg focus-visible:outline-hidden',
      )}
    >
      <CornerTicks />
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Grows a little once the decision is in — the picture is the
              answer now, and the answer is the thing to look at. */}
          <div
            className={cn(
              'shrink-0 transition-transform duration-500 ease-out motion-reduce:transition-none',
              view === 'saved' && 'motion-safe:scale-110',
            )}
          >
            <CookieIllustration state={cookieState} className="size-14 sm:size-16" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <MonoLabel className="block pt-1 text-primary">
                {view === 'saved' ? <Trans>Salvat</Trans> : <Trans>Confidențialitate</Trans>}
              </MonoLabel>
              {view === 'saved' ? null : (
                <button
                  type="button"
                  onClick={() => setPhase('leaving')}
                  aria-label={t`Nu acum — rămâne doar esențialul, întrebăm data viitoare`}
                  className="-mr-2 -mt-2 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <h2
              id={titleId}
              className="mt-1.5 text-lg font-semibold leading-tight tracking-tight text-balance sm:text-xl"
            >
              {view === 'saved' ? saved.title : <Trans>Fără urmărire pe ascuns</Trans>}
            </h2>
          </div>
        </div>

        <p
          id={descriptionId}
          aria-live="polite"
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
        >
          {view === 'saved' ? (
            saved.body
          ) : (
            <Trans>
              Aplicația ține minte în browser doar preferințele tale. Statisticile de utilizare
              și rapoartele de erori pornesc numai dacă le pornești tu.
            </Trans>
          )}
        </p>

        {view === 'saved' ? null : (
          <>
            <Collapsible open={isChoosing} onOpenChange={(open) => setView(open ? 'choose' : 'ask')}>
              <CollapsibleTrigger asChild>
                <button
                  ref={triggerRef}
                  type="button"
                  className="group mt-3 -ml-1 flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>
                    <Trans>Alege tu ce pornești</Trans>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 border-t">
                  <li
                    className="tpz-consent-row flex items-center justify-between gap-4 border-b py-3"
                    style={{ ['--tpz-row' as string]: 0 }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <MonoLabel className="text-muted-foreground/60">{ESSENTIAL_CATEGORY.index}</MonoLabel>
                        <span className="text-sm font-medium">{i18n._(ESSENTIAL_CATEGORY.title)}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {i18n._(ESSENTIAL_CATEGORY.summary)}
                      </p>
                    </div>
                    <MonoLabel className="shrink-0 text-muted-foreground">
                      <Trans>Mereu</Trans>
                    </MonoLabel>
                  </li>
                  {OPTIONAL_CATEGORIES.map((category, index) => {
                    const switchId = `${titleId}-${category.key}`
                    return (
                      <li
                        key={category.key}
                        className="tpz-consent-row flex items-center justify-between gap-4 border-b py-3"
                        style={{ ['--tpz-row' as string]: index + 1 }}
                      >
                        <label htmlFor={switchId} className="min-w-0 cursor-pointer">
                          <span className="flex items-baseline gap-2">
                            <MonoLabel className="text-muted-foreground/60">{category.index}</MonoLabel>
                            <span className="text-sm font-medium">{i18n._(category.title)}</span>
                            <MonoLabel className="text-muted-foreground">{i18n._(category.vendor)}</MonoLabel>
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {i18n._(category.summary)}
                          </span>
                        </label>
                        <Switch
                          id={switchId}
                          checked={draft[category.key]}
                          onCheckedChange={(checked) => patch({ [category.key]: checked })}
                          className="shrink-0"
                        />
                      </li>
                    )
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => decide(essentialOnly, 'plain')}
                className="h-10 flex-1 border-foreground/25 text-foreground hover:border-foreground/40"
              >
                <Trans>Doar esențiale</Trans>
              </Button>
              {isChoosing ? (
                <Button
                  onClick={() => decide(save, cookieStateFor(draft, true))}
                  className="h-10 flex-1"
                >
                  <Trans>Salvează alegerea</Trans>
                </Button>
              ) : (
                <Button onClick={() => decide(everything, 'bitten')} className="h-10 flex-1">
                  <Trans>Acceptă tot</Trans>
                </Button>
              )}
            </div>

            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              <Link to="/cookie-policy" className={FOOT_LINK_CLASS}>
                <MonoLabel className="whitespace-nowrap">
                  <Trans>Politica de cookie-uri</Trans>
                </MonoLabel>
              </Link>
              <Link to="/cookies" search={{ redirect }} className={FOOT_LINK_CLASS}>
                <MonoLabel className="whitespace-nowrap">
                  <Trans>Toate setările</Trans>
                </MonoLabel>
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  )
}

const FOOT_LINK_CLASS =
  'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm'

/** The landing's crosshairs, at the card's top corners. */
function CornerTicks() {
  const arm = 'absolute size-2 border-foreground/25'
  return (
    <span aria-hidden="true">
      <span className={cn(arm, '-left-px -top-px rounded-tl-lg border-l border-t')} />
      <span className={cn(arm, '-right-px -top-px rounded-tr-lg border-r border-t')} />
    </span>
  )
}
