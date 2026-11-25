import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ANALYSIS_LEGAL_FORMS } from '@/features/private-companies/lib/company-analytics-url'
import { mainShownAsCurrent } from '@/features/private-companies/lib/company-main-activity-model'
import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { companySentenceFacts, headActivity, headActivityDetail } from '@/features/private-companies/lib/company-profile-text'
import { companyFactSearch } from '@/features/private-companies/lib/hub-analysis-links'
import { cn } from '@/lib/utils'

/**
 * PROTOTYPE: the head's sentence (`CompanySentence` in
 * `company-profile-head.tsx`, copied) with its activity aligned with the
 * band's lead — see `ActivitySentence` below.
 */

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
export function PresumedSentence({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const { form, feminine, where, recordedYear: year } = companySentenceFacts(model)
  const legalForm = model.profile.legalForm
  // A PFA, II or IF is outside the analysis's population: its form is said, not linked to an empty answer.
  const formLink: FactLink | null =
    legalForm && ANALYSIS_LEGAL_FORMS.includes(legalForm.toUpperCase())
      ? { search: companyFactSearch({ legalForms: [legalForm] }), hint: t`firmele cu aceeași formă juridică, în analiza bilanțurilor` }
      : null
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

/**
 * The head's activity sentence, aligned with „Ce face firma" (owner, 25
 * November 2026: „Same as the band"): ANAF's presumed main activity where it
 * is current with an exact key, named as presumed and leading to its band;
 * otherwise the derived selection's sentence, as today.
 */
function ActivitySentence({ model }: { readonly model: CompanyProfileModel }) {
  const view = model.assumedMain
  if (view.kind === 'assigned' && mainShownAsCurrent(view.activity) && view.activity.resolved) {
    const presumed = view.activity.resolved.label
    return (
      <>
        {' '}
        <Trans>
          Activitate principală (presupusă după ANAF): <Fact link={{ hash: 'activitati', hint: t`ce face firma, mai jos` }}>{presumed}</Fact>.
        </Trans>
      </>
    )
  }
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
