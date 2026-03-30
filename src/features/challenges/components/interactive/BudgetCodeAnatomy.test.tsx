import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { BudgetCodeAnatomy } from './BudgetCodeAnatomy'

vi.mock('@/lib/utils', () => ({
  getUserLocale: () => 'ro',
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}))

describe('BudgetCodeAnatomy', () => {
  it('renders without crashing', () => {
    const { container } = render(<BudgetCodeAnatomy />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays the full budget code', () => {
    render(<BudgetCodeAnatomy />)

    // Appears in both mobile view and table
    const fullCodeElements = screen.getAllByText('65.04.02')
    expect(fullCodeElements.length).toBeGreaterThanOrEqual(1)
  })

  it('displays all segment level labels in Romanian', () => {
    render(<BudgetCodeAnatomy />)

    const capitolElements = screen.getAllByText('Capitol')
    expect(capitolElements.length).toBeGreaterThanOrEqual(1)

    const subcapitolElements = screen.getAllByText('Subcapitol')
    expect(subcapitolElements.length).toBeGreaterThanOrEqual(1)

    const paragrafElements = screen.getAllByText('Paragraf')
    expect(paragrafElements.length).toBeGreaterThanOrEqual(1)
  })

  it('displays all segment description labels in Romanian', () => {
    render(<BudgetCodeAnatomy />)

    const educationLabels = screen.getAllByText('Invatamant')
    expect(educationLabels.length).toBeGreaterThanOrEqual(1)

    const secondaryLabels = screen.getAllByText('Invatamant secundar')
    expect(secondaryLabels.length).toBeGreaterThanOrEqual(1)

    const lowerSecondaryLabels = screen.getAllByText(
      'Invatamant secundar inferior',
    )
    expect(lowerSecondaryLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the summary table with Code, Level, and Description headers', () => {
    render(<BudgetCodeAnatomy />)

    expect(screen.getByText('Cod')).toBeInTheDocument()
    expect(screen.getByText('Nivel')).toBeInTheDocument()
    expect(screen.getByText('Descriere')).toBeInTheDocument()
  })

  it('renders segment codes in the table', () => {
    render(<BudgetCodeAnatomy />)

    // Codes appear in both the schematic view and the table
    const chapterCodes = screen.getAllByText('65')
    expect(chapterCodes.length).toBeGreaterThanOrEqual(1)

    const subchapterCodes = screen.getAllByText('65.04')
    expect(subchapterCodes.length).toBeGreaterThanOrEqual(1)

    const paragraphCodes = screen.getAllByText('65.04.02')
    expect(paragraphCodes.length).toBeGreaterThanOrEqual(2)
  })

  it('marks the SVG connector as aria-hidden', () => {
    const { container } = render(<BudgetCodeAnatomy />)

    const svg = container.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })

  it('renders three table body rows for three segments', () => {
    render(<BudgetCodeAnatomy />)

    const rows = screen.getAllByRole('row')
    // 1 header row + 3 body rows
    expect(rows).toHaveLength(4)
  })
})
