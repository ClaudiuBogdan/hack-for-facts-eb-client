import {
  render as renderShared,
  screen,
  fireEvent,
  waitFor,
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { LegalCitationLookup } from './legal-citation-lookup'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

describe('LegalCitationLookup', () => {
  it('surfaces alias ambiguity as a candidate list, never a silent pick', async () => {
    render(<LegalCitationLookup />)

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'codul fiscal' },
    })

    // Both fixture candidates render; the user chooses.
    const options = await screen.findAllByRole('option', {}, { timeout: 5000 })
    expect(options).toHaveLength(2)
    expect(screen.getByText(/2 potriviri — alege actul exact/)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()

    fireEvent.click(options[1] as HTMLElement)
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/legislation/acts/$actId',
      params: { actId: '187041' },
    })
  })

  it('answers zero hits with a format hint', async () => {
    render(<LegalCitationLookup />)

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'ceva inexistent' },
    })

    await waitFor(
      () => {
        expect(
          screen.getByText(/încearcă numărul și anul \(ex. 227\/2015\)/),
        ).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
  })
})
