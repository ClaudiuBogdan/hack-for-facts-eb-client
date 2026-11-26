import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { CompanyBusinessBand } from '@/features/private-companies/components/profile/company-business-band'
import { ProfileBand } from '@/features/private-companies/components/profile/company-profile-band'
import { CompanyYearsChart, type ChartMetric } from '@/features/private-companies/components/profile/company-years-chart'
import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import { buildCompanyProfileModel, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { financialLede } from '@/features/private-companies/lib/company-profile-text'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useSearch } from '@tanstack/react-router'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { PROTOTYPE_MARKER, useProtoModel } from './profile.data'
import { IfrsYearsChart, type Marking, type SourcePlace } from './profile-ifrs.chart'
import { MOCK_ONE_YEAR, MOCK_SWITCHER, PETROM_FORMS, PETROM_IFRS, rowsFromModel } from './profile-ifrs.data'

/**
 * PROTOTYPE (owner via root, 25 November 2026): say why a company's IFRS
 * years are empty in the business chart. The Ministry of Finance published
 * them as IFRS statements (filer class `ir`); the pipeline keeps their
 * indicators outside the standard series, so the chart has nothing to draw.
 * One plain statement, from the filing metadata the page already gets, for
 * any company: never „no statement", never zero. `?cui=` a live company
 * (OMV Petrom by default: IFRS 2012–2018).
 */

type Placement = 'sub' | 'lede' | 'scurt'

const TITLE_ID = 'company-business-title'

/** The MFP's IFRS filer class, per the scrapper's notes (`ir`): the only one read as IFRS. */
function ifrsYears(model: CompanyProfileModel): readonly number[] {
  const drawn = new Set(
    model.span.filter((_, index) => model.series.turnover[index]?.value != null || model.series.net[index]?.value != null || model.series.employees[index]?.value != null),
  )
  const years = (model.longForm ?? []).filter((filing) => filing.publisher === 'mfp' && filing.filerClass === 'ir').map((filing) => filing.fiscalYear)
  return [...new Set(years)].filter((year) => !drawn.has(year)).sort((a, b) => a - b)
}

// The IFRS session's wording (25 November 2026): what the Ministry did — its file for IFRS reporters — never that the
// company kept IFRS accounts (some one-year members are small firms the Ministry put there), and never IFRS in
// general (the chart's 2019+ points can be the same IFRS form, from ANAF). Years as listed, a range only when contiguous.
function ifrsSentence(years: readonly number[], placement: Placement): string {
  const span = yearRanges(years)
  if (placement === 'scurt') return `${span}: indicatori publicați de Ministerul Finanțelor în fișierul IFRS; nu sunt incluși în grafic.`
  return `Pentru ${span}, Ministerul Finanțelor a publicat indicatorii din situațiile financiare anuale ale firmei în fișierul entităților care raportează conform IFRS. Aceste cifre nu sunt incluse în grafic.`
}

function ProtoIfrsBand({ model, placement }: { readonly model: CompanyProfileModel; readonly placement: Placement }) {
  const ifrs = ifrsYears(model)
  const ifrsSet = new Set(ifrs)
  const sentence = ifrs.length > 0 ? ifrsSentence(ifrs, placement) : null
  // The generic caption keeps the blank years that are not IFRS filings.
  const blank = model.span.filter(
    (year, index) => !ifrsSet.has(year) && model.series.turnover[index]?.value == null && model.series.net[index]?.value == null && model.series.employees[index]?.value == null,
  )
  const gaps = blank.length > 0 ? yearRanges(blank) : null
  // The page's chart reads a reason by year.
  const reasonOf = (year: number, _metric: ChartMetric) =>
    ifrsSet.has(year) ? t`Indicatori publicați de Ministerul Finanțelor în fișierul IFRS; nu sunt incluși în grafic` : t`Fără valori comparabile pentru acest an`
  const lede = financialLede(model)
  return (
    <ProfileBand id="afacerea" titleId={TITLE_ID}>
      <HubSectionHead
        titleId={TITLE_ID}
        title={<Trans>Cum merge afacerea</Trans>}
        lede={
          placement === 'lede' && sentence ? (
            <>
              {lede} {sentence}
            </>
          ) : (
            lede
          )
        }
      />
      <div className="mt-8">
        <CompanyYearsChart model={model} reasonOf={reasonOf} />
        {placement !== 'lede' && sentence ? <p className="mt-3 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">{sentence}</p> : null}
        {gaps ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <Trans>Fără valori comparabile pentru {gaps}.</Trans>
          </p>
        ) : null}
      </div>
    </ProfileBand>
  )
}

/**
 * The labelled IFRS-form series (spec PRIV-ZVPV, owner decisions of 25 November 2026), on Petrom's live profile with
 * its Ministry IFRS figures as the view returns them (`?caz=petrom`, the default), or on a fictitious company marked
 * as mock: one that switches form (`?caz=comutator`), one the Ministry filed as IFRS for 2014 alone (`?caz=un-an`).
 */
function SeriesBand({ marking, sources, notes = 'sub' }: { readonly marking: Marking; readonly sources: SourcePlace; readonly notes?: 'sub' | 'info' }) {
  const search = useSearch({ strict: false }) as { readonly caz?: unknown }
  const mock = search.caz === 'comutator' ? MOCK_SWITCHER : search.caz === 'un-an' ? MOCK_ONE_YEAR : null
  const { model, state } = useProtoModel()
  if (!mock && !model) return <p className="p-6 text-sm text-muted-foreground">{state}</p>
  const rows = mock ?? rowsFromModel(model!, PETROM_IFRS, PETROM_FORMS)
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <ProfileBand id="afacerea" titleId={TITLE_ID}>
        {mock ? (
          <p className="mb-6 inline-flex border border-amber-500/60 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            Firmă fictivă, date de probă (mock): {search.caz === 'comutator' ? 'schimbă formularul' : 'în fișierul IFRS doar în 2014'}
          </p>
        ) : null}
        <HubSectionHead titleId={TITLE_ID} title={<Trans>Cum merge afacerea</Trans>} lede={mock ? null : financialLede(model!)} />
        <IfrsYearsChart rows={rows} marking={marking} sources={sources} notes={notes} className="mt-8" />
      </ProfileBand>
    </div>
  )
}

/**
 * The page's own business band (the implementation), on Petrom's live profile with what the API will add injected in
 * the domain shape the adapter will produce: its Ministry IFRS-file years and ANAF's IFRS-layout markers (FY2019+).
 */
function ImplementedBand() {
  const { model, state } = useProtoModel()
  if (!model) return <p className="p-6 text-sm text-muted-foreground">{state}</p>
  const profile = {
    ...model.profile,
    financials: model.profile.financials.map((year) => (PETROM_FORMS[year.fiscalYear]?.reportingForm === 'ifrs' ? { ...year, reportingForm: 'ifrs' as const } : year)),
    ifrsFormYears: PETROM_IFRS.map((entry) => ({
      fiscalYear: entry.year,
      publisher: entry.publisher,
      turnover: entry.turnover,
      netResult: entry.netResult,
      employees: entry.employees,
      sourceUrl: entry.sourceUrl,
    })),
  }
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      <CompanyBusinessBand model={buildCompanyProfileModel(profile)} />
    </div>
  )
}

function Frame({ children }: { readonly children: (model: CompanyProfileModel) => React.ReactNode }) {
  const { model, state } = useProtoModel()
  if (!model) return <p className="p-6 text-sm text-muted-foreground">{state}</p>
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']">
      {children(model)}
    </div>
  )
}

export const prototype = {
  title: 'Firmă — anii IFRS din grafic',
  spec: 'docs/design/companies/design.md',
  variants: {
    azi: { title: 'Azi', component: () => <Frame>{(model) => <CompanyBusinessBand model={model} />}</Frame>, note: 'The band now: the IFRS years are only „fără valori comparabile".' },
    sub: {
      title: 'A · Sub grafic',
      component: () => <Frame>{(model) => <ProtoIfrsBand model={model} placement="sub" />}</Frame>,
      note: 'One sentence under the chart, in place of the generic caption for those years: the Ministry of Finance published their indicators in its file for IFRS reporters; those figures are not in this chart.',
    },
    lede: {
      title: 'B · În textul benzii',
      component: () => <Frame>{(model) => <ProtoIfrsBand model={model} placement="lede" />}</Frame>,
      note: 'The same sentence, after the band’s lede, above the chart: read before the hatched column.',
    },
    scurt: {
      title: 'C · Scurt, sub grafic',
      component: () => <Frame>{(model) => <ProtoIfrsBand model={model} placement="scurt" />}</Frame>,
      note: 'The shortest form under the chart: the years, IFRS, outside this chart.',
    },
    pagina: {
      title: 'Seria IFRS · Pe pagină (implementat)',
      component: () => <ImplementedBand />,
      note: 'The page’s own band, as implemented (owner, 26 November 2026: „Implement it"), on Petrom’s live profile with its Ministry IFRS years and ANAF’s IFRS-layout markers injected as the API will serve them.',
    },
    curat: {
      title: 'Seria IFRS · Curat',
      component: () => <SeriesBand marking="banda" sources="citire" notes="info" />,
      note: 'The clean option (owner, 26 November 2026: „just a short mention"): the thin rule named „IFRS" over each run; the legend’s „Raportat pe formularul IFRS" is the only mention, its ⓘ holding the turnover note and the Ministry-to-ANAF seam. No text under the chart but the real gaps; each year’s reading keeps its form, figures and source link.',
    },
    banda: {
      title: 'Seria IFRS · A · Bandă deasupra',
      component: () => <SeriesBand marking="banda" sources="citire" />,
      note: 'The IFRS-form years drawn, each in its own segment: a rule named „IFRS" over each run, the full label in the legend; the line breaks at every change of form, at a missing year and at a blank. Each year’s reading names its form and publisher, the turnover note, and links its source. ?caz=comutator | un-an for the fictitious hard cases.',
    },
    fundal: {
      title: 'Seria IFRS · B · Fundal',
      component: () => <SeriesBand marking="fundal" sources="citire" />,
      note: 'The same, the IFRS runs marked by a faint ground across both panels and „IFRS" over each.',
    },
    ambele: {
      title: 'Seria IFRS · A+B · Bandă și fundal',
      component: () => <SeriesBand marking="ambele" sources="citire" />,
      note: 'Both marks at once (owner: „prototype both"): the named rule over each IFRS run and the faint ground behind it, across both panels.',
    },
    surse: {
      title: 'Seria IFRS · C · Bandă, surse sub grafic',
      component: () => <SeriesBand marking="banda" sources="rand" />,
      note: 'As A, the Ministry’s IFRS files listed under the chart, one link a year, instead of a link in the reading (the ANAF years keep theirs in „Bilanțurile, an cu an").',
    },
  },
  compare: ['azi', 'curat', 'banda', 'ambele'],
} satisfies PrototypeDefinition
