import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, FileSignature, GitBranch, Layers, Users } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { linkYearOf, type ContractSheet } from '../../lib/contract-model'
import { headMoney, isAssociation, kindLabel } from '../../lib/contract-text'
import { whenText } from '../../lib/direct-purchase-text'
import { CopyCode, PartyName } from '../direct-purchase/direct-purchase-head'

/**
 * The contract page's head: the way back and the award notice's number on
 * the top row, what the record is (and its number) on one line, the title,
 * and one sentence — who gave whom what, for how much, when.
 */

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
  longest: 'text-xl sm:text-3xl lg:text-4xl',
} as const

const headingSize = (title: string): keyof typeof HEADING => (title.length <= 24 ? 'short' : title.length <= 48 ? 'medium' : title.length <= 96 ? 'long' : 'longest')

/** The way back; the record's kind beside it from a small screen up. */
function Kicker({ sheet }: { readonly sheet: ContractSheet | null }) {
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
        <span>{sheet?.kind === 'framework' ? t`Acord-cadru` : t`Contract`}</span>
      </span>
    </MonoLabel>
  )
}

/** What the record is, and its number, on one line above the title. */
function KindLine({ sheet }: { readonly sheet: ContractSheet }) {
  const Icon = sheet.kind === 'framework' ? Layers : sheet.kind === 'call-off' ? GitBranch : isAssociation(sheet.contract) ? Users : FileSignature
  const number = sheet.contractNo
  return (
    <p className="mt-6 flex min-w-0 items-center gap-1.5 text-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <MonoLabel>{kindLabel(sheet)}</MonoLabel>
      {number ? (
        <MonoLabel className="min-w-0 truncate text-muted-foreground" title={number}>
          · {t`nr. ${number}`}
        </MonoLabel>
      ) : null}
    </p>
  )
}

/** Who gave whom what, for how much, when — one sentence, per kind. */
function HeadSentence({ sheet }: { readonly sheet: ContractSheet }) {
  const year = linkYearOf(sheet)
  const authority = <PartyName party={sheet.authority} role="authority" year={year} />
  const supplier = <PartyName party={sheet.supplier} role="supplier" year={year} />
  const when = whenText(sheet.date)
  const money = <strong className="font-semibold text-foreground">{headMoney(sheet.value)}</strong>
  const partners = sheet.contract.firms.length - 1
  const others = plural(partners, { one: 'încă o firmă', few: 'alte # firme', other: 'alte # de firme' })
  if (sheet.kind === 'framework') {
    const ceiling = (sheet.value.kind === 'ceiling' || sheet.value.kind === 'accepted' || sheet.value.kind === 'converted') && sheet.value.value !== null
    if (!ceiling) {
      return partners > 0 ? (
        <Trans>
          {authority} a încheiat un acord-cadru cu {supplier} și {others} {when}. SEAP nu publică o valoare maximă verificată.
        </Trans>
      ) : (
        <Trans>
          {authority} a încheiat un acord-cadru cu {supplier} {when}. SEAP nu publică o valoare maximă verificată.
        </Trans>
      )
    }
    return partners > 0 ? (
      <Trans>
        {authority} a încheiat un acord-cadru cu {supplier} și {others} {when}: poate cumpăra de la ele cel mult {money}, prin contracte subsecvente.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat un acord-cadru cu {supplier} {when}: poate cumpăra de la firmă cel mult {money}, prin contracte subsecvente.
      </Trans>
    )
  }
  if (sheet.kind === 'call-off') {
    return (
      <Trans>
        {authority} a încheiat cu {supplier} un contract subsecvent unui acord-cadru, {when}, pentru {money}.
      </Trans>
    )
  }
  if (isAssociation(sheet.contract)) {
    return (
      <Trans>
        {authority} a încheiat contractul cu {supplier} și {others}, în asociere, {when}, pentru {money}.
      </Trans>
    )
  }
  return (
    <Trans>
      {authority} a încheiat contractul cu {supplier} {when}, pentru {money}.
    </Trans>
  )
}

function HeadFrame({ sheet, children }: { readonly sheet: ContractSheet | null; readonly children: ReactNode }) {
  return (
    <RuledFrame className="py-10 sm:py-12 lg:py-14">
      <CornerTicks />
      <div className="flex items-center justify-between gap-4">
        <Kicker sheet={sheet} />
        {sheet?.noticeNo ? <CopyCode code={sheet.noticeNo} label={t`Anunț`} /> : null}
      </div>
      {children}
      {/* The crux on the head's bottom rule. */}
      <span className="absolute inset-x-0 top-full z-30 mt-px">
        <CruxMarks />
      </span>
    </RuledFrame>
  )
}

export function ContractHead({ sheet }: { readonly sheet: ContractSheet }) {
  const title = sheet.title ?? t`Contract fără titlu în SEAP`
  return (
    <section className="relative border-b" aria-labelledby="contract-title">
      <TwoLayerLattice idPrefix="contract" />
      <HeadFrame sheet={sheet}>
        <KindLine sheet={sheet} />
        <h1 id="contract-title" className={cn('mt-3 max-w-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', HEADING[headingSize(title)])}>
          {title}
        </h1>
        {sheet.titleFromProcedure ? <p className="mt-2 text-sm text-muted-foreground">{t`Titlul procedurii: SEAP nu dă contractului un titlu al lui.`}</p> : null}
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          <HeadSentence sheet={sheet} />
        </p>
      </HeadFrame>
    </section>
  )
}

/** The head with no contract to name: the way back, and what the page has to say instead. */
export function ContractHeadShell({ children }: { readonly children: ReactNode }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="contract" />
      <HeadFrame sheet={null}>{children}</HeadFrame>
    </section>
  )
}

/** The head before the contract arrives (a client-side navigation): the way back and the shape of what comes. */
export function ContractHeadPending({ children }: { readonly children?: ReactNode }) {
  return (
    <section className="relative border-b" aria-busy="true" aria-label={t`Se încarcă contractul`}>
      <TwoLayerLattice idPrefix="contract" />
      <HeadFrame sheet={null}>
        <div className="mt-8 h-12 w-2/3 animate-pulse bg-muted/70 sm:h-16" aria-hidden="true" />
        <HubPending className="mt-6 max-w-xl" rows={2} />
        {children}
      </HeadFrame>
    </section>
  )
}
