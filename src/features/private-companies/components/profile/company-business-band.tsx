import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { yearRanges } from '../../lib/company-profile-format'
import type { FinancialMetric } from '@/schemas/private-company'
import type { CompanyProfileModel } from '../../lib/company-profile-model'
import { capitalised, financialLede, ifrsFileBlankReason, netResultStatusLabel, notAssessedNotice } from '../../lib/company-profile-text'
import { blankYearsOf, yearRowsOf, type YearRow } from '../../lib/company-years-rows'
import { metricStatus, reportedNumber } from '../../lib/financial-qualification'
import { ProfileBand } from './company-profile-band'
import { CompanyYearsChart, type ChartMetric } from './company-years-chart'

const TITLE_ID = 'company-business-title'

/**
 * „Cum merge afacerea": its sentence and one chart across the band (owner, 25
 * November 2026: „remove the bilanț from there and focus on a good chart";
 * version „Două panouri") — money and people at once, each on its own panel
 * and scale, so no measure switch. No balance-sheet table beside it: every
 * line of every statement is in „Bilanțurile, an cu an", right under the
 * activities band.
 */
export function CompanyBusinessBand({
  model,
  index,
}: {
  readonly model: CompanyProfileModel
  /** The band's numbered caption; none on a page that numbers no band. */
  readonly index?: string
}) {
  const title = <Trans>Cum merge afacerea</Trans>
  const rows = yearRowsOf(model)
  // A company with IFRS-file years and no typed statement still has a chart: only its IFRS series (no lede — nothing
  // derived reads those figures).
  if (!model.latest && model.ifrsForm.fileYears.length === 0) {
    return (
      <ProfileBand id="afacerea" titleId={TITLE_ID}>
        <HubSectionHead titleId={TITLE_ID} index={index} title={title} />
        <NoStatements className="mt-5" />
        {/* No list of the statements held only in long format: the page shows nothing it cannot read (owner, 25 November 2026). */}
      </ProfileBand>
    )
  }
  // The newest statement could not be assessed: said where its figures would be. Every value it published is in the years' band.
  const notAssessed = model.latest ? notAssessedNotice(model) : null
  // The years the chart has nothing to draw for: no statement, or one whose values are all left out (their reasons in each
  // year's reading); never a year of the publisher's IFRS file, whose blanks are said as such.
  const blank = blankYearsOf(rows)
  const gaps = blank.length > 0 ? yearRanges(blank) : null
  return (
    <ProfileBand id="afacerea" titleId={TITLE_ID}>
      <HubSectionHead titleId={TITLE_ID} index={index} title={title} lede={model.latest ? financialLede(model) : null} />
      <div className="mt-8" data-reveal>
        <CompanyYearsChart model={model} reasonOf={(year, metric) => gapReason(model, rows, year, metric)} />
        {/* A gap says only what the data cannot know: no comparable values, never „no statement". */}
        {gaps ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <Trans>Fără valori comparabile pentru {gaps}.</Trans>
          </p>
        ) : null}
      </div>
      {notAssessed ? <p className="mt-8 max-w-[60ch] border-l-2 border-amber-500 py-0.5 pl-3 text-sm leading-relaxed text-foreground">{notAssessed}</p> : null}
    </ProfileBand>
  )
}

/**
 * No statement served at all: said once, where the figures would be. What
 * the data holds, not what the company filed — a filing the sources were not
 * read for, or kept apart, is not proof of no statement.
 */
function NoStatements({ className }: { readonly className?: string }) {
  return (
    <p className={cn('max-w-[60ch] text-sm leading-relaxed text-muted-foreground', className)}>
      <Trans>Nicio valoare din bilanțuri în datele de aici: cifra de afaceri, rezultatul și numărul de salariați nu sunt disponibile.</Trans>
    </p>
  )
}

const METRIC: Record<ChartMetric, FinancialMetric> = { turnover: 'turnover', net: 'net_result', employees: 'employees' }

/**
 * Why a year's figure is not drawn, said in its reading: never a claim the
 * data cannot make — no comparable values for the year (a filing kept apart
 * or not read is no proof of none), a statement not qualified or qualified on
 * another basis, the net result's own hold, a value held out of the chart, or
 * no typed value.
 */
function gapReason(model: CompanyProfileModel, rows: readonly YearRow[], year: number, metric: ChartMetric): string {
  // A year of the publisher's IFRS file: its cell was left blank there (a filed value, never qualified, never held).
  if (rows.find((row) => row.year === year)?.ifrsFile) return ifrsFileBlankReason()
  const statement = model.profile.financials.find((entry) => entry.fiscalYear === year)
  if (!statement) return t`Fără valori comparabile pentru acest an`
  if (statement.qualification.assessment !== 'assessed') return t`Bilanț necalificat: valorile lui nu intră în grafic`
  if (model.qualification.otherBasisYears.includes(statement.fiscalYear)) return t`Calificat după altă politică sau ediție: nu se compară cu ceilalți ani`
  if (metric === 'net') {
    const netStatus = metricStatus(statement, 'net_result')
    // A zero profit and NO typed loss: the result is unknown, never a break-even. Only then.
    if (netStatus !== 'reported' && reportedNumber(statement, 'net_profit') === 0 && metricStatus(statement, 'net_loss') === 'missing') {
      return t`Profit net zero și nicio pierdere disponibilă aici: rezultatul net nu se știe`
    }
    // Otherwise a held result says its own reason (a held loss beside a profit included).
    if (netStatus !== null && netStatus !== 'reported' && netStatus !== 'missing') return capitalised(netResultStatusLabel(netStatus))
  }
  const status = metricStatus(statement, METRIC[metric])
  return status !== 'reported' && status !== 'missing' ? t`Valoare reținută: nu intră în grafic` : t`Nicio valoare disponibilă aici pentru acest an`
}

