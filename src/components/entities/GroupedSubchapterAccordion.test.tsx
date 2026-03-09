import { fireEvent, render, screen } from '@testing-library/react'
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

  it('preserves the parent economic code when analytics targets a nested functional row', () => {
    const onAnalyticsRequest = vi.fn()
    const onCopyPromptRequest = vi.fn()

    render(
      <GroupedSubchapterAccordion
        sub={{
          code: '10.01',
          name: 'Cheltuieli de personal',
          totalAmount: 72_355_864.29,
          functionals: [
            {
              code: '65.02',
              name: 'Învățământ',
              totalAmount: 35_000_000,
              economics: [],
            },
            {
              code: '67.02',
              name: 'Cultură',
              totalAmount: 37_355_864.29,
              economics: [],
            },
          ],
        }}
        baseTotal={100_000_000}
        searchTerm=""
        codePrefix="ec"
        onAnalyticsRequest={onAnalyticsRequest}
        onCopyPromptRequest={onCopyPromptRequest}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Cheltuieli de personal/i }),
    )

    const functionalInfoLinkProps = classificationInfoLinkMock.mock.calls
      .map(([props]) => props)
      .find((props) => props.code === '65.02')

    expect(functionalInfoLinkProps?.menuActions).toHaveLength(2)

    functionalInfoLinkProps?.menuActions?.[0]?.onSelect()
    functionalInfoLinkProps?.menuActions?.[1]?.onSelect()

    expect(onAnalyticsRequest).toHaveBeenCalledWith({
      subjectLabel: 'Învățământ',
      path: [
        { type: 'ec', code: '10.01' },
        { type: 'fn', code: '65.02' },
      ],
    })
    expect(onCopyPromptRequest).toHaveBeenCalledWith({
      subjectLabel: 'Învățământ',
      path: [
        { type: 'ec', code: '10.01' },
        { type: 'fn', code: '65.02' },
      ],
      displayedItem: { type: 'fn', code: '65.02' },
    })
  })

  it('keeps the economic paragraph label paired with the economic code in collapsed rows', () => {
    const onAnalyticsRequest = vi.fn()
    const onCopyPromptRequest = vi.fn()

    render(
      <GroupedSubchapterAccordion
        sub={{
          code: '10.01.01',
          name: 'Salarii de bază',
          totalAmount: 52_000_000,
          functionals: [
            {
              code: '65.02.00',
              name: 'Învățământ',
              totalAmount: 52_000_000,
              economics: [],
            },
          ],
        }}
        baseTotal={100_000_000}
        searchTerm=""
        codePrefix="ec"
        onAnalyticsRequest={onAnalyticsRequest}
        onCopyPromptRequest={onCopyPromptRequest}
      />,
    )

    expect(screen.getByText('ec:10.01.01')).toBeInTheDocument()
    expect(screen.queryByText('ec:65.02.00')).not.toBeInTheDocument()

    const collapsedInfoLinkProps = classificationInfoLinkMock.mock.calls
      .map(([props]) => props)
      .find((props) => props.code === '10.01.01')

    expect(collapsedInfoLinkProps?.menuActions).toHaveLength(2)
    expect(collapsedInfoLinkProps?.type).toBe('economic')

    collapsedInfoLinkProps?.menuActions?.[0]?.onSelect()
    collapsedInfoLinkProps?.menuActions?.[1]?.onSelect()

    expect(onAnalyticsRequest).toHaveBeenCalledWith({
      subjectLabel: 'Salarii de bază',
      path: [
        { type: 'ec', code: '10.01.01' },
        { type: 'fn', code: '65.02' },
      ],
    })
    expect(onCopyPromptRequest).toHaveBeenCalledWith({
      subjectLabel: 'Salarii de bază',
      path: [
        { type: 'ec', code: '10.01.01' },
        { type: 'fn', code: '65.02' },
      ],
      displayedItem: { type: 'ec', code: '10.01.01' },
    })
  })
})
