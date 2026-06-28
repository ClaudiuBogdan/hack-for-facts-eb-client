import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { CoverageRibbon } from './coverage-ribbon'

describe('CoverageRibbon', () => {
  it('expands to show blocked filters and sub-threshold metrics', () => {
    render(
      <CoverageRibbon
        status="mock"
        coverage={[
          {
            metric: 'authority_cui',
            rate: 0.94,
            threshold: 0.95,
            meetsThreshold: false,
          },
          { metric: 'amount', rate: 0.8, threshold: 0.95, meetsThreshold: false },
          { metric: 'cpv', rate: 0.88, threshold: 0.85, meetsThreshold: true },
        ]}
        dataAsOf="2026-06-25"
        cadence="zilnic (suspendat)"
        blocked={['Filtru regiune furnizor', 'Filtru generat LLM']}
      />,
    )

    expect(screen.getByText(/Date până la/i)).toBeInTheDocument()
    expect(screen.getByText(/sincronizare suspendată/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/Filtre indisponibile în v1/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Detalii/i }))

    expect(screen.getByText(/Filtre indisponibile în v1/i)).toBeInTheDocument()
    expect(screen.getByText(/Filtru regiune furnizor/i)).toBeInTheDocument()
    expect(screen.getByText(/Filtru generat LLM/i)).toBeInTheDocument()
    expect(screen.getAllByText(/sub prag/i).length).toBeGreaterThan(0)
  })
})
