import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, RotateCw } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { ProfileSectionBarPending } from './company-section-bar'

/**
 * The profile before it has a company to show: loading, a CUI no source knows,
 * or a read that failed — each in the page's frame, so the switch to the page
 * does not move the head.
 */

function Bone({ className }: { readonly className: string }) {
  return <span className={cn('block animate-pulse rounded-sm bg-muted/70', className)} />
}

/** One line of text: its line box, the pulse centred in it, so a block of lines is as tall as the text it stands for. */
function TextLine({ box, className }: { readonly box: string; readonly className: string }) {
  return (
    <span className={cn('flex items-center', box)}>
      <Bone className={className} />
    </span>
  )
}

// The line boxes of the text the skeleton stands for (font size × leading).
const SENTENCE_LINE = 'h-[1.625rem] sm:h-[1.828rem]' // text-base / sm:text-lg, leading-relaxed
const LEDE_LINE = 'h-[1.625rem]' // text-base, leading-relaxed
const FIGURE_LABEL_LINE = 'h-[1.203rem]' // text-sm, leading-snug
const FIGURE_NOTE_LINE = 'h-[1.219rem]' // text-xs, leading-relaxed

/**
 * The page as it will arrive, block for block, so nothing moves when the
 * company comes in: the head — the way back, the name, its sentence, the
 * chips and identifiers (no chart beside it since 25 November 2026) — the
 * pinned bar with its words, the figures band's four cells, then how the
 * business goes: its title, its sentence, the legend and the chart's two
 * panels. Sized from the page's own classes.
 */
export function CompanyProfileSkeleton() {
  return (
    <div className="relative w-full overflow-x-clip bg-background" role="status" aria-busy="true" aria-label={t`Se încarcă profilul firmei`}>
      <section className="relative border-b" aria-hidden="true">
        <RuledFrame className="py-10 sm:py-12 lg:py-12">
          <div className="min-w-0 max-w-4xl">
            <TextLine box="h-5" className="h-3 w-44" />
            {/* A name of middle length: `company-profile-head.tsx`'s HEADING.medium, at leading 0.96. */}
            <Bone className="mt-4 h-9 w-4/5 sm:h-12 lg:h-[3.75rem]" />
            {/* Three lines across a desktop; on a phone the same sentence takes five. */}
            <div className="mt-4 max-w-[64ch]">
              <TextLine box={SENTENCE_LINE} className="h-3.5 w-full" />
              <TextLine box={SENTENCE_LINE} className="h-3.5 w-full" />
              <TextLine box={cn(SENTENCE_LINE, 'max-sm:hidden')} className="h-3.5 w-2/3" />
              <TextLine box={cn(SENTENCE_LINE, 'sm:hidden')} className="h-3.5 w-full" />
              <TextLine box={cn(SENTENCE_LINE, 'sm:hidden')} className="h-3.5 w-full" />
              <TextLine box={cn(SENTENCE_LINE, 'sm:hidden')} className="h-3.5 w-1/2" />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex gap-2">
                <Bone className="h-[1.625rem] w-32" />
                <Bone className="h-[1.625rem] w-28" />
              </div>
              <TextLine box="h-4" className="h-3 w-64" />
            </div>
          </div>
        </RuledFrame>
      </section>

      <ProfileSectionBarPending name={<Bone className="h-3.5 w-40" />} />

      <section className="border-b bg-muted/20" aria-hidden="true">
        <RuledFrame>
          {/* `HubFiguresBand`'s cells: value, a two-line label, the note at the foot. */}
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col px-5 py-6 sm:py-7',
                  index % 2 === 1 && 'border-l',
                  index >= 2 && 'border-t lg:border-t-0',
                  index >= 1 && 'lg:border-l',
                )}
              >
                <TextLine box="h-8 sm:h-10" className="h-6 w-24 sm:h-8 sm:w-32" />
                <div className="mt-2.5">
                  <TextLine box={FIGURE_LABEL_LINE} className="h-3 w-28" />
                  <TextLine box={FIGURE_LABEL_LINE} className="h-3 w-16" />
                  {/* On a phone the public money's label („Valori din contracte, achiziții și PNRR") takes a third line in the second row. */}
                  {index >= 2 ? <TextLine box={cn(FIGURE_LABEL_LINE, 'sm:hidden')} className="h-3 w-20" /> : null}
                </div>
                <div className="mt-auto pt-3">
                  <TextLine box={FIGURE_NOTE_LINE} className="h-2.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </RuledFrame>
      </section>

      <section className="border-b" aria-hidden="true">
        <RuledFrame className="py-12 sm:py-16">
          <HubSectionHead
            title={<Trans>Cum merge afacerea</Trans>}
            lede={
              <span className="block w-[56ch] max-w-full">
                <TextLine box={LEDE_LINE} className="h-3.5 w-full" />
                <TextLine box={LEDE_LINE} className="h-3.5 w-1/2" />
              </span>
            }
          />
          <div className="mt-8">
            {/* The legend, then the chart's two panels (money, people) and the years under them, as `CompanyYearsChart` sizes them. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {['w-16', 'w-24', 'w-20', 'w-24'].map((width, index) => (
                <TextLine key={index} box="h-4" className={cn('h-2.5', width)} />
              ))}
            </div>
            <div className="mt-4 pl-16">
              <Bone className="h-64 w-full sm:h-80" />
              <Bone className="mt-8 h-20 w-full sm:h-24" />
              <div className="mt-2 h-5" />
            </div>
          </div>
        </RuledFrame>
      </section>
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
 * company's legal registration, with the way to search: the companies'
 * front door, whose search box looks names up.
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
        to="/companies"
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
