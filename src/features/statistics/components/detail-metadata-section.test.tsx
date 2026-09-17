import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { InsDataset } from '@/schemas/ins'
import { DetailMetadataSection } from './detail-metadata-section'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
  useLingui: () => ({ i18n: { locale: 'en' } }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { readonly children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}))

const dataset: InsDataset = {
  id: 'dataset:FOM106E',
  code: 'FOM106E',
  periodicity: ['ANNUAL'],
  has_uat_data: false,
  has_county_data: true,
  has_siruta: false,
  methodology_ro: 'Obiectivul cercetarii statistice anuale',
  methodology_en: 'The objective of the annual labour cost survey',
  data_sources_ro: 'Cercetarea statistica privind costul fortei de munca <<6263>>',
  data_sources_en: 'Labour cost survey <<6263>>',
  data_sources: [
    {
      name: 'Cercetarea statistica privind costul fortei de munca <<6263>>',
      type: 'Surse statistice (INS)',
      type_code: 1,
      link_number: 6263,
    },
  ],
  observations_ro: 'Datele sunt disponibile incepand cu anul 2008.',
  observations_en: null,
  discontinued_after_ro: null,
  discontinued_after_en: null,
  successor_dataset_code: null,
  continues_from: [
    { dataset_code: 'FOM106A', last_period_ro: 'Anul 2008', last_period_en: 'Year 2008' },
  ],
  source_last_update: '2025-09-04',
}

describe('DetailMetadataSection in English', () => {
  it('prefers the English text and names, falling back to Romanian where INS published none', async () => {
    render(<DetailMetadataSection dataset={dataset} />)
    await userEvent.click(screen.getByRole('button', { name: 'Metodologie' }))
    expect(
      screen.getByText('The objective of the annual labour cost survey'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Surse de date/ }))
    expect(screen.getByText('Labour cost survey')).toBeInTheDocument()
    expect(
      screen.queryByText('Cercetarea statistica privind costul fortei de munca'),
    ).not.toBeInTheDocument()
    // No type badge in English: the type belongs to the Romanian list and the
    // two lists are not guaranteed to share an order.
    expect(screen.queryByText('Surse statistice (INS)')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Observații INS' }))
    expect(
      screen.getByText('Datele sunt disponibile incepand cu anul 2008.'),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Continuitatea seriei' }),
    )
    expect(screen.getByText(/Year 2008/)).toBeInTheDocument()
  })
})
