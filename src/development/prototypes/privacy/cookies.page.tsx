import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, Bug, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn, getUserLocale } from '@/lib/utils'
import { Frame, PROTOTYPE_MARKER } from '../landing/about.parts'
import { MonoLabel } from '../landing/home-refs.mono-label'
import { RevealStyles, useRevealOnView } from '../landing/home-refs.reveal'
import { ScrambleText, scrambleWithin, stopScrambling } from '../landing/home-refs.scramble'
import { CookieArtStyles, PixelCookie } from './cookies.cookie-art'
import {
  ESSENTIAL_CATEGORY,
  OPTIONAL_CATEGORIES,
  cookieStateFor,
  useConsentDraft,
  type OptionalCategoryKey,
} from './cookies.state'

/**
 * `/cookies`, on the landing's skin.
 *
 * The shipped page is three shadcn cards under a settings icon — competent and
 * anonymous. This one is built from the landing's parts so it reads as a page
 * of the same site: the ruled frame, numbered bands, a lattice of cells for the
 * choices, and mono captions for state. Nothing here is a card inside a card.
 *
 * Two things the shipped page does not do:
 *
 * - **It shows the inventory.** The cookie policy lists every key the app
 *   writes; this page lists them too, next to the switches that govern them,
 *   with the state each one is in *right now*. `DESIGN.md` §Data Trust asks
 *   every surface to answer "where did this come from" — for a consent page the
 *   equivalent question is "what exactly did I just allow", and the answer
 *   belongs beside the switch, not in a policy three clicks away.
 * - **The picture reflects the stored answer.** The same cookie as the card,
 *   in the state the reader last chose, so the page opens by telling them
 *   where they stand before they read a word.
 *
 * `redirect` is read with `useSearch({ strict: false })` since a prototype
 * cannot bind to `/cookies`; the safe-path check is the shipped one.
 */

const isSafeRedirect = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')

const CATEGORY_ICON: Readonly<Record<'essential' | OptionalCategoryKey, LucideIcon>> = {
  essential: Shield,
  analytics: BarChart3,
  sentry: Bug,
}

/**
 * What the app writes, from the cookie policy's own breakdown. `governedBy`
 * ties each row to the switch that controls it, so the table's state column is
 * derived from consent rather than typed in.
 */
const INVENTORY: readonly {
  readonly name: string
  readonly governedBy: 'essential' | 'account' | OptionalCategoryKey
  readonly purpose: string
  readonly lifetime: string
}[] = [
  { name: 'cookie-consent', governedBy: 'essential', purpose: 'Alegerea de pe această pagină', lifetime: 'până o ștergi' },
  { name: 'ui-theme · user-locale · user-currency · user-inflation-adjusted', governedBy: 'essential', purpose: 'Cum îți afișăm cifrele: temă, limbă, monedă, ajustare la inflație', lifetime: 'până le ștergi' },
  { name: 'saved-charts · chart-categories', governedBy: 'essential', purpose: 'Graficele salvate și ordinea lor', lifetime: 'până le ștergi' },
  { name: 'guided-platform-tour-progress · learning_progress_*', governedBy: 'essential', purpose: 'Unde ai rămas: turul ghidat, progresul la învățare', lifetime: 'până le ștergi' },
  { name: '__session · __clerk_*', governedBy: 'account', purpose: 'Sesiunea contului, dacă ți-ai făcut unul', lifetime: 'sesiune · 30 de zile cu „ține-mă minte”' },
  { name: 'ph_*', governedBy: 'analytics', purpose: 'Identificator PostHog pentru statistici', lifetime: 'până la 1 an' },
  { name: 'sentryReplaySession', governedBy: 'sentry', purpose: 'Pașii de dinaintea erorii, pentru contextul raportului', lifetime: 'sesiunea' },
]

function startArrivalEffects(block: Element, delay: number) {
  scrambleWithin(block, delay)
}

export function CookieSettingsPage() {
  const { saved, draft, hasDecision, hydrated, isDirty, patch, save, essentialOnly, everything } =
    useConsentDraft()
  const search = useSearch({ strict: false }) as Readonly<{ redirect?: unknown }>
  const redirect = isSafeRedirect(search.redirect) ? search.redirect : undefined
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects)
  useEffect(() => () => stopScrambling(), [])

  // The moment of saving, so the confirmation line can say so and then let
  // the "last changed" date take over. Local, since a save from another tab
  // is not this reader's click.
  const [justSaved, setJustSaved] = useState(false)
  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2400)
    return () => clearTimeout(timer)
  }, [justSaved])

  const goBack = () => {
    if (redirect) navigate({ href: redirect })
  }

  const commit = (action: () => void) => {
    action()
    setJustSaved(true)
  }

  const cookieState = cookieStateFor(saved, hasDecision)
  const locale = getUserLocale()
  const formatDate = (iso: string, month: 'long' | 'short') =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month, year: 'numeric' })
  const stateOf = (key: 'essential' | 'account' | OptionalCategoryKey): string => {
    if (key === 'essential') return 'mereu'
    if (key === 'account') return 'doar cu cont'
    return saved[key] ? 'pornit' : 'oprit'
  }

  return (
    <div ref={rootRef} className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <CookieArtStyles />
      <RevealStyles />

      {/* Head — open band, never hidden by the reveal. The server does not
          know the stored answer, so until storage has been read the picture
          is whole and the label says it is still reading — not "no choice
          yet", which would be a claim. */}
      <section className="border-b">
        <Frame className="py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7">
              {redirect ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="mb-6 -ml-1 flex h-8 items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Înapoi unde erai
                </button>
              ) : null}
              <MonoLabel className="block text-primary">Setări</MonoLabel>
              <h1 className="mt-3 max-w-[18ch] text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
                Ce ține minte browserul tău
              </h1>
              <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
                Esențialul rămâne la tine, în browser. Restul pornește numai
                dacă îl pornești — și se vede mai jos, rând cu rând, ce anume.
              </p>
            </div>
            <div className="flex items-end gap-6 lg:col-span-4 lg:col-start-9 lg:justify-end">
              <div className="tpz-cookie-lean">
                <PixelCookie state={cookieState} className="size-32 sm:size-40" />
              </div>
              <dl className="pb-1">
                <dt>
                  <MonoLabel className="text-muted-foreground/70">Starea ta</MonoLabel>
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">
                  {!hydrated
                    ? 'Se citește…'
                    : !hasDecision
                      ? 'Nicio alegere încă'
                      : cookieState === 'bitten'
                        ? 'Totul pornit'
                        : cookieState === 'plain'
                          ? 'Doar esențiale'
                          : 'Alegere proprie'}
                </dd>
                <dd className="mt-0.5 text-xs text-muted-foreground">
                  {!hydrated
                    ? 'din browserul tău'
                    : hasDecision
                      ? `din ${formatDate(saved.updatedAt, 'long')}`
                      : 'se aplică doar esențialele'}
                </dd>
              </dl>
            </div>
          </div>
        </Frame>
      </section>

      {/* Choices — dense band, the landing's lattice. */}
      <section className="border-b" aria-labelledby="cookies-choose">
        <Frame className="py-12 sm:py-14">
          <div data-reveal className="flex items-center gap-3">
            <MonoLabel className="text-primary">01</MonoLabel>
            <h2 id="cookies-choose">
              <MonoLabel className="text-foreground">
                <ScrambleText>Alege</ScrambleText>
              </MonoLabel>
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            <MonoLabel className="text-muted-foreground/60 tabular-nums">03</MonoLabel>
          </div>

          <div className="mt-4 grid grid-cols-1 border md:grid-cols-3">
            <ChoiceCell
              icon={CATEGORY_ICON.essential}
              index={ESSENTIAL_CATEGORY.index}
              title={ESSENTIAL_CATEGORY.title}
              vendor={ESSENTIAL_CATEGORY.vendor}
              summary={ESSENTIAL_CATEGORY.summary}
              detail={ESSENTIAL_CATEGORY.detail}
              control={
                <div className="flex items-center gap-3">
                  <Switch checked disabled aria-label="Esențiale, mereu active" />
                  <MonoLabel className="text-muted-foreground">Mereu</MonoLabel>
                </div>
              }
            />
            {OPTIONAL_CATEGORIES.map((category) => {
              const id = `cookies-${category.key}`
              const on = draft[category.key]
              return (
                <ChoiceCell
                  key={category.key}
                  icon={CATEGORY_ICON[category.key]}
                  index={category.index}
                  title={category.title}
                  vendor={category.vendor}
                  summary={category.summary}
                  detail={category.detail}
                  labelFor={id}
                  active={on}
                  control={
                    <div className="flex items-center gap-3">
                      <Switch
                        id={id}
                        checked={on}
                        onCheckedChange={(checked) => patch({ [category.key]: checked })}
                      />
                      <MonoLabel className={cn(on ? 'text-foreground' : 'text-muted-foreground')}>
                        {on ? 'Pornit' : 'Oprit'}
                      </MonoLabel>
                      {on !== saved[category.key] ? (
                        <MonoLabel className="text-primary">nesalvat</MonoLabel>
                      ) : null}
                    </div>
                  }
                />
              )
            })}
          </div>

          <div
            data-reveal
            className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => commit(essentialOnly)}
                className="h-10 border-foreground/25 px-5 text-foreground hover:border-foreground/40"
              >
                Doar esențiale
              </Button>
              <Button
                variant="outline"
                onClick={() => commit(everything)}
                className="h-10 border-foreground/25 px-5 text-foreground hover:border-foreground/40"
              >
                Acceptă tot
              </Button>
              {/* Stays enabled once there is nothing to save: disabling it
                  under the pointer throws focus to the body, and saving the
                  same answer again is harmless. */}
              <Button onClick={() => commit(save)} className="h-10 px-5">
                Salvează alegerea
              </Button>
            </div>
            <MonoLabel
              aria-live="polite"
              className={cn('block', justSaved ? 'text-primary' : 'text-muted-foreground')}
            >
              {justSaved
                ? 'Salvat'
                : isDirty
                  ? 'Modificări nesalvate'
                  : hasDecision
                    ? `Ultima alegere · ${formatDate(saved.updatedAt, 'short')}`
                    : 'Nicio alegere salvată'}
            </MonoLabel>
          </div>
        </Frame>
      </section>

      {/* Inventory — what exactly is written, by whom, for how long. */}
      <section className="border-b" aria-labelledby="cookies-inventory">
        <Frame className="py-12 sm:py-14">
          <div data-reveal className="flex items-center gap-3">
            <MonoLabel className="text-primary">02</MonoLabel>
            <h2 id="cookies-inventory">
              <MonoLabel className="text-foreground">
                <ScrambleText>Inventar</ScrambleText>
              </MonoLabel>
            </h2>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            <MonoLabel className="text-muted-foreground/60 tabular-nums">
              {String(INVENTORY.length).padStart(2, '0')}
            </MonoLabel>
          </div>
          <p data-reveal className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            Tot ce scrie aplicația în browserul tău, cu starea de acum. Lista
            este aceeași cu cea din politica de cookie-uri; aici e lângă
            comutatoarele care o guvernează.
          </p>
          <div data-reveal className="mt-6 overflow-x-auto border-t">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th scope="col" className="py-2.5 pr-4 text-left font-normal">
                    <MonoLabel className="text-muted-foreground">Cheie</MonoLabel>
                  </th>
                  <th scope="col" className="hidden py-2.5 pr-4 text-left font-normal sm:table-cell">
                    <MonoLabel className="text-muted-foreground">Scop</MonoLabel>
                  </th>
                  <th scope="col" className="hidden py-2.5 pr-4 text-left font-normal sm:table-cell">
                    <MonoLabel className="text-muted-foreground">Durată</MonoLabel>
                  </th>
                  <th scope="col" className="py-2.5 text-right font-normal">
                    <MonoLabel className="text-muted-foreground">Acum</MonoLabel>
                  </th>
                </tr>
              </thead>
              <tbody>
                {INVENTORY.map((row) => {
                  const state = stateOf(row.governedBy)
                  const off = state === 'oprit'
                  return (
                    <tr key={row.name} className={cn('border-b', off && 'text-muted-foreground')}>
                      {/* On a phone the row folds: key, then purpose, then
                          lifetime, in one cell — three narrow columns of
                          wrapped text read as a broken table, not a table. */}
                      <td className="py-3 pr-4 align-top">
                        <code className="font-mono text-xs tabular-nums text-foreground">{row.name}</code>
                        <span className="mt-1 block leading-snug sm:hidden">{row.purpose}</span>
                        <MonoLabel className="mt-1.5 block leading-relaxed text-muted-foreground sm:hidden">
                          {row.lifetime}
                        </MonoLabel>
                      </td>
                      <td className="hidden py-3 pr-4 align-top leading-snug sm:table-cell">{row.purpose}</td>
                      <td className="hidden py-3 pr-4 align-top leading-snug text-muted-foreground sm:table-cell">
                        {row.lifetime}
                      </td>
                      <td className="py-3 text-right align-top whitespace-nowrap">
                        <MonoLabel
                          className={cn(
                            off ? 'text-muted-foreground/60' : 'text-foreground',
                            state === 'pornit' && 'text-primary',
                          )}
                        >
                          {state}
                        </MonoLabel>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Frame>
      </section>

      {/* Where the long version lives. */}
      <section>
        <Frame className="py-10 sm:py-12">
          <p data-reveal className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/cookie-policy" className={FOOT_LINK_CLASS}>
              <MonoLabel>Politica de cookie-uri</MonoLabel>
            </Link>
            <Link to="/privacy" className={FOOT_LINK_CLASS}>
              <MonoLabel>Politica de confidențialitate</MonoLabel>
            </Link>
          </p>
        </Frame>
      </section>
    </div>
  )
}

const FOOT_LINK_CLASS =
  'text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-sm'

/**
 * One choice, as a lattice cell. The shipped page's card, without the card:
 * the cell's edges are the lattice's own hairlines.
 */
function ChoiceCell({
  icon: Icon,
  index,
  title,
  vendor,
  summary,
  detail,
  control,
  labelFor,
  active = true,
}: {
  readonly icon: LucideIcon
  readonly index: string
  readonly title: string
  readonly vendor: string
  readonly summary: string
  readonly detail: string
  readonly control: ReactNode
  readonly labelFor?: string
  readonly active?: boolean
}) {
  const body = (
    <>
      <span className="block text-base font-semibold tracking-tight text-foreground">{title}</span>
      <MonoLabel className="mt-1.5 block text-muted-foreground">{vendor}</MonoLabel>
      <span className="mt-3 block text-sm leading-snug text-foreground">{summary}</span>
    </>
  )
  return (
    <div
      data-reveal
      className={cn(
        '-ml-px -mt-px flex flex-col border-l border-t p-5 transition-colors',
        !active && 'bg-muted/20',
      )}
    >
      <span className="flex items-center justify-between">
        <Icon
          className={cn('size-4 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <MonoLabel className="text-muted-foreground/50">{index}</MonoLabel>
      </span>
      {labelFor ? (
        <label htmlFor={labelFor} className="mt-4 block cursor-pointer">
          {body}
        </label>
      ) : (
        <div className="mt-4">{body}</div>
      )}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-auto border-t pt-4">
        <div className="mt-0">{control}</div>
      </div>
    </div>
  )
}
