import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ParliamentStenogramDocumentSearch } from './parliament-stenogram-document-search'

function renderSearch(
  props: Partial<
    Parameters<typeof ParliamentStenogramDocumentSearch>[0]
  > = {},
) {
  const onStep = vi.fn()
  const onQueryChange = vi.fn()
  render(
    <ParliamentStenogramDocumentSearch
      query="sanatate"
      onQueryChange={onQueryChange}
      matchCount={3}
      currentMatch={0}
      onStep={onStep}
      {...props}
    />,
  )
  return { onStep, onQueryChange }
}

describe('in-document search — keyboard controls', () => {
  it('reports the hit position politely, 1-indexed for humans', () => {
    renderSearch({ currentMatch: 1, matchCount: 3 })
    const status = screen.getByText('2 din 3')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('Enter steps forward, Shift+Enter steps back', async () => {
    const { onStep } = renderSearch()
    const input = screen.getByRole('searchbox', {
      name: /Caută în textul acestei ședințe/,
    })

    await userEvent.type(input, '{Enter}')
    expect(onStep).toHaveBeenLastCalledWith(1)

    await userEvent.type(input, '{Shift>}{Enter}{/Shift}')
    expect(onStep).toHaveBeenLastCalledWith(-1)
  })

  it('Escape clears the query', async () => {
    const { onQueryChange } = renderSearch()
    await userEvent.type(
      screen.getByRole('searchbox', { name: /Caută în textul/ }),
      '{Escape}',
    )
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  it('the prev/next buttons step in both directions', async () => {
    const { onStep } = renderSearch()
    await userEvent.click(
      screen.getByRole('button', { name: 'Rezultatul următor' }),
    )
    expect(onStep).toHaveBeenLastCalledWith(1)
    await userEvent.click(
      screen.getByRole('button', { name: 'Rezultatul anterior' }),
    )
    expect(onStep).toHaveBeenLastCalledWith(-1)
  })

  it('disables stepping when there is nothing to step through', () => {
    renderSearch({ matchCount: 0 })
    expect(
      screen.getByRole('button', { name: 'Rezultatul următor' }),
    ).toBeDisabled()
    expect(screen.getByText(/Niciun rezultat în această ședință/)).toBeInTheDocument()
  })

  it('does not step on Enter when there are no hits', async () => {
    const { onStep } = renderSearch({ matchCount: 0 })
    await userEvent.type(
      screen.getByRole('searchbox', { name: /Caută în textul/ }),
      '{Enter}',
    )
    expect(onStep).not.toHaveBeenCalled()
  })

  it('asks for a longer query below the minimum length', () => {
    renderSearch({ query: 'a', matchCount: 0 })
    expect(screen.getByText(/Tastați cel puțin 2 litere/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Rezultatul următor' }),
    ).toBeDisabled()
  })
})
