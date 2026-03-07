import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Accordion } from '@/components/ui/accordion'
import GroupedChapterAccordion from './GroupedChapterAccordion'

const classificationInfoLinkMock = vi.fn()

vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: (props: any) => {
    classificationInfoLinkMock(props)
    return <span data-testid={`classification-${props.type}`} />
  },
}))

vi.mock('./GroupedFunctionalAccordion', () => ({
  default: () => <div data-testid="grouped-functional-row" />,
}))

vi.mock('./GroupedSubchapterAccordion', () => ({
  default: () => <div data-testid="grouped-subchapter-row" />,
}))

describe('GroupedChapterAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the economic classification link for top-level chapters in economic mode', () => {
    render(
      <Accordion type="multiple" value={['20']}>
        <GroupedChapterAccordion
          ch={{
            prefix: '20',
            description: 'Bunuri și servicii',
            totalAmount: 120,
            functionals: [],
            subchapters: [],
          }}
          baseTotal={120}
          searchTerm=""
          codePrefixForSubchapters="ec"
        />
      </Accordion>,
    )

    expect(classificationInfoLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'economic',
        code: '20',
        className:
          'hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100',
        showOnHoverOnly: false,
      }),
    )
  })

  it('keeps chapter text and value on the same row on mobile', () => {
    render(
      <Accordion type="multiple" value={['20']}>
        <GroupedChapterAccordion
          ch={{
            prefix: '20',
            description: 'Bunuri și servicii',
            totalAmount: 120,
            functionals: [],
            subchapters: [],
          }}
          baseTotal={120}
          searchTerm=""
        />
      </Accordion>,
    )

    const labelRow = screen.getByText('Bunuri și servicii').closest('div')
    const gridContainer = labelRow?.parentElement?.parentElement
    const valueBlock = gridContainer?.lastElementChild

    expect(gridContainer).toHaveClass(
      'grid-cols-[minmax(0,1fr)_auto]',
    )
    expect(valueBlock).not.toHaveClass('w-full')
  })
})
