import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Accordion } from '@/components/ui/accordion'
import GroupedChapterAccordion from './GroupedChapterAccordion'

const classificationInfoLinkMock = vi.fn()
const groupedSubchapterAccordionMock = vi.fn()

vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: (props: any) => {
    classificationInfoLinkMock(props)
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`info-${props.type}-${props.code ?? 'unknown'}`}
        data-testid={`classification-${props.type}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') {
            return
          }

          event.preventDefault()
          event.stopPropagation()
        }}
      >
        Info
      </div>
    )
  },
}))

vi.mock('./GroupedFunctionalAccordion', () => ({
  default: () => <div data-testid="grouped-functional-row" />,
}))

vi.mock('./GroupedSubchapterAccordion', () => ({
  default: (props: any) => {
    groupedSubchapterAccordionMock(props)
    return <div data-testid="grouped-subchapter-row" />
  },
}))

describe('GroupedChapterAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the economic classification link for top-level chapters in economic mode', () => {
    const onAnalyticsRequest = vi.fn()
    const onCopyPromptRequest = vi.fn()

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
          onAnalyticsRequest={onAnalyticsRequest}
          onCopyPromptRequest={onCopyPromptRequest}
        />
      </Accordion>,
    )

    const infoLinkProps = classificationInfoLinkMock.mock.calls[0]?.[0]

    expect(infoLinkProps).toEqual(
      expect.objectContaining({
        type: 'economic',
        code: '20',
        className:
          'hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100',
        showOnHoverOnly: false,
      }),
    )
    expect(infoLinkProps?.menuActions).toHaveLength(2)

    infoLinkProps?.menuActions?.[0]?.onSelect()
    infoLinkProps?.menuActions?.[1]?.onSelect()

    expect(onAnalyticsRequest).toHaveBeenCalledWith({
      subjectLabel: 'Bunuri și servicii',
      path: [{ type: 'ec', code: '20' }],
    })
    expect(onCopyPromptRequest).toHaveBeenCalledWith({
      subjectLabel: 'Bunuri și servicii',
      path: [{ type: 'ec', code: '20' }],
      displayedItem: { type: 'ec', code: '20' },
    })
  })

  it('forwards copy prompt handlers to nested subchapter rows', () => {
    const onCopyPromptRequest = vi.fn()

    render(
      <Accordion type="multiple" value={['20']}>
        <GroupedChapterAccordion
          ch={{
            prefix: '20',
            description: 'Bunuri și servicii',
            totalAmount: 120,
            functionals: [],
            subchapters: [
              {
                code: '20.01',
                name: 'Bunuri',
                totalAmount: 120,
                functionals: [],
              },
            ],
          }}
          baseTotal={120}
          searchTerm=""
          codePrefixForSubchapters="ec"
          onCopyPromptRequest={onCopyPromptRequest}
        />
      </Accordion>,
    )

    expect(groupedSubchapterAccordionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        onCopyPromptRequest,
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

  it('does not expand the chapter when the info trigger is clicked', () => {
    render(
      <Accordion type="multiple">
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

    const chapterTrigger = screen.getByRole('button', {
      name: /Bunuri și servicii/i,
    })

    expect(chapterTrigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByLabelText('info-economic-20'))

    expect(chapterTrigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('expands the chapter when the chapter trigger is clicked directly', () => {
    render(
      <Accordion type="multiple">
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

    const chapterTrigger = screen.getByRole('button', {
      name: /Bunuri și servicii/i,
    })

    fireEvent.click(chapterTrigger)

    expect(chapterTrigger).toHaveAttribute('aria-expanded', 'true')
  })
})
