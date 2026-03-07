import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GroupedSubchapterAccordion from './GroupedSubchapterAccordion'

const classificationInfoLinkMock = vi.fn()

vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: (props: any) => {
    classificationInfoLinkMock(props)
    return <span data-testid={`classification-${props.type}`} />
  },
}))

describe('GroupedSubchapterAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides codes on mobile and keeps the value on the same row for accordion rows', () => {
    render(
      <GroupedSubchapterAccordion
        sub={{
          code: '71.01',
          name: 'Locuințe, servicii și dezvoltare publică',
          totalAmount: 72_355_864.29,
          functionals: [
            {
              code: '71.01.30',
              name: 'Alte servicii',
              totalAmount: 35_000_000,
              economics: [],
            },
            {
              code: '71.01.50',
              name: 'Dezvoltare publică',
              totalAmount: 37_355_864.29,
              economics: [],
            },
          ],
        }}
        baseTotal={100_000_000}
        searchTerm=""
        codePrefix="ec"
      />,
    )

    const codeLabel = screen.getByText('ec:71.01')
    const labelRow = codeLabel.parentElement
    const gridContainer = labelRow?.parentElement?.parentElement
    const valueBlock = gridContainer?.lastElementChild

    expect(codeLabel).toHaveClass('hidden', 'md:inline')
    expect(gridContainer).toHaveClass(
      'grid-cols-[minmax(0,1fr)_auto]',
    )
    expect(valueBlock).not.toHaveClass('w-full')
    expect(classificationInfoLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'economic',
        code: '71.01',
        className:
          'hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100',
        showOnHoverOnly: false,
      }),
    )
  })
})
