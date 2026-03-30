import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChallengeCommitmentsExplainer } from './challenge-commitments-explainer'

describe('ChallengeCommitmentsExplainer', () => {
  it('renders the aggregated primary copy in Romanian', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
        isPerCapita={false}
      />,
    )

    expect(
      screen.getByText(/Această pagină arată angajamentele bugetare agregate/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Citește mai mult' }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the detailed primary copy in Romanian', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="ro"
        reportType="DETAILED"
        inflationAdjusted={false}
        isPerCapita={false}
      />,
    )

    expect(
      screen.getByText(/Această pagină arată doar angajamentele bugetare raportate direct/),
    ).toBeInTheDocument()
  })

  it('renders in English', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="en"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
        isPerCapita={false}
      />,
    )

    expect(
      screen.getByText(/This page shows budget commitments aggregated/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Read more' }),
    ).toBeInTheDocument()
  })

  it('appends the per-capita suffix', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
        isPerCapita
      />,
    )

    expect(
      screen.getByText(/Valorile sunt afișate per capita/),
    ).toBeInTheDocument()
  })

  it('appends the inflation-adjusted suffix', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted
        isPerCapita={false}
      />,
    )

    expect(
      screen.getByText(/Sumele sunt ajustate la inflație/),
    ).toBeInTheDocument()
  })

  it('appends both per-capita and inflation suffixes', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted
        isPerCapita
      />,
    )

    expect(
      screen.getByText(/Valorile sunt afișate per capita.*Sumele sunt ajustate la inflație/),
    ).toBeInTheDocument()
  })

  it('expands to show expanded copy and collapses again', () => {
    render(
      <ChallengeCommitmentsExplainer
        locale="ro"
        reportType="PRINCIPAL_AGGREGATED"
        inflationAdjusted={false}
        isPerCapita={false}
      />,
    )

    const toggleButton = screen.getByRole('button', { name: 'Citește mai mult' })

    expect(
      screen.queryByText(/Creditele bugetare reprezintă limita maximă/),
    ).not.toBeInTheDocument()

    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(toggleButton).toHaveTextContent('Arată mai puțin')
    expect(
      screen.getByText(/Creditele bugetare reprezintă limita maximă/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Diferența dintre angajamente și plăți/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Creditele bugetare sunt anuale/),
    ).toBeInTheDocument()

    fireEvent.click(toggleButton)

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByText(/Creditele bugetare reprezintă limita maximă/),
    ).not.toBeInTheDocument()
  })
})
