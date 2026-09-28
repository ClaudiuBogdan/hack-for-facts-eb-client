import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight, FileSignature, GitBranch, Layers, Users } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { CONTEXT_TINT } from '@/features/procurement/components/direct-purchase/direct-purchase-style'
import { CopyCode, PartyName } from '@/features/procurement/components/direct-purchase/direct-purchase-head'
import { Clamp } from '@/features/procurement/components/direct-purchase/direct-purchase-receipt'
import { aboutText, dayLong, dayShort, labelText, leiExact, leiShort, whenText } from '@/features/procurement/lib/direct-purchase-text'
import { DIRECT_COMPARABLE_FROM, homeYear, procedureLabel } from '@/features/procurement/lib/home-model'
import { i18n } from '@lingui/core'
import { cn } from '@/lib/utils'
import { CONTRACT_FIXTURES } from './contract.fixtures'
import {
  againText,
  amendmentsLede,
  associationNote,
  contractsCount,
  criterionText,
  daysCount,
  estimateGap,
  frameworksCount,
  lotsText,
  modificationsCount,
  monthsCount,
  rowsCount,
  republishedText,
  offersCount,
  offersFate,
  offersFrom,
  signedLei,
  buyerYearText,
  directText,
  firmsCount,
  headMoney,
  historyText,
  isAssociation,
  isSharedFramework,
  kindLabel,
  namesList,
  sellerYearText,
  unpublishedText,
  valueBox,
  versionsText,
  yearFigures,
} from './contract.text'
import type { ContractSheet, CtContext, CtContract, CtParty } from './contract.types'

/** The contract page's parts, shared by the variants: the head, the record's pieces, the context band. */

export const SUBHEAD = 'text-base font-semibold tracking-tight text-foreground sm:text-lg'
const LABEL = 'block text-muted-foreground'
const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const FIRST_YEAR = DIRECT_COMPARABLE_FROM

export const DEFAULT_RECORD = 'turnul-sfatului'

/** The record the prototype shows (`&c=`), and a way to pick another. */
export function useRecordKey(): string {
  const search = useSearch({ strict: false }) as { readonly c?: unknown }
  const key = typeof search.c === 'string' ? search.c : DEFAULT_RECORD
  return CONTRACT_FIXTURES[key] ? key : DEFAULT_RECORD
}

export function RecordPicker() {
  const key = useRecordKey()
  const navigate = useNavigate()
  return (
    <div className="border-b bg-muted/40">
      <RuledFrame className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
        <MonoLabel className="text-muted-foreground">Înregistrarea</MonoLabel>
        <select
          aria-label="Înregistrarea"
          value={key}
          onChange={(event) => void navigate({ to: '.', search: (previous: Record<string, unknown>) => ({ ...previous, c: event.target.value }) })}
          className="h-9 max-w-full rounded-sm border bg-background px-2 text-sm"
        >
          {Object.entries(CONTRACT_FIXTURES).map(([id, record]) => (
            <option key={id} value={id}>
              {record.label}
            </option>
          ))}
        </select>
      </RuledFrame>
    </div>
  )
}

export function linkYear(sheet: ContractSheet): number | undefined {
  const year = sheet.date ? Number(sheet.date.slice(0, 4)) : null
  return year !== null && year >= FIRST_YEAR ? year : undefined
}

export function ExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
    </a>
  )
}

const raisedFirst = (text: string) => text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)

function procedureText(type: string | null): string | null {
  if (!type) return null
  const label = procedureLabel(type)
  return label ? i18n._(label) : type
}

// ────────────────────────────────────────────────────────────── the head ──

const HEADING = {
  short: 'text-4xl sm:text-6xl lg:text-7xl',
  medium: 'text-3xl sm:text-5xl lg:text-6xl',
  long: 'text-2xl sm:text-4xl lg:text-5xl',
  longest: 'text-xl sm:text-3xl lg:text-4xl',
} as const

const headingSize = (title: string): keyof typeof HEADING => (title.length <= 24 ? 'short' : title.length <= 48 ? 'medium' : title.length <= 96 ? 'long' : 'longest')

function KindLine({ sheet }: { readonly sheet: ContractSheet }) {
  const Icon = sheet.kind === 'framework' ? Layers : sheet.kind === 'call-off' ? GitBranch : sheet.contract.firms.length > 1 ? Users : FileSignature
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <MonoLabel>{kindLabel(sheet)}</MonoLabel>
      {sheet.contractNo ? (
        <MonoLabel className="min-w-0 truncate text-muted-foreground" title={sheet.contractNo}>
          · {t`nr. ${sheet.contractNo}`}
        </MonoLabel>
      ) : null}
    </p>
  )
}

/** Who gave whom what, for how much, when — one sentence, per kind. */
function HeadSentence({ sheet }: { readonly sheet: ContractSheet }) {
  const year = linkYear(sheet)
  const authority = <PartyName party={sheet.authority} role="authority" year={year} />
  const supplier = <PartyName party={sheet.supplier} role="supplier" year={year} />
  const when = whenText(sheet.date)
  const money = <strong className="font-semibold text-foreground">{headMoney(sheet.value)}</strong>
  const partners = sheet.contract.firms.length - 1
  if (sheet.kind === 'framework') {
    const others = partners === 1 ? t`încă o firmă` : t`alte ${partners} firme`
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
    const others = partners === 1 ? t`încă o firmă` : t`alte ${partners} firme`
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

export function ContractHead({ sheet }: { readonly sheet: ContractSheet }) {
  const title = sheet.title ?? t`Contract fără titlu în SEAP`
  return (
    <section className="relative border-b" aria-labelledby="contract-title">
      <TwoLayerLattice idPrefix="contract" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <div className="flex items-center justify-between gap-4">
          <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Link to="/procurement" className="group inline-flex items-center gap-1.5 hover:text-foreground">
              <ArrowLeft className="size-3" aria-hidden="true" />
              <span>Achiziții publice</span>
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              <span aria-hidden="true">/</span>
              <span>{sheet.kind === 'framework' ? t`Acord-cadru` : t`Contract`}</span>
            </span>
          </MonoLabel>
          {sheet.noticeNo ? <CopyCode code={sheet.noticeNo} label={t`Anunț`} /> : null}
        </div>
        <div className="mt-6">
          <KindLine sheet={sheet} />
        </div>
        <h1 id="contract-title" className={cn('mt-3 max-w-5xl font-extrabold leading-[0.95] tracking-tighter text-foreground [overflow-wrap:anywhere]', HEADING[headingSize(title)])}>
          {title}
        </h1>
        <p className="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
          <HeadSentence sheet={sheet} />
        </p>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────── the value and facts ──

/** The figure's size by its length: a phone holds „3.068.398.862,94 lei" only a size down. */
function figureSize(figure: string): string {
  if (figure.length <= 12) return 'text-5xl sm:text-6xl'
  if (figure.length <= 16) return 'text-4xl sm:text-6xl'
  return 'text-3xl min-[420px]:text-4xl sm:text-6xl'
}

export function ContractValue({ sheet }: { readonly sheet: ContractSheet }) {
  const box = valueBox(sheet)
  const label = sheet.vatExcluded && box.figure !== '—' ? t`${box.label}, fără TVA` : box.label
  const shared = associationNote(sheet.contract)
  const versions = sheet.contract.versions.length
  const others = versions > 1 ? t`E una dintre cele ${versions} valori pe care SEAP le publică pentru acest contract, mai jos.` : null
  const notes = [box.note, shared, others].filter((note): note is string => Boolean(note))
  return (
    <div>
      <MonoLabel className={LABEL}>{label}</MonoLabel>
      <p className={cn('mt-3 font-semibold tabular-nums tracking-tight', figureSize(box.figure), box.muted ? 'text-muted-foreground' : 'text-foreground')}>{box.figure}</p>
      {notes.map((note) => (
        <p key={note} className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  )
}

function Fact({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt>
        <MonoLabel className="text-muted-foreground">{label}</MonoLabel>
      </dt>
      <dd className="mt-2 text-sm leading-snug text-foreground">{children}</dd>
    </div>
  )
}

export function ContractFacts({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const route = procedureText(sheet.procedure?.type ?? null)
  const category = sheet.cpv ? labelText(sheet.cpv.label) : null
  const cells = [sheet.date, route, sheet.cpv, sheet.estimate, sheet.offers, sheet.criterion, sheet.duration].filter((cell) => cell !== null && cell !== undefined).length
  const own = sheet.contract.versions.find((version) => version.isThis)?.value ?? null
  const fate = sheet.offers ? offersFate(sheet.offers) : null
  const from = sheet.offers ? offersFrom(sheet.offers) : null
  const gap = sheet.estimate !== null ? estimateGap(sheet.estimate, own) : null
  return (
    <div className={className}>
    <dl className={cn('grid grid-cols-2 gap-x-8 gap-y-6', cells >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
      {sheet.date ? <Fact label={t`Data contractului`}>{dayLong(sheet.date)}</Fact> : null}
      {route && sheet.procedure ? (
        <Fact label={t`Procedura`}>
          <Link to="/procurement/procedures/$id" params={{ id: sheet.procedure.id }} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
            {route}
          </Link>
          {sheet.procedure.ted ? (
            <span className="mt-1 block text-muted-foreground">
              {t`publicată și în`}{' '}
              <a href={sheet.procedure.ted.url} target="_blank" rel="noreferrer" title={`TED ${sheet.procedure.ted.no}`} className="whitespace-nowrap underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">
                {t`Jurnalul UE`}
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> {t`(TED ${sheet.procedure.ted.no}, se deschide într-o filă nouă)`}</span>
              </a>
            </span>
          ) : null}
        </Fact>
      ) : null}
      {sheet.cpv ? (
        <Fact label={t`Categoria`}>
          {category ?? t`Cod CPV`}
          <span className="mt-1 block font-mono text-xs tabular-nums text-muted-foreground">CPV {sheet.cpv.code}</span>
        </Fact>
      ) : null}
      {sheet.offers ? (
        <Fact label={t`Oferte primite`}>
          {raisedFirst(offersCount(sheet.offers.received))}
          {fate ? <span className="mt-1 block text-muted-foreground">{fate}</span> : null}
          {from ? <span className="mt-1 block text-muted-foreground">{from}</span> : null}
        </Fact>
      ) : null}
      {sheet.criterion ? <Fact label={t`Criteriul de atribuire`}>{criterionText(sheet.criterion)}</Fact> : null}
      {sheet.duration ? <Fact label={t`Durata`}>{sheet.duration.months ? monthsCount(sheet.duration.months) : daysCount(sheet.duration.days ?? 0)}</Fact> : null}
      {sheet.estimate !== null ? (
        <Fact label={t`Estimarea instituției`}>
          {leiExact(sheet.estimate)}
          {gap ? <span className="mt-1 block text-muted-foreground">{gap}</span> : null}
        </Fact>
      ) : null}
    </dl>
    {sheet.procedure?.unpublished ? (
      <div className="mt-6 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
        <p>{unpublishedText()}</p>
        {sheet.justification?.text ? (
          <figure className="mt-3">
            <figcaption>{t`Instituția a explicat așa:`}</figcaption>
            <blockquote className="mt-1 border-l-2 border-border pl-3 text-foreground">
              <Clamp text={`„${sheet.justification.text}”`} lines={3} />
            </blockquote>
          </figure>
        ) : sheet.justification?.urgency ? (
          <p className="mt-2">{t`Motivul invocat: urgența.`}</p>
        ) : sheet.justification?.exclusive ? (
          <p className="mt-2">{t`Motivul invocat: drepturi exclusive.`}</p>
        ) : null}
      </div>
    ) : null}
    </div>
  )
}

// ─────────────────────────────────────────── firms, versions, amendments ──

function FirmLink({ firm, year }: { readonly firm: CtParty; readonly year: number | undefined }) {
  return <PartyName party={firm} role="supplier" year={year} />
}

/** The firms SEAP publishes the contract under: an association's, each at the whole value, or a shared framework's (the model orders them, this page's first). */
export function ContractFirms({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const shared = isSharedFramework(sheet.contract)
  if (!isAssociation(sheet.contract) && !shared) return null
  const year = linkYear(sheet)
  const isOwn = (firm: CtParty) => (sheet.supplier.cui ? firm.cui === sheet.supplier.cui : firm.name === sheet.supplier.name)
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{shared ? t`Firmele din acordul-cadru` : t`Firmele din asociere`}</h3>
      <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {sheet.contract.firms.map((firm) => (
          <li key={firm.cui ?? firm.name} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span className="min-w-0">
              <FirmLink firm={firm} year={year} />
              {isOwn(firm) ? <MonoLabel className="ml-2 text-muted-foreground">{t`pagina aceasta`}</MonoLabel> : null}
              {firm.sme ? <MonoLabel className="ml-2 text-muted-foreground">{t`IMM`}</MonoLabel> : null}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{firm.cui ? `CUI ${firm.cui}` : t`fără CUI în SEAP`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One contract number at several values: every value, this row's marked. */
export function ContractVersions({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const lede = versionsText(sheet.contract, sheet.current)
  if (!lede) return null
  // A contract whose values carry different firms (two lots under one number): each value says its firm.
  const byFirm = new Set(sheet.contract.versions.map((version) => [...version.firms].sort().join('|'))).size > 1
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{t`Valorile publicate`}</h3>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{lede}</p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {sheet.contract.versions.map((version) => {
          const today = sheet.current !== null && version.value !== null && Math.round(version.value / 100) === Math.round(sheet.current.value / 100)
          const note = today
            ? t`valoarea de azi a anunțului`
            : version.afterAmendment
            ? t`după actul adițional nr. ${version.afterAmendment}`
            : !version.date
              ? t`fără dată în SEAP`
              : version.date !== sheet.date
                ? t`cu data ${dayShort(version.date)}`
                : null
          return (
            <li key={version.ids[0]} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3 pr-1 text-sm', version.isThis ? 'border-l-2 border-primary pl-3' : 'pl-3.5')}>
              <span className="min-w-0">
                <span className={cn('font-semibold tabular-nums', version.isThis ? 'text-foreground' : 'text-muted-foreground')}>{version.value !== null ? leiExact(version.value) : '—'}</span>
                {version.isThis ? <MonoLabel className="ml-2 text-muted-foreground">{t`pagina aceasta`}</MonoLabel> : null}
                {byFirm ? <span className="mt-0.5 block text-xs text-muted-foreground">{namesList(version.firms)}</span> : null}
                {version.suspect ? <span className="mt-0.5 block text-xs text-amber-800 dark:text-amber-300">{t`din valori raportate care nu se potrivesc cu textele actelor`}</span> : null}
              </span>
              <span className="text-right text-muted-foreground">{note}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ───────────────────────────────────────────── the procedure, the notice ──

function contractValueText(contract: CtContract): string {
  if (contract.versions.length > 1) {
    const values = contract.versions.map((version) => (version.value !== null ? leiShort(version.value) : '—'))
    return t`${values.length} valori: ${values.join(' · ')}`
  }
  const value = contract.versions[0]?.value ?? null
  return value !== null ? leiExact(value) : '—'
}

/** The notice's other contracts: each a link, with its firms and value; a long list folded. */
export function NoticeOthers({ sheet, className, limit = 6 }: { readonly sheet: ContractSheet; readonly className?: string; readonly limit?: number }) {
  const [open, setOpen] = useState(false)
  const others = sheet.others
  if (others.length === 0) return null
  const shown = open ? others : others.slice(0, limit)
  const firms = new Set(others.flatMap((contract) => contract.firms.map((firm) => firm.cui ?? firm.name))).size
  const allFrameworks = others.every((contract) => contract.framework)
  const notice = sheet.noticeNo ?? ''
  const read = [sheet.contract, ...others].reduce((sum, contract) => sum + contract.versions.reduce((rows, version) => rows + version.ids.length, 0), 0)
  // The notice's list is read to its first page: past it, the count is a floor.
  const partial = sheet.noticeRows > read
  const count = allFrameworks ? frameworksCount(others.length) : contractsCount(others.length)
  const firmsText = firmsCount(firms)
  const rows = sheet.noticeRows
  const awarded = sheet.procedure?.awardedTotal ?? null
  const total = awarded !== null ? leiExact(awarded) : null
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{allFrameworks ? t`Celelalte acorduri-cadru din anunț` : t`Celelalte contracte din anunț`}</h3>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
        {partial ? t`Anunțul ${notice} mai are cel puțin ${count}, cu ${firmsText} (SEAP are ${rowsCount(rows)} sub el).` : t`Anunțul ${notice} mai are ${count}, cu ${firmsText}.`}
        {total ? ` ${allFrameworks ? t`În total, procedura a atribuit acorduri-cadru de cel mult ${total}.` : t`În total, procedura a atribuit ${total}.`}` : ''}
        {sheet.lots ? ` ${lotsText(sheet.lots)}` : ''}
      </p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {shown.map((contract) => (
          <li key={contract.key}>
            <Link
              to="/procurement/contracts/$id"
              params={{ id: contract.linkId }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3 text-sm transition-colors hover:text-primary"
            >
              <span className="min-w-0">
                <span className="block truncate text-foreground" title={namesList(contract.firms.map((firm) => firm.name))}>
                  {namesList(contract.firms.map((firm) => firm.name))}
                </span>
                <MonoLabel className="mt-1 block text-muted-foreground">
                  {contract.contractNo ? t`nr. ${contract.contractNo}` : t`fără număr`}
                  {contract.date ? ` · ${dayShort(contract.date)}` : ''}
                </MonoLabel>
              </span>
              <span className={cn('text-right tabular-nums sm:whitespace-nowrap', contract.versions.every((version) => !version.accepted) ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
                {contractValueText(contract)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {others.length > limit ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className={cn(OUT_LINK, 'mt-3 text-sm')} aria-expanded={open}>
          {open ? t`Mai puține` : t`Toate cele ${others.length}`}
        </button>
      ) : null}
    </div>
  )
}

export function ContractSource({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const { source } = sheet
  const again = sheet.alsoIn > 0 ? againText(sheet.alsoIn) : null
  const notice = sheet.noticeUrl ?? (source.kind === 'notice' ? source.url : null)
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      <Trans>Sursa:</Trans>{' '}
      {source.kind === 'notice' || notice ? (
        <>
          {notice ? <ExternalLink href={notice}>{t`anunțul de atribuire pe e-licitatie.ro`}</ExternalLink> : t`anunțul de atribuire din SEAP`}
          {source.kind === 'export' ? (
            <>
              {'; '}
              {t`rândul din raportul SEAP al contractelor`}
              {source.file ? `, ${source.file}` : ''}
              {source.url ? (
                <>
                  {' '}
                  (<ExternalLink href={source.url}>{t`data.gov.ro`}</ExternalLink>)
                </>
              ) : null}
            </>
          ) : null}
          .
        </>
      ) : (
        <>
          {t`raportul SEAP al contractelor`}
          {source.file ? `, ${source.file}` : ''}
          {source.url ? (
            <>
              {' '}
              (<ExternalLink href={source.url}>{t`data.gov.ro`}</ExternalLink>)
            </>
          ) : null}
          .
        </>
      )}{' '}
      {sheet.noticeUrl ? <>{t`Valorile anunțului sunt fără TVA.`} </> : null}
      {again}
    </p>
  )
}

// ──────────────────────────────────────────────────────────── the context ──

/** The pair year by year: contracts and framework agreements as columns (counts — contract money is provisional), the contract's year marked. */
function PairYears({ context, className }: { readonly context: CtContext; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...context.years.map((year) => year.awards + year.frameworks))
  const shown = context.years.find((year) => year.year === (active ?? context.year)) ?? null
  // The year in progress: its column drawn dashed, its label saying so.
  const inProgress = homeYear() + 1
  const columns = { gridTemplateColumns: `repeat(${context.years.length}, minmax(0, 1fr))` }
  return (
    <figure className={className}>
      <p className="min-h-10 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{shown?.year === inProgress ? t`${inProgress} (în curs)` : (shown?.year ?? context.year)}</span>
        {' · '}
        {shown ? yearFigures(shown) : t`nimic între ele`}
      </p>
      <ol className="mt-3 grid h-32 items-end gap-1.5" style={columns} onPointerLeave={() => setActive(null)}>
        {context.years.map((year) => {
          const total = year.awards + year.frameworks
          const isThis = year.year === context.year
          return (
            <li key={year.year} className="flex h-full flex-col justify-end" onPointerEnter={() => setActive(year.year)}>
              <span className="sr-only">
                {year.year}: {yearFigures(year)}
              </span>
              {total === 0 ? (
                <span aria-hidden="true" className="block h-px w-full bg-border" />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn('flex w-full flex-col justify-end', isThis && 'outline outline-1 outline-offset-2 outline-foreground', year.year === inProgress && !isThis && 'outline-dashed outline-1 outline-offset-1 outline-primary')}
                  style={{ height: `${Math.max((total / max) * 100, 4)}%` }}
                >
                  {year.frameworks > 0 ? <span className="block w-full bg-primary/35" style={{ height: `${(year.frameworks / total) * 100}%` }} /> : null}
                  {year.awards > 0 ? <span className={cn('block w-full', active === year.year || isThis ? 'bg-primary' : 'bg-primary/75')} style={{ height: `${(year.awards / total) * 100}%` }} /> : null}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <div className="mt-2 grid gap-1.5" style={columns} aria-hidden="true">
        {context.years.map((year) => (
          <MonoLabel key={year.year} className={cn('text-center tabular-nums', year.year === context.year ? 'text-foreground' : 'text-muted-foreground')}>
            {`'${String(year.year).slice(2)}`}
          </MonoLabel>
        ))}
      </div>
      {context.years.some((year) => year.frameworks > 0) ? (
        <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-primary" aria-hidden="true" />
            {t`contracte`}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-primary/35" aria-hidden="true" />
            {t`acorduri-cadru`}
          </span>
        </figcaption>
      ) : null}
    </figure>
  )
}

function RecordsAround({ sheet, context }: { readonly sheet: ContractSheet; readonly context: CtContext }) {
  if (context.around.length === 0) return null
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {context.around.map((other) => {
        const isThis = other.id === sheet.id
        const note = isThis ? t`acesta` : other.framework ? t`acord-cadru` : other.rows > 1 ? t`${other.rows} valori publicate` : null
        const row = cn('grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-start gap-x-3 py-2.5 pr-1', isThis ? 'border-l-2 border-primary pl-2.5' : 'pl-3')
        const body = (
          <>
            <MonoLabel className="pt-1 tabular-nums text-muted-foreground">{other.date ? dayShort(other.date) : '—'}</MonoLabel>
            <span className="min-w-0">
              <span className={cn('block truncate text-sm', isThis ? 'font-semibold' : '', 'text-foreground')}>
                {other.title ?? (other.contractNo ? (other.framework ? t`Acordul-cadru nr. ${other.contractNo}` : t`Contractul nr. ${other.contractNo}`) : t`Fără titlu în SEAP`)}
              </span>
              {note ? <MonoLabel className="mt-1 block text-muted-foreground">{note}</MonoLabel> : null}
            </span>
            <span className={cn('whitespace-nowrap text-right text-sm tabular-nums', other.accepted ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {other.value !== null ? leiShort(other.value) : '—'}
            </span>
          </>
        )
        return (
          <li key={other.id} aria-current={isThis ? 'page' : undefined}>
            {isThis ? (
              <div className={row}>{body}</div>
            ) : (
              <Link to="/procurement/contracts/$id" params={{ id: other.id }} className={cn(row, 'transition-colors hover:text-primary')}>
                {body}
              </Link>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function PartyBlock({ sheet, role }: { readonly sheet: ContractSheet; readonly role: 'authority' | 'supplier' }) {
  const year = linkYear(sheet)
  const party = role === 'authority' ? sheet.authority : sheet.supplier
  const about = role === 'authority' ? aboutText(party.identity) : null
  const search = year === undefined ? {} : { year }
  return (
    <div className="border-t pt-4">
      <MonoLabel className={LABEL}>{role === 'authority' ? t`Instituția` : t`Firma`}</MonoLabel>
      <p className="mt-3 text-base font-semibold leading-snug">
        <PartyName party={party} role={role} year={year} />
      </p>
      {about ? <p className="mt-1 text-sm text-muted-foreground">{about}</p> : null}
      {party.cui ? <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">CUI {party.cui}</p> : null}
      {party.cui ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {role === 'authority' ? (
            <>
              <Link to="/procurement/institutions/$cui" params={{ cui: party.cui }} search={search} className={OUT_LINK}>
                {t`Achizițiile instituției`}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              {party.hasBudget ? (
                <Link to="/entities/$cui" params={{ cui: party.cui }} className={OUT_LINK}>
                  {t`Bugetul`}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link to="/procurement/suppliers/$cui" params={{ cui: party.cui }} search={search} className={OUT_LINK}>
                {t`Vânzările firmei`}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link to="/companies/$cui" params={{ cui: party.cui }} className={OUT_LINK}>
                {t`Firma`}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** The context band: what else passed between the institution and the firm, set apart — tinted, labelled „Context". */
export function ContractContextBand({ sheet, context }: { readonly sheet: ContractSheet; readonly context: CtContext | null }) {
  const year = linkYear(sheet)
  const authority = <PartyName party={sheet.authority} role="authority" year={year} />
  const supplier = <PartyName party={sheet.supplier} role="supplier" year={year} />
  const sentences = context ? [historyText(context, sheet.kind === 'framework'), directText(context), buyerYearText(context), sellerYearText(context)].filter((text): text is string => Boolean(text)) : []
  // One contract in all between them: its chart and its list would only repeat the sentence that says so.
  const many = context !== null && (context.years.reduce((sum, year) => sum + year.awards + year.frameworks, 0) > 1 || context.around.length > 1)
  return (
    <section className={cn('border-y', CONTEXT_TINT)} aria-labelledby="contract-context">
      <RuledFrame className="py-12 sm:py-16">
        <MonoLabel className={LABEL}>{t`Context`}</MonoLabel>
        <h2 id="contract-context" className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t`Alte contracte între ele`}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <Trans>
            Ce a mai atribuit {authority} firmei {supplier}, din 2019 încoace.
          </Trans>
        </p>
        {context ? (
          <div className={cn('mt-8 grid gap-10 lg:gap-12', many ? 'lg:grid-cols-12' : '')}>
            <div className={cn('min-w-0 space-y-3 text-base leading-relaxed text-muted-foreground', many ? 'lg:col-span-5' : 'max-w-[62ch]')}>
              {sentences.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
              {many ? (
                <>
                  <MonoLabel className={cn(LABEL, 'pt-5')}>{t`Între ele, pe ani`}</MonoLabel>
                  <PairYears context={context} className="mt-3" />
                </>
              ) : null}
            </div>
            <div className={cn('min-w-0', many ? 'lg:col-span-7' : 'hidden')}>
              {context.around.length > 1 ? (
                <>
                  <MonoLabel className={LABEL}>{t`În jurul acestui contract`}</MonoLabel>
                  <div className="mt-3">
                    <RecordsAround sheet={sheet} context={context} />
                  </div>
                  {sheet.authority.cui && sheet.supplier.cui && context.records !== null && context.records > context.around.length ? (
                    <Link
                      to="/procurement/search"
                      search={{ view: 'list', grain: 'contracts', authority_cui: sheet.authority.cui, supplier_cui: sheet.supplier.cui }}
                      className={cn(OUT_LINK, 'mt-3 text-sm')}
                    >
                      {t`Toate cele ${context.records} dintre ele`}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            {sheet.date && Number(sheet.date.slice(0, 4)) < FIRST_YEAR
              ? t`Contractul e dinainte de 2019; pagina adună contractele dintre ele din 2019 încoace.`
              : t`SEAP nu dă codul fiscal al uneia dintre părți, așa că celelalte contracte dintre ele nu se pot aduna.`}
          </p>
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-10">
          <PartyBlock sheet={sheet} role="authority" />
          <PartyBlock sheet={sheet} role="supplier" />
        </div>
      </RuledFrame>
    </section>
  )
}

// ─────────────────────────────────────────────────────────── the history ──

interface HistoryStep {
  readonly key: string
  readonly when: string | null
  readonly title: string
  readonly body: ReactNode
  readonly value: number | null
  /** The act's text states another change than its reported values. */
  readonly stated?: number | null
}

/** The contract's life in the order it happened: dated steps by day, undated amendments by their number, the value now last. */
function historyOf(sheet: ContractSheet): readonly HistoryStep[] {
  const dated: HistoryStep[] = []
  if (sheet.call) {
    dated.push({
      key: 'call',
      when: sheet.call.date,
      title: t`Anunțul de participare`,
      body: (
        <>
          <span className="font-mono tabular-nums">{sheet.call.no}</span>
          {sheet.offers ? <span className="block">{raisedFirst(t`${offersCount(sheet.offers.received)} până la termen.`)}</span> : null}
        </>
      ),
      value: null,
    })
  }
  const own = sheet.contract.versions.find((version) => version.isThis)?.value ?? null
  dated.push({
    key: 'contract',
    when: sheet.date,
    title: sheet.kind === 'framework' ? t`Acordul-cadru, încheiat` : t`Contractul, încheiat`,
    body: <span className="block">{namesList(sheet.contract.firms.map((firm) => firm.name))}</span>,
    value: own,
  })
  if (sheet.startDate) dated.push({ key: 'start', when: sheet.startDate, title: t`Începutul contractului`, body: null, value: null })
  if (sheet.awardNoticeDate) {
    dated.push({
      key: 'award',
      when: sheet.awardNoticeDate,
      title: t`Anunțul de atribuire, publicat`,
      body: (
        <>
          {sheet.noticeNo ? <span className="font-mono tabular-nums">{sheet.noticeNo}</span> : null}
          {sheet.republished ? <span className="block">{republishedText(sheet.republished.times, dayLong(sheet.republished.last))}</span> : null}
        </>
      ),
      value: null,
    })
  }
  // An undated amendment takes its place by number: after the act before it (or the contract), not after every dated step.
  let placedAt = sheet.date ?? ''
  const order = new Map<string, string>()
  for (const item of sheet.amendments) {
    placedAt = item.date ?? placedAt
    order.set(item.id, placedAt)
    dated.push({
      key: item.id,
      when: item.date,
      title: item.number ? t`Actul adițional nr. ${item.number}` : t`Act adițional`,
      body: item.text ? <Clamp text={item.text} /> : null,
      value: item.after,
      stated: item.mismatch ? item.stated : null,
    })
  }
  const at = (step: HistoryStep) => step.when ?? order.get(step.key) ?? ''
  const steps = dated.map((step, index) => ({ step, index })).sort((a, b) => at(a.step).localeCompare(at(b.step)) || a.index - b.index).map(({ step }) => step)
  if (sheet.current) {
    steps.push({
      key: 'current',
      when: null,
      title: t`Valoarea de azi, în anunț`,
      body: <span className="block">{t`după ${modificationsCount(sheet.current.modified)} ale contractului`}</span>,
      value: sheet.current.value,
    })
  }
  return steps
}

/** „Istoria contractului": from the call to the value it stands at now, with the amendments checked against their own text. */
export function ContractHistory({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const steps = historyOf(sheet)
  // A contract with nothing but its own day has no history to tell.
  if (steps.length < 2) return null
  const lede = amendmentsLede(sheet)
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{t`Istoria contractului`}</h3>
      {lede ? (
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          {lede} {t`Valorile, așa cum le-a raportat instituția.`}
        </p>
      ) : null}
      <ol className="mt-6 border-l border-border pl-6">
        {steps.map((step) => (
          <li key={step.key} className="relative pb-7 last:pb-0">
            <span className={cn('absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-background', step.key === 'contract' ? 'bg-primary' : 'bg-foreground')} aria-hidden="true" />
            <MonoLabel className="block tabular-nums text-muted-foreground">{step.when ? dayLong(step.when) : step.key === 'current' ? t`azi` : t`fără dată`}</MonoLabel>
            <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 text-sm font-semibold text-foreground">
              <span>{step.title}</span>
              {step.value !== null ? <span className={cn('tabular-nums', step.stated != null && 'text-amber-800 dark:text-amber-300')}>{leiExact(step.value)}</span> : null}
            </p>
            {step.stated != null ? <p className="mt-0.5 text-right text-xs text-amber-800 dark:text-amber-300">{t`valoare raportată; textul actului spune ${signedLei(step.stated)}`}</p> : null}
            {step.body ? <div className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{step.body}</div> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
