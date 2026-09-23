import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import { DetailDefinition } from './detail-definition'

const SHORT = 'Populația după domiciliu la 1 ianuarie.'
// SOM101F's real definition runs past 3,000 characters of unbroken legalese.
const LONG = `Incepand cu 1 martie 2002 a intrat in vigoare Legea nr. 76/2002. ${'Somer inregistrat este persoana care indeplineste cumulativ urmatoarele conditii. '.repeat(6)}`

/**
 * jsdom lays nothing out, so both heights read 0 and the component would
 * always conclude „nothing is hidden". These stub the one measurement it
 * makes: a clamped paragraph taller than the three lines it shows.
 */
function stubLayout(scrollHeight: number, clientHeight: number) {
  for (const [name, value] of [
    ['scrollHeight', scrollHeight],
    ['clientHeight', clientHeight],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      value,
    })
  }
}

afterEach(() => {
  for (const name of ['scrollHeight', 'clientHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      value: 0,
    })
  }
})

describe('DetailDefinition', () => {
  it('offers no control when three lines already show the whole definition', () => {
    stubLayout(48, 48)
    render(<DetailDefinition text={SHORT} />)
    expect(screen.getByText(SHORT)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('clamps a definition that overflows three lines and opens it on request', async () => {
    stubLayout(420, 60)
    render(<DetailDefinition text={LONG} />)
    const paragraph = screen.getByText(/Incepand cu 1 martie 2002/).closest('p')!
    // The clamp is visual: the whole text stays in the DOM for search, copy
    // and assistive tech.
    expect(paragraph).toHaveClass('line-clamp-3')

    const toggle = screen.getByRole('button', {
      name: /Citește definiția completă/,
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', paragraph.id)

    await userEvent.click(toggle)
    expect(paragraph).not.toHaveClass('line-clamp-3')
    // Opened, the text scrolls inside its own box rather than pushing the
    // whole page — and that box is reachable by keyboard.
    expect(paragraph.parentElement).toHaveClass('overflow-y-auto')
    expect(paragraph.parentElement).toHaveAttribute('tabindex', '0')
    expect(
      screen.getByRole('button', { name: /Arată mai puțin/ }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders a published anchor as a link and drops any other markup', () => {
    // CON113A's definition points at the ESA regulation on EUR-Lex; TEMPO
    // ships it as an <a>, which used to print as text.
    stubLayout(48, 48)
    render(
      <DetailDefinition text={'Vezi <a href="https://eur-lex.europa.eu/x" target="_blank">regulamentul</a> și <b>atât</b>.'} />,
    )
    expect(screen.getByRole('link', { name: 'regulamentul' })).toHaveAttribute(
      'href',
      'https://eur-lex.europa.eu/x',
    )
    expect(screen.queryByText(/<b>/)).not.toBeInTheDocument()
    expect(screen.getByText(/atât/)).toBeInTheDocument()
  })
})
