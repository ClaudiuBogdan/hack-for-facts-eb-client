import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeEntityReportControls } from './challenge-entity-report-controls'

function renderControls(
  props: Partial<ComponentProps<typeof ChallengeEntityReportControls>> = {},
) {
  const onChange = vi.fn()

  render(
    <ChallengeEntityReportControls
      locale="ro"
      periodType="YEAR"
      selectedYear={2025}
      quarter="Q1"
      month="01"
      availableYears={[2025, 2024, 2023]}
      reportType="PRINCIPAL_AGGREGATED"
      mainCreditorOptions={[
        { id: '4305857', label: 'Municipiul Sibiu' },
        { id: '4305858', label: 'Municipiul Mediaș' },
      ]}
      onChange={onChange}
      {...props}
    />,
  )

  return { onChange }
}

describe('ChallengeEntityReportControls', () => {
  it('renders the period selector and year options', () => {
    renderControls()

    expect(screen.getByText('Perioadă')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Anual' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Trimestrial' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lunar' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '2025' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '2024' })).toBeInTheDocument()
  })

  it('anchors year to quarter transitions on Q1', () => {
    const { onChange } = renderControls({
      periodType: 'YEAR',
      month: '11',
      quarter: 'Q4',
    })

    fireEvent.click(screen.getByRole('radio', { name: 'Trimestrial' }))

    expect(onChange).toHaveBeenCalledWith({
      periodType: 'QUARTER',
      selectedYear: 2025,
      quarter: 'Q1',
      month: '11',
    })
  })

  it('derives the quarter from the selected month when moving from month to quarter', () => {
    const { onChange } = renderControls({
      periodType: 'MONTH',
      month: '05',
      quarter: 'Q1',
    })

    fireEvent.click(screen.getByRole('radio', { name: 'Trimestrial' }))

    expect(onChange).toHaveBeenCalledWith({
      periodType: 'QUARTER',
      selectedYear: 2025,
      quarter: 'Q2',
      month: '05',
    })
  })

  it('anchors quarter to month transitions on the quarter end month', () => {
    const { onChange } = renderControls({
      periodType: 'QUARTER',
      quarter: 'Q3',
      month: '01',
    })

    fireEvent.click(screen.getByRole('radio', { name: 'Lunar' }))

    expect(onChange).toHaveBeenCalledWith({
      periodType: 'MONTH',
      selectedYear: 2025,
      quarter: 'Q3',
      month: '09',
    })
  })

  it('hides the report type and main creditor sections when there is one option', () => {
    renderControls({
      showReportTypeControl: false,
      mainCreditorOptions: [],
    })

    expect(screen.queryByText('Tip raport')).not.toBeInTheDocument()
    expect(screen.queryByText('Ordonator principal')).not.toBeInTheDocument()
  })

  it('uses generic report type labels for the entities route', () => {
    renderControls({
      reportCopyVariant: 'entity',
    })

    expect(screen.getByText('Entitate + instituții')).toBeInTheDocument()
    expect(screen.getByText('Doar entitatea')).toBeInTheDocument()
    expect(screen.queryByText('Primărie + instituții')).not.toBeInTheDocument()
    expect(screen.queryByText('Doar primărie')).not.toBeInTheDocument()
  })

  it('shows secondary aggregated and detailed report options when requested', () => {
    renderControls({
      reportCopyVariant: 'entity',
      reportType: 'SECONDARY_AGGREGATED',
      reportTypeOptions: ['SECONDARY_AGGREGATED', 'DETAILED'],
    })

    expect(screen.getByText('Ordonator secundar')).toBeInTheDocument()
    expect(screen.getByText('Doar entitatea')).toBeInTheDocument()
    expect(screen.queryByText('Entitate + instituții')).not.toBeInTheDocument()
  })

  it('clears the main creditor filter when All is selected', () => {
    const { onChange } = renderControls({
      mainCreditorCui: '4305857',
    })

    fireEvent.click(screen.getByRole('radio', { name: 'Toate' }))

    expect(onChange).toHaveBeenCalledWith({
      mainCreditorCui: undefined,
    })
  })
})
