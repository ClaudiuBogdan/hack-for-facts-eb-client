import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ParliamentBillDetailSchema,
  type ParliamentAiBillMetadata,
  type ParliamentBillDetail,
} from '@/schemas/parliament'

// BillDetailsTab renders TanStack <Link>s; stub the router to a plain anchor so
// the component can render without a RouterProvider (mirrors other unit tests).
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: React.ReactNode
    to?: string
    params?: Record<string, string>
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (acc, [key, value]) => acc.replace(`$${key}`, value),
      to ?? '',
    )
    return (
      <a href={href} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    )
  },
}))
// The bill tab reads vote summaries via sync getters; no related votes here.
vi.mock('../api/parliament-api', () => ({
  getParliamentVoteSummary: () => undefined,
  getVoteDivisionNumber: () => undefined,
}))

import { BillDetailsTab } from './bill-details-tab'

const ai: ParliamentAiBillMetadata = {
  summary: 'Rezumat AI al proiectului.',
  domains: ['Finanțe'],
  keywords: ['buget'],
  valueClass: 'standard',
  model: 'glm-5.2',
  loadedAt: '2026-05-22T09:00:00+03:00',
  disclaimer: 'Rezumat generat automat de AI.',
  trustClass: 'ai_generated',
  privacyClass: 'public',
}

function buildBill(overrides: Partial<ParliamentBillDetail>): ParliamentBillDetail {
  return ParliamentBillDetailSchema.parse({
    billId: '12760',
    number: 'PL-x 237/2012',
    title: 'Proiect de Lege X',
    billType: 'guvern',
    originatingChamber: 'camera',
    currentLocation: 'promulgat',
    currentStageLabel: 'Promulgat',
    lastUpdatedAt: '2023-12-29T00:00:00+03:00',
    legislatureId: '2012',
    longTitle: 'Proiect de Lege X (titlu lung)',
    initiator: { type: 'guvern', departmentName: 'Guvernul României' },
    documents: [],
    timeline: [],
    relatedVotes: [],
    ...overrides,
  })
}

describe('BillDetailsTab AI summary gate (C1)', () => {
  it('shows the AI summary card for a standard bill', () => {
    render(<BillDetailsTab bill={buildBill({ aiMetadata: ai, valueClass: 'standard' })} />)
    expect(screen.getByText('Rezumat generat de AI')).toBeInTheDocument()
    expect(screen.getByText('Rezumat generat automat de AI.')).toBeInTheDocument()
  })

  it('hides the AI summary card for a low_value bill', () => {
    render(
      <BillDetailsTab
        bill={buildBill({
          aiMetadata: { ...ai, valueClass: 'low_value' },
          valueClass: 'low_value',
        })}
      />,
    )
    expect(screen.queryByText('Rezumat generat de AI')).not.toBeInTheDocument()
  })

  it('hides the AI summary card when the bill has no aiMetadata', () => {
    render(<BillDetailsTab bill={buildBill({})} />)
    expect(screen.queryByText('Rezumat generat de AI')).not.toBeInTheDocument()
  })
})

describe('BillDetailsTab — Stadiu curent', () => {
  it('routes from the stage the bill is at to the etape tab that explains it', () => {
    // The card states one fact about where the bill stands. Without a route out
    // of it, reaching the procedure means guessing that "Etape" is the tab that
    // expands what was just read.
    render(<BillDetailsTab bill={buildBill({})} />)
    expect(
      screen.getByRole('link', { name: /Vezi toate etapele parcursului/ }),
    ).toHaveAttribute('href', '/parlament/proiecte/12760/etape')
  })
})
