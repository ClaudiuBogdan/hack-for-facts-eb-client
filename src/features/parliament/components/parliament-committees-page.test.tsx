import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentCommittee } from '@/schemas/parliament'

// Capture the params the page passes to the committees hook.
const useCommitteesMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentCommittees: (params: unknown) => useCommitteesMock(params),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as Record<string, unknown>)}>{children}</a>
  ),
}))

import { ParliamentCommitteesPage } from './parliament-committees-page'

const committee: ParliamentCommittee = {
  committeeKey: 'camera_deputatilor:buget|2024',
  chamber: 'camera_deputatilor',
  name: 'Comisia pentru buget',
  legislature: '2024',
  committeeType: 'permanenta',
  sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
}

describe('ParliamentCommitteesPage legislature default', () => {
  beforeEach(() => {
    useCommitteesMock.mockReset()
    useCommitteesMock.mockReturnValue({ data: { committees: [committee] }, isLoading: false })
  })

  it('defaults the browse query to the CURRENT legislature (2024, not 1990)', () => {
    render(<ParliamentCommitteesPage />)
    expect(useCommitteesMock).toHaveBeenCalledWith({ legislature: '2024' })
  })

  it('drops the legislature filter when "Toate legislaturile" is selected', () => {
    render(<ParliamentCommitteesPage />)
    fireEvent.change(screen.getByLabelText('Filtru legislatură'), {
      target: { value: 'all' },
    })
    expect(useCommitteesMock).toHaveBeenLastCalledWith({})
  })

  it('keeps the legislature default when switching chamber tabs', () => {
    render(<ParliamentCommitteesPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Senat' }))
    expect(useCommitteesMock).toHaveBeenLastCalledWith({
      chamber: 'senat',
      legislature: '2024',
    })
  })
})
