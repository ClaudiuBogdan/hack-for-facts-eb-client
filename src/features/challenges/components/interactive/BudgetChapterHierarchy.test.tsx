import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { BudgetChapterHierarchy } from './BudgetChapterHierarchy'

vi.mock('@/lib/utils', () => ({
  getUserLocale: () => 'ro',
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}))

describe('BudgetChapterHierarchy', () => {
  it('renders without crashing', () => {
    const { container } = render(<BudgetChapterHierarchy />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays the root chapter code and label', () => {
    render(<BudgetChapterHierarchy />)

    expect(screen.getByText('65')).toBeInTheDocument()
    expect(screen.getByText('Invatamant')).toBeInTheDocument()
  })

  it('displays subcapitol codes and labels', () => {
    render(<BudgetChapterHierarchy />)

    expect(screen.getByText('65.03')).toBeInTheDocument()
    expect(
      screen.getByText('Invatamant prescolar si primar'),
    ).toBeInTheDocument()
    expect(screen.getByText('65.04')).toBeInTheDocument()
    expect(screen.getByText('Invatamant secundar')).toBeInTheDocument()
    expect(screen.getByText('65.05')).toBeInTheDocument()
    expect(screen.getByText('Invatamant postliceal')).toBeInTheDocument()
    expect(screen.getByText('65.06')).toBeInTheDocument()
    expect(screen.getByText('Invatamant superior')).toBeInTheDocument()
  })

  it('displays nested paragraph-level items', () => {
    render(<BudgetChapterHierarchy />)

    expect(screen.getByText('65.03.01')).toBeInTheDocument()
    expect(screen.getByText('Invatamant prescolar')).toBeInTheDocument()
    expect(screen.getByText('65.03.02')).toBeInTheDocument()
    expect(screen.getByText('Invatamant primar')).toBeInTheDocument()
  })

  it('renders ellipsis placeholders for truncated items', () => {
    render(<BudgetChapterHierarchy />)

    const ellipsisElements = screen.getAllByText('...')
    expect(ellipsisElements.length).toBeGreaterThanOrEqual(2)
  })

  it('marks decorative connector lines as aria-hidden', () => {
    const { container } = render(<BudgetChapterHierarchy />)

    const ariaHiddenSpans = container.querySelectorAll(
      'span[aria-hidden="true"]',
    )
    expect(ariaHiddenSpans.length).toBeGreaterThan(0)
  })

  it('renders the hierarchy as nested lists', () => {
    const { container } = render(<BudgetChapterHierarchy />)

    const lists = container.querySelectorAll('ul')
    expect(lists.length).toBeGreaterThanOrEqual(2)
  })
})
