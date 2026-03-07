import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ClassificationInfoLink } from './classification-info-link'

vi.mock('@/components/classification-explorer/ClassificationDescription', () => ({
  ClassificationDescription: () => <div>Classification description</div>,
}))

describe('ClassificationInfoLink', () => {
  it('lets responsive hidden classes override the base display class', () => {
    render(
      <ClassificationInfoLink
        type="functional"
        code="84.03.03"
        showOnHoverOnly={false}
        className="hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100"
      />,
    )

    const trigger = screen.getByRole('button')

    expect(trigger).toHaveClass(
      'hidden',
      'md:inline-flex',
      'md:opacity-0',
      'md:group-hover:opacity-100',
    )
    expect(trigger).not.toHaveClass('inline-flex')
  })
})
