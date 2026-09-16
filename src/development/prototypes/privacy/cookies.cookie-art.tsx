import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { CookieIllustration } from '@/features/privacy/components/cookie-illustration'
import type { CookieState } from '@/features/privacy/lib/consent-categories'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** A local art study: trying states here never changes the visitor's consent. */
export function CookieIllustrationStudy() {
  const [state, setState] = useState<CookieState>('whole')
  return (
    <section className="bg-background px-6 py-12 text-foreground sm:px-12 sm:py-16" data-dev-marker={PROTOTYPE_MARKER}>
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground"><Trans>Studiu de ilustrație</Trans></p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight"><Trans>O alegere, trei stări.</Trans></h1>
        <div className="mt-10 grid items-center gap-10 sm:grid-cols-2">
          <div className="flex min-h-72 items-center justify-center rounded-xl border bg-muted/20">
            <CookieIllustration state={state} className="w-64" />
          </div>
          <div>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground"><Trans>Întreg, mușcat sau simplu. Încearcă tranzițiile — preferințele tale rămân neschimbate.</Trans></p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant={state === 'whole' ? 'default' : 'outline'} aria-pressed={state === 'whole'} onClick={() => setState('whole')}><Trans>Întreg</Trans></Button>
              <Button variant={state === 'bitten' ? 'default' : 'outline'} aria-pressed={state === 'bitten'} onClick={() => setState('bitten')}><Trans>Mușcat</Trans></Button>
              <Button variant={state === 'plain' ? 'default' : 'outline'} aria-pressed={state === 'plain'} onClick={() => setState('plain')}><Trans>Simplu</Trans></Button>
            </div>
            <div className="mt-10 flex items-center gap-6 border-t pt-6">
              <CookieIllustration state={state} className="size-16" />
              <p className="text-sm text-muted-foreground"><Trans>Aceeași ilustrație, la dimensiunea cardului.</Trans></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
