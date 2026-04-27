import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChallengeEntityAnalysisExplainer } from './challenge-entity-analysis-explainer'

describe('ChallengeEntityAnalysisExplainer', () => {
  it('renders the aggregated primary copy in Romanian', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
      />,
    )

    expect(
      screen.getByText(/Datele din această pagină vin din execuții bugetare agregate/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Citește mai mult' }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the detailed primary copy in Romanian', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="DETAILED"
        inflationAdjusted={false}
      />,
    )

    expect(
      screen.getByText(/Datele din această pagină arată doar execuțiile raportate direct/),
    ).toBeInTheDocument()
  })

  it('renders generic entity copy in Romanian', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
        copyVariant="entity"
      />,
    )

    expect(
      screen.getByText(/execuțiile raportate direct de entitate/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/finanțele primăriei/),
    ).not.toBeInTheDocument()
  })

  it('renders generic detailed entity copy in English', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="en"
        reportType="DETAILED"
        inflationAdjusted={false}
        copyVariant="entity"
      />,
    )

    expect(
      screen.getByText(/reported directly by this entity/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/directly by the city hall/),
    ).not.toBeInTheDocument()
  })

  it('renders the aggregated primary copy in English', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="en"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
      />,
    )

    expect(
      screen.getByText(/This page uses aggregate execution data/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Read more' }),
    ).toBeInTheDocument()
  })

  it('appends the inflation-adjusted suffix when enabled', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted
      />,
    )

    expect(
      screen.getByText(/Sumele sunt ajustate la inflație/),
    ).toBeInTheDocument()
  })

  it('does not show the inflation suffix when disabled', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
      />,
    )

    expect(
      screen.queryByText(/Sumele sunt ajustate la inflație/),
    ).not.toBeInTheDocument()
  })

  it('expands to show secondary copy and collapses again', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
      />,
    )

    const toggleButton = screen.getByRole('button', { name: 'Citește mai mult' })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    expect(
      screen.queryByText(/Sumele pot fi mai mari decât aparatul propriu/),
    ).not.toBeInTheDocument()

    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(toggleButton).toHaveTextContent('Arată mai puțin')
    expect(
      screen.getByText(/Sumele pot fi mai mari decât aparatul propriu/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/această vedere este utilă/),
    ).toBeInTheDocument()

    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(toggleButton).toHaveTextContent('Citește mai mult')
    expect(
      screen.queryByText(/Sumele pot fi mai mari decât aparatul propriu/),
    ).not.toBeInTheDocument()
  })

  it('shows the inflation context paragraph in expanded mode when inflation is on', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Citește mai mult' }))

    expect(
      screen.getByText(/Ajustarea la inflație folosește indicele prețurilor/),
    ).toBeInTheDocument()
  })

  it('does not show the inflation context paragraph when inflation is off', () => {
    render(
      <ChallengeEntityAnalysisExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Citește mai mult' }))

    expect(
      screen.queryByText(/Ajustarea la inflație folosește indicele prețurilor/),
    ).not.toBeInTheDocument()
  })
})
