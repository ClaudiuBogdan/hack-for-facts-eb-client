import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { STATUS_ACTIVE } from '../../lib/company-status-codes'
import type { CompanyProfileModel, StatusKind } from '../../lib/company-profile-model'
import { companySentence, nameLength, statusNotice, statusText } from '../../lib/company-profile-text'
import { countyDirectorySearch } from '../../lib/hub-counties'
import { CompanyBalanceTrend } from './company-balance-trend'

/**
 * The profile's head: where the company sits in the directory, its name, what
 * it is in a sentence, its status and identifiers — and beside them, when it
 * filed statements, its last five years on one chart. The head is about the
 * company only; its place in the economy comes near the end of the page.
 */

const HEADING: Record<ReturnType<typeof nameLength>, string> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

export function CompanyProfileHead({ model }: { readonly model: CompanyProfileModel }) {
  const trend = model.latest !== null && model.recent.years.length > 0
  return (
    <section className="relative border-b" aria-labelledby="company-profile-title">
      <TwoLayerLattice idPrefix="company-profile" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className={cn('grid grid-cols-1 items-center gap-10', trend && 'lg:grid-cols-12 lg:gap-8')}>
          <div className={cn('min-w-0', trend && 'lg:col-span-7')}>
            <CompanyKicker model={model} />
            <h1
              id="company-profile-title"
              className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[nameLength(model.displayName)])}
            >
              {model.displayName}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{companySentence(model)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StatusChips model={model} />
              <IdentifierLine model={model} />
            </div>
            <StatusNotice model={model} className="mt-4 max-w-[60ch]" />
          </div>
          {trend ? <CompanyBalanceTrend model={model} className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8" /> : null}
        </div>
        {/* The crux on the head's bottom rule, where the section nav begins; above the nav, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The way back to the directory, by the company's county and sector. */
export function CompanyKicker({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { place, mainActivity } = model
  // Every text box trimmed to its capitals, so centring puts the arrow on the capitals' middle in any font.
  return (
    <MonoLabel className={cn('flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]', className)}>
      <Link to="/companies" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Firme</Trans>
        </span>
      </Link>
      {place.countyCode && place.county ? (
        <>
          <span aria-hidden="true">/</span>
          <Link to="/companies/search" search={countyDirectorySearch(place.countyCode)} className="hover:text-foreground">
            {place.county}
          </Link>
        </>
      ) : null}
      {mainActivity?.division && mainActivity.divisionLabel ? (
        <>
          <span aria-hidden="true">/</span>
          <Link to="/companies/search" search={{ caen: mainActivity.division, status: [STATUS_ACTIVE] }} className="hover:text-foreground">
            {mainActivity.divisionLabel}
          </Link>
        </>
      ) : null}
    </MonoLabel>
  )
}

const STATUS_TONE: Record<StatusKind, string> = {
  active: 'bg-emerald-500',
  insolvency: 'bg-amber-500',
  dissolution: 'bg-amber-500',
  'struck-off': 'bg-destructive',
  other: 'bg-muted-foreground',
}

export function StatusChips({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { fiscal } = model.profile
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      <li className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium text-foreground">
        <span className={cn('size-1.5 rounded-full', STATUS_TONE[model.status.kind])} aria-hidden="true" />
        {statusText(model)}
      </li>
      {fiscal.vatPayer ? (
        <li className="inline-flex items-center border px-2.5 py-1 text-xs text-muted-foreground">
          <Trans>Plătitoare de TVA</Trans>
        </li>
      ) : null}
      {fiscal.inactive ? (
        <li className="inline-flex items-center border border-destructive/40 px-2.5 py-1 text-xs font-medium text-destructive">
          <Trans>Inactivă fiscal la ANAF</Trans>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * What the registry status means for the figures below it, for a company not
 * in business. Said once, in the head, so no figure has to repeat it.
 */
export function StatusNotice({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const message = statusNotice(model)
  if (!message) return null
  return (
    <p
      className={cn(
        'border-l-2 py-0.5 pl-3 text-sm leading-relaxed text-foreground',
        model.status.kind === 'struck-off' ? 'border-destructive' : 'border-amber-500',
        className,
      )}
    >
      {message}
    </p>
  )
}

type CopyStatus = 'idle' | 'copied' | 'failed'

/** The CUI as one button that copies it; says what happened to assistive technology too. */
export function CopyCui({ cui, className, bare = false }: { readonly cui: string; readonly className?: string; readonly bare?: boolean }) {
  const [status, setStatus] = useState<CopyStatus>('idle')
  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 1500)
    return () => window.clearTimeout(timer)
  }, [status])
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(cui)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void copy()}
        className={cn('inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-foreground transition-colors hover:text-primary', className)}
        aria-label={t`Copiază CUI ${cui}`}
      >
        {bare ? null : <span className="text-muted-foreground">CUI</span>} {cui}
        {status === 'copied' ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status === 'copied' ? t`CUI copiat` : status === 'failed' ? t`Copierea nu e disponibilă` : ''}
      </span>
    </>
  )
}

export function IdentifierLine({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { cui, codInmatriculare } = model.profile
  if (!cui && !codInmatriculare) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', className)}>
      {cui ? <CopyCui cui={cui} /> : null}
      {codInmatriculare ? (
        <span className="font-mono text-xs tabular-nums text-foreground">
          <span className="text-muted-foreground">
            <Trans>Nr. registru</Trans>
          </span>{' '}
          {codInmatriculare}
        </span>
      ) : null}
    </div>
  )
}
