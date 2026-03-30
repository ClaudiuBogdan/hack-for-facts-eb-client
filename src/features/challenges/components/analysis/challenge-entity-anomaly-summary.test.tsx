import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ExecutionLineItem } from '@/lib/api/entities'
import { ChallengeEntityAnomalySummary } from './challenge-entity-anomaly-summary'

const normalizationOptions = {
  normalization: 'total' as const,
  currency: 'RON' as const,
}

const anomalyLineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'ytd-1',
    account_category: 'ch',
    funding_source_id: 1,
    anomaly: 'YTD_ANOMALY',
    functionalClassification: {
      functional_code: '65.02',
      functional_name: 'Invatamant',
    },
    economicClassification: {
      economic_code: '20.01',
      economic_name: 'Bunuri si servicii',
    },
    ytd_amount: 100,
    quarterly_amount: 100,
    monthly_amount: 100,
    amount: 100,
  },
  {
    line_item_id: 'missing-1',
    account_category: 'ch',
    funding_source_id: 1,
    anomaly: 'MISSING_LINE_ITEM',
    functionalClassification: {
      functional_code: '68.02',
      functional_name: 'Sanatate',
    },
    economicClassification: {
      economic_code: '10.01',
      economic_name: 'Cheltuieli cu personalul',
    },
    ytd_amount: 50,
    quarterly_amount: 50,
    monthly_amount: 50,
    amount: 50,
  },
]

const noAnomalyLineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'normal-1',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '65.02',
      functional_name: 'Invatamant',
    },
    economicClassification: {
      economic_code: '20.01',
      economic_name: 'Bunuri si servicii',
    },
    ytd_amount: 200,
    quarterly_amount: 200,
    monthly_amount: 200,
    amount: 200,
  },
]

describe('ChallengeEntityAnomalySummary', () => {
  it('renders the title and badge count for anomaly items', () => {
    render(
      <ChallengeEntityAnomalySummary
        locale="ro"
        lineItems={anomalyLineItems}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(
      screen.getByText('Semnale de Alarmă'),
    ).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(
      screen.getByText('Revizuiește liniile bugetare semnalate pentru perioada curentă.'),
    ).toBeInTheDocument()
  })

  it('shows the no-signals message when there are no anomalies', () => {
    render(
      <ChallengeEntityAnomalySummary
        locale="ro"
        lineItems={noAnomalyLineItems}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(
      screen.getByText('Nu există semnale de alarmă pentru perioada curentă.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nu s-au găsit linii bugetare marcate cu anomalii.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Arată Detaliile/i }),
    ).not.toBeInTheDocument()
  })

  it('renders in English locale', () => {
    render(
      <ChallengeEntityAnomalySummary
        locale="en"
        lineItems={anomalyLineItems}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText('Warning signals')).toBeInTheDocument()
    expect(
      screen.getByText('Review the budget lines flagged for the current period.'),
    ).toBeInTheDocument()
  })

  it('shows anomaly type counts as outline badges', () => {
    render(
      <ChallengeEntityAnomalySummary
        locale="ro"
        lineItems={anomalyLineItems}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText(/YTD anomaly.*: 1/)).toBeInTheDocument()
    expect(screen.getByText(/Missing.*: 1/)).toBeInTheDocument()
  })

  it('expands details when clicking the toggle and collapses again', () => {
    render(
      <ChallengeEntityAnomalySummary
        locale="ro"
        lineItems={anomalyLineItems}
        normalizationOptions={normalizationOptions}
      />,
    )

    const toggleButton = screen.getByRole('button', { name: /Arată Detaliile/i })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(toggleButton).toHaveTextContent(/Ascunde Detaliile/)

    const list = screen.getByRole('list')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)

    expect(screen.getByText('Invatamant / Bunuri si servicii')).toBeInTheDocument()
    expect(screen.getByText('65.02 · 20.01')).toBeInTheDocument()
    expect(screen.getByText('Sanatate / Cheltuieli cu personalul')).toBeInTheDocument()

    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('does not show the toggle button when there are no anomalies', () => {
    render(
      <ChallengeEntityAnomalySummary
        locale="ro"
        lineItems={noAnomalyLineItems}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /Arată Detaliile/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Ascunde Detaliile/i }),
    ).not.toBeInTheDocument()
  })
})
