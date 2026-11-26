import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PrivateCompanyFinancialYear, PrivateCompanyIfrsFormYear, PrivateCompanyProfile } from '@/schemas/private-company'
import { companyProfile, financialYear } from '../../lib/company-profile.fixture'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { financialLede } from '../../lib/company-profile-text'
import { admittedQualification } from '../../mocks/fixtures/qualification'
import { CompanyBusinessBand } from './company-business-band'
import { companyFigures } from './company-figures'

/**
 * The business band draws each year in the series of its own form (owner, 25–26 November 2026, „curat"; scrapper
 * PRIV-ZVPV): the publisher's IFRS-file years beside the typed ones, named by a rule and the legend, broken from the
 * years on another form; their figures as filed, never in the lede, a count or a figure. Fictitious figures, shaped
 * like the case the series was built for: ordinary statements to 2011, the Ministry's IFRS file 2012–2018 (a loss in
 * 2015), ANAF's IFRS layout from 2019 (results held, profits admitted).
 */

const M = 1_000_000

const source = (url: string, kind: 'anaf_statement' | 'mfp_resource'): PrivateCompanyFinancialYear['source'] => ({
  url,
  urlKind: kind,
  statementProfileHash: null,
  metricRuleVersion: null,
  selectionBasis: null,
  contributingSources: null,
})

/** An ordinary statement up to 2018 (the Ministry's file), ANAF's from 2019 (its answer for the year). */
function typed(year: number, turnover: number, netProfit: number, employees: number, fields: Partial<PrivateCompanyFinancialYear> = {}): PrivateCompanyFinancialYear {
  return financialYear(year, {
    turnover,
    netProfit,
    netLoss: 0,
    employees,
    source: year >= 2019 ? source(`https://webservicesp.anaf.ro/bilant?an=${year}&cui=1`, 'anaf_statement') : source(`https://data.gov.ro/ordinary-${year}.txt`, 'mfp_resource'),
    ...fields,
  })
}

/** On ANAF's IFRS layout: no typed loss (its loss line is mislabelled), the result held, the profit admitted — drawn outlined. */
function ifrsLayout(year: number, turnover: number, netProfit: number, employees: number): PrivateCompanyFinancialYear {
  const statement = typed(year, turnover, netProfit, employees, { reportingForm: 'ifrs', netLoss: null })
  return { ...statement, qualification: admittedQualification(statement, { net_result: 'held_profile' }) }
}

/** The same company's years without any form marker: what every company was before. */
function unmarkedCompany(): PrivateCompanyProfile {
  return companyProfile({
    financials: [2008, 2009, 2010, 2011, 2019, 2020].map((year, index) => typed(year, (12 + index) * M, (1 + index / 10) * M, 1000 + index)),
  })
}

function fileYear(year: number, turnover: string | null, netResult: string | null, employees: string | null): PrivateCompanyIfrsFormYear {
  return { fiscalYear: year, publisher: 'mfp', turnover, netResult, employees, sourceUrl: `https://data.gov.ro/web_ir_an${year}.txt` }
}

const IFRS_FILE: readonly PrivateCompanyIfrsFormYear[] = [
  fileYear(2012, String(19.5 * M), String(3.8 * M), '20508'),
  fileYear(2013, String(18.0 * M), String(4.8 * M), '19016'),
  fileYear(2014, String(16.5 * M), String(1.8 * M), '17866'),
  fileYear(2015, String(13.7 * M), String(-0.6 * M), '15581'),
  fileYear(2016, String(12.5 * M), String(0.9 * M), '14380'),
  fileYear(2017, String(14.8 * M), String(2.4 * M), '13322'),
  fileYear(2018, String(17.8 * M), String(3.9 * M), '12498'),
]

function formsCompany(ifrsFormYears: readonly PrivateCompanyIfrsFormYear[] | null = IFRS_FILE): PrivateCompanyProfile {
  return companyProfile({
    financials: [
      typed(2008, 16.8 * M, 0.9 * M, 30000),
      typed(2009, 12.8 * M, 1.4 * M, 30398),
      typed(2010, 13.9 * M, 1.9 * M, 26000),
      typed(2011, 16.6 * M, 3.7 * M, 23000),
      ...[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year, index) => ifrsLayout(year, (20 + index) * M, (3 + index / 10) * M, 11000 - index * 500)),
    ],
    ifrsFormYears: ifrsFormYears ? [...ifrsFormYears] : null,
  })
}

const band = () => within(document.getElementById('afacerea') as HTMLElement)
const stretches = () => document.querySelectorAll('[data-testid="company-years-people-stretch"]').length

/** Opens the reading of the year `steps` slots after the first, from the keyboard. */
function readYear(steps: number) {
  const group = band().getByRole('group', { name: /^Anii:/u })
  fireEvent.keyDown(group, { key: 'Home' })
  for (let step = 0; step < steps; step += 1) fireEvent.keyDown(group, { key: 'ArrowRight' })
  return band().getByTestId('company-years-reading').parentElement as HTMLElement
}

describe('CompanyBusinessBand, the IFRS form', () => {
  it('draws the IFRS-form years as one labelled run, never joined to the years before', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(formsCompany())} />)
    expect(band().getByTestId('company-years-ifrs-legend')).toHaveTextContent('Raportat pe formularul IFRS')
    // One rule: 2012–2025, the Ministry's file and ANAF's layout on the same form.
    expect(document.querySelectorAll('#afacerea [aria-hidden="true"] .border-t-2.border-primary')).toHaveLength(1)
    // The people line: 2008–2011, then 2012–2025 — no line across 2011→2012.
    expect(stretches()).toBe(2)
    // No real gap: the generic note does not speak for the IFRS years.
    expect(band().queryByText(/Fără valori comparabile/u)).toBeNull()
  })

  it('reads an IFRS-file year with its form, its publisher, its figures as filed and its file', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(formsCompany())} />)
    const reading = within(readYear(6))
    expect(reading.getByText('2014')).toBeInTheDocument()
    expect(reading.getByText('Raportat pe formularul IFRS')).toBeInTheDocument()
    expect(reading.getByText('Ministerul Finanțelor')).toBeInTheDocument()
    expect(reading.getByText('Cifra de afaceri netă')).toBeInTheDocument()
    // The count as filed, in the locale's grouping.
    expect(reading.getByText(/^17[.,]866$/u)).toBeInTheDocument()
    expect(reading.getByRole('link', { name: /Fișierul pe data\.gov\.ro/u })).toHaveAttribute('href', 'https://data.gov.ro/web_ir_an2014.txt')
  })

  it('closes a reading on Escape', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(formsCompany())} />)
    readYear(3)
    expect(band().getByTestId('company-years-reading')).toBeInTheDocument()
    fireEvent.keyDown(band().getByRole('group', { name: /^Anii:/u }), { key: 'Escape' })
    expect(band().queryByTestId('company-years-reading')).toBeNull()
  })

  it('keeps the held result of an IFRS-layout year held, its admitted profit outlined, and links ANAF', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(formsCompany())} />)
    const reading = within(readYear(11))
    expect(reading.getByText('2019')).toBeInTheDocument()
    expect(reading.getByText('Raportat pe formularul IFRS')).toBeInTheDocument()
    expect(reading.getByText('ANAF')).toBeInTheDocument()
    expect(reading.getByText('Profit net')).toBeInTheDocument()
    expect(reading.getByRole('link', { name: /Interoghează ANAF pentru 2019/u })).toHaveAttribute('href', 'https://webservicesp.anaf.ro/bilant?an=2019&cui=1')
  })

  it('names the turnover row and the publishers behind the legend ⓘ', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(formsCompany())} />)
    fireEvent.click(band().getByRole('button', { name: 'Despre anii pe formularul IFRS' }))
    const note = within(screen.getByRole('dialog', { name: 'Despre anii pe formularul IFRS' }))
    expect(note.getByText(/rândul „Cifra de afaceri netă" din formularul depus/u)).toBeInTheDocument()
    expect(note.getByText(/Pentru 2012–2018, cifrele formularului IFRS vin din fișierul Ministerului Finanțelor; din 2019, de la ANAF\./u)).toBeInTheDocument()
    // No 2018 blank beside a 2019 zero here.
    expect(note.queryByText(/ANAF a publicat 0/u)).toBeNull()
  })

  it('says a blank of the file as such, a zero as a zero, and breaks the line at a blank and at every change of form', () => {
    const company = companyProfile({
      financials: [
        typed(2010, 4.2 * M, 0.3 * M, 40),
        typed(2011, 4.6 * M, 0.35 * M, 42),
        ifrsLayout(2019, 0, 0.45 * M, 49),
        typed(2020, 6.0 * M, 0.7 * M, 52),
        ifrsLayout(2021, 6.4 * M, 0.8 * M, 55),
        ifrsLayout(2022, 6.9 * M, 0.9 * M, 57),
      ],
      ifrsFormYears: [
        fileYear(2016, String(5.2 * M), String(0.3 * M), '46'),
        fileYear(2017, String(5.9 * M), String(0.6 * M), null),
        fileYear(2018, null, String(0.5 * M), '50'),
      ],
    })
    render(<CompanyBusinessBand model={buildCompanyProfileModel(company)} />)
    // 2010–2011 · 2016 (alone: a blank 2017) · 2018–2019 · 2020 alone (unmarked) · 2021–2022: three lines drawn.
    expect(stretches()).toBe(3)
    // 2012–2015: no statement and no file year — the real gap, said as such.
    expect(band().getByText('Fără valori comparabile pentru 2012–2015.')).toBeInTheDocument()
    // The year slots: 2010, 2011, (2012–2015 one hatched column, not a year slot), 2016, 2017, 2018, 2019 …
    // 2018: the Ministry's blank turnover; 2019: ANAF's zero.
    const blank = within(readYear(4))
    expect(blank.getByText('2018')).toBeInTheDocument()
    expect(blank.getByText('Celulă goală în fișierul Ministerului Finanțelor')).toBeInTheDocument()
    const zero = within(readYear(5))
    expect(zero.getByText('2019')).toBeInTheDocument()
    expect(zero.getByText(/^0\s+lei$/u)).toBeInTheDocument()
    fireEvent.click(band().getByRole('button', { name: 'Despre anii pe formularul IFRS' }))
    expect(screen.getByRole('dialog', { name: 'Despre anii pe formularul IFRS' })).toHaveTextContent(
      'Pentru 2016–2018, cifrele formularului IFRS vin din fișierul Ministerului Finanțelor; din 2019, de la ANAF. În 2019, unde fișierul Ministerului avea celula goală, ANAF a publicat 0: trecerea de la gol la 0 nu e o scădere.',
    )
  })

  it('keeps the IFRS-file figures out of the lede, the loss years and the figures', () => {
    // The IFRS file holds a loss (2015); nothing derived may count it.
    const withFile = buildCompanyProfileModel(formsCompany())
    const without = buildCompanyProfileModel(formsCompany(null))
    expect(withFile.ifrsForm.fileYears).toHaveLength(7)
    expect(financialLede(withFile)).toBe(financialLede(without))
    expect(withFile.lossYears).toBe(without.lossYears)
    expect(withFile.sizeClass).toEqual(without.sizeClass)
    expect(withFile.series).toEqual(without.series)
    const figures = (model: typeof withFile) => companyFigures(model, { business: 'afacerea', money: 'bani-publici' }).map(({ key, value, label }) => ({ key, value, label }))
    expect(figures(withFile)).toEqual(figures(without))
  })

  it('compares no two years across a change of form, and compares as before where no form is read', () => {
    const switched = (form: 'ifrs' | null) =>
      buildCompanyProfileModel(
        companyProfile({
          financials: [typed(2023, 10 * M, 1 * M, 50), { ...typed(2024, 12 * M, 1.5 * M, 55), reportingForm: form }],
        }),
      )
    const changed = switched('ifrs')
    expect(changed.comparable).toBe(false)
    // Nothing to compare: no lede at all, no „față de" under a figure.
    expect(financialLede(changed) ?? '').not.toMatch(/crescut|scăzut/u)
    const notes = companyFigures(changed, { business: 'afacerea', money: 'bani-publici' }).map((fact) => String(fact.note ?? ''))
    expect(notes.join(' ')).not.toMatch(/față de 2023/u)
    // No form read (the API's null): unmarked both, compared as today.
    const unknown = switched(null)
    expect(unknown.comparable).toBe(true)
    expect(financialLede(unknown) ?? '').toMatch(/crescut/u)
    expect(companyFigures(unknown, { business: 'afacerea', money: 'bani-publici' }).map((fact) => String(fact.note ?? '')).join(' ')).toMatch(/față de 2023/u)
  })

  it('draws a company held only in the IFRS file, with no lede and no „no statement"', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(companyProfile({ financials: [], ifrsFormYears: [...IFRS_FILE] }))} />)
    expect(band().getByTestId('company-years-ifrs-legend')).toBeInTheDocument()
    expect(band().queryByText(/Nicio valoare din bilanțuri/u)).toBeNull()
    expect(within(readYear(0)).getByText('2012')).toBeInTheDocument()
  })

  it('leaves a company with no IFRS-form year unmarked, its reading naming the publisher and the source', () => {
    render(<CompanyBusinessBand model={buildCompanyProfileModel(unmarkedCompany())} />)
    expect(band().queryByTestId('company-years-ifrs-legend')).toBeNull()
    expect(band().queryByText('Raportat pe formularul IFRS')).toBeNull()
    const reading = within(readYear(1))
    expect(reading.getByText('2009')).toBeInTheDocument()
    expect(reading.getByText('Ministerul Finanțelor')).toBeInTheDocument()
    expect(reading.getByRole('link', { name: /Fișierul pe data\.gov\.ro/u })).toHaveAttribute('href', 'https://data.gov.ro/ordinary-2009.txt')
  })
})
