import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeft, Gavel, Megaphone } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CopyCode, PartyName } from '@/features/procurement/components/direct-purchase/direct-purchase-head'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { contractsCount, frameworksCount } from '@/features/procurement/lib/contract-text'
import { leiShort, whenText } from '@/features/procurement/lib/direct-purchase-text'
import { procedureLabel } from '@/features/procurement/lib/home-model'
import { cn } from '@/lib/utils'
import type { ProcedureSheet } from './procedure.model'
import { lotsCount, offersTotal, signedWhen, statusText, winnersCount } from './procedure.text'

/**
 * The procedure page's head (the contract page's, `contract-head.tsx`): the
 * way back and the notice's number on the top row; the route, what was bought
 * and the lots on one line; the title; one sentence — who awarded what to
 * whom, when, for how much, and how many offered.
 */

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
  longest: 'text-xl sm:text-3xl lg:text-4xl',
} as const

const headingSize = (title: string): keyof typeof HEADING => (title.length <= 24 ? 'short' : title.length <= 48 ? 'medium' : title.length <= 96 ? 'long' : 'longest')

export function useRouteLabel(type: string | null): string | null {
  const { i18n } = useLingui()
  if (!type) return null
  const label = procedureLabel(type)
  return label ? i18n._(label) : type
}

export function contractTypeLabel(type: ProcedureSheet['contractType']): string | null {
  switch (type) {
    case 'works':
      return t`Lucrări`
    case 'services':
      return t`Servicii`
    case 'supplies':
      return t`Produse`
    default:
      return null
  }
}

function KindLine({ sheet }: { readonly sheet: ProcedureSheet }) {
  const route = useRouteLabel(sheet.procedureType)
  const Icon = sheet.kind === 'call' ? Megaphone : Gavel
  const parts = [route, contractTypeLabel(sheet.contractType), sheet.lotsTotal > 1 ? lotsCount(sheet.lotsTotal) : null, sheet.framework ? t`acorduri-cadru` : null].filter(Boolean)
  return (
    <p className="mt-6 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <MonoLabel>{parts[0] ?? t`Procedură`}</MonoLabel>
      {parts.slice(1).map((part) => (
        <MonoLabel key={part} className="text-muted-foreground">
          · {part}
        </MonoLabel>
      ))}
    </p>
  )
}

/** The firms the procedure was awarded to, as the sentence names them. */
function Winners({ sheet }: { readonly sheet: ProcedureSheet }) {
  const firms = sheet.contracts.flatMap((contract) => contract.firms)
  const first = firms[0]
  if (sheet.contracts.length === 1 && first) {
    const others = firms.length - 1
    const link = <PartyName party={first} role="supplier" year={sheet.year} />
    if (others === 0) return link
    const rest = plural(others, { one: 'încă o firmă', few: 'alte # firme', other: 'alte # de firme' })
    return (
      <Trans>
        {link} și {rest}, în asociere
      </Trans>
    )
  }
  return <>{winnersCount(sheet.firmsCount)}</>
}

/** How many offered: the lot's offers, or the lots', and how many lots had one. */
function competitionText(sheet: ProcedureSheet): string | null {
  const offers = sheet.offers
  if (!offers) return null
  if (offers.lots === 1) return offers.received === 1 ? t`A primit o singură ofertă.` : t`A primit ${offersTotal(offers.received)}.`
  const total = offersTotal(offers.received)
  const lots = lotsCount(offers.lots)
  if (offers.single === 0) return t`A primit ${total} pe ${lots}.`
  const single = plural(offers.single, { one: 'unul a avut o singură ofertă', few: '# au avut câte o singură ofertă', other: '# au avut câte o singură ofertă' })
  return t`A primit ${total} pe ${lots}; ${single}.`
}

function HeadSentence({ sheet }: { readonly sheet: ProcedureSheet }) {
  const authority = <PartyName party={sheet.authority} role="authority" year={sheet.year} />
  const route = useRouteLabel(sheet.procedureType)?.toLocaleLowerCase('ro-RO') ?? t`procedură`
  if (sheet.kind === 'call') {
    const call = sheet.call ?? (sheet.openedOnCall ? { date: null } : null)
    const when = whenText(call?.date ?? null)
    const money = sheet.estimate !== null ? <strong className="font-semibold text-foreground">{leiShort(sheet.estimate)}</strong> : null
    const status = statusText(sheet.status)
    return (
      <>
        {money ? (
          <Trans>
            {authority} a lansat o {route} {when}, estimată la {money}.
          </Trans>
        ) : (
          <Trans>
            {authority} a lansat o {route} {when}.
          </Trans>
        )}
        {status ? ` ${status}` : null}
      </>
    )
  }
  const when = signedWhen(sheet.contractsSpan)
  const money = sheet.awarded !== null ? <strong className="font-semibold text-foreground">{leiShort(sheet.awarded)}</strong> : null
  const winners = <Winners sheet={sheet} />
  const competition = competitionText(sheet)
  const count = sheet.contracts.length
  const sentence = sheet.framework ? (
    money ? (
      <Trans>
        {authority} a încheiat {frameworksCount(count)} cu {winners} {when}: poate cumpăra prin ele cel mult {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat {frameworksCount(count)} cu {winners} {when}.
      </Trans>
    )
  ) : sheet.unpublished ? (
    money ? (
      <Trans>
        {authority} a încheiat contractul cu {winners} prin negociere, fără anunț de participare, {when}, pentru {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat contractul cu {winners} prin negociere, fără anunț de participare, {when}.
      </Trans>
    )
  ) : count === 1 ? (
    money ? (
      <Trans>
        {authority} a încheiat contractul cu {winners} {when}, pentru {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat contractul cu {winners} {when}.
      </Trans>
    )
  ) : money ? (
    <Trans>
      {authority} a încheiat {contractsCount(count)} cu {winners} {when}, pentru {money}.
    </Trans>
  ) : (
    <Trans>
      {authority} a încheiat {contractsCount(count)} cu {winners} {when}.
    </Trans>
  )
  return (
    <>
      {sentence}
      {competition ? ` ${competition}` : null}
    </>
  )
}

/** The way back; what the page is beside it from a small screen up. */
function Kicker({ sheet }: { readonly sheet: ProcedureSheet }) {
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
        <span>{sheet.kind === 'call' ? t`Anunț de participare` : t`Procedură`}</span>
      </span>
    </MonoLabel>
  )
}

export function ProcedureHead({ sheet }: { readonly sheet: ProcedureSheet }) {
  const noticeNo = sheet.noticeNo ?? ''
  const title = sheet.title ?? (sheet.kind === 'call' ? t`Anunțul de participare nr. ${noticeNo}` : t`Anunțul de atribuire nr. ${noticeNo}`)
  const award = sheet.award
  const callNo = sheet.call?.no ?? ''
  return (
    <section className="relative border-b" aria-labelledby="procedure-title">
      <TwoLayerLattice idPrefix="procedure" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <Kicker sheet={sheet} />
          {sheet.noticeNo ? <CopyCode code={sheet.noticeNo} label={t`Anunț`} /> : null}
        </div>
        <KindLine sheet={sheet} />
        <h1 id="procedure-title" className={cn('mt-3 max-w-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', HEADING[headingSize(title)])}>
          {title}
        </h1>
        {!sheet.title ? <p className="mt-2 text-sm text-muted-foreground">{t`SEAP nu dă acestui anunț un titlu.`}</p> : null}
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          <HeadSentence sheet={sheet} />
        </p>
        {sheet.openedOnCall && award ? (
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            {t`Ai deschis anunțul de participare ${callNo}; procedura s-a încheiat cu anunțul de atribuire ${award.no}, pe care se sprijină pagina.`}
          </p>
        ) : null}
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}
