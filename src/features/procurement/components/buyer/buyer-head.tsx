import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight, Check, Copy } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { hasAnyRecord, type BuyerProfile } from '../../lib/buyer-model'
import { buyerKind, countyName, headSentence } from '../../lib/buyer-text'
import { buyerAllRecordsSearch } from '../../lib/home-links'
import { homeYear } from '../../lib/home-model'
import { ProfileTopRow } from '../profile/profile-top-row'
import { ProfileYearSelect } from '../profile/profile-year-select'

/**
 * The page's head, in the company profile's shape: where the buyer sits in
 * the site and the year the page describes (a dropdown, as on a firm's page,
 * with the date the year in progress runs through), its name, what it is and
 * what it bought in the year in one sentence, its CUI and the ways out (its
 * budget, all its direct purchases, all its contracts) — and beside them its
 * years on one chart, which picks the year too.
 */

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
} as const

function headingSize(name: string): keyof typeof HEADING {
  return name.length <= 22 ? 'short' : name.length <= 44 ? 'medium' : 'long'
}

/** The way back; on a phone only it, so the year fits beside it — what the buyer is and its county are in the sentence. */
function BuyerKicker({ profile }: { readonly profile: BuyerProfile | null }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]">
      <Link to="/procurement" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Achiziții publice</Trans>
        </span>
      </Link>
      {profile ? (
        <span className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true">/</span>
          <span>{hasAnyRecord(profile) || profile.identity.entityType ? buyerKind(profile.identity) : t`Fără achiziții publice`}</span>
          {profile.county ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{countyName(profile.county)}</span>
            </>
          ) : null}
        </span>
      ) : null}
    </MonoLabel>
  )
}

/** The head's top row: the way back, the year — the year in progress first — and how recent its data is. */
function BuyerTopRow({
  profile,
  year,
  onYear,
}: {
  readonly profile: BuyerProfile | null
  /** Null while the newest year is read (a client-side navigation without one): no year to show yet. */
  readonly year: number | null
  readonly onYear: (year: number) => void
}) {
  // The date shows once the read of the year asked has landed.
  const shown = profile && profile.year === year ? profile : null
  return (
    <ProfileTopRow kicker={<BuyerKicker profile={profile} />} read={shown}>
      {year !== null ? (
        <ProfileYearSelect
          points={profile ? { direct: profile.directYears, contracts: profile.awardYears } : null}
          year={year}
          latest={profile?.latest ?? homeYear()}
          emptyLabel={t`fără achiziții`}
          onYear={onYear}
        />
      ) : null}
    </ProfileTopRow>
  )
}

function CopyCui({ cui }: { readonly cui: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard?.writeText(cui).then(() => setCopied(true), () => undefined)}
      className="inline-flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
      aria-label={copied ? t`CUI copiat` : t`Copiază CUI ${cui}`}
    >
      <MonoLabel>CUI</MonoLabel>
      <span className="font-mono tabular-nums text-foreground">{cui}</span>
      {copied ? <Check className="size-3" aria-hidden="true" /> : <Copy className="size-3" aria-hidden="true" />}
    </button>
  )
}

const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'

export function BuyerHead({
  profile,
  year,
  onYear,
  aside,
}: {
  readonly profile: BuyerProfile
  /** The year asked for, which the dropdown shows at once. */
  readonly year: number
  readonly onYear: (year: number) => void
  readonly aside: ReactNode
}) {
  const { identity } = profile
  return (
    <section className="relative border-b" aria-labelledby="buyer-profile-title">
      <TwoLayerLattice idPrefix="buyer-profile" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <BuyerTopRow profile={profile} year={year} onYear={onYear} />
        <div className="mt-4 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <h1 id="buyer-profile-title" className={cn('font-extrabold leading-[0.95] tracking-tighter text-foreground', HEADING[headingSize(identity.name)])}>
              {identity.name}
            </h1>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg">{headSentence(profile)}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <CopyCui cui={identity.cui} />
              {identity.hasBudget ? (
                <Link to="/entities/$cui" params={{ cui: identity.cui }} className={OUT_LINK}>
                  <Trans>Bugetul instituției</Trans>
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
              <Link to="/procurement/search" search={buyerAllRecordsSearch(identity.cui, 'direct')} className={OUT_LINK}>
                <Trans>Toate achizițiile directe</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link to="/procurement/search" search={buyerAllRecordsSearch(identity.cui, 'contract')} className={OUT_LINK}>
                <Trans>Toate contractele</Trans>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="min-w-0 lg:col-span-5 lg:border-l lg:pl-8">{aside}</div>
        </div>
        {/* The crux on the head's bottom rule, where the section nav begins; above the nav, which would cover its top half. */}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The head before the profile arrives (a client-side navigation): the way back, the year, the CUI, and the shape of what comes. */
export function BuyerHeadPending({
  cui,
  year,
  onYear,
  children,
}: {
  readonly cui: string
  readonly year: number | null
  readonly onYear: (year: number) => void
  readonly children?: ReactNode
}) {
  return (
    <section className="relative border-b" aria-busy="true" aria-label={t`Se încarcă profilul de achiziții`}>
      <TwoLayerLattice idPrefix="buyer-profile" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <BuyerTopRow profile={null} year={year} onYear={onYear} />
        <div className="mt-4 h-12 w-2/3 animate-pulse bg-muted/70 sm:h-16" aria-hidden="true" />
        <HubPending className="mt-6 max-w-xl" rows={2} />
        <div className="mt-5">
          <CopyCui cui={cui} />
        </div>
        {children}
      </RuledFrame>
    </section>
  )
}
