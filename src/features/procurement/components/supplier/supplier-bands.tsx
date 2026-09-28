import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { ProcurementSupplierGrain } from '@/schemas/procurement-supplier'
import { allCategoriesText } from '../../lib/buyer-text'
import { categoryOfCode } from '../../lib/home-categories'
import { contractsCount, countText, moneyText, monthText } from '../../lib/home-format'
import { supplierCountySearch, supplierRecordsSearch } from '../../lib/home-links'
import { DIRECT_COMPARABLE_FROM, type RecentRecord } from '../../lib/home-model'
import { clientName, contractClients, type SupplierView } from '../../lib/supplier-model'
import { clientsLede, howLede, partnersLede, steadyLede, whatLede, whereLede } from '../../lib/supplier-text'
import { HomeBand, ProvisionalMark } from '../home/home-chrome'
import { CategoryRows } from '../home/home-rows'
import { PartyYearsMatrix } from '../profile/party-years-matrix'
import { CountyRows, ProcedureRows } from '../profile/profile-rows'
import { ClientRows, PartnerRows, RecordList } from './supplier-rows'

/**
 * A firm's page's bands, one per question: who buys from it (and what it is
 * to them), what it sells, where its buyers are, how it wins, with whom, the
 * largest records, and the firm last. Each opens with a sentence computed from
 * the read, or none when the data has nothing worth saying.
 */

const HALF = 'lg:col-span-5'
const OTHER_HALF = 'min-w-0 lg:col-span-6 lg:col-start-7'
/** Two columns of rows on a wide screen, the rows kept whole. */
const COLUMNS = 'lg:columns-2 lg:gap-12 [&>li]:break-inside-avoid'
const CATEGORIES_SHOWN = 8
const OUT_LINK = 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0'
const EMPTY = 'border-y py-4 text-sm text-muted-foreground'

function grainOf(choice: ProcurementSupplierGrain): 'direct' | 'contract' {
  return choice === 'directe' ? 'direct' : 'contract'
}

function GrainToggle({ value, onChange }: { readonly value: ProcurementSupplierGrain; readonly onChange: (value: ProcurementSupplierGrain) => void }) {
  return (
    <IndicatorToggle
      label={t`Arată`}
      options={[
        { key: 'directe', label: t`Achiziții directe` },
        { key: 'contracte', label: t`Contracte` },
      ]}
      value={value}
      onChange={onChange}
    />
  )
}

// ─────────────────────────────────────────────────────── who buys ──

export function SupplierClientsBand({ profile, index }: { readonly profile: SupplierView; readonly index: string }) {
  const contracts = contractClients(profile)
  const hasDirect = profile.directClients.rows.length > 0
  const hasContracts = contracts.rows.length > 0
  const matrix = profile.clientYears.filter((row) => row.total > 0)
  return (
    <HomeBand id="clienti" labelledBy="supplier-clients-title">
      <HubSectionHead titleId="supplier-clients-title" index={index} title={<Trans>Cine cumpără de la firmă</Trans>} lede={clientsLede(profile)} />
      <div className={hasDirect && hasContracts ? 'mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12' : 'mt-8 max-w-3xl'} data-reveal>
        {hasDirect ? (
          <div className="min-w-0">
            <MonoLabel className="block text-muted-foreground">
              <Trans>Achiziții directe, după valoare, {profile.year}</Trans>
            </MonoLabel>
            <ClientRows className="mt-3" profile={profile} ranking={profile.directClients} grain="direct" />
          </div>
        ) : null}
        {hasContracts ? (
          <div className="min-w-0">
            <MonoLabel className="block text-muted-foreground">
              <Trans>Contracte câștigate, după număr, {profile.year}</Trans>
            </MonoLabel>
            <ClientRows className="mt-3" profile={profile} ranking={contracts} grain="contract" />
          </div>
        ) : null}
        {!hasDirect && !hasContracts ? (
          <p className={EMPTY}>
            <Trans>Nicio vânzare în {profile.year}.</Trans>
          </p>
        ) : null}
      </div>
      {matrix.length > 1 ? (
        <div className="mt-12" data-reveal>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            <Trans>An de an</Trans>
          </h3>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            {steadyLede(profile, matrix) ?? <Trans>Instituțiile care au cumpărat cel mai mult direct de la firmă din {DIRECT_COMPARABLE_FROM} încoace, pe ani.</Trans>}
          </p>
          <PartyYearsMatrix
            className="mt-4"
            rows={matrix}
            year={profile.year}
            kind="authority"
            nameOf={(cui) => clientName(profile, cui)}
            caption={t`Achiziții directe de la firmă, pe instituții și ani, lei`}
          />
        </div>
      ) : null}
      {profile.weights.size > 0 ? (
        <p className="mt-6 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
          <Trans>
            „Din achizițiile ei directe”: banii plătiți firmei împărțiți la toate achizițiile directe ale instituției în același an, calculat de
            Transparenta.eu.
          </Trans>
        </p>
      ) : null}
    </HomeBand>
  )
}

// ───────────────────────────────────────────────────── what it sells ──

export function SupplierWhatBand({
  profile,
  index,
  choice,
  onChoice,
}: {
  readonly profile: SupplierView
  readonly index: string
  readonly choice: ProcurementSupplierGrain
  readonly onChoice: (choice: ProcurementSupplierGrain) => void
}) {
  const { i18n } = useLingui()
  const [all, setAll] = useState(false)
  const grain = grainOf(choice)
  // Every contract row's own CPV code when all were read (consortia included); else the analysis's, a consortium's money left out.
  const fromRows = grain === 'contract' && profile.contracts.categories !== null
  const rows = grain === 'contract' ? (profile.contracts.categories ?? profile.categories.contract) : profile.categories.direct
  const shown = all ? rows : rows.slice(0, CATEGORIES_SHOWN)
  const lede = whatLede(rows, grain, profile.year, i18n)
  const both = (profile.direct.count ?? 0) > 0 && profile.contracts.count > 0
  return (
    <HomeBand id="ce" labelledBy="supplier-what-title">
      <HubSectionHead
        titleId="supplier-what-title"
        index={index}
        title={<Trans>Ce vinde</Trans>}
        lede={
          lede && grain === 'contract' ? (
            <>
              {lede} <ProvisionalMark />
            </>
          ) : (
            lede
          )
        }
        aside={both ? <GrainToggle value={choice} onChange={onChoice} /> : null}
      />
      <div className="mt-8" data-reveal>
        {rows.length === 0 ? (
          <p className={EMPTY}>
            {grain === 'direct' ? <Trans>Nicio achiziție directă în {profile.year}.</Trans> : <Trans>Niciun contract în {profile.year}.</Trans>}
          </p>
        ) : (
          <CategoryRows rows={shown} grain={grain} className={COLUMNS} />
        )}
        {rows.length > CATEGORIES_SHOWN ? (
          <button
            type="button"
            onClick={() => setAll((value) => !value)}
            aria-expanded={all}
            className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline underline-offset-4 sm:min-h-0"
          >
            {all ? <Trans>Arată mai puține</Trans> : allCategoriesText(rows.length)}
          </button>
        ) : null}
        <p className="mt-3 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
          {grain === 'direct' ? (
            <Trans>Categoriile adună codurile CPV ale achizițiilor; valorile sunt fără TVA.</Trans>
          ) : (
            <>
              {fromRows ? (
                <Trans>Categoriile adună codurile CPV ale tuturor contractelor, și ale celor câștigate în asociere; valoarea e a întregului contract.</Trans>
              ) : (
                <Trans>Categoriile adună codurile CPV ale contractelor; valoarea e a întregului contract, fără contractele câștigate în asociere.</Trans>
              )}{' '}
              <ProvisionalMark />
            </>
          )}
        </p>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────── where they are ──

export function SupplierWhereBand({ profile, index }: { readonly profile: SupplierView; readonly index: string }) {
  const direct = profile.countiesOf === 'direct'
  // A row opens the explorer on what it counts: the firm's direct purchases, or its contracts, from that county.
  const searchOf = (code: string) => supplierCountySearch(profile.cui, code, profile.year, direct ? 'direct' : 'contract')
  return (
    <HomeBand id="unde" labelledBy="supplier-where-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className={HALF}>
          <HubSectionHead titleId="supplier-where-title" index={index} title={<Trans>Unde sunt clienții</Trans>} lede={whereLede(profile)} />
        </div>
        <div className={OTHER_HALF} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            {!direct ? (
              <Trans>Contractele, după județul instituției, {profile.year}</Trans>
            ) : profile.countiesRankedBy === 'value' ? (
              <Trans>Banii achizițiilor directe, după județul instituției, {profile.year}</Trans>
            ) : (
              <Trans>Achizițiile directe, după județul instituției, {profile.year}</Trans>
            )}
          </MonoLabel>
          <CountyRows
            className="mt-3"
            rows={profile.counties}
            rankedBy={profile.countiesRankedBy}
            home={profile.county}
            homeLabel={t`județul firmei`}
            searchOf={searchOf}
            empty={t`Nicio vânzare în ${profile.year}.`}
          />
        </div>
      </div>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────────── how it wins ──

export function SupplierHowBand({ profile, index }: { readonly profile: SupplierView; readonly index: string }) {
  // The analysis names the procedure of fewer contracts than the list holds for some firms: said, not hidden.
  const listed = profile.procedures.reduce((sum, row) => sum + row.count, 0) + profile.proceduresUnlisted
  return (
    <HomeBand id="cum" labelledBy="supplier-how-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className={HALF}>
          <HubSectionHead titleId="supplier-how-title" index={index} title={<Trans>Cum câștigă</Trans>} lede={howLede(profile)} />
          <dl className="mt-6 space-y-4 text-sm leading-relaxed" data-reveal>
            <div>
              <dt className="font-semibold text-foreground">
                <Trans>Achiziție directă</Trans>
              </dt>
              <dd className="text-muted-foreground">
                <Trans>Instituția alege firma și cumpără fără licitație. E permisă pentru sume mici, sub pragurile legii.</Trans>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                <Trans>Contract prin procedură</Trans>
              </dt>
              <dd className="text-muted-foreground">
                <Trans>
                  Instituția anunță ce cumpără și alege dintre ofertele primite. Negocierea fără anunț public e excepția: instituția discută direct cu firmele
                  alese de ea.
                </Trans>
              </dd>
            </div>
          </dl>
        </div>
        <div className={OTHER_HALF} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Contracte câștigate în {profile.year}, după procedură</Trans>
          </MonoLabel>
          <ProcedureRows className="mt-3" procedures={profile.procedures} unlisted={profile.proceduresUnlisted} empty={t`Niciun contract în ${profile.year}.`} />
          {listed > 0 && listed < profile.contracts.count ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t`SEAP dă procedura pentru ${contractsCount(listed)} din ${profile.contracts.count}.`}</p>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}

// ───────────────────────────────────────────────────────── with whom ──

export function SupplierPartnersBand({ profile, index }: { readonly profile: SupplierView; readonly index: string }) {
  const { contracts } = profile
  return (
    <HomeBand id="cu-cine" labelledBy="supplier-partners-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className={HALF}>
          <HubSectionHead titleId="supplier-partners-title" index={index} title={<Trans>Cu cine câștigă</Trans>} lede={partnersLede(profile)} />
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-sm" data-reveal>
            <div>
              <dt className="text-muted-foreground">
                <Trans>Contracte în asociere</Trans>
              </dt>
              <dd className="text-2xl font-semibold tabular-nums text-foreground">{countText(contracts.together)}</dd>
            </div>
            {contracts.togetherValue !== null ? (
              <div>
                <dt className="text-muted-foreground">
                  <Trans>Valoarea lor întreagă</Trans>
                </dt>
                <dd className="text-2xl font-semibold tabular-nums text-foreground">
                  {moneyText(contracts.togetherValue)} <ProvisionalMark />
                </dd>
                {/* Some awards carry no value, or values that disagree (revisions): the sum is theirs only. */}
                {contracts.togetherValued < contracts.togetherContracts ? (
                  <dd className="text-xs text-muted-foreground">{t`la ${contractsCount(contracts.togetherValued)} din ${contracts.togetherContracts}`}</dd>
                ) : null}
              </div>
            ) : null}
          </dl>
          <p className="mt-4 max-w-[55ch] text-xs leading-relaxed text-muted-foreground" data-reveal>
            <Trans>
              Într-o asociere, câteva firme semnează împreună un singur contract. SEAP publică valoarea întregului contract, nu partea fiecărei firme, așa că
              valoarea de mai sus nu e cât a primit firma.
            </Trans>
          </p>
        </div>
        <div className={OTHER_HALF} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Partenerii de asociere, {profile.year}</Trans>
          </MonoLabel>
          <PartnerRows className="mt-3" partners={contracts.partners} year={profile.year} />
        </div>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────────── the largest ──

export function SupplierLargestBand({
  profile,
  index,
  direct,
  choice,
  onChoice,
}: {
  readonly profile: SupplierView
  readonly index: string
  readonly direct: { readonly data: readonly RecentRecord[] | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly choice: ProcurementSupplierGrain
  readonly onChoice: (choice: ProcurementSupplierGrain) => void
}) {
  const { i18n } = useLingui()
  const grain = grainOf(choice)
  const list = grain === 'contract' ? profile.contracts.largest : direct.data
  const both = profile.contracts.largest.length > 0 && (profile.direct.count ?? 0) > 0
  const fallbackTitle = (record: { readonly cpvCode: string | null }) => (record.cpvCode ? i18n._(categoryOfCode(record.cpvCode).label) : null)
  return (
    <HomeBand id="cele-mai-mari" labelledBy="supplier-largest-title">
      <HubSectionHead
        titleId="supplier-largest-title"
        index={index}
        title={<Trans>Cele mai mari din {profile.year}</Trans>}
        lede={
          grain === 'contract' ? (
            <Trans>Contractele cu cea mai mare valoare, fiecare cu toate firmele care l-au câștigat.</Trans>
          ) : (
            <Trans>Achizițiile directe cu cea mai mare valoare, fără TVA.</Trans>
          )
        }
        aside={both ? <GrainToggle value={choice} onChange={onChoice} /> : null}
      />
      <div className="mt-8" data-reveal>
        {grain === 'direct' && direct.isError && !direct.data ? (
          <HubLoadError onRetry={direct.retry} />
        ) : list ? (
          list.length > 0 ? (
            <RecordList records={list} cui={profile.cui} fallbackTitle={fallbackTitle} className={COLUMNS} />
          ) : (
            <p className={EMPTY}>
              {grain === 'contract' ? (
                <Trans>Niciun contract cu valoare publicată în {profile.year}.</Trans>
              ) : (
                <Trans>Nicio achiziție directă cu valoare publicată în {profile.year}.</Trans>
              )}
            </p>
          )
        ) : (
          <HubPending rows={6} />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {grain === 'contract' && list && list.length > 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <Trans>Valoarea e a întregului contract; la o asociere, SEAP nu publică partea fiecărei firme.</Trans> <ProvisionalMark />
            </p>
          ) : (
            <span />
          )}
          <Link to="/procurement/search" search={supplierRecordsSearch(profile.cui, profile.year, grain)} className={OUT_LINK}>
            {grain === 'contract' ? <Trans>Toate contractele din {profile.year}</Trans> : <Trans>Toate achizițiile directe din {profile.year}</Trans>}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────────────── the firm ──

/**
 * The firm's size and its history in SEAP, late; what it is and its status
 * are the head's. Its turnover sits beside its public sales, never divided by
 * them: an award spans years and a framework counts its ceiling. The source,
 * said once for the page.
 */
export function SupplierFirmBand({ profile, index }: { readonly profile: SupplierView; readonly index: string | null }) {
  const cutoff = profile.cutoff.direct
  const source = (
    <p className="max-w-[80ch] text-xs leading-relaxed text-muted-foreground">
      <Trans>
        Sursa: SEAP și e-licitatie.ro; registrul firmelor (ONRC, ANAF). Achizițiile directe sunt fără TVA și se compară între ani din {DIRECT_COMPARABLE_FROM};
        valorile contractelor sunt atribuite, nu plăți.
      </Trans>{' '}
      {cutoff ? <Trans>Datele SEAP merg până în {monthText(cutoff)}.</Trans> : null}
    </p>
  )
  const { company } = profile
  if (!index || !company) {
    return (
      <section className="border-b" aria-label={t`Sursa datelor`}>
        <RuledFrame className="py-8">{source}</RuledFrame>
      </section>
    )
  }
  const { latest } = company
  const facts = [
    profile.firstYear !== null
      ? { term: t`Prima vânzare în SEAP`, value: profile.firstYear === DIRECT_COMPARABLE_FROM ? t`${DIRECT_COMPARABLE_FROM} sau mai devreme` : String(profile.firstYear) }
      : null,
    latest?.turnover != null ? { term: t`Cifra de afaceri, ${latest.fiscalYear}`, value: moneyText(latest.turnover) } : null,
    latest?.employees != null ? { term: t`Angajați, ${latest.fiscalYear}`, value: countText(latest.employees) } : null,
  ].filter((fact): fact is NonNullable<typeof fact> => fact !== null)
  return (
    <HomeBand id="firma" labelledBy="supplier-firm-title">
      <HubSectionHead
        titleId="supplier-firm-title"
        index={index}
        title={<Trans>Firma</Trans>}
        lede={
          latest?.turnover != null ? (
            <Trans>
              Cifra de afaceri e aici doar ca măsură a mărimii firmei. Nu o împărțim la vânzările către stat: un contract se întinde pe mai mulți ani, iar
              valoarea lui nu e o plată.
            </Trans>
          ) : null
        }
        aside={
          <Link to="/companies/$cui" params={{ cui: profile.cui }} className={OUT_LINK}>
            <Trans>Profilul firmei</Trans>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      />
      {facts.length > 0 ? (
        <dl className="mt-8 grid grid-cols-1 gap-x-12 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3" data-reveal>
          {facts.map((fact) => (
            <div key={fact.term} className="border-t pt-3">
              <dt className="text-muted-foreground">{fact.term}</dt>
              <dd className="mt-1 text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-8">{source}</div>
    </HomeBand>
  )
}
