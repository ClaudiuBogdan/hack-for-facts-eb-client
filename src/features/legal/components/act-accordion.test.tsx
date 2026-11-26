import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { ActAccordion, ActAccordionItem } from './act-accordion'

const row = (props: { readonly defaultOpen?: boolean } = {}) => (
  <ActAccordion label="Detalii despre acest act">
    <ActAccordionItem
      id="row-heading"
      title="Versiunile textului"
      meta="3 expresii"
      description="Ce anume putem afișa."
      footnote="O notă de subsol."
      {...props}
    >
      <p>Corpul rândului</p>
    </ActAccordionItem>
  </ActAccordion>
)

describe('ActAccordionItem', () => {
  it('titles each row with an h3, under the page h2 "Fișa actului"', () => {
    render(row())
    const heading = screen.getByRole('heading', { level: 3, name: /Versiunile textului/ })
    expect(heading).toHaveAttribute('id', 'row-heading')
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    // The row is a section labelled by its heading.
    expect(screen.getByRole('region', { name: /Versiunile textului/ })).toBeInTheDocument()
  })

  it('shows the count right after the title, inside the head, in the muted colour', () => {
    render(row())
    const head = screen.getByRole('button', { name: /Versiunile textului/ })
    const count = screen.getByText('3 expresii')
    expect(head).toContainElement(count)
    expect(count).toHaveClass('tabular-nums', 'text-muted-foreground')
    // Title, then the count, then the description line under them.
    // A space between the title and the count, so the name never runs them together.
    expect(head.textContent).toBe('Versiunile textului 3 expresiiCe anume putem afișa.')
    expect(head).toHaveAccessibleName(/^Versiunile textului 3 expresii/)
  })

  it('keeps a closed row without a body until it is opened, and drops it again when closed', () => {
    render(row())
    const head = screen.getByRole('button', { name: /Versiunile textului/ })
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(head).toHaveAttribute('aria-controls', 'row-heading-panel')
    expect(screen.queryByText('Corpul rândului')).not.toBeInTheDocument()
    expect(screen.queryByText('O notă de subsol.')).not.toBeInTheDocument()

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById('row-heading-panel')
    expect(panel).toContainElement(screen.getByText('Corpul rândului'))
    expect(panel).toContainElement(screen.getByText('O notă de subsol.'))

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Corpul rândului')).not.toBeInTheDocument()
    expect(document.getElementById('row-heading-panel')).toBeNull()
  })

  it('opens a defaultOpen row at the first render, and closing it drops its body', () => {
    render(row({ defaultOpen: true }))
    const head = screen.getByRole('button', { name: /Versiunile textului/ })
    expect(head).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Corpul rândului')).toBeInTheDocument()

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Corpul rândului')).not.toBeInTheDocument()

    fireEvent.click(head)
    expect(screen.getByText('Corpul rândului')).toBeInTheDocument()
  })

  it('renders a defaultOpen row open on the server too, and a closed one without its body', () => {
    const open = renderToString(row({ defaultOpen: true }))
    expect(open).toContain('aria-expanded="true"')
    expect(open).toContain('id="row-heading-panel"')
    expect(open).toContain('Corpul rândului')

    const closed = renderToString(row())
    expect(closed).toContain('aria-expanded="false"')
    expect(closed).not.toContain('Corpul rândului')
  })

  it('draws no frame for the group and no colour outside the site tokens', () => {
    const { container } = render(row({ defaultOpen: true }))
    const group = screen.getByRole('group', { name: 'Detalii despre acest act' })
    expect(group.className).toBe('')
    expect(container.innerHTML).not.toMatch(/pnrr|rounded-none|shadow/)
    // Each row opens with a hairline.
    expect(screen.getByRole('region', { name: /Versiunile textului/ })).toHaveClass('border-t')
  })
})
