import { describe, expect, it } from 'vitest'
import type { PnrrFilterOption } from './PnrrStyledMultiSelect'
import { filterPnrrOptions } from './pnrr-filter-search'

const uatOptions: readonly PnrrFilterOption[] = [
  {
    value: '1',
    label: 'Comuna Altana',
    description: 'Sibiu',
    searchText: 'Comuna Altana 1',
  },
  {
    value: '143450',
    label: 'Municipiul Sibiu',
    description: 'Sibiu',
    searchText: 'Municipiul Sibiu 143450',
  },
  {
    value: '2',
    label: 'Comuna Apoldu De Jos',
    description: 'Sibiu',
    searchText: 'Comuna Apoldu De Jos 2',
  },
]

describe('filterPnrrOptions', () => {
  it('can search UAT options by name without matching county-only text', () => {
    expect(filterPnrrOptions(uatOptions, 'sibiu').map((option) => option.label)).toEqual([
      'Municipiul Sibiu',
    ])
  })

  it('matches abbreviated administrative prefixes', () => {
    expect(filterPnrrOptions(uatOptions, 'mun sibiu').map((option) => option.label)).toEqual([
      'Municipiul Sibiu',
    ])
  })

  it('can search UAT options by SIRUTA code', () => {
    expect(filterPnrrOptions(uatOptions, '143450').map((option) => option.label)).toEqual([
      'Municipiul Sibiu',
    ])
  })
})
