import { useState } from 'react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { act, fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { Tags } from 'lucide-react'
import { ComparisonRail, type ComparisonRailAxis, type ComparisonRailTerritory } from './comparison-rail'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
}))

const THREE: readonly ComparisonRailTerritory[] = [
  { token: 'siruta:54975', name: 'Cluj-Napoca', kind: 'municipiu', color: 'red' },
  { token: 'cod:CJ', name: 'Cluj', kind: 'județ', color: 'green' },
  { token: 'cod:RO', name: 'România', kind: 'țară', color: 'blue' },
]

/**
 * A parent that removes the territory the way the router does: after the
 * click handler has returned, once the new address is committed — never in
 * the same render as the click.
 */
function Harness({ initial }: { readonly initial: readonly ComparisonRailTerritory[] }) {
  const [territories, setTerritories] = useState(initial)
  return (
    <ComparisonRail
      indicator={{ code: 'POP107D', name: 'Populația', meta: null }}
      onSelectIndicator={() => {}}
      territories={territories}
      suggestions={[]}
      localities
      onAdd={() => {}}
      onRemove={(token) => {
        setTimeout(() => setTerritories((list) => list.filter((entry) => entry.token !== token)), 0)
      }}
      axes={[]}
      pinCount={0}
      onReset={() => {}}
      example={false}
    />
  )
}

async function removeAndSettle(name: RegExp) {
  const button = screen.getByRole('button', { name })
  button.focus()
  await act(async () => {
    fireEvent.click(button)
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
  expect(screen.queryByRole('button', { name })).toBeNull()
}

describe('ComparisonRail', () => {
  it('keeps the keyboard on the next territory when one is removed, after the address lands', async () => {
    render(<Harness initial={THREE} />)
    await removeAndSettle(/Scoate Cluj din/)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Scoate România din/ }))
  })

  it('moves to the previous territory when the last one is removed', async () => {
    render(<Harness initial={THREE} />)
    await removeAndSettle(/Scoate România din/)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Scoate Cluj din/ }))
  })

  it('lands on „Adaugă un teritoriu" when the only territory leaves', async () => {
    render(<Harness initial={THREE.slice(0, 1)} />)
    await removeAndSettle(/Scoate Cluj-Napoca din/)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Adaugă un teritoriu/ }))
  })

  it('prints the code the address names while the indicator’s name loads', () => {
    render(
      <ComparisonRail
        indicator={{ code: 'POP107D', name: null, meta: null }}
        onSelectIndicator={() => {}}
        territories={[]}
        suggestions={[]}
        localities
        onAdd={() => {}}
        onRemove={() => {}}
        axes={[]}
        pinCount={0}
        onReset={() => {}}
        example={false}
      />,
    )
    expect(screen.getByRole('button', { name: /POP107D/ })).toBeInTheDocument()
  })

  describe('the panel', () => {
    const axis = (overrides: Partial<ComparisonRailAxis> = {}): ComparisonRailAxis => ({
      id: 'clasificare-D0',
      icon: Tags,
      label: 'Sexe',
      value: 'Total',
      implicit: true,
      unresolved: false,
      control: (onPicked) => (
        <button type="button" onClick={onPicked}>
          Alege Feminin
        </button>
      ),
      ...overrides,
    })
    const rail = (props: {
      readonly axes: readonly ComparisonRailAxis[]
      readonly pinCount?: number
      readonly onReset?: () => void
      readonly onAdd?: (token: string) => void
    }) => (
      <ComparisonRail
        indicator={{ code: 'POP107D', name: 'Populația', meta: 'POP107D' }}
        onSelectIndicator={() => {}}
        territories={THREE}
        suggestions={[{ token: 'cod:AB', label: 'Alba', kind: 'județ' }]}
        localities
        onAdd={props.onAdd ?? (() => {})}
        onRemove={() => {}}
        axes={props.axes}
        pinCount={props.pinCount ?? 0}
        onReset={props.onReset ?? (() => {})}
        example={false}
      />
    )

    it('opens an axis in place, and a pick closes it with the focus back on its trigger', async () => {
      render(rail({ axes: [axis()] }))
      const trigger = screen.getByRole('button', { name: /Sexe/ })
      expect(screen.queryByRole('button', { name: 'Alege Feminin' })).toBeNull()
      await userEvent.click(trigger)
      await userEvent.click(screen.getByRole('button', { name: 'Alege Feminin' }))
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
    })

    it('stands open on an axis the comparison is waiting on', () => {
      render(rail({ axes: [axis({ value: 'alege', implicit: false, unresolved: true })] }))
      expect(screen.getByRole('button', { name: /Sexe/ })).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('button', { name: 'Alege Feminin' })).toBeInTheDocument()
    })

    it('keeps the territories on screen as the legend, whatever is open', async () => {
      render(rail({ axes: [axis()] }))
      await userEvent.click(screen.getByRole('button', { name: /Sexe/ }))
      expect(screen.getByRole('list', { name: 'Teritorii comparate' })).toBeInTheDocument()
    })

    it('adds a territory from the section it opened, keeping the focus on „Adaugă un teritoriu"', async () => {
      const onAdd = vi.fn()
      render(rail({ axes: [], onAdd }))
      const add = screen.getByRole('button', { name: /Adaugă un teritoriu/ })
      await userEvent.click(add)
      await userEvent.click(screen.getByRole('button', { name: /Alba/ }))
      expect(onAdd).toHaveBeenCalledWith('cod:AB')
      expect(add).toHaveAttribute('aria-expanded', 'false')
      expect(add).toHaveFocus()
    })

    it('resets the pinned axes and moves the focus to the indicator', async () => {
      const onReset = vi.fn()
      render(rail({ axes: [axis({ implicit: false })], pinCount: 1, onReset }))
      await userEvent.click(screen.getByRole('button', { name: 'Resetează (1)' }))
      expect(onReset).toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /Indicator/ })).toHaveFocus()
    })
  })
})
