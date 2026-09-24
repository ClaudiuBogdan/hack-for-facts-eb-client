import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@/test/test-utils'
import { DetailExportButton } from './detail-export-button'
import {
  sourceDescriptor,
  sourceObservation,
} from '../lib/source-observations.test-fixtures'
import { downloadObservationsCsv } from '../lib/observations-csv'

vi.mock('../lib/observations-csv', async (original) => ({
  ...(await original<typeof import('../lib/observations-csv')>()),
  downloadObservationsCsv: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))
beforeEach(() => vi.clearAllMocks())

describe('complete source export action', () => {
  it('does not download an incomplete inspection preview', async () => {
    render(
      <DetailExportButton
        datasetCode="TEST"
        sourceDescriptor={sourceDescriptor}
        observations={[sourceObservation()]}
        disabled={false}
        complete={false}
      />,
    )
    const button = screen.getByRole('button', { name: 'Descarcă CSV' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(downloadObservationsCsv).not.toHaveBeenCalled()
  })
  it('validates the descriptor before starting a download', async () => {
    render(
      <DetailExportButton
        datasetCode="TEST"
        sourceDescriptor={{}}
        observations={[sourceObservation()]}
        disabled={false}
        complete
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Descarcă CSV' }))
    expect(downloadObservationsCsv).not.toHaveBeenCalled()
  })
  it('exports qualified source rows without pretending their geography is exact', async () => {
    render(
      <DetailExportButton
        datasetCode="TEST"
        sourceDescriptor={sourceDescriptor}
        observations={[sourceObservation()]}
        disabled={false}
        complete
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Descarcă CSV' }))
    expect(downloadObservationsCsv).toHaveBeenCalledWith(
      expect.stringContaining('CONTEXTUAL'),
      expect.stringMatching(/^TEST-/),
    )
  })
})
