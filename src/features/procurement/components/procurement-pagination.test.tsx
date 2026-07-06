import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProcurementPagination } from './procurement-pagination'

describe('ProcurementPagination', () => {
  it('renders windowed page numbers when the total is known', () => {
    const onPageChange = vi.fn()
    render(
      <ProcurementPagination
        page={5}
        pageSize={25}
        total={500}
        hasRecords
        onPageChange={onPageChange}
      />,
    )

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '6' }))
    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  it('degrades to prev/next with "1000+" when the total is unknown', () => {
    render(
      <ProcurementPagination
        page={2}
        pageSize={25}
        total={null}
        hasRecords
        onPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/1000\+/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '3' })).toBeNull()
  })

  it('returns null when a known total fits one page', () => {
    const { container } = render(
      <ProcurementPagination
        page={1}
        pageSize={25}
        total={10}
        hasRecords
        onPageChange={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
