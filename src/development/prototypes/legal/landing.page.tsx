import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CruxMarks } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { PROTOTYPE_MARKER } from './landing.lib'

/**
 * One example of the slim head a dedicated page carries once the tabs are gone, on the analysis page: the way
 * back to the landing and the page's place, its title, and one pinned row of the sibling pages, where the
 * landing pins its bands. No hero, no statue, no tab bar. The body is a placeholder: the page's own content
 * starts right under the row.
 */

type Sibling = {
  readonly key: string
  readonly label: string
  readonly to: '/legislation/search' | '/legislation/acts' | '/legislation/analytics' | '/legislation/changes' | '/legislation/gazette' | '/legislation/guide'
}

function siblings(): readonly Sibling[] {
  return [
    { key: 'cauta', label: t`Caută`, to: '/legislation/search' },
    { key: 'acte', label: t`Acte`, to: '/legislation/acts' },
    { key: 'analiza', label: t`Analiză`, to: '/legislation/analytics' },
    { key: 'modificari', label: t`Modificări`, to: '/legislation/changes' },
    { key: 'monitor', label: t`Monitorul Oficial`, to: '/legislation/gazette' },
    { key: 'ghid', label: t`Ghid`, to: '/legislation/guide' },
  ]
}

/** The page the example stands for. */
const CURRENT = 'analiza'

export function DedicatedPageExample() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" data-dev-marker={PROTOTYPE_MARKER}>
      <header className="relative border-b">
        <RuledFrame className="py-8 sm:py-10">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {/* In the product this is `/legislation`; here it opens the landing prototype. */}
            <Link to="/development/$" params={{ _splat: 'legal/landing' }} search={{ v: 'hub' }} className="group inline-flex min-h-11 items-center gap-1.5 hover:text-foreground sm:min-h-0">
              <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              <span>{t`Legislație`}</span>
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{t`Analiză`}</span>
          </MonoLabel>
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-4 sm:text-5xl">
            <Trans>Analiza legislației</Trans>
          </h1>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
            <Trans>Actele numărate: ce fac, cine le emite, cum se schimbă și cum se leagă între ele.</Trans>
          </p>
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </header>

      <nav aria-label={t`Paginile legislației`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <RuledFrame className="overflow-x-auto py-0">
          <ul className="flex shrink-0 gap-5 sm:gap-6">
            {siblings().map((page) => {
              const current = page.key === CURRENT
              return (
                <li key={page.key} className="shrink-0">
                  <Link
                    to={page.to}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center whitespace-nowrap text-sm transition-colors hover:text-foreground',
                      current ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {page.label}
                    {current ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden="true" /> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </RuledFrame>
      </nav>

      <main>
        <RuledFrame className="py-10 sm:py-14">
          <div className="border border-dashed p-6 sm:p-10">
            <MonoLabel className="block text-primary">
              <Trans>Loc pentru conținut</Trans>
            </MonoLabel>
            <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
              <Trans>
                Aici începe pagina: întrebarea, lentilele, răspunsul și actele analizei de azi, fără antetul cu statuie și fără file. Rândul de sus rămâne prins cât
                derulezi și duce la celelalte pagini; „Legislație" duce înapoi la pagina de pornire.
              </Trans>
            </p>
            <div className="mt-6 space-y-2" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-7 w-full rounded-sm bg-muted/60" />
              ))}
            </div>
          </div>
        </RuledFrame>
      </main>
    </div>
  )
}
