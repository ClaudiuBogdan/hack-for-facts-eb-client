import { useState } from 'react'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonRail, type ComparisonRailTerritory } from './comparison-rail'

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
      details={null}
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
        details={null}
        example={false}
      />,
    )
    expect(screen.getByRole('button', { name: /POP107D/ })).toBeInTheDocument()
  })
})
