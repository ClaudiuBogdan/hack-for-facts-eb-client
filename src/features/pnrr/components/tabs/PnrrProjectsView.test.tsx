import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectsView } from './PnrrProjectsView'

vi.mock('../table/PnrrProjectTable', () => ({
  PnrrProjectTable: () => <div data-testid="pnrr-project-table" />,
}))

vi.mock('../filters/PnrrProjectSearchInput', () => ({
  PnrrProjectSearchInput: () => <div data-testid="pnrr-project-search" />,
}))

describe('PnrrProjectsView', () => {
  it('labels project and official record counts separately', () => {
    render(
      <PnrrProjectsView
        page={{
          rows: [],
          totalCount: 21_786,
          page: 1,
          pageSize: 25,
          totalPages: 1,
          sortBy: 'value',
          sortOrder: 'desc',
        }}
        projectRecordCount={24_967}
        filterState={{} as ReturnType<typeof usePnrrFilterState>}
      />,
    )

    expect(screen.getByText(/21\.786\s+projects.*24\.967\s+records/)).toBeInTheDocument()
  })
})
