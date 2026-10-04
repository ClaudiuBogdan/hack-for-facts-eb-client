import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, RotateCw } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'

/**
 * The profile before it has a company to show: loading, a CUI no source knows,
 * or a read that failed — each in the page's frame, so the switch to the page
 * does not move the head.
 */

function Bone({ className }: { readonly className: string }) {
  return <span className={cn('block animate-pulse rounded-sm bg-muted/70', className)} />
}

/** The head's shape — kicker, name, sentence, chips, the chart beside — then the section bar and the figures. */
export function CompanyProfileSkeleton() {
  return (
    <div className="w-full bg-background" role="status" aria-busy="true" aria-label={t`Se încarcă profilul firmei`}>
      <div className="border-b">
        <RuledFrame className="py-10 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8" aria-hidden="true">
            <div className="lg:col-span-7">
              <Bone className="h-2.5 w-48" />
              <Bone className="mt-5 h-12 w-4/5 sm:h-16" />
              <Bone className="mt-5 h-4 w-full max-w-[60ch]" />
              <Bone className="mt-2 h-4 w-2/3" />
              <div className="mt-6 flex gap-2">
                <Bone className="h-6 w-28" />
                <Bone className="h-6 w-32" />
              </div>
            </div>
            <div className="lg:col-span-5 lg:border-l lg:pl-8">
              <Bone className="h-2.5 w-40" />
              <Bone className="mt-5 h-40 w-full" />
            </div>
          </div>
        </RuledFrame>
      </div>
      <div className="border-b">
        <RuledFrame className="flex h-11 items-center justify-end gap-5">
          {Array.from({ length: 4 }, (_, index) => (
            <Bone key={index} className="h-3 w-20" />
          ))}
        </RuledFrame>
      </div>
      <div className="border-b bg-muted/20">
        <RuledFrame className="grid grid-cols-2 gap-px py-6 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="px-5 py-2">
              <Bone className="h-9 w-24" />
              <Bone className="mt-4 h-2.5 w-32" />
            </div>
          ))}
        </RuledFrame>
      </div>
    </div>
  )
}

function StateFrame({ title, children, alert = false }: { readonly title: ReactNode; readonly children: ReactNode; readonly alert?: boolean }) {
  return (
    <div className="w-full border-b bg-background">
      <RuledFrame className="py-16 sm:py-20">
        <div className="max-w-[60ch]" role={alert ? 'alert' : undefined}>
          <MonoLabel className="text-muted-foreground">
            <Link to="/companies" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3" aria-hidden="true" />
              <Trans>Firme</Trans>
            </Link>
          </MonoLabel>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {children}
        </div>
      </RuledFrame>
    </div>
  )
}

/**
 * A CUI the platform's company directory does not hold (or does not show
 * publicly) — said as a finding about the directory, never as a fact about the
 * company's legal registration, with the way to search.
 */
export function CompanyProfileNotFound({ cui }: { readonly cui: string | null }) {
  return (
    <StateFrame title={<Trans>Firma nu a fost găsită</Trans>}>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        {cui ? (
          <Trans>
            Directorul de firme al platformei nu are o firmă publică cu CUI {cui}. Asta nu spune dacă firma este înregistrată la registrul
            comerțului. Verifică codul, sau caută firma după nume.
          </Trans>
        ) : (
          <Trans>
            Directorul de firme al platformei nu are o firmă publică cu acest CUI. Asta nu spune dacă firma este înregistrată la registrul
            comerțului. Verifică codul, sau caută firma după nume.
          </Trans>
        )}
      </p>
      <Link
        to="/companies/search"
        className="mt-6 inline-flex min-h-10 items-center rounded-sm border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Trans>Caută în firme</Trans>
      </Link>
    </StateFrame>
  )
}

/**
 * The ONRC registry moved while the profile was open (a new edition, a
 * withdrawal or an access change): what was read before is no longer shown,
 * and the current record is read only when the reader asks.
 */
export function CompanyProfileRegistryMoved({ onAccept }: { readonly onAccept: () => void }) {
  return (
    <StateFrame title={<Trans>Registrul s-a schimbat</Trans>}>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground" data-testid="company-profile-registry-moved">
        <Trans>
          Registrul comerțului s-a schimbat de când ai deschis pagina (o ediție nouă sau o schimbare de acces). Datele citite înainte nu mai
          sunt afișate.
        </Trans>
      </p>
      <button
        type="button"
        onClick={onAccept}
        className="mt-6 inline-flex min-h-10 items-center rounded-sm border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Trans>Arată datele actuale</Trans>
      </button>
    </StateFrame>
  )
}

/**
 * The profile could not be read — distinct from „this company does not
 * exist": a failed request says nothing about the registry, so the page says
 * so and offers the retry.
 */
export function CompanyProfileError({ onRetry, retrying = false }: { readonly onRetry: () => void; readonly retrying?: boolean }) {
  return (
    <StateFrame title={<Trans>Profilul firmei nu s-a încărcat</Trans>} alert>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        <Trans>Citirea datelor a eșuat. Nu înseamnă că firma lipsește din registru: încearcă din nou, iar dacă eroarea se repetă, sursa poate fi indisponibilă pentru moment.</Trans>
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-sm border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        <RotateCw className={cn('size-4', retrying && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
        <Trans>Încearcă din nou</Trans>
      </button>
    </StateFrame>
  )
}
