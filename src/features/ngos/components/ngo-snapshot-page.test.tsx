import { render, screen } from '@/test/test-utils'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { getMockSnapshotProvenance } from '@/features/ngos/mocks/ngo-mocks'
import { NgoSnapshotPage } from './ngo-snapshot-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
  }: {
    readonly children: ReactNode
    readonly to?: string
  }) => <a href={to ?? '#'}>{children}</a>,
}))

describe('NgoSnapshotPage', () => {
  it('renders stale services snapshot status, metadata, official link, validation, and evidence rows', () => {
    const provenance = getMockSnapshotProvenance('mmuncii_services_2023_12_11')
    if (!provenance) throw new Error('Missing mock provenance')

    render(<NgoSnapshotPage provenance={provenance} fromLabel="landing" />)

    expect(screen.getByText('În direct')).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: 'Date posibil depășite: 11 dec. 2023' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Ministerul Muncii și Solidarității Sociale (MMuncii)',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('mmuncii_services_2023_12_11')).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: 'Sursa oficiala' }),
    ).toHaveAttribute(
      'href',
      'https://mmuncii.ro/j33/meniu/3229/servicii-sociale-licentiate',
    )

    expect(screen.getByText('Metadate instantaneu')).toBeInTheDocument()
    expect(screen.getByText('source_snapshot_id')).toBeInTheDocument()
    expect(screen.getByText('content_sha256')).toBeInTheDocument()
    expect(screen.getByText('5.407')).toBeInTheDocument()

    expect(screen.getByText('siruta_missing')).toBeInTheDocument()
    expect(
      screen.getByText(/38 de servicii fără cod SIRUTA/),
    ).toBeInTheDocument()

    expect(screen.getByText('Randuri de evidence')).toBeInTheDocument()
    expect(screen.getByText(/Arată dovada|Ascunde dovada/)).toBeInTheDocument()
    expect(screen.getByText(/Deschis din:\s*landing/)).toBeInTheDocument()
  })

  it('renders name-only trust state for the MJ registry snapshot', () => {
    const provenance = getMockSnapshotProvenance('mj_registry_2024_06')
    if (!provenance) throw new Error('Missing mock provenance')

    render(<NgoSnapshotPage provenance={provenance} />)

    expect(screen.getAllByText('Doar referință').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: 'Ministerul Justiției (MJ)' }),
    ).toBeInTheDocument()
    expect(screen.getByText('mj_registry_2024_06')).toBeInTheDocument()
    expect(
      screen.getByText('Fara probleme de validare pentru acest instantaneu.'),
    ).toBeInTheDocument()
  })

  it('renders pending financial snapshot as partial trust state', () => {
    const provenance = getMockSnapshotProvenance('anaf_financial_pending')
    if (!provenance) throw new Error('Missing mock provenance')

    render(<NgoSnapshotPage provenance={provenance} />)

    expect(screen.getByText('Parțial')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Agenția Națională de Administrare Fiscală (ANAF)',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Randuri sursa')).toBeInTheDocument()
    expect(screen.getByText('anaf_financial_pending')).toBeInTheDocument()
  })
})
