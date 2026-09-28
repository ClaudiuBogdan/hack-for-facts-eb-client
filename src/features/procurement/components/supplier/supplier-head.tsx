import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { CopyCui, StatusChips, StatusNotice } from '@/features/private-companies/components/profile/company-profile-head'
import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { companySentence, nameLength } from '@/features/private-companies/lib/company-profile-text'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { countyName } from '../../lib/buyer-text'
import { dayText } from '../../lib/home-format'
import { supplierRecordsSearch } from '../../lib/home-links'
import { homeYear } from '../../lib/home-model'
import type { SupplierProfile, SupplierView } from '../../lib/supplier-model'
import { lastDayOf } from '../../lib/supplier-period'
import { headSentence } from '../../lib/supplier-text'
import { ProfileYearSelect } from '../profile/profile-year-select'

/**
 * The page's head, in the company profile's own shape — its sentence, status
 * chips, notice and CUI button, so the two pages describe a firm in the same
 * words — with the year's sales after the registry's sentence, the ways out
 * (the company profile, all direct purchases, all contracts), the year above
 * and the years on one chart beside it.
 */

const HEADING: Record<ReturnType<typeof nameLength>, string> = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
}

const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'

/** The way back; on a phone only it, so the year fits beside it — the county is in the sentence. */
function SupplierKicker({ county }: { readonly county: string | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]">
      <Link to="/procurement" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Achiziții publice</Trans>
        </span>
      </Link>
      <span className="hidden items-center gap-2 sm:flex">
        <span aria-hidden="true">/</span>
        <span>
          <Trans>Furnizor</Trans>
        </span>
        {county ? (
          <>
            <span aria-hidden="true">/</span>
            <span>{countyName(county)}</span>
          </>
        ) : null}
      </span>
    </MonoLabel>
  )
}

/**
 * The head's top row: the way back on the left, the year at the right end —
 * and, for the year in progress, the date its data runs through (SEAP's cutoff,
 * read from the API), once the read has landed.
 */
function SupplierTopRow({
  county,
  year,
  onYear,
  profile,
}: {
  readonly county: string | null
  readonly year: number
  readonly onYear: (year: number) => void
  readonly profile: SupplierProfile | null
}) {
  const shown = profile && profile.year === year ? profile : null
  const through = shown?.through ?? null
  // The year in progress says how recent its data is — or, with no cutoff known, that it is incomplete.
  const fresh = through
    ? t`Date actualizate până la ${dayText(lastDayOf(through))} ${through.slice(0, 4)}`
    : shown && shown.year > shown.latest
      ? t`An în curs: date incomplete`
      : null
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <SupplierKicker county={county} />
        <div className="flex items-center gap-4">
          {fresh ? <span className="hidden text-xs text-muted-foreground sm:inline">{fresh}</span> : null}
          <ProfileYearSelect
            points={profile ? { direct: profile.directYears, contracts: profile.contractYears } : null}
            year={year}
            latest={profile?.latest ?? homeYear()}
            partYear
            emptyLabel={t`fără vânzări`}
            onYear={onYear}
          />
        </div>
      </div>
      {fresh ? <p className="mt-2 text-right text-xs text-muted-foreground sm:hidden">{fresh}</p> : null}
    </>
  )
}

/** The company profile's status chips and CUI button, then its notice for a firm not in business. */
function StatusRow({ cui, company }: { readonly cui: string; readonly company: CompanyProfileModel | null }) {
  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        {company ? <StatusChips model={company} /> : null}
        <CopyCui cui={cui} />
      </div>
      {company ? <StatusNotice model={company} className="mt-4 max-w-[60ch]" /> : null}
    </>
  )
}

/**
 * What the firm is, in the company profile's own sentence; a firm the
 * registry does not hold — usually a foreign one — says so; one it could not
 * read now says nothing, rather than call it foreign.
 */
function firmSentence(profile: SupplierView): string | null {
  if (profile.company) return companySentence(profile.company)
  return profile.registryFailed ? null : t`Firma nu are fișă în registrul comerțului; de regulă, e o firmă străină.`
}

export function SupplierHead({
  profile,
  year,
  onYear,
  aside,
}: {
  readonly profile: SupplierView
  /** The year asked for, which the dropdown shows at once. */
  readonly year: number
  readonly onYear: (year: number) => void
  readonly aside: ReactNode
}) {
  return (
    <section className="relative border-b" aria-labelledby="supplier-profile-title">
      <TwoLayerLattice idPrefix="supplier-profile" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <SupplierTopRow county={profile.county} year={year} onYear={onYear} profile={profile} />
        <div className="mt-4 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className={cn('min-w-0', aside ? 'lg:col-span-7' : 'lg:col-span-12')}>
            <h1 id="supplier-profile-title" className={cn('font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[nameLength(profile.name)])}>
              {profile.name}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              {[firmSentence(profile), headSentence(profile)].filter(Boolean).join(' ')}
            </p>
            <StatusRow cui={profile.cui} company={profile.company} />
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {/* A registry that could not be read now may still hold the firm: its page says. */}
              {profile.company || profile.registryFailed ? (
                <Link to="/companies/$cui" params={{ cui: profile.cui }} className={OUT_LINK}>
                  <Trans>Profilul firmei</Trans>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
              <Link to="/procurement/search" search={supplierRecordsSearch(profile.cui, null, 'direct')} className={OUT_LINK}>
                <Trans>Toate achizițiile directe</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link to="/procurement/search" search={supplierRecordsSearch(profile.cui, null, 'contract')} className={OUT_LINK}>
                <Trans>Toate contractele</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          {aside ? <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">{aside}</div> : null}
        </div>
        {/* The crux on the head's bottom rule, where the section nav begins; above the nav, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/**
 * The head before the profile arrives (a client-side navigation): the way
 * back, the year, and — as soon as the registry answers, well before the
 * profile — the firm's name, sentence and status; else the shape of what comes.
 */
export function SupplierHeadPending({
  cui,
  company,
  year,
  onYear,
  children,
}: {
  readonly cui: string
  readonly company: CompanyProfileModel | null
  readonly year: number
  readonly onYear: (year: number) => void
  readonly children?: ReactNode
}) {
  return (
    <section className="relative border-b" aria-busy="true" aria-label={t`Se încarcă profilul de furnizor`}>
      <TwoLayerLattice idPrefix="supplier-profile" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <SupplierTopRow county={company?.place.countyCode ?? null} year={year} onYear={onYear} profile={null} />
        {company ? (
          <>
            <h1 className={cn('mt-4 font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[nameLength(company.displayName)])}>{company.displayName}</h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{companySentence(company)}</p>
          </>
        ) : (
          <>
            <div className="mt-4 h-12 w-2/3 animate-pulse bg-muted/70 sm:h-16" aria-hidden="true" />
            <HubPending className="mt-6 max-w-xl" rows={2} />
          </>
        )}
        <StatusRow cui={cui} company={company} />
        {children}
      </RuledFrame>
    </section>
  )
}
