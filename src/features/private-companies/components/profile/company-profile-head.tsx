import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { cn } from '@/lib/utils'
import { HubInfoNote } from '../hub/hub-info-note'
import { caenEdition, type CompanyProfileModel, type StatusKind } from '../../lib/company-profile-model'
import { companySentenceFacts, headActivity, headActivityDetail, nameLength, statusNotice, statusText } from '../../lib/company-profile-text'
import { companyFactSearch } from '../../lib/hub-analysis-links'
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
  // The trend plots admitted values only: with none, there is nothing to draw.
  const { recent } = model
  const trend = model.latest !== null && [...recent.turnover, ...recent.net.map((point) => point.value), ...recent.employees].some((value) => value !== null)
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
            <CompanySentence model={model} className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground sm:text-lg" />
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StatusChips model={model} explained />
              <IdentifierLine model={model} />
            </div>
            <StatusNotice model={model} registryCaveats={false} className="mt-4 max-w-[60ch]" />
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

const FACT_CLASS = 'font-normal text-foreground underline decoration-primary/50 decoration-2 underline-offset-[0.3em]'
const FACT_LINK_CLASS = cn(FACT_CLASS, 'rounded-[1px] transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')

/**
 * Where a fact of the sentence leads: the companies analysis on the companies
 * sharing it (`search`), or a band of this page (`hash`). `hint` says where,
 * on a pointer and to assistive technology after the fact's own words.
 */
type FactLink = { readonly search: Record<string, unknown>; readonly hint: string } | { readonly hash: string; readonly hint: string }

/**
 * A fact inside the head's sentence, underlined in the value tier so the eye
 * finds it without reading the sentence; a link where it leads somewhere.
 * `plain`: no fact at all (the „Firmă" said for a company with no legal form).
 */
function Fact({ children, link, plain = false }: { readonly children?: ReactNode; readonly link?: FactLink | null; readonly plain?: boolean }) {
  if (plain) return <>{children}</>
  if (!link) return <strong className={FACT_CLASS}>{children}</strong>
  const hint = <span className="sr-only"> ({link.hint})</span>
  if ('hash' in link) {
    return (
      <a href={`#${link.hash}`} className={FACT_LINK_CLASS} title={link.hint}>
        {children}
        {hint}
      </a>
    )
  }
  return (
    <Link to="/companies/analytics" search={link.search} className={FACT_LINK_CLASS} title={link.hint}>
      {children}
      {hint}
    </Link>
  )
}

/** Where the sentence's place leads: the analysis's locality filter when the label names the edition's locality, its county filter when the label is the county alone. */
function placeLink(model: CompanyProfileModel): FactLink | null {
  const { label, county, countyCode, uatCode } = model.place
  if (!label) return null
  if (uatCode) return { search: companyFactSearch({ uat: { in: [uatCode] } }), hint: t`firmele din ${label}, în analiza bilanțurilor` }
  if (countyCode && county === label) return { search: companyFactSearch({ county: { in: [countyCode] } }), hint: t`firmele din ${label}, în analiza bilanțurilor` }
  return null
}

/**
 * The company in sentences, its facts underlined, each leading where the
 * analysis can follow it: the legal form and the place to the companies that
 * share them, the year ONRC recorded (registered then, not necessarily
 * founded: no analysis filter selects it) to the registry band, the selected
 * activity to the companies with the same exact selection, and the activities
 * when none is selected to their band.
 */
export function CompanySentence({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { form, feminine, where, recordedYear: year } = companySentenceFacts(model)
  const legalForm = model.profile.legalForm
  const formLink: FactLink | null = legalForm ? { search: companyFactSearch({ legalForms: [legalForm] }), hint: t`firmele cu aceeași formă juridică, în analiza bilanțurilor` } : null
  const whereLink = placeLink(model)
  const yearLink: FactLink = { hash: 'registru', hint: t`data din registru, mai jos` }
  return (
    <p className={className}>
      {where && year !== null ? (
        feminine ? (
          <Trans>
            <Fact link={formLink} plain={!legalForm}>
              {form}
            </Fact>{' '}
            din <Fact link={whereLink}>{where}</Fact>, înregistrată la ONRC în <Fact link={yearLink}>{year}</Fact>.
          </Trans>
        ) : (
          <Trans>
            <Fact link={formLink} plain={!legalForm}>
              {form}
            </Fact>{' '}
            din <Fact link={whereLink}>{where}</Fact>, înregistrat la ONRC în <Fact link={yearLink}>{year}</Fact>.
          </Trans>
        )
      ) : where ? (
        <Trans>
          <Fact link={formLink} plain={!legalForm}>
            {form}
          </Fact>{' '}
          din <Fact link={whereLink}>{where}</Fact>.
        </Trans>
      ) : year !== null ? (
        feminine ? (
          <Trans>
            <Fact link={formLink} plain={!legalForm}>
              {form}
            </Fact>
            , înregistrată la ONRC în <Fact link={yearLink}>{year}</Fact>.
          </Trans>
        ) : (
          <Trans>
            <Fact link={formLink} plain={!legalForm}>
              {form}
            </Fact>
            , înregistrat la ONRC în <Fact link={yearLink}>{year}</Fact>.
          </Trans>
        )
      ) : (
        <Trans>
          <Fact link={formLink} plain={!legalForm}>
            {form}
          </Fact>
          .
        </Trans>
      )}
      <ActivitySentence model={model} />
    </p>
  )
}

/** The head's activity sentence (`headActivity`), after the company's; nothing when the selection selects nothing for another reason. */
function ActivitySentence({ model }: { readonly model: CompanyProfileModel }) {
  const activity = headActivity(model)
  if (!activity) return null
  if (activity.kind === 'fiscal') {
    const { label: fiscal } = activity
    return (
      <>
        {' '}
        <Trans>
          Cod CAEN fiscal ANAF: <Fact>{fiscal}</Fact>.
        </Trans>
      </>
    )
  }
  if (activity.kind === 'unselected') {
    const classified = plural(activity.count, { one: 'o activitate clasificată', few: '# activități clasificate', other: '# de activități clasificate' })
    return (
      <>
        {' '}
        <Trans>
          <Fact link={{ hash: 'activitati', hint: t`lista lor, mai jos` }}>{classified}</Fact> în registrul ONRC, niciuna selectată.
        </Trans>
      </>
    )
  }
  const link: FactLink = { search: companyFactSearch({ activity: [activity.selector] }), hint: t`firmele cu aceeași activitate selectată, în analiza bilanțurilor` }
  const detail = headActivityDetail(activity)
  const { code } = activity
  const label = activity.label ?? t`codul ${code}`
  return (
    <>
      {' '}
      <Trans>
        Activitatea selectată: <Fact link={link}>{label}</Fact> ({detail}).
      </Trans>
    </>
  )
}

/**
 * The way back: the companies hub, the company's county in the analysis, and
 * — for a selected ONRC class whose revision names its division — that
 * division, as text: the analysis filters exact activities, never a division.
 */
export function CompanyKicker({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { place } = model
  const { county } = place
  const activity = headActivity(model)
  const division = activity?.kind === 'selected' && activity.division && activity.revision ? { name: activity.division, code: activity.code.slice(0, 2), revision: activity.revision } : null
  const divisionTitle = (() => {
    if (!division) return undefined
    const { code, name } = division
    const edition = caenEdition(division.revision)
    return t`Diviziunea CAEN ${code}, ${edition}: ${name}`
  })()
  // Every text box trimmed to its capitals, so centring puts the arrow on the capitals' middle in any font.
  return (
    <MonoLabel className={cn('flex flex-wrap items-center gap-2 text-muted-foreground **:[text-box:trim-both_cap_alphabetic]', className)}>
      <Link to="/companies" className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>
          <Trans>Firme</Trans>
        </span>
      </Link>
      {place.countyCode && county ? (
        <>
          <span aria-hidden="true">/</span>
          <Link
            to="/companies/analytics"
            search={companyFactSearch({ county: { in: [place.countyCode] } })}
            className="hover:text-foreground"
            title={t`Firmele din ${county}, în analiza bilanțurilor`}
          >
            {county}
          </Link>
        </>
      ) : null}
      {division ? (
        <>
          <span aria-hidden="true">/</span>
          {/* Cut along the line only: the kicker trims each box to its capitals, which a vertical clip would cut into. */}
          <span className="min-w-0 max-w-full overflow-x-clip text-ellipsis whitespace-nowrap sm:max-w-[48ch]" title={divisionTitle}>
            {division.name}
          </span>
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
  conflict: 'bg-amber-500',
  unqualified: 'bg-muted-foreground',
}

/** A registry status the chip alone cannot settle: observations that disagree, or an edition that cannot say. */
const isRegistryCaveat = (model: CompanyProfileModel) => model.status.kind === 'conflict' || model.status.kind === 'unqualified'

/**
 * The status, VAT and ANAF chips. `explained`: a registry caveat's note opens
 * from an info button beside its chip, in place of the notice under the head
 * (the head then renders `StatusNotice` with `registryCaveats={false}`).
 */
export function StatusChips({
  model,
  className,
  explained = false,
}: {
  readonly model: CompanyProfileModel
  readonly className?: string
  readonly explained?: boolean
}) {
  const { fiscal } = model.profile
  const note = explained && isRegistryCaveat(model) ? statusNotice(model) : null
  return (
    <ul className={cn('flex flex-wrap items-center gap-2', className)}>
      <li className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium text-foreground">
          <span className={cn('size-1.5 rounded-full', STATUS_TONE[model.status.kind])} aria-hidden="true" />
          {statusText(model)}
        </span>
        {note ? <HubInfoNote label={t`Despre starea din registru`}>{note}</HubInfoNote> : null}
      </li>
      {fiscal.vatPayer ? (
        <li className="inline-flex items-center border px-2.5 py-1 text-xs text-muted-foreground">
          <Trans>Plătitoare de TVA</Trans>
        </li>
      ) : null}
      {/* ANAF's list of declared inactive taxpayers: its absence is not an ONRC „în funcțiune". */}
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
export function StatusNotice({
  model,
  className,
  registryCaveats = true,
}: {
  readonly model: CompanyProfileModel
  readonly className?: string
  /** False where the status chip explains a registry caveat itself (`StatusChips` `explained`). */
  readonly registryCaveats?: boolean
}) {
  const message = registryCaveats || !isRegistryCaveat(model) ? statusNotice(model) : null
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
