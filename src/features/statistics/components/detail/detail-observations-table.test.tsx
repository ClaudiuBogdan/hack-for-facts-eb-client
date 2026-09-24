import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@/test/test-utils'
import type { NativeInsObservation } from '@/schemas/ins'
import { DetailObservationsTable } from './detail-observations-table'
import { activeNumberLocale, groupWireValue } from '../../lib/format'
import {
  sourceDescriptor,
  sourceObservation,
} from '../../lib/source-observations.test-fixtures'

/** One exact, unqualified annual cell of the fixture's single series. */
function exactRow(year: number, overrides: Partial<NativeInsObservation> = {}): NativeInsObservation {
  const base = sourceObservation()
  return {
    ...base,
    id: `opaque:TEST:${year}`,
    value: String(1_000_000 + year),
    value_status: null,
    time_period: { ...base.time_period, iso_period: String(year), year },
    dimensions: {
      geography: {
        ...base.dimensions.geography!,
        resolution: 'EXACT',
        qualified: false,
        flags: [],
        resolvedTerritory: { code: 'B', level: 'NUTS3' },
        contextTerritory: null,
        applicableRules: [],
      },
    },
    ...overrides,
  }
}

const years = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => exactRow(from + index))

const bodyRows = () => screen.getAllByRole('row').slice(1)

describe('DetailObservationsTable', () => {
  it('reads a single series as its period and its value: no axis, unit, archive or pick columns', () => {
    render(<DetailObservationsTable sourceDescriptor={sourceDescriptor} observations={years(2022, 2024)} onSelectSource={vi.fn()} />)
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    // The unit's own name is the fallback word when INS has no symbol for it.
    expect(headers).toEqual(['An', 'Valoare (număr persoane)'])
    expect(screen.queryByRole('button', { name: 'Alege această serie' })).not.toBeInTheDocument()
    expect(screen.queryByText(/opaque:TEST/)).not.toBeInTheDocument()
  })

  it('lists the newest period first and prints each value with every digit INS published', () => {
    render(
      <DetailObservationsTable
        sourceDescriptor={sourceDescriptor}
        observations={[exactRow(2023), exactRow(2024, { value: '-123456789012345678901.2300' })]}
      />,
    )
    const [first, second] = bodyRows()
    expect(first).toHaveTextContent('2024')
    expect(first).toHaveTextContent(groupWireValue('-123456789012345678901.2300', activeNumberLocale()))
    expect(second).toHaveTextContent('2023')
  })

  it('shows the latest five years, opens onto every year in a scrollable region, and closes again', async () => {
    render(<DetailObservationsTable sourceDescriptor={sourceDescriptor} observations={years(1990, 2024)} />)
    expect(bodyRows()).toHaveLength(5)
    expect(bodyRows()[4]).toHaveTextContent('2020')

    const toggle = screen.getByRole('button', { name: /Arată toate cele 35 de valori/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(bodyRows()).toHaveLength(35)
    expect(screen.getByRole('region', { name: 'Toate valorile seriei' })).toHaveAttribute('tabindex', '0')

    await userEvent.click(screen.getByRole('button', { name: /Arată mai puțin/ }))
    expect(bodyRows()).toHaveLength(5)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('shows every row when folding would hide fewer than three', () => {
    render(<DetailObservationsTable sourceDescriptor={sourceDescriptor} observations={years(2018, 2024)} />)
    expect(bodyRows()).toHaveLength(7)
    expect(screen.queryByRole('button', { name: /Arată/ })).not.toBeInTheDocument()
  })

  it('names the axis that tells rows apart and lets a row pin its series, when the rows hold several', async () => {
    const onSelectSource = vi.fn()
    const other = exactRow(2024, {
      id: 'opaque:TEST:other',
      classifications: sourceObservation().classifications.map((member) =>
        member.type_code === 'D0' ? { ...member, code: '1', name_ro: 'Femei' } : member,
      ),
    })
    render(
      <DetailObservationsTable
        sourceDescriptor={sourceDescriptor}
        observations={[exactRow(2024), other]}
        onSelectSource={onSelectSource}
      />,
    )
    expect(screen.getByRole('columnheader', { name: '=Category' })).toBeInTheDocument()
    // The geography is the same on both rows: not a column.
    expect(screen.queryByRole('columnheader', { name: 'Geografie unu' })).not.toBeInTheDocument()
    const femei = screen.getByText('Femei').closest('tr')!
    await userEvent.click(within(femei).getByRole('button', { name: 'Alege această serie' }))
    expect(onSelectSource).toHaveBeenCalledWith(other)
  })

  it('folds by period, so every series of an inspection stays in view', () => {
    const women = (year: number) =>
      exactRow(year, {
        id: `opaque:TEST:${year}:women`,
        classifications: sourceObservation().classifications.map((member) =>
          member.type_code === 'D0' ? { ...member, code: '1', name_ro: 'Femei' } : member,
        ),
      })
    const rows = years(2015, 2024).flatMap((row) => [row, women(row.time_period.year)])
    render(<DetailObservationsTable sourceDescriptor={sourceDescriptor} observations={rows} onSelectSource={vi.fn()} />)
    // The latest five years of both series: ten rows, not five.
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getAllByText('Femei')).toHaveLength(5)
    expect(bodyRows()[9]).toHaveTextContent('2020')
  })

  it('names a mixed cadence „Perioadă" and gives a unit that varies its own column', () => {
    const quarter = exactRow(2024, {
      id: 'opaque:TEST:2024-Q4',
      time_period: { iso_period: '2024-Q4', periodicity: 'QUARTERLY', year: 2024, quarter: 4, month: null },
      unit: { code: '1', name_ro: 'Procente', symbol: '%' },
    })
    render(<DetailObservationsTable sourceDescriptor={sourceDescriptor} observations={[exactRow(2023), quarter]} />)
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual(['Perioadă', 'Unitate', 'Valoare'])
    expect(screen.getByText('Procente')).toBeInTheDocument()
  })

  it('marks a qualified territory and explains it under the table, linking only http evidence', () => {
    const { unmount } = render(
      <DetailObservationsTable sourceDescriptor={sourceDescriptor} observations={[sourceObservation()]} />,
    )
    expect(screen.getByText('teritoriu interpretat, vezi nota de sub tabel')).toBeInTheDocument()
    expect(screen.getByText('Source methodology, not a fiscal hierarchy.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sursa regulii' })).toHaveAttribute(
      'href',
      'https://statistici.insse.ro/test-evidence',
    )
    unmount()

    const base = sourceObservation()
    const geography = base.dimensions.geography!
    render(
      <DetailObservationsTable
        sourceDescriptor={sourceDescriptor}
        observations={[
          sourceObservation({
            dimensions: {
              geography: {
                ...geography,
                applicableRules: geography.applicableRules.map((rule) => ({
                  ...rule,
                  evidenceUrl: 'javascript:alert(1)',
                })),
              },
            },
          }),
        ]}
      />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('keeps a status whose value is unavailable, and names it once under the table', () => {
    render(
      <DetailObservationsTable
        sourceDescriptor={sourceDescriptor}
        observations={[exactRow(2024, { value: null, value_status: 'c' })]}
      />,
    )
    const marker = screen.getByTitle('date confidențiale')
    expect(marker.tagName).toBe('SUP')
    expect(marker).toHaveTextContent('date confidențiale')
    expect(screen.getByText('Marcaje de calitate INS')).toBeInTheDocument()
  })

  it('refuses rows whose source identity cannot be verified', () => {
    render(<DetailObservationsTable sourceDescriptor={{}} observations={[exactRow(2024)]} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Nu putem verifica identitatea')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
