import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalStatusActCounts } from '@/schemas/legal'
import { legislationStatusCountsFixture } from '../mocks/fixtures/legislation-status-counts'
import { formatLegalNumber } from '../lib/legal-format'
import { LegislationKpiStrip } from './legislation-kpi-strip'

vi.mock('../hooks/use-legislation', () => ({
  useLegislationStatusCounts: vi.fn(),
}))

import { useLegislationStatusCounts } from '../hooks/use-legislation'

const mockCounts = (value: {
  readonly data?: LegalStatusActCounts
  readonly isError?: boolean
}) => {
  vi.mocked(useLegislationStatusCounts).mockReturnValue({
    data: undefined,
    isError: false,
    ...value,
  } as unknown as ReturnType<typeof useLegislationStatusCounts>)
}

/** The Lingui test mock pins `i18n.locale` to `en`. */
const formatted = (value: number) => formatLegalNumber(value, 'en')

describe('LegislationKpiStrip', () => {
  beforeEach(() => {
    vi.mocked(useLegislationStatusCounts).mockReset()
  })

  it('renders all four numbers from the one aggregate', () => {
    mockCounts({ data: legislationStatusCountsFixture })

    render(<LegislationKpiStrip />)

    expect(
      screen.getByText(formatted(legislationStatusCountsFixture.total)),
    ).toBeInTheDocument()
    expect(
      screen.getByText(formatted(legislationStatusCountsFixture.inVigoare)),
    ).toBeInTheDocument()
    expect(
      screen.getByText(formatted(legislationStatusCountsFixture.modificat)),
    ).toBeInTheDocument()
    expect(
      screen.getByText(formatted(legislationStatusCountsFixture.abrogat)),
    ).toBeInTheDocument()
  })

  it('renders labels only — no zeros — while the counts are unknown', () => {
    mockCounts({})

    render(<LegislationKpiStrip />)

    expect(screen.getByText('Acte normative')).toBeInTheDocument()
    expect(screen.getByText('În vigoare')).toBeInTheDocument()
    // An unknown number renders a reserved blank, never a fabricated 0.
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('keeps a known number on screen while another stays blank — per-tile honesty', () => {
    mockCounts({ data: { inVigoare: 194_924 } })

    render(<LegislationKpiStrip />)

    expect(screen.getByText(formatted(194_924))).toBeInTheDocument()
    // total is unknown here, so its tile carries no number — and no share
    // meta can be computed without it.
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(/din total/)).not.toBeInTheDocument()
  })

  it('renders a true zero as 0 — a proven absence is a number, not a gap', () => {
    mockCounts({
      data: { total: 194_924, inVigoare: 194_924, modificat: 0, abrogat: 0 },
    })

    render(<LegislationKpiStrip />)

    expect(screen.getAllByText('0')).toHaveLength(2)
  })

  it('says the numbers could not load when the aggregate fails, instead of standing in zeros', () => {
    mockCounts({ isError: true })

    render(<LegislationKpiStrip />)

    expect(
      screen.getByText(/Cifrele nu au putut fi încărcate/),
    ).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
