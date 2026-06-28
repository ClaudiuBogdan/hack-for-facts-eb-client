import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { procurementMockFixtures } from '../mocks/fixtures'
import { ProcurementRecordDetail } from './procurement-record-detail'
import { TooltipProvider } from '@/components/ui/tooltip'

function macroText(
  strings: TemplateStringsArray | string,
  ...values: readonly unknown[]
) {
  if (typeof strings === 'string') return strings
  return strings.reduce(
    (text, part, index) => `${text}${part}${values[index] ?? ''}`,
    '',
  )
}

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: macroText,
  msg: macroText,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('ProcurementRecordDetail', () => {
  it('renders contract details with partial coverage, gated slots, duplicates, and provenance drawer evidence', async () => {
    const detail = procurementMockFixtures.contractDetail('contract-key-001')
    if (!detail) throw new Error('Missing contract detail fixture')

    render(
      <TooltipProvider>
        <ProcurementRecordDetail detail={detail} />
      </TooltipProvider>,
    )

    expect(screen.getByText('Achiziții publice')).toBeInTheDocument()
    expect(screen.getByText('38912/2025')).toBeInTheDocument()
    expect(screen.getByText('Părți')).toBeInTheDocument()
    expect(screen.getByText('Modificări')).toBeInTheDocument()
    expect(screen.getByText('Trail de modificări')).toBeInTheDocument()
    expect(screen.getByText('Sloturi sub prag')).toBeInTheDocument()
    expect(screen.getByText('Vezi și pe TED')).toBeInTheDocument()
    expect(screen.getByText('Neverificat')).toBeInTheDocument()
    expect(
      screen.getByText(/Deduplicarea este un strat de legături reversibil/),
    ).toBeInTheDocument()
    expect(screen.getByText('contract-key-001-seap-mirror')).toBeInTheDocument()
    expect(screen.getByText(/Acoperire parțială/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Proveniență' }))

    expect(
      await screen.findByRole('heading', { name: 'Proveniența datelor' }),
    ).toBeInTheDocument()
    expect(screen.getByText('public-contracts-seap')).toBeInTheDocument()
    expect(
      screen.getByText(
        'https://www.e-licitatie.ro/pub/notices/contract/contract-key-001',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Valorile non-RON nu au sumă în RON; se afișează codul monedei.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        '~310k proceduri e-licitatie pot lipsi publication_date până la o reîncărcare.',
      ),
    ).toBeInTheDocument()
  })
})
