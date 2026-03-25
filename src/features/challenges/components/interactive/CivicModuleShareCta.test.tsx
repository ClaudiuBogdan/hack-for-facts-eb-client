import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCampaignProvocariModulePath } from '../../constants'
import { CivicModuleShareCta } from './CivicModuleShareCta'

const writeTextMock = vi.fn(async () => undefined)
const DEFAULT_TEST_PATH = '/'

describe('CivicModuleShareCta', () => {
  beforeEach(() => {
    writeTextMock.mockClear()
    window.history.replaceState({}, '', DEFAULT_TEST_PATH)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
    })
  })

  afterEach(() => {
    window.history.replaceState({}, '', DEFAULT_TEST_PATH)
  })

  it('copies the civic-module link for the current entity', async () => {
    render(<CivicModuleShareCta entityCui="4305857" moduleSlug="civic-campaign" />)

    const expectedLink = `${window.location.origin}${buildCampaignProvocariModulePath('4305857', 'civic-campaign')}`

    expect(screen.getByLabelText('Module link')).toHaveValue(expectedLink)

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expectedLink)
    })

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('preserves only the english locale in the copied civic-module link', async () => {
    window.history.replaceState(
      {},
      '',
      '/primarie/4305857/buget/provocari/civic-campaign/civic-monitor-and-request/cererea-de-dezbatere-publica?lang=en&view=section&section=trimite-cererea&analytics=test',
    )

    render(<CivicModuleShareCta entityCui="4305857" moduleSlug="civic-campaign" />)

    const expectedLink = `${window.location.origin}${buildCampaignProvocariModulePath('4305857', 'civic-campaign')}?lang=en`

    expect(screen.getByLabelText('Module link')).toHaveValue(expectedLink)

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expectedLink)
    })

    expect(writeTextMock).not.toHaveBeenCalledWith(expect.stringContaining('view=section'))
    expect(writeTextMock).not.toHaveBeenCalledWith(expect.stringContaining('section='))
    expect(writeTextMock).not.toHaveBeenCalledWith(expect.stringContaining('analytics='))
  })
})
