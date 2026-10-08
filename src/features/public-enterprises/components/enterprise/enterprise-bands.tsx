import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { ChevronDown } from 'lucide-react'

import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { moneyText as companyMoneyText, yearRanges } from '@/features/private-companies/lib/company-profile-format'
import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { moneyPeriod } from '@/features/private-companies/lib/company-profile-text'
import { HomeBand } from '@/features/procurement/components/home/home-chrome'
import { CategoryRows, PartyRows } from '@/features/procurement/components/home/home-rows'
import { hasAnyRecord, isEmptyYear, supplierName, type BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { periodYear } from '@/features/procurement/lib/profile-period'
import { periodText } from '@/features/procurement/lib/profile-period-text'
import { HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import { boardPanel, type ControlGroup, type ControlRow, type IndicatorTables } from '../../lib/enterprise-model'
import { controlLede, spendingLede } from '../../lib/enterprise-text'
import { BandColumns, BandNote } from '../hub/hub-parts'
import { ControlList, IndicatorFacts, IndicatorTableView, OutLink, PeerList, StatusTable } from './enterprise-parts'

/**
 * The enterprise page's bands, one per question, in the order the owner
 * chose (2026-10-08): who controls it, the public money, what it reports to
 * AMEPIP, then each source's word on its status — context last, since the
 * head's chips already flag a disagreement.
 */

export type ReadState<T> = { readonly status: 'pending' } | { readonly status: 'failed'; readonly retry: () => void } | { readonly status: 'ready'; readonly value: T }

/** How many categories and firms the money band lists: the procurement page has the rest. */
const SHOWN = 5

// ────────────────────────────────────────────────────────── control ──

export function ControlBand({
  index,
  read,
  rows,
  groups,
  locale,
}: {
  readonly index: string
  readonly read: PublicEnterpriseRead
  readonly rows: readonly ControlRow[]
  readonly groups: readonly ControlGroup[]
  readonly locale: string
}) {
  return (
    <HomeBand id="control" labelledBy="enterprise-control-title">
      <BandColumns titleId="enterprise-control-title" index={index} title={t`Cine o controlează`} lede={controlLede(rows)}>
        <ul className="space-y-8">
          {groups.map((group) => (
            <li key={group.key}>
              <ControlList groups={[group]} read={read} locale={locale} />
              <PeerList row={group.rows[0]!} />
            </li>
          ))}
        </ul>
        {/* The portfolio pages still list each authority's enterprises (the link under it): only this page's live lists are missing. */}
        {read.authorities === null ? <BandNote>{t`Fișele autorităților nu s-au putut citi acum: tipul lor și celelalte întreprinderi pe care le au lipsesc de aici.`}</BandNote> : null}
      </BandColumns>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────────────── money ──

/** What it sells to institutions, from the company page's own figure, with the way to its detail. */
function Seller({ cui, company }: { readonly cui: string; readonly company: ReadState<CompanyProfileModel | null> }) {
  if (company.status === 'pending') return <HubPending rows={1} />
  if (company.status === 'failed') return <HubLoadError onRetry={company.retry} />
  const model = company.value
  if (!model) return <p className="text-sm text-muted-foreground">{t`Fără fișă de firmă: nu se știe ce a vândut instituțiilor.`}</p>
  const { money } = model
  if (money.receivedCount === 0) return <p className="text-sm text-muted-foreground">{t`Nu apare ca furnizor plătit din bani publici.`}</p>
  const period = moneyPeriod(model)
  const valued = money.flows.some((flow) => flow.receipt && flow.total !== null)
  return (
    <div>
      <p className="text-sm leading-relaxed text-foreground">
        {valued
          ? period
            ? t`Contracte și plăți publice de ${companyMoneyText(money.received)}, ${period}.`
            : t`Contracte și plăți publice de ${companyMoneyText(money.received)}.`
          : t`Apare în contracte și plăți publice fără valoare publicată.`}{' '}
        {money.unvaluedCount > 0 && valued ? <span className="text-muted-foreground">{t`O parte nu are valoare publicată: suma e o limită de jos.`}</span> : null}
      </p>
      <OutLink page="company" cui={cui} hash="bani-publici" className="mt-2">
        {t`Ce a primit de la stat`}
      </OutLink>
    </div>
  )
}

/** What it bought in the last twelve months: categories and firms by value, as the procurement page ranks them. */
function Buying({ cui, profile }: { readonly cui: string; readonly profile: BuyerProfile }) {
  // A count not read is unknown: the lists would say „none" for it, so they are not drawn.
  if (profile.direct.count === null) {
    return (
      <OutLink page="buyer" cui={cui}>
        {t`Achizițiile, pe pagina de achiziții`}
      </OutLink>
    )
  }
  // No direct purchase: the lede says so, once; the lists would only say it again.
  if (profile.direct.count === 0) {
    if (!isEmptyYear(profile)) {
      return (
        <OutLink page="buyer" cui={cui}>
          {t`Achizițiile, pe pagina de achiziții`}
        </OutLink>
      )
    }
    return hasAnyRecord(profile) ? (
      <OutLink page="buyer" cui={cui}>
        {t`Anii dinainte, pe pagina de achiziții`}
      </OutLink>
    ) : null
  }
  const categories = profile.categories.direct.slice(0, SHOWN)
  const suppliers = {
    rankedBy: profile.directSuppliers.rankedBy,
    rows: profile.directSuppliers.rows.map((row) => ({ key: row.cui, label: supplierName(profile, row.cui), count: row.count, value: row.value, share: row.share })),
  }
  const period = periodText(profile.period)
  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12" data-reveal>
        <div className="min-w-0">
          <MonoLabel className="block text-muted-foreground">{t`Ce cumpără direct, ${period}`}</MonoLabel>
          {/* Direct purchases there are (the count is positive): an empty breakdown is one not read, never „none". */}
          {categories.length > 0 ? <CategoryRows className="mt-3" rows={categories} grain="direct" /> : <p className="mt-3 border-y py-4 text-sm text-muted-foreground">{t`Categoriile achizițiilor nu s-au putut citi acum.`}</p>}
        </div>
        <div className="min-w-0">
          <MonoLabel className="block text-muted-foreground">{t`De la cine cumpără direct, ${period}`}</MonoLabel>
          {suppliers.rows.length > 0 ? (
            <PartyRows className="mt-3" ranking={suppliers} grain="direct" kind="supplier" year={periodYear(profile.period)} limit={SHOWN} />
          ) : (
            <p className="mt-3 border-y py-4 text-sm text-muted-foreground">{t`Firmele de la care a cumpărat nu s-au putut citi acum.`}</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t`Categoriile adună codurile CPV ale achizițiilor; valorile sunt fără TVA.`}
        {profile.namesUnread ? ` ${t`Numele firmelor nu s-au putut citi acum: firmele apar cu codul fiscal.`}` : ''}
      </p>
      <OutLink page="buyer" cui={cui} className="mt-2">
        {t`Toate achizițiile, pe pagina de achiziții`}
      </OutLink>
    </>
  )
}

/**
 * The public money: what it buys as a contracting authority, in the
 * procurement institution page's own read and words (the last twelve months,
 * direct purchases by value, without VAT), and what it sells to institutions,
 * in the company page's.
 */
export function MoneyBand({
  index,
  cui,
  buyer,
  company,
}: {
  readonly index: string
  readonly cui: string
  readonly buyer: ReadState<BuyerProfile>
  readonly company: ReadState<CompanyProfileModel | null>
}) {
  return (
    <HomeBand id="bani" labelledBy="enterprise-money-title">
      <HubSectionHead
        titleId="enterprise-money-title"
        index={index}
        title={t`Banii publici`}
        lede={buyer.status === 'ready' ? spendingLede(buyer.value) : null}
      />
      <div className="mt-8">
        {buyer.status === 'pending' ? <HubPending rows={5} /> : buyer.status === 'failed' ? <HubLoadError onRetry={buyer.retry} /> : <Buying cui={cui} profile={buyer.value} />}
      </div>
      <div className="mt-10 grid grid-cols-1 gap-3 border-y border-border/70 py-5 lg:grid-cols-12 lg:gap-8">
        <MonoLabel className="text-muted-foreground lg:col-span-4">{t`Vinde instituțiilor`}</MonoLabel>
        <div className="min-w-0 lg:col-span-8">
          <Seller cui={cui} company={company} />
        </div>
      </div>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────────────── AMEPIP ──

/**
 * What it reports to AMEPIP: the newest form's answers on the board and the
 * people first (else the newest ratios), as written; every value, year by
 * year, one click away.
 */
export function AmepipBand({ index, tables, down, locale }: { readonly index: string; readonly tables: IndicatorTables | null; readonly down: boolean; readonly locale: string }) {
  const [open, setOpen] = useState(false)
  const panel = tables ? boardPanel(tables) : null
  const lede =
    tables === null
      ? t`Indicatorii AMEPIP nu s-au putut citi acum.`
      : !tables.calculated && !tables.form
        ? down
          ? t`Registrul AMEPIP nu e încărcat acum.`
          : tables.withheldFormYears.length > 0
            ? t`AMEPIP are pentru ea doar trei valori din formular, pe ${yearRanges(tables.withheldFormYears)} (dividende, investiții, cercetare); nu sunt arătate: un 0 de acolo poate fi o căsuță goală.`
            : t`AMEPIP nu are indicatori pentru această întreprindere.`
        : panel?.kind === 'form'
          ? t`Formularul pe ${panel.year}, cum l-a raportat întreprinderea: consiliul de administrație, oamenii, dividendele.`
          : panel && tables.form
            ? t`Indicatorii calculați din bilanț pe ${panel.year}; în formularul pe ${tables.form.years[tables.form.years.length - 1] ?? panel.year}, rândurile despre consiliu, oameni și dividende sunt goale.`
            : panel
              ? t`Indicatorii calculați din bilanț pe ${panel.year}; AMEPIP nu are formular pentru ea.`
              : tables.form
                ? t`În formularul pe ${tables.form.years[tables.form.years.length - 1] ?? ''}, rândurile despre consiliu, oameni și dividende sunt goale.`
                : null
  return (
    <HomeBand id="amepip" labelledBy="enterprise-amepip-title">
      <BandColumns titleId="enterprise-amepip-title" index={index} title={t`Ce raportează la AMEPIP`} lede={lede}>
        {panel ? <IndicatorFacts rows={panel.rows} year={panel.year} locale={locale} /> : null}
      </BandColumns>
      {tables && (tables.calculated || tables.form) ? (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-8">
          <CollapsibleTrigger className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {open ? t`Ascunde valorile, pe ani` : t`Toate valorile AMEPIP, pe ani`}
            <ChevronDown className={cn('size-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')} aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            {tables.calculated ? (
              <div className="mt-6">
                <IndicatorTableView table={tables.calculated} title={t`Indicatori calculați din bilanț`} caption={t`Indicatorii calculați de AMEPIP, pe ani`} locale={locale} />
              </div>
            ) : null}
            {tables.form ? (
              <div className="mt-10">
                <IndicatorTableView table={tables.form} title={t`Formularul raportat de întreprindere`} caption={t`Formularul AMEPIP, pe ani`} locale={locale} grouped />
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────────────── status ──

export function StatusBand({
  index,
  read,
  company,
  locale,
}: {
  readonly index: string
  readonly read: PublicEnterpriseRead
  readonly company: ReadState<CompanyProfileModel | null>
  readonly locale: string
}) {
  const model = company.status === 'ready' ? company.value : null
  const state = company.status === 'ready' ? (company.value ? 'ready' : 'none') : 'unread'
  // No lede: the head's chips name each status, and the table beside the title gives them with their dates.
  return (
    <HomeBand id="stare" labelledBy="enterprise-status-title">
      <BandColumns titleId="enterprise-status-title" index={index} title={t`Ce spune fiecare sursă`} lede={null}>
        {company.status === 'pending' ? <HubPending rows={4} /> : <StatusTable read={read} model={model} company={state} locale={locale} />}
      </BandColumns>
    </HomeBand>
  )
}
