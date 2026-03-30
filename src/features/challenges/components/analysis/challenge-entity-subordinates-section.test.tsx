import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ChallengeEntitySubordinatesSection,
  type ChallengeEntitySubordinateCardItem,
} from './challenge-entity-subordinates-section'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => {
    const href =
      typeof to === 'string' && params?.cui
        ? to.replace('$cui', encodeURIComponent(params.cui))
        : to ?? '#'
    return (
      <a
        href={href}
        data-search={search ? JSON.stringify(search) : undefined}
        {...props}
      >
        {children}
      </a>
    )
  },
}))

const normalizationOptions = {
  normalization: 'total' as const,
  currency: 'RON' as const,
}

const sampleItems: ChallengeEntitySubordinateCardItem[] = [
  {
    entityCui: '111',
    entityName: 'Scoala Nr 1',
    entityTypeLabel: 'Scoala',
    totalSpending: 500_000,
    entitySearch: { year: 2025 },
  },
  {
    entityCui: '222',
    entityName: 'Biblioteca Judeteana',
    entityTypeLabel: 'Institutie culturala',
    totalSpending: 300_000,
    entitySearch: { year: 2025 },
  },
]

describe('ChallengeEntitySubordinatesSection', () => {
  it('renders the title and description in Romanian', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={sampleItems}
        totalResultsCount={2}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText('Instituții subordonate')).toBeInTheDocument()
    expect(
      screen.getByText(/Am ordonat instituțiile după cheltuielile raportate/),
    ).toBeInTheDocument()
  })

  it('renders the title in English', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="en"
        items={sampleItems}
        totalResultsCount={2}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText('Subordinate institutions')).toBeInTheDocument()
  })

  it('renders subordinate items as links', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={sampleItems}
        totalResultsCount={2}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText('Scoala Nr 1')).toBeInTheDocument()
    expect(screen.getByText('Biblioteca Judeteana')).toBeInTheDocument()
    expect(screen.getByText('Scoala')).toBeInTheDocument()
    expect(screen.getByText('Institutie culturala')).toBeInTheDocument()
  })

  it('shows the summary count badge', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={sampleItems}
        totalResultsCount={10}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(screen.getByText('Top 2 din 10')).toBeInTheDocument()
  })

  it('renders loading skeletons when isLoading is true', () => {
    const { container } = render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={[]}
        totalResultsCount={0}
        isLoading
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
      />,
    )

    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders the error state with a retry button', () => {
    const onRetry = vi.fn()

    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={[]}
        totalResultsCount={0}
        isLoading={false}
        isError
        onRetry={onRetry}
        normalizationOptions={normalizationOptions}
      />,
    )

    expect(
      screen.getByText('Nu am putut încărca instituțiile subordonate pentru această perioadă.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders the empty state for spending kind', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={[]}
        totalResultsCount={0}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
        emptyStateKind="spending"
      />,
    )

    expect(
      screen.getByText('Nu am găsit cheltuieli raportate pentru instituțiile subordonate în perioada selectată.'),
    ).toBeInTheDocument()
  })

  it('renders the empty state for children kind', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={[]}
        totalResultsCount={0}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
        emptyStateKind="children"
      />,
    )

    expect(
      screen.getByText('Nu există instituții subordonate conectate acestei primării în datele disponibile.'),
    ).toBeInTheDocument()
  })

  it('renders the show-all link when showAllSearch is provided', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={sampleItems}
        totalResultsCount={2}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
        showAllSearch={{ year: 2025 }}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'Vezi toate instituțiile' }),
    ).toBeInTheDocument()
  })

  it('uses a custom description when provided', () => {
    render(
      <ChallengeEntitySubordinatesSection
        locale="ro"
        items={sampleItems}
        totalResultsCount={2}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        normalizationOptions={normalizationOptions}
        description="Custom description text"
      />,
    )

    expect(screen.getByText('Custom description text')).toBeInTheDocument()
  })
})
