import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ParliamentStenogramFilterNotice } from './parliament-stenogram-filter-notice'

const onClear = vi.fn()

function renderNotice(
  overrides: Partial<
    Parameters<typeof ParliamentStenogramFilterNotice>[0]
  > = {},
) {
  return render(
    <ParliamentStenogramFilterNotice
      selected={['Ion Popescu']}
      visibleCount={2}
      totalCount={7}
      onClear={onClear}
      {...overrides}
    />,
  )
}

beforeEach(() => {
  onClear.mockClear()
})

describe('the excerpt is stated, counted and reversible', () => {
  it('says plainly that this is an EXCERPT, not the record', () => {
    renderNotice()
    expect(
      screen.getByText('Extras filtrat — nu este stenograma integrală.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Ordinea de zi, intervențiile celorlalți vorbitori/),
    ).toBeInTheDocument()
  })

  it('counts what is shown AGAINST the whole sitting, and names the speakers', () => {
    renderNotice()
    expect(
      screen.getByText(
        /Se afișează 2 din 7 luări de cuvânt ale ședinței, doar de la: Ion Popescu\./,
      ),
    ).toBeInTheDocument()
  })

  it('names every selected speaker, not just the first', () => {
    renderNotice({ selected: ['Ion Popescu', 'Maria Ionescu'], visibleCount: 3 })
    const names = screen.getByText(
      /doar de la: Ion Popescu · Maria Ionescu\./,
    )
    expect(names).toBeInTheDocument()
    expect(names.className).toContain('line-clamp-4')
    expect(names.className).toContain('print:line-clamp-none')
  })

  it('announces the filtered state to assistive tech', () => {
    renderNotice()
    expect(screen.getByRole('status').textContent).toContain('Extras filtrat')
  })

  it('carries the claim onto PAPER, while its button stays on screen', () => {
    // Printing an excerpt must print the sentence that says it is one — but a
    // button is not part of a document.
    renderNotice()
    expect(screen.getByRole('status').className).not.toContain('print:hidden')
    expect(
      screen.getByRole('button', { name: 'Arată stenograma integrală' })
        .className,
    ).toContain('print:hidden')
  })

  it('offers ONE click back to the whole sitting', async () => {
    renderNotice()
    await userEvent.click(
      screen.getByRole('button', { name: 'Arată stenograma integrală' }),
    )
    expect(onClear).toHaveBeenCalledWith()
  })

  it('holds a SINGLE restore-full action, never a pair', () => {
    renderNotice({ linkedOutsideExcerpt: true })
    expect(
      screen.getAllByRole('button', { name: 'Arată stenograma integrală' }),
    ).toHaveLength(1)
  })
})

describe('a deep link the selection hides', () => {
  it('says the linked contribution is outside the excerpt, in the same card', () => {
    // Same card, same status region, same one way back: a separate notice with
    // its own identical button would be the duplicate this consolidates.
    renderNotice({ linkedOutsideExcerpt: true })
    expect(
      screen.getByRole('status').textContent,
    ).toContain('Intervenția din link nu aparține vorbitorilor selectați')
  })

  it('says nothing about a link when there is no conflict', () => {
    renderNotice()
    expect(
      screen.queryByText(/Intervenția din link nu aparține/),
    ).toBeNull()
  })
})
