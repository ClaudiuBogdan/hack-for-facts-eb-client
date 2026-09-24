import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildCompanyProfileModel } from '../../lib/company-profile-model'
import { companyProfile, financialYear } from '../../lib/company-profile.fixture'
import { CompanyBalanceTrend } from './company-balance-trend'

// The page's language, pinned: the test environment activates English.
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  getUserLocale: () => 'ro',
}))

/**
 * The head's chart gives a year's three figures to a mouse that points at it
 * and to a finger that taps it — a tap opens the year and a second tap, or a
 * tap anywhere else, closes it.
 */

function trend() {
  const model = buildCompanyProfileModel(
    companyProfile({
      financials: [2021, 2022, 2023].map((year) => financialYear(year, { turnover: year * 1_000, netProfit: 100, employees: 5 })),
    }),
  )
  const view = render(
    <div>
      <CompanyBalanceTrend model={model} />
      <p>elsewhere</p>
    </div>,
  )
  // The pointer's targets: one column per year, over the drawing.
  const targets = view.container.querySelector('.z-10') as HTMLElement
  const year = (index: number) => targets.children[index] as HTMLElement
  const tooltip = () => view.container.querySelector('.bg-popover')
  return { view, year, tooltip }
}

const POINTER_EVENT = { pointerOver: 'pointerover', pointerDown: 'pointerdown', pointerCancel: 'pointercancel' } as const

/** A pointer event of a kind; jsdom has no PointerEvent, so the kind is set on the event itself. */
function pointer(type: keyof typeof POINTER_EVENT, target: Element, pointerType: 'mouse' | 'touch') {
  const event = new MouseEvent(POINTER_EVENT[type], { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  fireEvent(target, event)
}

describe('CompanyBalanceTrend', () => {
  it('opens a year on a tap and closes it on the next, although a touch also fires the hover', () => {
    const { year, tooltip } = trend()
    pointer('pointerOver', year(1), 'touch')
    pointer('pointerDown', year(1), 'touch')
    expect(tooltip()?.textContent).toContain('2022')
    pointer('pointerDown', year(1), 'touch')
    expect(tooltip()).toBeNull()
  })

  it('leaves no year open after a scroll that starts on the chart', () => {
    const { year, tooltip } = trend()
    pointer('pointerDown', year(1), 'touch')
    // The browser takes the gesture for a pan and cancels the pointer.
    pointer('pointerCancel', year(1), 'touch')
    expect(tooltip()).toBeNull()
  })

  it('closes a tapped year on a tap anywhere else', () => {
    const { view, year, tooltip } = trend()
    pointer('pointerDown', year(0), 'touch')
    expect(tooltip()?.textContent).toContain('2021')
    pointer('pointerDown', view.getByText('elsewhere'), 'touch')
    expect(tooltip()).toBeNull()
  })

  it('follows a mouse, and a click does not close what the mouse points at', () => {
    const { year, tooltip } = trend()
    pointer('pointerOver', year(2), 'mouse')
    expect(tooltip()?.textContent).toContain('2023')
    pointer('pointerDown', year(2), 'mouse')
    expect(tooltip()?.textContent).toContain('2023')
  })
})
