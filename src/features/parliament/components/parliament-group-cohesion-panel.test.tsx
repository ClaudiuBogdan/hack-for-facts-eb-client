import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ParliamentGroupCohesion } from '@/schemas/parliament'
import { ParliamentGroupCohesionPanel } from './parliament-group-cohesion-panel'

const WINDOW = { from: '2026-01-28', to: '2026-07-28' }

function renderPanel(props: Partial<Parameters<typeof ParliamentGroupCohesionPanel>[0]>) {
  return render(
    <ParliamentGroupCohesionPanel
      groupName="PSD"
      row={undefined}
      rows={undefined}
      window={WINDOW}
      isLoading={false}
      isError={false}
      {...props}
    />,
  )
}

const PSD: ParliamentGroupCohesion = {
  groupName: 'PSD',
  forPct: 86.2,
  againstPct: 5.9,
  abstainPct: 5,
  absentPct: 2.9,
  cohesionIndex: 0.871,
  voteCount: 296,
}

describe('ParliamentGroupCohesionPanel — the three empty states are distinct', () => {
  it('says the request failed when it failed', () => {
    renderPanel({ isError: true })
    expect(screen.getByText(/Nu am putut încărca datele de vot/)).toBeInTheDocument()
    // Must NOT blame a group-name mismatch for a network failure.
    expect(screen.queryByText(/alte denumiri de grup/)).not.toBeInTheDocument()
  })

  it('says the source reports no votes when the window came back empty', () => {
    renderPanel({ rows: [] })
    expect(screen.getByText(/nu raportează voturi în intervalul analizat/)).toBeInTheDocument()
    expect(screen.queryByText(/alte denumiri de grup/)).not.toBeInTheDocument()
  })

  it('explains the vocabulary mismatch only when other groups did come back', () => {
    renderPanel({ groupName: 'PACE', rows: [PSD] })
    expect(screen.getByText(/alte denumiri de grup/)).toBeInTheDocument()
  })
})

describe('ParliamentGroupCohesionPanel — the reported figures', () => {
  it('prints the window alongside the vote count, so the claim stays bounded', () => {
    renderPanel({ row: PSD, rows: [PSD] })
    expect(screen.getByText(/296 voturi/)).toBeInTheDocument()
    expect(screen.getByText(/28 ian\. 2026/)).toBeInTheDocument()
    expect(screen.getByText(/28 iul\. 2026/)).toBeInTheDocument()
  })

  it('gives every share a label and a number, not just a bar', () => {
    renderPanel({ row: PSD, rows: [PSD] })
    for (const label of ['Pentru', 'Împotrivă', 'Abțineri', 'Nu au votat']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('86,2%')).toBeInTheDocument()
  })

  it('bands the index into words and ranks it in the chamber', () => {
    const pnl: ParliamentGroupCohesion = { groupName: 'PNL', cohesionIndex: 0.887 }
    renderPanel({ row: PSD, rows: [pnl, PSD] })
    expect(screen.getByText('Foarte unit')).toBeInTheDocument()
    expect(screen.getByText('0,87')).toBeInTheDocument()
    expect(screen.getByText(/locul 2 din 2/)).toBeInTheDocument()
  })

  it('omits a share the source did not report rather than printing 0%', () => {
    renderPanel({
      row: { groupName: 'PSD', forPct: 90, cohesionIndex: 0.9, voteCount: 10 },
      rows: [],
    })
    expect(screen.getByText('Pentru')).toBeInTheDocument()
    expect(screen.queryByText('Nu au votat')).not.toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
})
