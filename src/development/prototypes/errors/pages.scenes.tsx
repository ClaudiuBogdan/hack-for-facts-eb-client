import { useId, useRef, useState, type ReactNode } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Home, RefreshCcw } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import type { Mood } from './pages.art'

/**
 * The page both states share, on the landing's skin: one band on the lattice,
 * the ruled frame, the crossing marks where its bottom rule meets the frame,
 * Inter only, one navy accent. The variants differ in the picture (and, for
 * the digits, in where it stands).
 *
 * The error page keeps today's behaviour: reload is a hard `reload()`, home a
 * hard `assign('/')`, so a page that failed on a stale chunk gets the new
 * deploy's. No technical details. While reload is hovered or focused the
 * picture mends itself; a click mends it, then reloads.
 */

export type Scene = 'not-found' | 'error' | 'update'
export type Layout = 'split' | 'center'

const SCENES: readonly { readonly key: Scene; readonly label: string }[] = [
  { key: 'not-found', label: 'Pagina lipsă (404)' },
  { key: 'error', label: 'Eroare' },
  { key: 'update', label: 'Versiune nouă' },
]

/** The page shown, from the prototype's own `page` parameter; the 404 by default. */
export function useScene(): Scene {
  const search = useSearch({ strict: false }) as { readonly page?: unknown }
  return SCENES.some((scene) => scene.key === search.page) ? (search.page as Scene) : 'not-found'
}

/** Prototype chrome, not part of the design: which page to show. */
export function SceneSwitch() {
  const current = useScene()
  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-4 py-2 text-xs">
      <span className="mr-2 text-muted-foreground">Arată:</span>
      {SCENES.map((scene) => (
        <Link
          key={scene.key}
          to="."
          search={((previous: Record<string, unknown>) => ({ ...previous, page: scene.key === 'not-found' ? undefined : scene.key })) as never}
          className={cn('rounded px-2 py-1', current === scene.key ? 'bg-background font-medium text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
        >
          {scene.label}
        </Link>
      ))}
    </div>
  )
}

/** The address a reader asked for: the real page reads it from the router; here, an example. */
const ASKED_PATH = '/bugetul-national/2019/cheltuieli'

const SHORTCUTS: readonly { readonly to: string; readonly label: () => string }[] = [
  { to: '/national-budget', label: () => t`Bugetul național` },
  { to: '/achizitii', label: () => t`Achiziții publice` },
  { to: '/companies', label: () => t`Companii` },
  { to: '/legislation', label: () => t`Legislație` },
  { to: '/map', label: () => t`Harta` },
]

const SHORTCUT_LINK = 'inline-flex min-h-11 items-center text-sm font-medium text-foreground transition-colors hover:text-primary @2xl:min-h-0'

type Copy = { readonly title: string; readonly lede: ReactNode }
export type Words = Readonly<Record<Scene, () => Copy>>

/** Each picture's own words: the headline answers what the picture shows. */
export const COOKIE_WORDS: Words = {
  'not-found': () => ({
    title: t`Am căutat peste tot`,
    lede: (
      <>
        {t`Adresa`} <Path /> {t`nu duce la nicio pagină. Poate s-a mutat, sau adresa are o greșeală.`}
      </>
    ),
  }),
  error: () => ({
    title: t`S-a rupt ceva`,
    lede: t`Pagina nu s-a putut afișa. De obicei o reîncărcare o repară; dacă nu, pornește de la prima pagină.`,
  }),
  update: () => ({
    title: t`Proaspăt scos din cuptor`,
    lede: t`Am publicat o versiune nouă a site-ului cât timp citeai. Reîncarcă pagina ca s-o primești.`,
  }),
}

export const SHEET_WORDS: Words = {
  'not-found': () => ({
    title: t`Fila asta lipsește din dosar`,
    lede: (
      <>
        {t`Adresa`} <Path /> {t`nu duce la nicio pagină. Poate s-a mutat, sau adresa are o greșeală.`}
      </>
    ),
  }),
  error: () => ({
    title: t`Pagina s-a rupt`,
    lede: t`Nu s-a putut afișa. De obicei o reîncărcare o lipește la loc; dacă nu, pornește de la prima pagină.`,
  }),
  update: () => ({
    title: t`A ieșit o ediție nouă`,
    lede: t`Am publicat o versiune nouă a site-ului cât timp citeai. Reîncarcă pagina ca s-o primești.`,
  }),
}

function Path() {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground [overflow-wrap:anywhere]">{ASKED_PATH}</code>
}

/** What the picture is told: which mood, and whether reload is being pointed at. */
export type ArtProps = { readonly mood: Mood; readonly mended: boolean; readonly label: string }

const MOOD: Readonly<Record<Scene, Mood>> = { 'not-found': 'search', error: 'broken', update: 'fresh' }

const LABEL: Readonly<Record<Scene, () => string>> = {
  'not-found': () => t`Un personaj desenat în pixeli care caută cu o lupă`,
  error: () => t`Un personaj desenat în pixeli, rupt în două, care strânge ochii`,
  update: () => t`Un personaj desenat în pixeli, proaspăt, care zâmbește larg`,
}

/** How long the picture takes to mend before the page reloads: four steps of the transition. */
const MEND_MS = 320

/**
 * The page. `art` draws the picture; `words` gives its headline and lede.
 * The 404 offers home and back, then a quiet row of the site's main doors; the
 * error and the new version offer reload first, home second.
 */
export function ScenePage({ scene, layout, art, words }: { readonly scene: Scene; readonly layout: Layout; readonly art: (props: ArtProps) => ReactNode; readonly words: Words }) {
  const lattice = useId().replace(/:/g, '')
  const [mended, setMended] = useState(false)
  const reloading = useRef(false)
  const copy = words[scene]()
  const center = layout === 'center'

  const reload = () => {
    if (reloading.current) return
    reloading.current = true
    setMended(true)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => window.location.reload(), still ? 0 : MEND_MS)
  }
  const mendProps = {
    onPointerEnter: () => setMended(true),
    onPointerLeave: () => setMended(reloading.current),
    onFocus: () => setMended(true),
    onBlur: () => setMended(reloading.current),
  }

  const picture = art({ mood: MOOD[scene], mended, label: LABEL[scene]() })

  const actions =
    scene === 'not-found' ? (
      <>
        <Button asChild size="lg" className="w-full @md:w-auto">
          <a href="/">
            <Home aria-hidden="true" />
            {t`Mergi la prima pagină`}
          </a>
        </Button>
        <Button variant="outline" size="lg" className="w-full @md:w-auto" onClick={() => window.history.back()}>
          <ArrowLeft aria-hidden="true" />
          {t`Înapoi`}
        </Button>
      </>
    ) : (
      <>
        <Button size="lg" className="w-full @md:w-auto" onClick={reload} {...mendProps}>
          <RefreshCcw aria-hidden="true" />
          {t`Reîncarcă pagina`}
        </Button>
        <Button variant="outline" size="lg" className="w-full @md:w-auto" onClick={() => window.location.assign('/')}>
          <Home aria-hidden="true" />
          {t`Mergi la prima pagină`}
        </Button>
      </>
    )

  return (
    <div className="@container relative bg-background" role={scene === 'not-found' ? undefined : 'alert'} aria-labelledby={`${lattice}-title`}>
      <section className="relative border-b">
        <TwoLayerLattice idPrefix={lattice} />
        <RuledFrame className="flex min-h-[70svh] items-center py-14 @3xl:py-20">
          <div className={cn('w-full', center ? 'flex flex-col items-center text-center' : 'grid grid-cols-1 items-center gap-6 @3xl:grid-cols-12 @3xl:gap-8')}>
            {center ? <div className="mb-8">{picture}</div> : null}
            <div className={cn('min-w-0', center ? 'max-w-2xl' : '@3xl:col-span-7')}>
              {scene === 'not-found' ? <MonoLabel className="block text-sm text-primary">404</MonoLabel> : null}
              <h1
                id={`${lattice}-title`}
                className={cn(
                  'text-[2.5rem] font-extrabold leading-[0.96] tracking-[-0.04em] text-balance text-foreground @2xl:text-6xl @5xl:text-7xl',
                  scene === 'not-found' && 'mt-4',
                )}
              >
                {copy.title}
              </h1>
              <p className={cn('mt-5 max-w-[46ch] text-lg leading-relaxed text-muted-foreground', center && 'mx-auto')}>{copy.lede}</p>
              <div className={cn('mt-8 flex flex-col gap-3 @md:flex-row', center && '@md:justify-center')}>{actions}</div>
              {scene === 'not-found' ? (
                <nav aria-label={t`Scurtături`} className="mt-10">
                  <span className="block text-sm text-muted-foreground">{t`Sau mergi direct la`}</span>
                  <div className={cn('mt-1 flex flex-wrap gap-x-5 @2xl:mt-2', center && 'justify-center')}>
                    {SHORTCUTS.map((shortcut) => (
                      <a key={shortcut.to} href={shortcut.to} className={SHORTCUT_LINK}>
                        {shortcut.label()}
                      </a>
                    ))}
                  </div>
                </nav>
              ) : null}
            </div>
            {/* On a narrow page the picture leads, smaller, so the character is seen before the buttons. */}
            {center ? null : <div className="order-first flex justify-start @3xl:order-none @3xl:col-span-5 @3xl:justify-end">{picture}</div>}
          </div>
          {/* Where the band's bottom rule crosses the frame's, as on the landing's hero. */}
          <span className="absolute inset-x-0 top-full z-10 mt-px">
            <CruxMarks />
          </span>
        </RuledFrame>
      </section>
    </div>
  )
}
