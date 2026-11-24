import { useState, type ComponentType } from 'react'
import { useLingui } from '@lingui/react/macro'
import { ChevronDown, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'
import { CookieIllustration } from '@/features/privacy/components/cookie-illustration'
import type { CookieState } from '@/features/privacy/lib/consent-categories'
import { cn } from '@/lib/utils'
import { ART_CSS, CoinCookie, PieCookie, StampCookie } from './consent-card-v2.art'
import { FACE_CSS, FaceCookie } from './consent-card-v2.face'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/**
 * The polished card: Inter only (no mono capitals), no eyebrow, plainer words,
 * no corner ticks (they also made the scrolling card grow a horizontal
 * scrollbar). The decision is mocked: nothing is saved here.
 */

type Art = ComponentType<{ readonly state: CookieState; readonly className?: string }>

const CARD_CSS = `
@keyframes tpzc-card-in { from { opacity: 0; translate: 0 20px; } to { opacity: 1; translate: none; } }
.tpzc-card { animation: tpzc-card-in 640ms cubic-bezier(0.16, 1, 0.3, 1) 120ms backwards; }
@keyframes tpzc-row-in { from { opacity: 0; translate: 0 6px; } to { opacity: 1; translate: none; } }
.tpzc-row { animation: tpzc-row-in 360ms cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--tpzc-row) * 60ms); }
@media (prefers-reduced-motion: reduce) { .tpzc-card, .tpzc-row { animation: none; } }
${ART_CSS}
${FACE_CSS}
`

function Card({ art: ArtComponent }: { readonly art: Art }) {
  const { t } = useLingui()
  const [state, setState] = useState<CookieState>('whole')
  const [choosing, setChoosing] = useState(false)
  const [prefs, setPrefs] = useState({ analytics: false, sentry: false })
  const decided = state !== 'whole'

  const saved =
    state === 'bitten'
      ? { title: t`Mulțumim!`, body: t`Statisticile și rapoartele de erori sunt pornite. Le oprești oricând din setări.` }
      : state === 'plain'
        ? { title: t`Doar esențialul.`, body: t`Fără statistici și fără rapoarte detaliate de erori. Te poți răzgândi oricând din setări.` }
        : { title: t`Am notat.`, body: t`Pornești sau oprești fiecare opțiune oricând din setări.` }

  return (
    <section role="dialog" aria-modal="false" aria-label={t`Cookie-uri`} className="tpzc-card relative w-full max-w-[26rem] overflow-y-auto rounded-lg border bg-background text-foreground shadow-lg">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className={cn('shrink-0 transition-transform duration-500 ease-out motion-reduce:transition-none', decided && 'motion-safe:scale-110')}>
            <ArtComponent state={state} className="size-16 sm:size-[4.5rem]" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg leading-snug font-semibold tracking-tight text-balance">{decided ? saved.title : t`Cookie-uri puține, la vedere`}</h2>
              {!decided && (
                <button
                  type="button"
                  aria-label={t`Nu acum: rămâne doar esențialul, te întrebăm data viitoare`}
                  className="-mt-1.5 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>

        <p aria-live="polite" className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
          {decided
            ? saved.body
            : t`Folosim doar ce e nevoie ca site-ul să meargă. Statisticile de vizite și rapoartele de erori pornesc numai dacă alegi tu.`}
        </p>

        {!decided && (
          <>
            <Collapsible open={choosing} onOpenChange={setChoosing}>
              <CollapsibleTrigger asChild>
                <button type="button" className="group mt-3 -ml-1 flex h-8 items-center gap-1 rounded-md px-1 text-sm font-medium transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden">
                  {t`Alege ce pornești`}
                  <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 border-t">
                  <li className="tpzc-row flex items-center justify-between gap-4 border-b py-3" style={{ ['--tpzc-row' as string]: 0 }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t`Esențiale`}</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{t`Limba, tema, moneda, graficele salvate și această alegere.`}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{t`Mereu pornite`}</span>
                  </li>
                  {(
                    [
                      ['analytics', t`Statistici de vizite`, t`PostHog`, t`Ce pagini se deschid, ca să știm ce merită îmbunătățit.`],
                      ['sentry', t`Rapoarte de erori`, t`Sentry`, t`Când ceva se strică, primim contextul ca să reparăm.`],
                    ] as const
                  ).map(([key, title, vendor, summary], index) => (
                    <li key={key} className="tpzc-row flex items-center justify-between gap-4 border-b py-3" style={{ ['--tpzc-row' as string]: index + 1 }}>
                      <label htmlFor={`tpzc-${key}`} className="min-w-0 cursor-pointer">
                        <span className="text-sm font-medium">{title}</span> <span className="text-xs text-muted-foreground">{vendor}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{summary}</span>
                      </label>
                      <Switch id={`tpzc-${key}`} checked={prefs[key]} onCheckedChange={(checked) => setPrefs((current) => ({ ...current, [key]: checked }))} />
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setState('plain')} className="h-10 flex-1 border-foreground/25 hover:border-foreground/40">
                {t`Doar esențiale`}
              </Button>
              {choosing ? (
                <Button onClick={() => setState(prefs.analytics || prefs.sentry ? 'bitten' : 'plain')} className="h-10 flex-1">
                  {t`Salvează alegerea`}
                </Button>
              ) : (
                <Button onClick={() => setState('bitten')} className="h-10 flex-1">
                  {t`Acceptă tot`}
                </Button>
              )}
            </div>

            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a href="/cookie-policy" className="underline-offset-4 hover:text-foreground hover:underline">{t`Politica de cookie-uri`}</a>
              <a href="/cookies" className="underline-offset-4 hover:text-foreground hover:underline">{t`Toate setările`}</a>
            </p>
          </>
        )}
      </div>
    </section>
  )
}

/** A stage per version: the card where it sits on a page, and „Din nou” to replay its arrival. */
function Stage({ art }: { readonly art: Art }) {
  const { t } = useLingui()
  const [run, setRun] = useState(0)
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="space-y-2">
      <style>{CARD_CSS}</style>
      <div className="flex justify-end">
        <button type="button" onClick={() => setRun((value) => value + 1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="size-3" aria-hidden />
          {t`Din nou`}
        </button>
      </div>
      <div className="flex min-h-[32rem] items-end justify-end rounded-md border bg-muted/30 p-3 sm:p-6">
        <Card key={run} art={art} />
      </div>
    </div>
  )
}

export function Current() {
  return <Stage art={CookieIllustration} />
}
export function Pie() {
  return <Stage art={PieCookie} />
}
export function Stamp() {
  return <Stage art={StampCookie} />
}
export function Coin() {
  return <Stage art={CoinCookie} />
}

function SadFace({ state, className }: { readonly state: CookieState; readonly className?: string }) {
  return <FaceCookie state={state} mood="sad" className={className} />
}
function CalmFace({ state, className }: { readonly state: CookieState; readonly className?: string }) {
  return <FaceCookie state={state} mood="calm" className={className} />
}
export function FaceSad() {
  return <Stage art={SadFace} />
}
export function FaceCalm() {
  return <Stage art={CalmFace} />
}
