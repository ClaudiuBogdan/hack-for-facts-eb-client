import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { MonoLabel } from '../landing/home-refs.mono-label'
import { CookieArtStyles, PixelCookie, type CookieState } from './cookies.cookie-art'
import {
  ESSENTIAL_CATEGORY,
  OPTIONAL_CATEGORIES,
  cookieStateFor,
  useConsentDraft,
} from './cookies.state'

/**
 * The consent card — `CookieConsentBanner.tsx`, rebuilt.
 *
 * What changed, and why each change is a decision:
 *
 * - **Non-modal, and says so.** `role="dialog"` with `aria-modal="false"`, no
 *   backdrop, no focus trap. The page behind it is usable, which is what a
 *   reader who has not decided yet is entitled to. The shipped one was a Radix
 *   Toast with a 20-second timer, which is the wrong primitive: a consent
 *   question does not expire.
 * - **Refusing is as easy as accepting.** Two buttons of one size on one row.
 *   The filled one is "accept", the bordered one is "essential only", and both
 *   are one click. There is a third way — choose — but it is a disclosure
 *   inside the card, not a trip to another page, so nobody leaves the article
 *   they were reading to say no to analytics.
 * - **Closing is honest.** The × means "not now": nothing is stored, the
 *   privacy-safe defaults apply, and the question comes back next visit. Its
 *   accessible name says exactly that.
 * - **The picture answers the click.** A whole cookie while the question is
 *   open; bitten when everything is accepted, plain when only the essentials
 *   are. Then the card leaves. That is the only motion keyed to the reader, and
 *   it reports what they did.
 * - **One accent.** The chips and the filled button are the page's navy;
 *   everything else is the neutral scale. The shipped card's `blue-600`,
 *   `slate-200/30` and `shadow-2xl` are gone.
 *
 * Copy is Romanian source text, per `docs/design/prototyping.md`. The shipped
 * banner is English-source under Lingui; promotion has to pick one.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
export const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

type CardView = 'ask' | 'choose' | 'saved'
type CardPhase = 'entering' | 'open' | 'leaving'

const PHASE_ATTR = 'data-phase'

/** DESIGN.md §Entrance recipe: opacity and a rise, strong ease-out, short delay. */
const ENTER_MS = 640
const ENTER_DELAY_MS = 120
/** Leaving is quicker than arriving — the reader has already moved on. */
const LEAVE_MS = 240
/** How long the confirmation stays before the card goes. Long enough to read one line. */
const SAVED_HOLD_MS = 1900
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

/** What the confirmation says, by what was decided. */
function savedCopy(state: CookieState): { readonly title: string; readonly body: string } {
  switch (state) {
    case 'bitten':
      return {
        title: 'Mulțumim.',
        body: 'Statisticile și rapoartele de erori sunt pornite. Le oprești oricând din Setări cookie-uri.',
      }
    case 'plain':
      return {
        title: 'Doar esențialul.',
        body: 'Fără statistici, fără rapoarte detaliate de erori. Te răzgândești oricând din Setări cookie-uri.',
      }
    default:
      return {
        title: 'Notat.',
        body: 'Pornești sau oprești fiecare opțiune oricând din Setări cookie-uri.',
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
  const location = useLocation()
  const redirect = `${location.pathname}${location.searchStr ?? ''}`

  // Two frames after mount, so the 'entering' state has been painted and the
  // switch to 'open' is a transition rather than an initial style.
  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase('open'))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'leaving') return
    const timer = setTimeout(onGone, LEAVE_MS)
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
      if (view === 'choose') setView('ask')
      else setPhase('leaving')
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
              'tpz-cookie-lean shrink-0 transition-transform duration-500 ease-out',
              view === 'saved' && 'scale-110',
            )}
          >
            <PixelCookie
              state={cookieState}
              delayMs={ENTER_DELAY_MS + 160}
              className="size-14 sm:size-16"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <MonoLabel className="block pt-1 text-primary">
                {view === 'saved' ? 'Salvat' : 'Confidențialitate'}
              </MonoLabel>
              {view === 'saved' ? null : (
                <button
                  type="button"
                  onClick={() => setPhase('leaving')}
                  aria-label="Nu acum — rămâne doar esențialul, întrebăm data viitoare"
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
              {view === 'saved' ? saved.title : 'Fără urmărire pe ascuns'}
            </h2>
          </div>
        </div>

        <p
          id={descriptionId}
          aria-live="polite"
          className="mt-3 text-sm leading-relaxed text-muted-foreground"
        >
          {view === 'saved'
            ? saved.body
            : 'Aplicația ține minte în browser doar preferințele tale. Statisticile de utilizare și rapoartele de erori pornesc numai dacă le pornești tu.'}
        </p>

        {view === 'saved' ? null : (
          <>
            <Collapsible open={isChoosing} onOpenChange={(open) => setView(open ? 'choose' : 'ask')}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group mt-3 -ml-1 flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Alege tu ce pornești</span>
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
                        <span className="text-sm font-medium">{ESSENTIAL_CATEGORY.title}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                        {ESSENTIAL_CATEGORY.summary}
                      </p>
                    </div>
                    <MonoLabel className="shrink-0 text-muted-foreground">Mereu</MonoLabel>
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
                            <span className="text-sm font-medium">{category.title}</span>
                            <MonoLabel className="text-muted-foreground">{category.vendor}</MonoLabel>
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                            {category.summary}
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
                Doar esențiale
              </Button>
              {isChoosing ? (
                <Button
                  onClick={() => decide(save, cookieStateFor(draft, true))}
                  className="h-10 flex-1"
                >
                  Salvează alegerea
                </Button>
              ) : (
                <Button onClick={() => decide(everything, 'bitten')} className="h-10 flex-1">
                  Acceptă tot
                </Button>
              )}
            </div>

            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              <Link to="/cookie-policy" className={FOOT_LINK_CLASS}>
                <MonoLabel className="whitespace-nowrap">Politica de cookie-uri</MonoLabel>
              </Link>
              <Link to="/cookies" search={{ redirect }} className={FOOT_LINK_CLASS}>
                <MonoLabel className="whitespace-nowrap">Toate setările</MonoLabel>
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

/**
 * The variant: a page to stand on, and the card over it.
 *
 * The page is a stand-in — two paragraphs and enough height to scroll — so the
 * fixed card can be judged against text, at the bottom of a viewport, with the
 * frame rules the real pages carry. The strip at the top is prototype chrome:
 * the real card mounts once per undecided visit, and iterating on an entrance
 * that plays once per `localStorage` wipe is not iterating.
 */
export function ConsentModalStage() {
  const [generation, setGeneration] = useState(0)
  const [mounted, setMounted] = useState(false)
  const { saved, hasDecision } = useConsentDraft()

  // The shipped banner waits half a second after navigation; the same here,
  // so the card arrives on a page that is already there.
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500)
    return () => clearTimeout(timer)
  }, [generation])

  const replay = () => {
    setMounted(false)
    setGeneration((current) => current + 1)
  }

  // Stable, so the card's leave timer is not restarted by a re-render of the
  // strip above it — which happens on every consent change, i.e. exactly
  // while the card is leaving.
  const unmount = useCallback(() => setMounted(false), [])

  const clearDecision = () => {
    window.localStorage.removeItem('cookie-consent')
    window.dispatchEvent(new Event('consent:changed'))
    replay()
  }

  return (
    <div className="relative min-h-[140vh] bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <CookieArtStyles />
      <ConsentCardStyles />
      <div className="border-b bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2 sm:px-8">
          <MonoLabel className="text-muted-foreground">Prototip</MonoLabel>
          <MonoLabel className="text-muted-foreground/70">
            decizie stocată: {hasDecision ? 'da' : 'nu'} · statistici:{' '}
            {saved.analytics ? 'pornit' : 'oprit'} · erori: {saved.sentry ? 'pornit' : 'oprit'}
          </MonoLabel>
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={replay}>
              Reafișează
            </Button>
            <Button size="sm" variant="outline" onClick={clearDecision}>
              Șterge decizia
            </Button>
          </span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-border" />
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-px bg-border" />
        <MonoLabel className="block text-primary">Pagina de dedesubt</MonoLabel>
        <h1 className="mt-3 max-w-[20ch] text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Execuția bugetară, pe scurt
        </h1>
        <div className="mt-6 max-w-[62ch] space-y-5 text-base leading-relaxed text-muted-foreground">
          <p>
            Text de umplutură, ca să existe ceva sub card. Pagina rămâne
            utilizabilă cât timp întrebarea e deschisă: fără fundal întunecat,
            fără blocarea derulării, fără capcană de focus.
          </p>
          <p>
            Derulează. Cardul stă pe loc în colțul din dreapta jos pe ecran lat
            și ocupă toată lățimea, jos, pe telefon.
          </p>
        </div>
      </div>

      {mounted ? <ConsentCard key={generation} onGone={unmount} /> : null}
    </div>
  )
}
