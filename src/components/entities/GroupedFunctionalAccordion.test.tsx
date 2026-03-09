import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GroupedFunctionalAccordion from './GroupedFunctionalAccordion'

const classificationInfoLinkMock = vi.fn()

vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: (props: any) => {
    classificationInfoLinkMock(props)
    return <span data-testid={`classification-${props.type}`} />
  },
}))

describe('GroupedFunctionalAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides codes on mobile and keeps the value on the same row for leaf rows', () => {
    render(
      <GroupedFunctionalAccordion
        func={{
          code: '84.03.03',
          name: 'Străzi',
          totalAmount: 79_190_000,
          economics: [],
        }}
        baseTotal={100_000_000}
        searchTerm=""
      />,
    )

    const codeLabel = screen.getByText('fn:84.03.03')
    const labelRow = codeLabel.parentElement
    const rowContent = labelRow?.parentElement?.parentElement
    const valueBlock = rowContent?.lastElementChild

    expect(codeLabel).toHaveClass('hidden', 'md:inline')
    expect(rowContent).toHaveClass(
      'grid-cols-[minmax(0,1fr)_auto]',
    )
    expect(valueBlock).not.toHaveClass('w-full')
    expect(classificationInfoLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'functional',
        code: '84.03.03',
        className:
          'hidden md:inline-flex md:opacity-0 md:group-hover:opacity-100',
        showOnHoverOnly: false,
      }),
    )
  })

  it('keeps the functional code and applies the deepest economic child code for analytics', () => {
    const onAnalyticsRequest = vi.fn()
    const onCopyPromptRequest = vi.fn()

    render(
      <GroupedFunctionalAccordion
        func={{
          code: '65.02',
          name: 'Învățământ',
          totalAmount: 79_190_000,
          economics: [
            {
              code: '10.01',
              name: 'Cheltuieli de personal',
              amount: 52_000_000,
            },
          ],
        }}
        baseTotal={100_000_000}
        searchTerm=""
        onAnalyticsRequest={onAnalyticsRequest}
        onCopyPromptRequest={onCopyPromptRequest}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Învățământ/i }),
    )

    const economicInfoLinkProps = classificationInfoLinkMock.mock.calls
      .map(([props]) => props)
      .find((props) => props.code === '10.01')

    expect(economicInfoLinkProps?.menuActions).toHaveLength(2)

    economicInfoLinkProps?.menuActions?.[0]?.onSelect()
    economicInfoLinkProps?.menuActions?.[1]?.onSelect()

    expect(onAnalyticsRequest).toHaveBeenCalledWith({
      subjectLabel: 'Cheltuieli de personal',
      path: [
        { type: 'fn', code: '65.02' },
        { type: 'ec', code: '10.01' },
      ],
    })
    expect(onCopyPromptRequest).toHaveBeenCalledWith({
      subjectLabel: 'Cheltuieli de personal',
      path: [
        { type: 'fn', code: '65.02' },
        { type: 'ec', code: '10.01' },
      ],
      displayedItem: { type: 'ec', code: '10.01' },
    })
  })
})
