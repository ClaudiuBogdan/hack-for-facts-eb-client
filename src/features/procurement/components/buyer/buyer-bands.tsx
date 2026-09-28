import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { ProcurementBuyerGrain } from '@/schemas/procurement-buyer'
import { perResident, supplierName, type BuyerProfile, type BuyerRecords } from '../../lib/buyer-model'
import {
  allCategoriesText,
  balanceLede,
  countyShareLede,
  decemberLede,
  procedureLede,
  sellersLede,
  steadyLede,
  whatLede,
  whereLede,
  yearsLede,
} from '../../lib/buyer-text'
import { categoryOfCode } from '../../lib/home-categories'
import { countText, monthText } from '../../lib/home-format'
import { buyerCountySearch, buyerRecordsSearch } from '../../lib/home-links'
import { DIRECT_COMPARABLE_FROM } from '../../lib/home-model'
import { HomeBand, ProvisionalMark } from '../home/home-chrome'
import { CategoryRows, RecordRows } from '../home/home-rows'
import { PartyYearsMatrix } from '../profile/party-years-matrix'
import { CountyRows, ProcedureRows } from '../profile/profile-rows'
import { MonthStrip } from './buyer-charts'
import { SupplierRows } from './buyer-rows'

/**
 * The buyer page's bands, one per question: what it buys, from whom, from
 * where, when, how, the largest records, and the context last. Each opens
 * with a sentence computed from the read, or none when the data has nothing
 * worth saying.
 */

const HALF = 'lg:col-span-5'
const OTHER_HALF = 'min-w-0 lg:col-span-6 lg:col-start-7'
/** Two columns of rows on a wide screen, the rows kept whole. */
const COLUMNS = 'lg:columns-2 lg:gap-12 [&>li]:break-inside-avoid'
const CATEGORIES_SHOWN = 8

function grainOf(choice: ProcurementBuyerGrain): 'direct' | 'contract' {
  return choice === 'directe' ? 'direct' : 'contract'
}

function GrainToggle({ value, onChange }: { readonly value: ProcurementBuyerGrain; readonly onChange: (value: ProcurementBuyerGrain) => void }) {
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

// ───────────────────────────────────────────────────── what it buys ──

export function BuyerWhatBand({
  profile,
  index,
  choice,
  onChoice,
}: {
  readonly profile: BuyerProfile
  readonly index: string
  readonly choice: ProcurementBuyerGrain
  readonly onChoice: (choice: ProcurementBuyerGrain) => void
}) {
  const { i18n } = useLingui()
  const [all, setAll] = useState(false)
  const grain = grainOf(choice)
  const rows = profile.categories[grain]
  const shown = all ? rows : rows.slice(0, CATEGORIES_SHOWN)
  const lede = whatLede(rows, grain, profile.year, i18n)
  return (
    <HomeBand id="ce" labelledBy="buyer-what-title">
      <HubSectionHead
        titleId="buyer-what-title"
        index={index}
        title={<Trans>Ce cumpără</Trans>}
        lede={
          lede && grain === 'contract' ? (
            <>
              {lede} <ProvisionalMark />
            </>
          ) : (
            lede
          )
        }
        aside={<GrainToggle value={choice} onChange={onChoice} />}
      />
      <div className="mt-8" data-reveal>
        {rows.length === 0 ? (
          <p className="border-y py-4 text-sm text-muted-foreground">
            {grain === 'direct' ? <Trans>Nicio achiziție directă în {profile.year}.</Trans> : <Trans>Niciun contract atribuit în {profile.year}.</Trans>}
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
              <Trans>Categoriile adună codurile CPV ale contractelor atribuite; valoarea e a întregului contract.</Trans> <ProvisionalMark />
            </>
          )}
        </p>
      </div>
    </HomeBand>
  )
}

// ────────────────────────────────────────────────────── who sells ──

export function BuyerWhoBand({ profile, index }: { readonly profile: BuyerProfile; readonly index: string }) {
  const matrix = profile.supplierYears
  return (
    <HomeBand id="de-la-cine" labelledBy="buyer-who-title">
      <HubSectionHead titleId="buyer-who-title" index={index} title={<Trans>De la cine cumpără</Trans>} lede={sellersLede(profile)} />
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12" data-reveal>
        <div className="min-w-0">
          <MonoLabel className="block text-muted-foreground">
            <Trans>Achiziții directe, după valoare, {profile.year}</Trans>
          </MonoLabel>
          <SupplierRows className="mt-3" profile={profile} ranking={profile.directSuppliers} grain="direct" />
        </div>
        <div className="min-w-0">
          <MonoLabel className="block text-muted-foreground">
            <Trans>Contracte atribuite, după număr, {profile.year}</Trans>
          </MonoLabel>
          <SupplierRows className="mt-3" profile={profile} ranking={profile.awardSuppliers} grain="contract" />
        </div>
      </div>
      {matrix.length > 0 ? (
        <div className="mt-12" data-reveal>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            <Trans>An de an</Trans>
          </h3>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            {steadyLede(profile, matrix, profile.latest) ?? <Trans>Firmele care i-au vândut cel mai mult direct din {DIRECT_COMPARABLE_FROM} încoace, pe ani.</Trans>}
          </p>
          <PartyYearsMatrix
            className="mt-4"
            rows={matrix}
            year={profile.year}
            kind="supplier"
            nameOf={(cui) => supplierName(profile, cui)}
            caption={t`Achiziții directe de la fiecare firmă, pe ani, lei`}
          />
        </div>
      ) : null}
      <p className="mt-6 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
        {profile.namesUnread ? (
          <Trans>Numele firmelor și anii lor nu s-au putut citi acum: firmele apar cu codul fiscal.</Trans>
        ) : (
          <Trans>O firmă înregistrată cu două coduri fiscale apare de două ori, așa că partea celor mai mari poate fi mai mare decât arată lista.</Trans>
        )}
      </p>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────── where they are ──

export function BuyerWhereBand({ profile, index }: { readonly profile: BuyerProfile; readonly index: string }) {
  return (
    <HomeBand id="de-unde" labelledBy="buyer-where-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className={HALF}>
          <HubSectionHead titleId="buyer-where-title" index={index} title={<Trans>De unde sunt firmele</Trans>} lede={whereLede(profile)} />
        </div>
        <div className={OTHER_HALF} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            {profile.supplierCountiesRankedBy === 'value' ? (
              <Trans>Banii achizițiilor directe, după județul firmei, {profile.year}</Trans>
            ) : (
              <Trans>Achizițiile directe, după județul firmei, {profile.year}</Trans>
            )}
          </MonoLabel>
          <CountyRows
            className="mt-3"
            rows={profile.supplierCounties}
            rankedBy={profile.supplierCountiesRankedBy}
            home={profile.county}
            homeLabel={t`județul instituției`}
            searchOf={(code) => buyerCountySearch(profile.identity.cui, code, profile.year)}
            empty={t`Nicio achiziție directă în ${profile.year}.`}
          />
        </div>
      </div>
    </HomeBand>
  )
}

// ───────────────────────────────────────────────────────── when ──

export function BuyerWhenBand({ profile, index }: { readonly profile: BuyerProfile; readonly index: string }) {
  const hasMonths = profile.directMonths.some((month) => (month.value ?? 0) > 0)
  const lede = [yearsLede(profile), decemberLede(profile)].filter(Boolean).join(' ')
  return (
    <HomeBand id="cand" labelledBy="buyer-when-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className={HALF}>
          <HubSectionHead titleId="buyer-when-title" index={index} title={<Trans>Când cumpără</Trans>} lede={lede || null} />
        </div>
        <div className={OTHER_HALF} data-reveal>
          {hasMonths ? (
            <MonthStrip profile={profile} />
          ) : (
            <p className="border-y py-4 text-sm text-muted-foreground">
              <Trans>Nicio achiziție directă în {profile.year}.</Trans>
            </p>
          )}
        </div>
      </div>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────────────── how ──

export function BuyerHowBand({ profile, index }: { readonly profile: BuyerProfile; readonly index: string }) {
  const lede = [balanceLede(profile), procedureLede(profile)].filter(Boolean).join(' ')
  const counts = [profile.frameworks ? { key: 'frameworks', term: t`Acorduri-cadru semnate`, value: countText(profile.frameworks) } : null].filter(
    (item): item is NonNullable<typeof item> => item !== null,
  )
  return (
    <HomeBand id="cum" labelledBy="buyer-how-title">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className={HALF}>
          <HubSectionHead titleId="buyer-how-title" index={index} title={<Trans>Cum cumpără</Trans>} lede={lede || null} />
          {counts.length > 0 ? (
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm" data-reveal>
              {counts.map((item) => (
                <div key={item.key}>
                  <dt className="text-muted-foreground">{item.term}</dt>
                  <dd className="font-semibold tabular-nums text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <div className={OTHER_HALF} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Contracte atribuite în {profile.year}, după procedură</Trans>
          </MonoLabel>
          <ProcedureRows
            className="mt-3"
            procedures={profile.procedures}
            unlisted={profile.proceduresUnlisted}
            empty={t`Niciun contract atribuit în ${profile.year}.`}
          />
          {(profile.awards.count ?? 0) > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              <Trans>SEAP numără un contract câștigat de o asociere de firme o dată pentru fiecare firmă.</Trans>
            </p>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────── the largest ──

export function BuyerLargestBand({
  profile,
  index,
  records,
  choice,
  onChoice,
}: {
  readonly profile: BuyerProfile
  readonly index: string
  readonly records: { readonly data: BuyerRecords | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly choice: ProcurementBuyerGrain
  readonly onChoice: (choice: ProcurementBuyerGrain) => void
}) {
  const { i18n } = useLingui()
  const grain = grainOf(choice)
  const list = grain === 'contract' ? records.data?.contracts : records.data?.direct
  const fallbackTitle = (record: { readonly cpvCode: string | null }) => (record.cpvCode ? i18n._(categoryOfCode(record.cpvCode).label) : null)
  return (
    <HomeBand id="cele-mai-mari" labelledBy="buyer-largest-title">
      <HubSectionHead
        titleId="buyer-largest-title"
        index={index}
        title={<Trans>Cele mai mari din {profile.year}</Trans>}
        lede={
          grain === 'contract' ? (
            <Trans>Contractele atribuite cu cea mai mare valoare, fiecare cu toate firmele câștigătoare.</Trans>
          ) : (
            <Trans>Achizițiile directe cu cea mai mare valoare, fără TVA.</Trans>
          )
        }
        aside={<GrainToggle value={choice} onChange={onChoice} />}
      />
      <div className="mt-8" data-reveal>
        {records.isError && !records.data ? (
          <HubLoadError onRetry={records.retry} />
        ) : list ? (
          list.length > 0 ? (
            <RecordRows records={list} lead={grain === 'contract' ? 'winners' : 'title'} fallbackTitle={fallbackTitle} showBuyer={false} className={COLUMNS} />
          ) : (
            <p className="border-y py-4 text-sm text-muted-foreground">
              {grain === 'contract' ? (
                <Trans>Niciun contract atribuit în {profile.year} cu valoare publicată.</Trans>
              ) : (
                <Trans>Nicio achiziție directă în {profile.year} cu valoare publicată.</Trans>
              )}
            </p>
          )
        ) : (
          <HubPending rows={6} />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {grain === 'contract' && list && list.length > 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              <Trans>Valoarea e a întregului contract; la o asociere de firme, SEAP nu publică partea fiecăreia.</Trans> <ProvisionalMark />
            </p>
          ) : (
            <span />
          )}
          <Link
            to="/procurement/search"
            search={buyerRecordsSearch(profile.identity.cui, profile.year, grain)}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline sm:min-h-0"
          >
            {grain === 'contract' ? <Trans>Toate contractele din {profile.year}</Trans> : <Trans>Toate achizițiile directe din {profile.year}</Trans>}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────────── the context ──

/** Where the buyer stands among its county's buyers, and where it sits; the source, said once. */
export function BuyerContextBand({ profile, index }: { readonly profile: BuyerProfile | null; readonly index: string | null }) {
  const share = profile ? countyShareLede(profile) : null
  const address = profile?.identity.address ?? null
  const cutoff = profile?.cutoff.direct ?? null
  const source = (
    <p className="max-w-[80ch] text-xs leading-relaxed text-muted-foreground">
      <Trans>
        Sursa: SEAP și e-licitatie.ro. Achizițiile directe sunt fără TVA și se compară între ani din {DIRECT_COMPARABLE_FROM}; valorile contractelor sunt
        atribuite, nu plăți.
      </Trans>{' '}
      {cutoff ? <Trans>Datele merg până în {monthText(cutoff)}.</Trans> : null}
      {profile && perResident(profile) !== null ? (
        <>
          {' '}
          <Trans>Pe locuitor: achizițiile directe împărțite la populația unității administrativ-teritoriale (INS), calculat de Transparenta.eu.</Trans>
        </>
      ) : null}
      {profile?.countyShare && profile.countyShare.share >= 0.01 ? (
        <>
          {' '}
          <Trans>Partea din județ: achizițiile directe ale instituției împărțite la cele ale tuturor cumpărătorilor publici din județ, calculat de Transparenta.eu.</Trans>
        </>
      ) : null}
    </p>
  )
  if (!index || (!share && !address)) {
    return (
      <section className="border-b" aria-label={t`Sursa datelor`}>
        <RuledFrame className="py-8">{source}</RuledFrame>
      </section>
    )
  }
  return (
    <HomeBand id="context" labelledBy="buyer-context-title">
      <HubSectionHead titleId="buyer-context-title" index={index} title={<Trans>În context</Trans>} lede={share} />
      {address ? (
        <p className="mt-6 text-sm text-muted-foreground" data-reveal>
          <Trans>Sediul:</Trans> <span className="text-foreground">{address}</span>
        </p>
      ) : null}
      <div className="mt-6">{source}</div>
    </HomeBand>
  )
}
