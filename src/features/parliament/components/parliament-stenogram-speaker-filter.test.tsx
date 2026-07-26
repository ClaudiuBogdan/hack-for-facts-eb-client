import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StyledMultiSelectOption } from '@/components/ui/styled-multi-select'
import type { StenogramSpeakerFacet } from '../lib/stenogram-speaker-filter'

/**
 * The shared multi-select is replaced by a plain list of toggles.
 *
 * What is under test here is the READER's contract — which options it offers,
 * what it says about the subset, and how it hands a selection back — not the
 * shared control's dropdown, virtualiser and Radix popper, which own their own
 * tests and need a layout engine jsdom does not have.
 */
const multiSelectProps = vi.fn()
vi.mock('@/components/ui/styled-multi-select', () => ({
  StyledMultiSelect: (props: {
    options: readonly StyledMultiSelectOption[]
    selected: readonly string[]
    onChange: (values: string[]) => void
    placeholder: string
  }) => {
    multiSelectProps(props)
    return (
      <div data-testid="speaker-select" data-placeholder={props.placeholder}>
        {props.options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={props.selected.includes(option.value)}
            onClick={() =>
              props.onChange(
                props.selected.includes(option.value)
                  ? props.selected.filter((value) => value !== option.value)
                  : [...props.selected, option.value],
              )
            }
          >
            {option.label} · {option.description}
          </button>
        ))}
      </div>
    )
  },
}))

const { ParliamentStenogramSpeakerFilter } = await import(
  './parliament-stenogram-speaker-filter'
)

const FACETS: StenogramSpeakerFacet[] = [
  { speakerName: 'Ion Popescu', interventionCount: 2 },
  { speakerName: 'Maria Ionescu', interventionCount: 1 },
]

const onChange = vi.fn()

function renderFilter(
  overrides: Partial<Parameters<typeof ParliamentStenogramSpeakerFilter>[0]> = {},
) {
  return render(
    <ParliamentStenogramSpeakerFilter
      facets={FACETS}
      selected={[]}
      onChange={onChange}
      {...overrides}
    />,
  )
}

beforeEach(() => {
  onChange.mockClear()
  multiSelectProps.mockClear()
})

describe('the speaker options', () => {
  it('offers each printed speaker, with the count as its description', () => {
    renderFilter()
    expect(multiSelectProps.mock.calls[0]?.[0].options).toEqual([
      {
        value: 'Ion Popescu',
        label: 'Ion Popescu',
        description: '2 luări de cuvânt',
      },
      {
        value: 'Maria Ionescu',
        label: 'Maria Ionescu',
        description: '1 luare de cuvânt',
      },
    ])
  })

  it('uses the PRINTED name as both label and selection value', () => {
    renderFilter({
      facets: [{ speakerName: 'Invitat Guvern', interventionCount: 4 }],
    })
    const [option] = multiSelectProps.mock.calls[0]![0].options
    expect(option.value).toBe('Invitat Guvern')
    expect(option.label).toBe('Invitat Guvern')
  })

  it('says the reading is complete while nothing is selected', () => {
    renderFilter()
    expect(
      screen.getByText('Se afișează stenograma integrală a ședinței.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Extras filtrat/)).toBeNull()
    expect(screen.getByTestId('speaker-select')).toHaveAttribute(
      'data-placeholder',
      'Toți vorbitorii — stenograma integrală',
    )
  })

  it('renders nothing at all when the capture printed no speaker names', () => {
    const { container } = renderFilter({ facets: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('hands the selection back through onChange', async () => {
    renderFilter()
    await userEvent.click(screen.getByRole('button', { name: /Ion Popescu/ }))
    expect(onChange).toHaveBeenCalledWith(['Ion Popescu'])
  })
})

describe('the toolbar is a control, not a caveat', () => {
  const filtered = () => renderFilter({ selected: ['Ion Popescu'] })

  it('states nothing about the excerpt — that lives in the left lane', () => {
    // The counts, the omitted context and the way back all belong to
    // `ParliamentStenogramFilterNotice`, which the reader keeps sticky beside
    // the excerpt. Restating them here would put the same claim in two places
    // with two different lifetimes on screen.
    filtered()
    expect(screen.queryByText(/Extras filtrat/)).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('offers no second restore-full button next to the selection', () => {
    // One clear/restore action, in the notice. Two identically labelled
    // buttons are two ways to press the same thing.
    filtered()
    expect(
      screen.queryByRole('button', { name: 'Arată stenograma integrală' }),
    ).toBeNull()
  })

  it('drops the "complete reading" line once a selection exists', () => {
    filtered()
    expect(
      screen.queryByText('Se afișează stenograma integrală a ședinței.'),
    ).toBeNull()
  })

  it('is a screen affordance and never prints', () => {
    filtered()
    expect(screen.getByRole('group').className).toContain('print:hidden')
  })

  it('still hands a de-selection back through onChange', async () => {
    filtered()
    await userEvent.click(screen.getByRole('button', { name: /Ion Popescu/ }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
