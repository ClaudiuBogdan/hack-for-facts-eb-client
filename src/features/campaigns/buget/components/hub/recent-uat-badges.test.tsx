import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecentUatBadges } from './recent-uat-badges'

const useRecentEntitiesMock = vi.fn()

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { readonly children: React.ReactNode }) => <div>{children}</div>,
  },
}))

vi.mock('@/hooks/useRecentEntities', () => ({
  useRecentEntities: () => useRecentEntitiesMock(),
}))

describe('RecentUatBadges', () => {
  beforeEach(() => {
    localStorage.clear()
    useRecentEntitiesMock.mockReset()
    useRecentEntitiesMock.mockReturnValue({
      recentEntities: [],
    })
  })

  it('keeps the most recently selected suggested UAT first when still available', () => {
    const handleSelect = vi.fn()
    const { unmount } = render(
      <RecentUatBadges locale="ro" onSelect={handleSelect} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Mun\. Cluj-Napoca/i }))

    expect(handleSelect).toHaveBeenCalledWith('4305857')

    unmount()

    render(<RecentUatBadges locale="ro" onSelect={vi.fn()} />)

    const suggestionButtons = screen.getAllByRole('button')

    expect(suggestionButtons[0]).toHaveTextContent('Mun. Cluj-Napoca')
  })
})
