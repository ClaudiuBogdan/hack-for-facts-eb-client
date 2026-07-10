import { describe, expect, it } from 'vitest'
import { getDatasetDataStatus, isDatasetAvailable } from './dataset-status'

describe('dataset-status mapping', () => {
  it('prefers the server data_status over any sync_status', () => {
    // `matrices` emits sync_status='PENDING' both for a metadata-only dataset
    // and for a fact-loaded one whose upstream sync is pending, so the field
    // cannot answer the question and `data_status` wins whenever present.
    expect(
      getDatasetDataStatus({ sync_status: 'PENDING', data_status: 'AVAILABLE' }),
    ).toBe('available')
    expect(
      getDatasetDataStatus({ sync_status: 'SYNCED', data_status: 'CATALOG_ONLY' }),
    ).toBe('catalog-only')
    expect(
      isDatasetAvailable({ sync_status: 'PENDING', data_status: 'AVAILABLE' }),
    ).toBe(true)
  })

  it('maps full / partial / loaded-style statuses to available', () => {
    expect(getDatasetDataStatus({ sync_status: 'full' })).toBe('available')
    expect(getDatasetDataStatus({ sync_status: 'partial' })).toBe('available')
    expect(getDatasetDataStatus({ sync_status: 'loaded' })).toBe('available')
    expect(getDatasetDataStatus({ sync_status: 'LOADED' })).toBe('available')
  })

  it('maps every InsSyncStatus member except PENDING to available', () => {
    // `matrices` emits PENDING only for metadata-only datasets; SYNCED /
    // SYNCING / STALE / FAILED all describe the sync pipeline of a dataset
    // whose facts are already loaded.
    expect(getDatasetDataStatus({ sync_status: 'SYNCED' })).toBe('available')
    expect(getDatasetDataStatus({ sync_status: 'SYNCING' })).toBe('available')
    expect(getDatasetDataStatus({ sync_status: 'STALE' })).toBe('available')
    expect(getDatasetDataStatus({ sync_status: 'FAILED' })).toBe('available')
  })

  it('maps metadata_only / PENDING to catalog-only', () => {
    expect(getDatasetDataStatus({ sync_status: 'metadata_only' })).toBe(
      'catalog-only',
    )
    expect(getDatasetDataStatus({ sync_status: 'PENDING' })).toBe(
      'catalog-only',
    )
    expect(getDatasetDataStatus({ sync_status: 'pending' })).toBe(
      'catalog-only',
    )
    expect(getDatasetDataStatus({ sync_status: 'METADATA_ONLY' })).toBe(
      'catalog-only',
    )
  })

  it('does not claim in-flight loading states are available', () => {
    expect(getDatasetDataStatus({ sync_status: 'LOADING' })).toBe(
      'catalog-only',
    )
  })

  it('maps null and empty sync_status to catalog-only (safer side)', () => {
    expect(getDatasetDataStatus({ sync_status: null })).toBe('catalog-only')
    expect(getDatasetDataStatus({ sync_status: undefined })).toBe(
      'catalog-only',
    )
    expect(getDatasetDataStatus({ sync_status: '' })).toBe('catalog-only')
  })

  it('degrades an unknown sync_status to catalog-only', () => {
    expect(getDatasetDataStatus({ sync_status: 'whatever' })).toBe(
      'catalog-only',
    )
  })

  it('isDatasetAvailable mirrors getDatasetDataStatus', () => {
    expect(isDatasetAvailable({ sync_status: 'full' })).toBe(true)
    expect(isDatasetAvailable({ sync_status: 'PENDING' })).toBe(false)
    expect(isDatasetAvailable({ sync_status: null })).toBe(false)
  })
})
