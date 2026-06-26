import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitDatasetRequest } from '../api/statistics-api'
import { RequestDatasetAction } from './request-dataset-action'

vi.mock('../api/statistics-api', () => ({
  submitDatasetRequest: vi.fn(),
}))

describe('RequestDatasetAction', () => {
  beforeEach(() => {
    vi.mocked(submitDatasetRequest).mockResolvedValue({
      accepted: true,
      datasetCode: 'TUR101C',
      message: 'Cererea a fost înregistrată pentru TUR101C.',
    })
  })

  it('submits datasetCode, siruta, contactEmail, and note through useDatasetRequest', async () => {
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
})
