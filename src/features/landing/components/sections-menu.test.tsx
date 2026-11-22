import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@/test/test-utils'
import { visibleGroups } from '@/features/landing/lib/landing-groups'
import { SectionsMenu } from './sections-menu'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, preload: _preload, ...props }: { readonly children: ReactNode; readonly to: string; readonly preload?: unknown }) => (
    <a href={to} {...props} onClickCapture={(event) => event.preventDefault()}>
      {children}
    </a>
  ),
}))

describe('SectionsMenu', () => {
  it('lists every visible section as a link, and closes when one is followed', async () => {
    const user = userEvent.setup()
    const groups = visibleGroups()
    render(<SectionsMenu groups={groups} />)

    const button = screen.getByRole('button', { name: /toate secțiunile|all sections/i })
    expect(screen.queryByRole('navigation')).toBeNull()

    await user.click(button)
    const list = within(screen.getByRole('navigation'))
    const links = list.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(groups.flatMap((group) => group.entries.map((entry) => entry.to)))

    await user.click(links[0])
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('closes on Escape, with the focus back on the button, and on a press outside', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SectionsMenu groups={visibleGroups()} />
        <p>Outside</p>
      </>,
    )
    const button = screen.getByRole('button', { name: /toate secțiunile|all sections/i })

    await user.click(button)
    await user.tab()
    expect(screen.getAllByRole('link')[0]).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(button).toHaveFocus()

    await user.click(button)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    await user.click(screen.getByText('Outside'))
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
