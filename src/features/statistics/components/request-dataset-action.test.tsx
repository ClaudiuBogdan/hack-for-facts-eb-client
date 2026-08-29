import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitDatasetRequest } from '../api/statistics-api'
import { RequestDatasetAction } from './request-dataset-action'

vi.mock('../api/statistics-api', () => ({
  submitDatasetRequest: vi.fn(),
}))

const { useOptionalUserMock } = vi.hoisted(() => ({
  useOptionalUserMock: vi.fn(),
}))

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return { ...actual, useOptionalUser: () => useOptionalUserMock() }
})

describe('RequestDatasetAction', () => {
  beforeEach(() => {
    useOptionalUserMock.mockReturnValue({ id: 'user_1' })
    vi.mocked(submitDatasetRequest).mockResolvedValue({
      accepted: true,
      datasetCode: 'TUR101C',
      message: 'Cererea a fost înregistrată pentru TUR101C.',
    })
  })

  it('submits datasetCode, siruta, contactEmail, and note for a signed-in user', async () => {
    render(
      <RequestDatasetAction
        datasetCode="TUR101C"
        datasetName="Înnoptări în structuri de cazare turistică"
        siruta="54975"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cere set' }))
    fireEvent.change(screen.getByLabelText('De ce ai nevoie de acest set?'), {
      target: { value: 'Am nevoie de seria lunară pentru Cluj.' },
    })
    fireEvent.change(screen.getByLabelText('Email pentru notificare (opțional)'), {
      target: { value: 'jurnalist@example.ro' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Trimite cererea' }))

    await waitFor(() => {
      expect(submitDatasetRequest).toHaveBeenCalledWith({
        datasetCode: 'TUR101C',
        siruta: '54975',
        contactEmail: 'jurnalist@example.ro',
        note: 'Am nevoie de seria lunară pentru Cluj.',
      })
    })

    await waitFor(() => {
      expect(
        screen.getByText('Cererea a fost înregistrată pentru TUR101C.'),
      ).toBeInTheDocument()
    })
  })

  it('offers no contact fields when signed out, and sends none', async () => {
    // Without a Clerk user id the server has no `user.deleted` event that could
    // ever anonymize an email or a note, so it discards both. The UI must not
    // collect what will be thrown away.
    useOptionalUserMock.mockReturnValue(null)

    render(
      <RequestDatasetAction
        datasetCode="TUR101C"
        datasetName="Înnoptări în structuri de cazare turistică"
        siruta="54975"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cere set' }))

    expect(screen.queryByLabelText('De ce ai nevoie de acest set?')).toBeNull()
    expect(
      screen.queryByLabelText('Email pentru notificare (opțional)'),
    ).toBeNull()
    expect(
      screen.getByText(/Înregistrăm doar cererea, fără date de contact/),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Trimite cererea' }))

    await waitFor(() => {
      expect(submitDatasetRequest).toHaveBeenCalledWith({
        datasetCode: 'TUR101C',
        siruta: '54975',
        contactEmail: undefined,
        note: undefined,
      })
    })
  })
})

describe('RequestDatasetAction — rejected envelope', () => {
  beforeEach(() => {
    useOptionalUserMock.mockReturnValue({ id: 'user_1' })
    vi.mocked(submitDatasetRequest).mockResolvedValue({
      accepted: false,
      datasetCode: 'TUR101C',
      message: 'Cererea nu a fost acceptată. Verifică setul de date selectat.',
    })
  })

  it('shows the failure message and keeps the submit button for a retry', async () => {
    render(
      <RequestDatasetAction datasetCode="TUR101C" datasetName={null} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cere set' }))
    fireEvent.click(screen.getByRole('button', { name: 'Trimite cererea' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Cererea nu a fost acceptată. Verifică setul de date selectat.',
        ),
      ).toBeInTheDocument()
    })

    // accepted:false must NOT collapse into the success state — the retry
    // affordance stays.
    expect(
      screen.getByRole('button', { name: 'Trimite cererea' }),
    ).toBeInTheDocument()
  })
})
