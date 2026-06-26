import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { CoverageRibbon } from './coverage-ribbon'
import { procurementMockFixtures } from '@/features/procurement/mocks/fixtures'

describe('CoverageRibbon', () => {
  const gate = procurementMockFixtures.gate

  it('expands to show blocked filters and sub-threshold metrics', () => {
    render(
      <CoverageRibbon
        status="mock"
        coverage={gate.coverage}
        dataAsOf={gate.dataAsOf}
        cadence={gate.cadence}
        blocked={gate.blocked}
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
