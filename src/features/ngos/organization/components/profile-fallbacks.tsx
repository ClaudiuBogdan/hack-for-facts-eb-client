import type { ReactNode } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { registrySearch } from '@/features/ngos/hub/registry-figures'

/**
 * `/ngos/$cui` when there is no profile to show: a CUI that is no current
 * registry organisation's admitted identity (which is not proof it is no NGO),
 * or an API that did not answer. Both keep the way to the registry, where an
 * entry may still be found by name.
 */

function Fallback({ title, children }: { readonly title: ReactNode; readonly children: ReactNode }) {
  return (
    <section className="border-b">
      <RuledFrame className="py-14 sm:py-20">
        <MonoLabel className="text-muted-foreground">
          <Link to="/ngos" className="hover:text-foreground">
            ← <Trans>ONG-uri</Trans>
          </Link>
        </MonoLabel>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <div className="mt-4 max-w-[42rem] space-y-4 text-base leading-relaxed text-muted-foreground">{children}</div>
        <Link
          to="/ngos/registry"
          search={registrySearch()}
          className="mt-6 inline-flex min-h-10 items-center border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Trans>Caută în registru</Trans> →
        </Link>
      </RuledFrame>
    </section>
  )
}

export function NgoProfileNotFound() {
  return (
    <Fallback title={<Trans>Niciun profil disponibil pentru acest CUI</Trans>}>
      <p>
        <Trans>
          Pagina unui ONG există când registrul național ONG are o intrare curentă legată de CUI. Nu e o dovadă că organizația nu e un ONG: în registru o poți
          găsi după nume.
        </Trans>
      </p>
    </Fallback>
  )
}

/**
 * The profile's read failed. „Încearcă din nou" reads it again through the
 * router (a boundary's reset alone would render the same failed match), and
 * shows on the server's render too.
 */
export function NgoProfileUnavailable() {
  const router = useRouter()
  const retrying = useRouterState({ select: (state) => state.isLoading })
  return (
    <Fallback title={<Trans>Profilul nu s-a încărcat</Trans>}>
      <p role="alert">
        <Trans>Datele nu au putut fi citite acum. Asta nu spune nimic despre organizație.</Trans>
      </p>
      <button
        type="button"
        onClick={() => void router.invalidate()}
        disabled={retrying}
        aria-busy={retrying}
        className="inline-flex min-h-9 items-center rounded-sm border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {retrying ? <Trans>Se încarcă…</Trans> : <Trans>Încearcă din nou</Trans>}
      </button>
    </Fallback>
  )
}
