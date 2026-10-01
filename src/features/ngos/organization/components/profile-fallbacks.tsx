import type { ReactNode } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { registrySearch } from '@/features/ngos/hub/registry-figures'
import type { RegistrySearch } from '@/features/ngos/registry/api'
import type { NgoOrganization } from '../api'
import { placeOf, statusOf } from '../model'
import { organizationName, purposeText, statusLabel } from '../words'
import { RegistryFacts } from './profile-parts'

/**
 * `/ngos/$cui` when there is no profile to show: a CUI that is no current
 * registry organisation's admitted identity (which is not proof it is no NGO),
 * or an API that did not answer. Both keep the way to the registry, where an
 * entry may still be found by name.
 */

function Fallback({ title, children, search = {} }: { readonly title: ReactNode; readonly children: ReactNode; readonly search?: RegistrySearch }) {
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
          search={registrySearch(search)}
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

/** `/ngos/registry/$number` for a number the current registry export does not hold, or an address that names none. */
export function NgoRegistryProfileNotFound() {
  return (
    <Fallback title={<Trans>Niciun ONG cu acest număr în registru</Trans>}>
      <p>
        <Trans>
          Exportul curent al registrului național ONG nu are o intrare cu acest număr. Numărul se caută exact cum e scris în registru (de exemplu
          1471/A/2012); în registru o organizație se poate găsi și după nume.
        </Trans>
      </p>
    </Fallback>
  )
}

/**
 * A registry number the registry gives to several organisations: each is
 * listed, and the reader chooses — the page never picks one. Those with an
 * admitted CUI open their profile; the others have no address of their own,
 * so what the registry says of each — its purpose and its entries — opens
 * in place.
 */
export function NgoRegistryProfileChoice({ registryNumber, candidates }: { readonly registryNumber: string; readonly candidates: readonly NgoOrganization[] }) {
  return (
    <Fallback title={<Trans>Mai multe organizații cu numărul {registryNumber}</Trans>} search={{ registryNumber }}>
      <p>
        <Trans>Registrul național ONG trece acest număr la mai multe organizații. Alege-o pe cea pe care o cauți:</Trans>
      </p>
      <ul className="divide-y border-y">
        {candidates.map((candidate, index) => {
          const place = placeOf(candidate)
          const details = [place, statusLabel(statusOf(candidate))].filter(Boolean).join(' · ')
          return (
            <li key={candidate.cui ?? candidate.registryRecords[0]?.id ?? index} className="py-3">
              {candidate.cui ? (
                <Link to="/ngos/$cui" params={{ cui: candidate.cui }} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {organizationName(candidate)}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{organizationName(candidate)}</span>
              )}
              <span className="block text-sm text-muted-foreground">
                {details}
                {candidate.cui ? ` · CUI ${candidate.cui}` : ''}
              </span>
              {candidate.cui ? null : <CandidateDetails candidate={candidate} />}
            </li>
          )
        })}
      </ul>
    </Fallback>
  )
}

/** A candidate without a profile address: the registry's purpose and entries for it, a click away. */
function CandidateDetails({ candidate }: { readonly candidate: NgoOrganization }) {
  const purpose = purposeText(candidate)
  return (
    <details className="mt-2 text-sm">
      <summary className="inline-flex min-h-10 cursor-pointer items-center font-medium text-foreground underline-offset-4 hover:underline">
        <Trans>Ce spune registrul despre ea</Trans>
      </summary>
      <div className="mt-2 space-y-4">
        {purpose ? <p className="whitespace-pre-wrap text-foreground">{purpose}</p> : null}
        <RegistryFacts organization={candidate} />
      </div>
    </details>
  )
}

