import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { CompanyBusinessBand } from '@/features/private-companies/components/profile/company-business-band'
import { ProfileBand } from '@/features/private-companies/components/profile/company-profile-band'
import { CompanyYearsChart, type ChartMetric } from '@/features/private-companies/components/profile/company-years-chart'
import { yearRanges } from '@/features/private-companies/lib/company-profile-format'
import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import { financialLede } from '@/features/private-companies/lib/company-profile-text'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import type { PrototypeDefinition } from '@/development/harness/entry'
import { PROTOTYPE_MARKER, useProtoModel } from './profile.data'

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
  const reasonOf = (index: number, _metric: ChartMetric) =>
    ifrsSet.has(model.span[index] ?? -1) ? t`Indicatori publicați de Ministerul Finanțelor în fișierul IFRS; nu sunt incluși în grafic` : t`Fără valori comparabile pentru acest an`
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
  },
  compare: ['azi', 'sub', 'lede', 'scurt'],
} satisfies PrototypeDefinition
