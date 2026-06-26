import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { CopyButton } from './copy-button'

describe('CopyButton', () => {
  it('exposes an accessible name and announces success', async () => {
    const user = userEvent.setup()
    const onCopy = vi.fn().mockResolvedValue(undefined)

    render(
      <CopyButton
        onCopy={onCopy}
        ariaLabel="Copiază ID"
        copiedLabel="ID copiat"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Copiază ID' }))

    await waitFor(() => {
      expect(onCopy).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByRole('status')).toHaveTextContent('ID copiat')
    expect(screen.getByRole('button', { name: 'ID copiat' })).toBeInTheDocument()
  })

  it('announces copy failures', async () => {
    const user = userEvent.setup()

    render(
      <CopyButton
        onCopy={() => Promise.reject(new Error('denied'))}
        ariaLabel="Copiază ID"
        errorLabel="Copiere eșuată"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Copiază ID' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Copiere eșuată')
    })
  })
})
