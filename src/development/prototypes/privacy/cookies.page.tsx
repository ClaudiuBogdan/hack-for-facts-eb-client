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
import { CookieIllustration } from './cookies.cookie-art'
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
 * of the same site: the ruled frame, a numbered band, full-width choice rows,
 * and mono captions for state. Nothing here is a card inside a card.
 *
 * **One choice per row, full width.** The choices were three cells side by
 * side, which made each one a narrow column of wrapped text and put the switch
 * at the bottom of a card — three switches on three different baselines, none
 * of them where the eye lands. A row per choice gives every switch the same
 * place on the right, the same size target, and the whole text block as its
 * label, which is the part of the page that has to be effortless.
 *
 * **There is no inventory table.** It listed every key the app writes with its
 * lifetime and its state — the cookie policy's own table, restated. Two copies
 * of a list like that is one more than can be kept true, and the policy is one
 * click away in the footer. What survived is the sentence per choice that says
 * what it actually stores, beside the switch that governs it, which is the part
 * a reader deciding needs.
 *
 * **The picture reflects the stored answer.** The same cookie as the card, in
 * the state the reader last chose, so the page opens by telling them where they
 * stand before they read a word.
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

export function CookieSettingsPage() {
  const { saved, draft, hasDecision, hydrated, isDirty, patch, save, essentialOnly, everything } =
    useConsentDraft()
  const search = useSearch({ strict: false }) as Readonly<{ redirect?: unknown }>
  const redirect = isSafeRedirect(search.redirect) ? search.redirect : undefined
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef)

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

  return (
    <div ref={rootRef} className="bg-background" data-dev-marker={PROTOTYPE_MARKER}>
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
                <CookieIllustration state={cookieState} className="size-32 sm:size-40" />
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

      {/* Choices. No band heading: the rows are the only thing here, the
          headline above already says what they are, and a numbered title over
          three switches was labelling the obvious. The region keeps a name for
          anyone listing landmarks. */}
      <section className="border-b" aria-label="Alegerile tale">
        <Frame className="py-12 sm:py-14">
          {/* No rule above the first row: the band's own divider is a few
              pixels up, and two hairlines that close together read as a
              mistake. Each row draws its own bottom edge instead. */}
          <div>
            <ChoiceRow
              icon={CATEGORY_ICON.essential}
              index={ESSENTIAL_CATEGORY.index}
              title={ESSENTIAL_CATEGORY.title}
              vendor={ESSENTIAL_CATEGORY.vendor}
              summary={ESSENTIAL_CATEGORY.summary}
              detail={ESSENTIAL_CATEGORY.detail}
              state={<MonoLabel className="text-muted-foreground">Mereu</MonoLabel>}
              control={<Switch checked disabled aria-label="Esențiale, mereu active" />}
            />
            {OPTIONAL_CATEGORIES.map((category) => {
              const id = `cookies-${category.key}`
              const on = draft[category.key]
              return (
                <ChoiceRow
                  key={category.key}
                  icon={CATEGORY_ICON[category.key]}
                  index={category.index}
                  title={category.title}
                  vendor={category.vendor}
                  summary={category.summary}
                  detail={category.detail}
                  labelFor={id}
                  active={on}
                  state={
                    <>
                      <MonoLabel className={cn(on ? 'text-foreground' : 'text-muted-foreground')}>
                        {on ? 'Pornit' : 'Oprit'}
                      </MonoLabel>
                      {on !== saved[category.key] ? (
                        <MonoLabel className="text-primary">nesalvat</MonoLabel>
                      ) : null}
                    </>
                  }
                  control={
                    <Switch
                      id={id}
                      checked={on}
                      onCheckedChange={(checked) => patch({ [category.key]: checked })}
                    />
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

      {/* Where the long version lives — including the full list of keys and
          their lifetimes, which is the policy's job to keep current. */}
      <section>
        <Frame className="py-10 sm:py-12">
          <p data-reveal className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            Lista completă a ce se scrie în browserul tău, cu durata fiecărei
            chei, este în politica de cookie-uri.
          </p>
          <p data-reveal className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
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
 * One choice, full width, with the switch on the right.
 *
 * The text block is the switch's label, so the target is the row rather than a
 * 44x24 control — everything except the switch itself, which is deliberately
 * left outside the `<label>`. A Radix `Switch` renders a button, not an input,
 * so a label wrapping it would forward the click it just received and toggle
 * twice.
 */
function ChoiceRow({
  icon: Icon,
  index,
  title,
  vendor,
  summary,
  detail,
  control,
  state,
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
  readonly state: ReactNode
  readonly labelFor?: string
  readonly active?: boolean
}) {
  const body = (
    <>
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-semibold tracking-tight text-foreground">{title}</span>
        <MonoLabel className="text-muted-foreground">{vendor}</MonoLabel>
      </span>
      <span className="mt-2 block text-sm leading-snug text-foreground">{summary}</span>
      <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
    </>
  )
  return (
    <div
      data-reveal
      className={cn(
        'flex items-center gap-4 border-b py-5 transition-colors sm:gap-6',
        !active && 'text-muted-foreground',
      )}
    >
      <MonoLabel className="hidden shrink-0 self-start pt-1 text-muted-foreground/50 sm:block">
        {index}
      </MonoLabel>
      <Icon
        className={cn(
          'mt-0.5 size-5 shrink-0 self-start transition-colors',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      {labelFor ? (
        <label htmlFor={labelFor} className="min-w-0 flex-1 cursor-pointer">
          {body}
        </label>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      <div className="flex shrink-0 flex-col items-end gap-2 pl-2">
        {control}
        <span className="flex flex-col items-end gap-0.5 text-right">{state}</span>
      </div>
    </div>
  )
}
