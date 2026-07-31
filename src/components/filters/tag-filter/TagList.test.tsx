/**
 * TagList — the grouped faceted-tag picker.
 *
 * The load-bearing assertions: facet headers must NOT carry `data-list-option`
 * (keyboard navigation walks that attribute, and a focusable header would be a
 * selectable non-option), and toggling a row must emit the RAW tag id
 * (`kind::hospital`), because that exact string is what the server's `@>`
 * containment matches — a localized label leaking into the filter would
 * silently match nothing.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TagList, TagExcludeList } from './TagList'
import type { EntityTagVocabulary } from '@/hooks/filters/useFilterLabels'

const fixture: EntityTagVocabulary = {
  version: 'test',
  semantics: 'or-within-facet-and-across-facets',
  tagCount: 4,
  facets: [
    {
      facet: 'kind',
      labelRo: 'Tip de instituție',
      labelEn: 'Institution type',
      multi: false,
      tags: [
        { tag: 'kind::hospital', labelRo: 'Spital', labelEn: 'Hospital' },
        {
          tag: 'kind::school',
          labelRo: 'Școală',
          labelEn: 'School',
          descriptionRo: 'Orice unitate de învățământ',
          descriptionEn: 'Any education unit',
        },
        {
          tag: 'kind::school::gymnasium',
          labelRo: 'Școală gimnazială',
          labelEn: 'Gymnasium school',
          parent: 'kind::school',
        },
      ],
    },
    {
      facet: 'level',
      labelRo: 'Nivel de guvernare',
      labelEn: 'Government tier',
      multi: false,
      tags: [{ tag: 'level::local', labelRo: 'Local', labelEn: 'Local' }],
    },
  ],
}

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityTagVocabulary: () => ({ vocabulary: fixture }),
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getUserLocale: () => 'en',
}))

describe('TagList', () => {
  const toggleSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one header per facet, outside keyboard navigation', () => {
    const { container } = render(<TagList selectedOptions={[]} toggleSelect={toggleSelect} />)

    expect(screen.getByText('Institution type')).toBeInTheDocument()
    expect(screen.getByText('Government tier')).toBeInTheDocument()

    const optionRows = container.querySelectorAll('[data-list-option]')
    expect(optionRows).toHaveLength(4) // tags only, never headers
  })

  it('emits the raw tag id on toggle, not the localized label', () => {
    render(<TagList selectedOptions={[]} toggleSelect={toggleSelect} />)

    fireEvent.click(screen.getByText('Hospital'))
    expect(toggleSelect).toHaveBeenCalledWith({ id: 'kind::hospital', label: 'Hospital' })
  })

  it('marks selected tags', () => {
    render(
      <TagList
        selectedOptions={[{ id: 'kind::hospital', label: 'Hospital' }]}
        toggleSelect={toggleSelect}
      />
    )

    const row = screen.getByText('Hospital').closest('[data-list-option]')
    expect(row).toHaveAttribute('aria-selected', 'true')
  })

  it('filters by search and drops facets with no matches', async () => {
    render(<TagList selectedOptions={[]} toggleSelect={toggleSelect} />)

    // SearchInput debounces by 300ms, so the list updates asynchronously.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hospital' } })

    await waitFor(() => {
      expect(screen.queryByText('Local')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Hospital')).toBeInTheDocument()
    expect(screen.queryByText('Government tier')).not.toBeInTheDocument()
  })

  it('explains the OR-within / AND-across grouping rule for include', () => {
    render(<TagList selectedOptions={[]} toggleSelect={toggleSelect} />)

    expect(
      screen.getByText(/same group combine with OR; different groups combine with AND/)
    ).toBeInTheDocument()
  })

  it('shows the flat any-match copy in exclude mode — the server excludes on ANY selected tag', () => {
    render(<TagExcludeList selectedOptions={[]} toggleSelect={toggleSelect} />)

    expect(screen.getByText(/any selected tag are excluded/)).toBeInTheDocument()
    expect(screen.queryByText(/combine with AND/)).not.toBeInTheDocument()
  })

  it('shows a description hint only where a description exists', () => {
    render(<TagList selectedOptions={[]} toggleSelect={toggleSelect} />)

    expect(screen.getByLabelText('Any education unit')).toBeInTheDocument()
  })
})
