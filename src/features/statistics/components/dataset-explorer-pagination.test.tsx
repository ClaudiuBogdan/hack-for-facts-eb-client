import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { DatasetExplorerPagination } from './dataset-explorer-pagination'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
}))

describe('DatasetExplorerPagination', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(<DatasetExplorerPagination page={1} totalCount={25} hasNextPage={false} onPageChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the page in a live region and pages forward and back, never past either end', () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<DatasetExplorerPagination page={1} totalCount={60} hasNextPage onPageChange={onPageChange} />)
    const nav = screen.getByRole('navigation', { name: 'Paginare seturi de date' })
    expect(nav.querySelector('[aria-live="polite"]')).toHaveTextContent('Pagina 1 din 3')
    // An end button stays focusable — `aria-disabled`, not `disabled` — so
    // landing on the last page never drops the focus to the body.
    const previous = screen.getByRole('button', { name: 'Anterioară' })
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    expect(previous).not.toBeDisabled()
    fireEvent.click(previous)
    expect(onPageChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Următoarea' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    rerender(<DatasetExplorerPagination page={3} totalCount={60} hasNextPage={false} onPageChange={onPageChange} />)
    const next = screen.getByRole('button', { name: 'Următoarea' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(next)
    expect(onPageChange).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Anterioară' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
