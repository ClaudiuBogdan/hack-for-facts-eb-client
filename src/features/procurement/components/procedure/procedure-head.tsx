import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, Gavel, Megaphone } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { useProcedureRouteLabel } from '../../hooks/use-procedure-route-label'
import { contractsCount, frameworksCount } from '../../lib/contract-text'
import { leiShort, whenText } from '../../lib/direct-purchase-text'
import type { ProcedureSheet } from '../../lib/procedure-model'
import { contractTypeLabel, lotsCount, offersTotal, signedWhen, statusText, winnersCount } from '../../lib/procedure-text'
import { CopyCode, PartyName } from '../direct-purchase/direct-purchase-head'

/**
 * The procedure page's head (the contract page's, `contract-head.tsx`): the
 * way back and the notice's number on the top row; the route, what was
 * bought and the lots on one line; the title; one sentence — who awarded
 * what to whom, when, for how much, and how many offered; or, for a call, what
 * was asked and what became of it.
 */

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
  longest: 'text-xl sm:text-3xl lg:text-4xl',
} as const

const headingSize = (title: string): keyof typeof HEADING => (title.length <= 24 ? 'short' : title.length <= 48 ? 'medium' : title.length <= 96 ? 'long' : 'longest')

function KindLine({ sheet }: { readonly sheet: ProcedureSheet }) {
  const route = useProcedureRouteLabel(sheet.procedureType)
  const Icon = sheet.kind === 'call' ? Megaphone : Gavel
  const parts = [route, contractTypeLabel(sheet.contractType), sheet.lots.length > 1 ? lotsCount(sheet.lots.length) : null, sheet.framework ? t`acorduri-cadru` : null].filter((part): part is string => Boolean(part))
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

/** The firms the procedure went to, as the sentence names them: one contract's firms by name, many contracts' by count. */
function Winners({ sheet }: { readonly sheet: ProcedureSheet }) {
  const only = sheet.contracts.length === 1 ? sheet.contracts[0] : undefined
  const first = only?.firms[0]
  if (!only || !first) return <>{winnersCount(sheet.firmsCount)}</>
  const others = only.firms.length - 1
  const link = <PartyName party={first} role="supplier" year={sheet.year} />
  if (others === 0) return link
  const rest = plural(others, { one: 'încă o firmă', few: 'alte # firme', other: 'alte # de firme' })
  // Several firms on one contract, every row at one value, is an association; a framework's firms each hold their own, and firms
  // without a shared value are only listed together. The association's clause closes on a comma: the sentence goes on with the day.
  return sheet.framework || !only.sharedValue ? (
    <Trans>
      {link} și {rest}
    </Trans>
  ) : (
    <Trans>
      {link} și {rest}, în asociere,
    </Trans>
  )
}

/** How many offered: the lot's offers, or the lots', and how many lots had a single one. */
function competitionText(sheet: ProcedureSheet): string | null {
  const offers = sheet.offers
  if (!offers) return null
  const total = offersTotal(offers.received)
  if (offers.lots === 1) return offers.received === 1 ? t`A primit o singură ofertă.` : t`A primit ${total}.`
  const lots = lotsCount(offers.lots)
  if (offers.single === 0) return t`A primit ${total} pe ${lots}.`
  const single = plural(offers.single, { one: 'unul a avut o singură ofertă', few: '# au avut câte o singură ofertă', other: '# au avut câte o singură ofertă' })
  return t`A primit ${total} pe ${lots}; ${single}.`
}

/** A call no award is known for: when it was published, for how much, and what became of it. */
function CallSentence({ sheet }: { readonly sheet: ProcedureSheet }) {
  const authority = <PartyName party={sheet.authority} role="authority" year={sheet.year} />
  const when = whenText(sheet.call?.date ?? null)
  const money = sheet.estimate !== null ? <strong className="font-semibold text-foreground">{leiShort(sheet.estimate)}</strong> : null
  const status = statusText(sheet.status)
  return (
    <>
      {money ? (
        <Trans>
          {authority} a publicat anunțul de participare {when}, cu o valoare estimată de {money}.
        </Trans>
      ) : (
        <Trans>
          {authority} a publicat anunțul de participare {when}.
        </Trans>
      )}
      {status ? ` ${status}` : null}
    </>
  )
}

/** An award notice SEAP links no contract of the institution to (yet): what it awarded, if it says. */
function UnlinkedAwardSentence({ sheet }: { readonly sheet: ProcedureSheet }) {
  const authority = <PartyName party={sheet.authority} role="authority" year={sheet.year} />
  const money = sheet.awarded !== null && sheet.status === 'awarded' ? <strong className="font-semibold text-foreground">{leiShort(sheet.awarded)}</strong> : null
  return (
    <>
      {money ? (
        <Trans>
          {authority} a atribuit prin această procedură {money}.
        </Trans>
      ) : (
        <Trans>{authority} a publicat anunțul de atribuire.</Trans>
      )}{' '}
      {/* Rows of other institutions linked here are said below, apart: none of them is this institution's contract. */}
      {sheet.foreign.length > 0 ? t`SEAP nu leagă de anunț niciun contract al instituției.` : t`SEAP nu leagă încă de anunț niciun contract.`}
    </>
  )
}

/** The API's rows came back full: the counts are floors, and their days a part's — no span said. */
function CappedSentence({ sheet }: { readonly sheet: ProcedureSheet }) {
  const authority = <PartyName party={sheet.authority} role="authority" year={sheet.year} />
  const count = sheet.framework ? frameworksCount(sheet.contracts.length) : contractsCount(sheet.contracts.length)
  const firms = winnersCount(sheet.firmsCount)
  const money = sheet.awarded !== null ? <strong className="font-semibold text-foreground">{leiShort(sheet.awarded)}</strong> : null
  return money ? (
    <Trans>
      {authority} a atribuit prin această procedură {money}, în cel puțin {count}, cu cel puțin {firms}.
    </Trans>
  ) : (
    <Trans>
      {authority} a încheiat cel puțin {count}, cu cel puțin {firms}.
    </Trans>
  )
}

function AwardSentence({ sheet }: { readonly sheet: ProcedureSheet }) {
  if (sheet.contractsCapped) return <CappedSentence sheet={sheet} />
  const authority = <PartyName party={sheet.authority} role="authority" year={sheet.year} />
  const when = signedWhen(sheet.contractsSpan)
  // The value goes with the contracts only when they carry it; else the head says it as the notice's (`NoticeValueSentence`).
  const money = sheet.awarded !== null && sheet.awardedByContracts ? <strong className="font-semibold text-foreground">{leiShort(sheet.awarded)}</strong> : null
  const winners = <Winners sheet={sheet} />
  const count = sheet.contracts.length
  const frameworks = frameworksCount(count)
  const contracts = contractsCount(count)
  if (sheet.framework) {
    return money ? (
      <Trans>
        {authority} a încheiat {frameworks} cu {winners} {when}: poate cumpăra prin ele cel mult {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat {frameworks} cu {winners} {when}.
      </Trans>
    )
  }
  if (sheet.unpublished && count > 1) {
    return money ? (
      <Trans>
        {authority} a încheiat {contracts} cu {winners} prin negociere, fără anunț de participare, {when}, pentru {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat {contracts} cu {winners} prin negociere, fără anunț de participare, {when}.
      </Trans>
    )
  }
  if (sheet.unpublished) {
    return money ? (
      <Trans>
        {authority} a încheiat contractul cu {winners} prin negociere, fără anunț de participare, {when}, pentru {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat contractul cu {winners} prin negociere, fără anunț de participare, {when}.
      </Trans>
    )
  }
  if (count === 1) {
    return money ? (
      <Trans>
        {authority} a încheiat contractul cu {winners} {when}, pentru {money}.
      </Trans>
    ) : (
      <Trans>
        {authority} a încheiat contractul cu {winners} {when}.
      </Trans>
    )
  }
  return money ? (
    <Trans>
      {authority} a încheiat {contracts} cu {winners} {when}, pentru {money}.
    </Trans>
  ) : (
    <Trans>
      {authority} a încheiat {contracts} cu {winners} {when}.
    </Trans>
  )
}

function HeadSentence({ sheet }: { readonly sheet: ProcedureSheet }) {
  if (sheet.kind === 'call') return <CallSentence sheet={sheet} />
  const competition = competitionText(sheet)
  const callOffs = sheet.callOffsReported !== null ? leiShort(sheet.callOffsReported) : null
  // The notice's value, apart, when its contracts do not carry it (a part linked, or values missing); a full page of rows says it already.
  const noticeValue = sheet.contracts.length > 0 && !sheet.contractsCapped && !sheet.awardedByContracts && sheet.awarded !== null ? leiShort(sheet.awarded) : null
  const status = sheet.status === 'awarded' ? null : statusText(sheet.status)
  return (
    <>
      {sheet.contracts.length === 0 ? <UnlinkedAwardSentence sheet={sheet} /> : <AwardSentence sheet={sheet} />}
      {noticeValue ? ` ${t`Anunțul de atribuire raportează o valoare de ${noticeValue}.`}` : null}
      {callOffs ? ` ${t`Anunțul raportează contracte subsecvente de ${callOffs}.`}` : null}
      {status ? ` ${status}` : null}
      {competition ? ` ${competition}` : null}
    </>
  )
}

/** The way back; what the page is beside it from a small screen up. */
function Kicker({ sheet }: { readonly sheet: ProcedureSheet | null }) {
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
        <span>{sheet?.kind === 'call' ? t`Anunț de participare` : t`Procedură`}</span>
      </span>
    </MonoLabel>
  )
}

function HeadFrame({ sheet, children }: { readonly sheet: ProcedureSheet | null; readonly children: ReactNode }) {
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

export function ProcedureHead({ sheet }: { readonly sheet: ProcedureSheet }) {
  const noticeNo = sheet.noticeNo
  const title =
    sheet.title ??
    (noticeNo
      ? sheet.kind === 'call'
        ? t`Anunțul de participare nr. ${noticeNo}`
        : t`Anunțul de atribuire nr. ${noticeNo}`
      : sheet.kind === 'call'
        ? t`Anunț de participare fără număr în SEAP`
        : t`Anunț de atribuire fără număr în SEAP`)
  const award = sheet.award?.no ?? ''
  const callNo = sheet.call?.no ?? ''
  return (
    <section className="relative border-b" aria-labelledby="procedure-title">
      <TwoLayerLattice idPrefix="procedure" />
      <HeadFrame sheet={sheet}>
        <KindLine sheet={sheet} />
        <h1 id="procedure-title" className={cn('mt-3 max-w-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', HEADING[headingSize(title)])}>
          {title}
        </h1>
        {sheet.title ? null : <p className="mt-2 text-sm text-muted-foreground">{t`SEAP nu dă acestui anunț un titlu.`}</p>}
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          <HeadSentence sheet={sheet} />
        </p>
        {sheet.openedOnCall && sheet.award ? (
          <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
            {t`Pagina e deschisă pe anunțul de participare ${callNo}; procedura s-a încheiat cu anunțul de atribuire ${award}, din care citește.`}
          </p>
        ) : null}
      </HeadFrame>
    </section>
  )
}

/** The head with no procedure to name: the way back, and what the page has to say instead. */
export function ProcedureHeadShell({ children }: { readonly children: ReactNode }) {
  return (
    <section className="relative border-b">
      <TwoLayerLattice idPrefix="procedure" />
      <HeadFrame sheet={null}>{children}</HeadFrame>
    </section>
  )
}

/** The head before the procedure arrives (a client-side navigation): the way back and the shape of what comes. */
export function ProcedureHeadPending({ children }: { readonly children?: ReactNode }) {
  return (
    <section className="relative border-b" aria-busy="true" aria-label={t`Se încarcă procedura`}>
      <TwoLayerLattice idPrefix="procedure" />
      <HeadFrame sheet={null}>
        <div className="mt-8 h-12 w-2/3 animate-pulse bg-muted/70 sm:h-16" aria-hidden="true" />
        <HubPending className="mt-6 max-w-xl" rows={2} />
        {children}
      </HeadFrame>
    </section>
  )
}
