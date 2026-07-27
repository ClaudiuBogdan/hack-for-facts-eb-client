import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// The bar segments link into the filtered votes list; the panel itself needs no
// router state, so a plain anchor is enough to assert the search params.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    search,
    to,
  }: {
    children: React.ReactNode
    search: Record<string, unknown>
    to: string
  }) => (
    <a href={to} data-search={JSON.stringify(search)}>
      {children}
    </a>
  ),
}))
import type { ParliamentGroupCohesion } from '@/schemas/parliament'
import { ParliamentGroupCohesionPanel } from './parliament-group-cohesion-panel'

const WINDOW = { from: '2026-01-28', to: '2026-07-28' }

function renderPanel(props: Partial<Parameters<typeof ParliamentGroupCohesionPanel>[0]>) {
  return render(
    <ParliamentGroupCohesionPanel
      groupName="PSD"
      chamber="camera"
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

describe('ParliamentGroupCohesionPanel — the drill-down link', () => {
  it('sends the cohesion row’s group name, not the nomenclator’s', () => {
    // The filter matches `vote_records.group_name` exactly, and the two
    // vocabularies differ for some groups.
    renderPanel({
      groupName: 'Neafiliaţi',
      row: { ...PSD, groupName: 'neafiliat' },
      rows: [{ ...PSD, groupName: 'neafiliat' }],
    })
    const search = JSON.parse(
      screen.getByText('86,2%').closest('a')!.dataset['search']!,
    )
    expect(search.grupVot).toBe('neafiliat')
  })

  it('carries the chamber, the choice and the same window as the bar', () => {
    renderPanel({ row: PSD, rows: [PSD], chamber: 'senat' })
    const search = JSON.parse(
      screen.getByText('5,9%').closest('a')!.dataset['search']!,
    )
    expect(search).toMatchObject({
      tab: 'voturi',
      chamber: 'senat',
      alegere: 'impotriva',
      from: WINDOW.from,
      to: WINDOW.to,
    })
  })

  it('maps the absence segment to nu_a_votat', () => {
    renderPanel({ row: PSD, rows: [PSD] })
    const search = JSON.parse(
      screen.getByText('2,9%').closest('a')!.dataset['search']!,
    )
    expect(search.alegere).toBe('nu_a_votat')
  })

  it('warns that the percentage and the linked list count different things', () => {
    renderPanel({ row: PSD, rows: [PSD] })
    expect(screen.getByText(/deci un număr diferit/)).toBeInTheDocument()
  })
})
