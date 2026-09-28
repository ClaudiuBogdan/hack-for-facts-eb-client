import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { linkYearOf, type ContractSheet, type CtContract, type CtParty } from '../../lib/contract-model'
import {
  againText,
  amendmentsLede,
  associationNote,
  contractsCount,
  criterionText,
  daysCount,
  estimateGap,
  fileText,
  firmsCount,
  frameworksCount,
  isAssociation,
  isSharedFramework,
  lotsText,
  modificationsCount,
  monthsCount,
  namesList,
  offersCount,
  offersFate,
  offersFrom,
  republishedText,
  signedLei,
  unpublishedText,
  valueBox,
  valuesCount,
  versionsText,
} from '../../lib/contract-text'
import { dayLong, dayShort, labelText, leiExact, leiShort } from '../../lib/direct-purchase-text'
import { procedureLabel } from '../../lib/home-model'
import { PartyName } from '../direct-purchase/direct-purchase-head'
import { Clamp } from '../direct-purchase/direct-purchase-receipt'

/**
 * The contract, section by section (`design.md` §17.6): the value on its own
 * row with the facts under it, then — each only where it says something —
 * the association's firms, the values SEAP publishes the contract at, its
 * history (the call, the contract, the award notice, the amendments checked
 * against their own text, the value today), the notice's other contracts,
 * the source.
 */

const SUBHEAD = 'text-base font-semibold tracking-tight text-foreground sm:text-lg'
const LABEL = 'block text-muted-foreground'
const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'

const raisedFirst = (text: string) => text.charAt(0).toLocaleUpperCase('ro-RO') + text.slice(1)

function ExternalLink({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> {t`(se deschide într-o filă nouă)`}</span>
    </a>
  )
}

// ─────────────────────────────────────────────────── the value and facts ──

/** The figure's size by its length: a phone holds „3.068.398.862,94 lei" only a size down. */
function figureSize(figure: string): string {
  if (figure.length <= 12) return 'text-5xl sm:text-6xl'
  if (figure.length <= 16) return 'text-4xl sm:text-6xl'
  return 'text-3xl min-[420px]:text-4xl sm:text-6xl'
}

function ContractValue({ sheet }: { readonly sheet: ContractSheet }) {
  const box = valueBox(sheet)
  const boxLabel = box.label
  const label = sheet.vatExcluded && box.figure !== '—' ? t`${boxLabel}, fără TVA` : boxLabel
  const shared = associationNote(sheet.contract)
  const versions = sheet.contract.versions.length
  const others =
    versions > 1
      ? plural(versions, {
          one: 'E una dintre valorile pe care SEAP le publică pentru acest contract, mai jos.',
          few: 'E una dintre cele # valori pe care SEAP le publică pentru acest contract, mai jos.',
          other: 'E una dintre cele # de valori pe care SEAP le publică pentru acest contract, mai jos.',
        })
      : null
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

/** The facts under the value: the day, the route, the category — and, where the notice says them, the offers, the criterion, the duration, the estimate. */
function ContractFacts({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const { i18n } = useLingui()
  const procedureType = sheet.procedure?.type ?? null
  const routeLabel = procedureType ? procedureLabel(procedureType) : null
  const route = procedureType ? (routeLabel ? i18n._(routeLabel) : procedureType) : null
  const category = sheet.cpv ? labelText(sheet.cpv.label) : null
  const cells = [sheet.date, route, sheet.cpv, sheet.estimate, sheet.offers, sheet.criterion, sheet.duration].filter((cell) => cell !== null && cell !== undefined).length
  const own = sheet.contract.versions.find((version) => version.isThis)?.value ?? null
  const fate = sheet.offers ? offersFate(sheet.offers) : null
  const from = sheet.offers ? offersFrom(sheet.offers) : null
  const gap = sheet.estimate !== null ? estimateGap(sheet.estimate, own) : null
  const ted = sheet.procedure?.ted ?? null
  const tedNo = ted?.no ?? ''
  return (
    <div className={className}>
      <dl className={cn('grid grid-cols-2 gap-x-8 gap-y-6', cells >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3')}>
        {sheet.date ? <Fact label={t`Data contractului`}>{dayLong(sheet.date)}</Fact> : null}
        {route && sheet.procedure ? (
          <Fact label={t`Procedura`}>
            <Link to="/procurement/procedures/$id" params={{ id: sheet.procedure.id }} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
              {route}
            </Link>
            {ted ? (
              <span className="mt-1 block text-muted-foreground">
                <Trans>
                  publicată și în{' '}
                  <a href={ted.url} target="_blank" rel="noreferrer" title={`TED ${tedNo}`} className="whitespace-nowrap underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">
                    Jurnalul UE
                  </a>
                </Trans>
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> {t`(TED ${tedNo}, se deschide într-o filă nouă)`}</span>
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

/** The firms SEAP publishes the contract under: an association's, each at the whole value, or a shared framework's (the model orders them, this page's first). */
function ContractFirms({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const shared = isSharedFramework(sheet.contract)
  if (!isAssociation(sheet.contract) && !shared) return null
  const year = linkYearOf(sheet)
  const isOwn = (firm: CtParty) => (sheet.supplier.cui ? firm.cui === sheet.supplier.cui : firm.name === sheet.supplier.name)
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{shared ? t`Firmele din acordul-cadru` : t`Firmele din asociere`}</h3>
      <ul className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {sheet.contract.firms.map((firm) => (
          <li key={firm.cui ?? firm.name} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span className="min-w-0">
              <PartyName party={firm} role="supplier" year={year} />
              {isOwn(firm) ? <MonoLabel className="ml-2 text-muted-foreground">{t`pagina aceasta`}</MonoLabel> : null}
              {firm.sme ? <MonoLabel className="ml-2 text-muted-foreground">{t`IMM`}</MonoLabel> : null}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{firm.cui ? `CUI ${firm.cui}` : t`fără CUI în SEAP`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** One contract number at several values: every value, this row's marked. */
function ContractVersions({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
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
          const today = sheet.current !== null && version.value !== null && Math.abs(version.value - sheet.current.value) <= 1
          const act = version.afterAmendment
          const day = version.date
          const dayText = day ? dayShort(day) : ''
          const note = today
            ? t`valoarea de azi a anunțului`
            : act
              ? t`după actul adițional nr. ${act}`
              : !day
                ? t`fără dată în SEAP`
                : day !== sheet.date
                  ? t`cu data ${dayText}`
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

/** The contract's life in the order it happened: dated steps by day, undated amendments by their number, the value today last. */
function historyOf(sheet: ContractSheet): readonly HistoryStep[] {
  const dated: HistoryStep[] = []
  if (sheet.call) {
    const offers = sheet.offers ? offersCount(sheet.offers.received) : null
    dated.push({
      key: 'call',
      when: sheet.call.date,
      title: t`Anunțul de participare`,
      body: (
        <>
          <span className="font-mono tabular-nums">{sheet.call.no}</span>
          {offers ? <span className="block">{raisedFirst(t`${offers} până la termen.`)}</span> : null}
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
    const number = item.number
    dated.push({
      key: item.id,
      when: item.date,
      title: number ? t`Actul adițional nr. ${number}` : t`Act adițional`,
      body: item.text ? <Clamp text={item.text} /> : null,
      value: item.after,
      stated: item.mismatch ? item.stated : null,
    })
  }
  const at = (step: HistoryStep) => step.when ?? order.get(step.key) ?? ''
  const steps = dated
    .map((step, index) => ({ step, index }))
    .sort((a, b) => at(a.step).localeCompare(at(b.step)) || a.index - b.index)
    .map(({ step }) => step)
  if (sheet.current) {
    const modifications = modificationsCount(sheet.current.modified)
    steps.push({
      key: 'current',
      when: null,
      title: t`Valoarea de azi, în anunț`,
      body: <span className="block">{t`după ${modifications} ale contractului`}</span>,
      value: sheet.current.value,
    })
  }
  return steps
}

/** „Istoria contractului": from the call to the value it stands at now, with the amendments checked against their own text. */
function ContractHistory({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
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
        {steps.map((step) => {
          const stated = step.stated != null ? signedLei(step.stated) : null
          return (
            <li key={step.key} className="relative pb-7 last:pb-0">
              <span className={cn('absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-background', step.key === 'contract' ? 'bg-primary' : 'bg-foreground')} aria-hidden="true" />
              <MonoLabel className="block tabular-nums text-muted-foreground">{step.when ? dayLong(step.when) : step.key === 'current' ? t`azi` : t`fără dată`}</MonoLabel>
              <p className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 text-sm font-semibold text-foreground">
                <span>{step.title}</span>
                {step.value !== null ? <span className={cn('tabular-nums', stated && 'text-amber-800 dark:text-amber-300')}>{leiExact(step.value)}</span> : null}
              </p>
              {stated ? <p className="mt-0.5 text-right text-xs text-amber-800 dark:text-amber-300">{t`valoare raportată; textul actului spune ${stated}`}</p> : null}
              {step.body ? <div className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">{step.body}</div> : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ───────────────────────────────────────────── the notice, the source ──

function contractValueText(contract: CtContract): string {
  if (contract.versions.length > 1) {
    const count = valuesCount(contract.versions.length)
    const values = contract.versions.map((version) => (version.value !== null ? leiShort(version.value) : '—')).join(' · ')
    return t`${count}: ${values}`
  }
  const value = contract.versions[0]?.value ?? null
  return value !== null ? leiExact(value) : '—'
}

/** The notice's other contracts: each a link, with its firms and value; a long list folded. */
function NoticeOthers({ sheet, className, limit = 6 }: { readonly sheet: ContractSheet; readonly className?: string; readonly limit?: number }) {
  const [open, setOpen] = useState(false)
  const others = sheet.others
  if (others.length === 0) return null
  const shown = open ? others : others.slice(0, limit)
  const firms = new Set(others.flatMap((contract) => contract.firms.map((firm) => firm.cui ?? firm.name))).size
  const allFrameworks = others.every((contract) => contract.framework)
  const notice = sheet.noticeNo ?? ''
  const count = allFrameworks ? frameworksCount(others.length) : contractsCount(others.length)
  const firmsText = firmsCount(firms)
  const awarded = sheet.procedure?.awardedTotal ?? null
  const total = awarded !== null ? leiExact(awarded) : null
  const all = others.length
  return (
    <div className={className}>
      <h3 className={SUBHEAD}>{allFrameworks ? t`Celelalte acorduri-cadru din anunț` : t`Celelalte contracte din anunț`}</h3>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
        {/* The notice's rows are read a page at a time: when the page came back full, the count is a floor. */}
        {sheet.noticeMore ? t`Anunțul ${notice} mai are cel puțin ${count}, cu ${firmsText}.` : t`Anunțul ${notice} mai are ${count}, cu ${firmsText}.`}
        {total ? ` ${allFrameworks ? t`În total, procedura a atribuit acorduri-cadru de cel mult ${total}.` : t`În total, procedura a atribuit ${total}.`}` : ''}
        {sheet.lots ? ` ${lotsText(sheet.lots)}` : ''}
      </p>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {shown.map((contract) => {
          const names = namesList(contract.firms.map((firm) => firm.name))
          const number = contract.contractNo
          return (
            <li key={contract.key}>
              <Link to="/procurement/contracts/$id" params={{ id: contract.linkId }} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3 text-sm transition-colors hover:text-primary">
                <span className="min-w-0">
                  <span className="block truncate text-foreground" title={names}>
                    {names}
                  </span>
                  <MonoLabel className="mt-1 block text-muted-foreground">
                    {number ? t`nr. ${number}` : t`fără număr`}
                    {contract.date ? ` · ${dayShort(contract.date)}` : ''}
                  </MonoLabel>
                </span>
                <span className={cn('text-right tabular-nums sm:whitespace-nowrap', contract.versions.every((version) => !version.accepted) ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
                  {contractValueText(contract)}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {others.length > limit ? (
        <button type="button" onClick={() => setOpen((value) => !value)} className={cn(OUT_LINK, 'mt-3 text-sm')} aria-expanded={open}>
          {open ? t`Mai puține` : t`Toate cele ${all}`}
        </button>
      ) : null}
    </div>
  )
}

/** Where the record comes from: the award notice, or the export row (and the notice SEAP matched it to); the VAT basis when the notice states it. */
function ContractSource({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  const { source } = sheet
  const again = sheet.alsoIn > 0 ? againText(sheet.alsoIn) : null
  const notice = sheet.noticeUrl ?? (source.kind === 'notice' ? source.url : null)
  const file = source.file ? `, ${fileText(source.file)}` : ''
  const dataGov = source.url ? (
    <>
      {' '}
      (<ExternalLink href={source.url}>{t`data.gov.ro`}</ExternalLink>)
    </>
  ) : null
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
              {file}
              {dataGov}
            </>
          ) : null}
          .
        </>
      ) : (
        <>
          {t`raportul SEAP al contractelor`}
          {file}
          {dataGov}.
        </>
      )}{' '}
      {sheet.vatExcluded ? <>{t`Valorile anunțului sunt fără TVA.`} </> : null}
      {again}
    </p>
  )
}

// ───────────────────────────────────────────────────────────── the block ──

/** The record: what was awarded, then its firms, its published values, its history, the notice's other contracts, the source. */
export function ContractBlock({ sheet, className }: { readonly sheet: ContractSheet; readonly className?: string }) {
  return (
    <section className={className} aria-labelledby="contract-block">
      <h2 id="contract-block" className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        <Trans>Ce s-a atribuit</Trans>
      </h2>
      {sheet.noticeUnread ? (
        <p role="status" className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
          {t`Celelalte rânduri ale anunțului nu s-au putut citi acum: firmele din asociere, celelalte valori publicate și celelalte contracte din anunț pot lipsi. Reîncarcă pagina pentru ele.`}
        </p>
      ) : null}
      {/* The value on its own row — a contract's runs from 400 lei to 6,1 billion — and the facts under it. */}
      <div className="mt-8 border-y py-7">
        <ContractValue sheet={sheet} />
        <ContractFacts sheet={sheet} className="mt-7 border-t pt-7" />
      </div>
      <ContractFirms sheet={sheet} className="mt-12" />
      <ContractVersions sheet={sheet} className="mt-12" />
      <ContractHistory sheet={sheet} className="mt-12" />
      <NoticeOthers sheet={sheet} className="mt-12" />
      <ContractSource sheet={sheet} className="mt-10" />
    </section>
  )
}
