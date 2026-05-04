import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { PnrrMapView } from './PnrrMapView'

const mockState = vi.hoisted(() => ({
  geoJsonData: undefined as unknown,
  interactiveMapProps: [] as unknown[],
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({ data: mockState.geoJsonData, isPending: false }),
}))

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: (props: unknown) => {
    mockState.interactiveMapProps.push(props)
    return <div data-testid="interactive-map" />
  },
}))

const PROJECT: PnrrProject = {
  id: 'project-1',
  title: 'Test Project',
  beneficiary: 'COMUNA ION ROATA',
  cui: '12345678',
  county: 'Ialomița',
  locality: 'Ion Roată',
  fundingSource: 'grant',
  valueEur: 100_000,
  techProgress: 50,
  finProgress: 40,
  status: 'mid-progress',
  componentCode: 'C4',
  measureCode: 'I3',
  measureFullCode: 'C4-I3',
  cri: 'MTI',
  anomalies: ['large-low-progress'],
  dataQualitySignals: [],
  isReform: false,
  entityType: 'public',
  beneficiaryType: 'uat',
  sirutaCode: '123',
}

const UAT_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        natcode: '123',
        name: 'Ion Roată',
        county: 'Ialomița',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [26.6, 44.6],
            [26.7, 44.6],
            [26.7, 44.7],
            [26.6, 44.7],
            [26.6, 44.6],
          ],
        ],
      },
    },
  ],
}

function makeFilterState(
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'map',
      page: 1,
      pageSize: 25,
      sortBy: 'value',
      sortOrder: 'desc',
      beneficiarySortBy: 'value',
      beneficiarySortOrder: 'desc',
      beneficiaryPage: 1,
      onlyAnomalies: false,
      excludeMicro: false,
      granularity: 'county',
      includeNational: false,
    },
    setView: vi.fn(),
    showBeneficiaryProjects: vi.fn(),
    showUatView: vi.fn(),
    setSearch: vi.fn(),
    setBeneficiarySearch: vi.fn(),
    setBeneficiaryCui: vi.fn(),
    setUatFilter: vi.fn(),
    setUatFilters: vi.fn(),
    setComponents: vi.fn(),
    setCounties: vi.fn(),
    setFundingSources: vi.fn(),
    setMeasures: vi.fn(),
    setCris: vi.fn(),
    setProgressCategories: vi.fn(),
    setOnlyAnomalies: vi.fn(),
    setExcludeMicro: vi.fn(),
    setAnomalyTypes: vi.fn(),
    setDataQualitySignalTypes: vi.fn(),
    setGranularity: vi.fn(),
    setEntityTypes: vi.fn(),
    setBeneficiaryTypes: vi.fn(),
    setIncludeNational: vi.fn(),
    setSorting: vi.fn(),
    setBeneficiarySorting: vi.fn(),
    setCurrency: vi.fn(),
    setPagination: vi.fn(),
    setBeneficiaryPagination: vi.fn(),
    setMapView: vi.fn(),
    openProjectPanel: vi.fn(),
    openBeneficiaryPanel: vi.fn(),
    openMapCountyPanel: vi.fn(),
    openMapUatPanel: vi.fn(),
    openAnomalyInfoPanel: vi.fn(),
    closePanel: vi.fn(),
    closeProjectPanel: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  }
}

describe('PnrrMapView', () => {
  beforeEach(() => {
    mockState.geoJsonData = undefined
    mockState.interactiveMapProps = []
  })

  it('opens the county panel from URL panel state', () => {
    render(
      <PnrrMapView
        projects={[PROJECT]}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            panel: 'map-county',
            panelCountyCode: 'IL',
          },
        })}
      />,
    )

    expect(screen.getByText('Ialomița')).toBeInTheDocument()
    expect(screen.getAllByText(/1 project/).length).toBeGreaterThan(0)
  })

  it('opens the UAT panel from URL panel state', () => {
    render(
      <PnrrMapView
        projects={[PROJECT]}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            granularity: 'uat',
            panel: 'map-uat',
            panelUatSiruta: '123',
          },
        })}
      />,
    )

    expect(screen.getByText('Ion Roată')).toBeInTheDocument()
    expect(screen.getByText(/Ialomița · 1 project/)).toBeInTheDocument()
  })

  it('keeps the map panel visible with a nested project drawer', () => {
    render(
      <PnrrMapView
        projects={[PROJECT]}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            granularity: 'uat',
            panel: 'map-uat',
            panelUatSiruta: '123',
            panelProjectId: PROJECT.id,
          },
        })}
      />,
    )

    expect(screen.getByText('Ion Roată')).toBeInTheDocument()
    expect(screen.getAllByText('Test Project').length).toBeGreaterThan(1)
  })

  it('passes the selected project-count series to map labels', async () => {
    mockState.geoJsonData = UAT_GEOJSON

    render(
      <PnrrMapView
        projects={[PROJECT]}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            granularity: 'uat',
          },
        })}
      />,
    )

    await screen.findByTestId('interactive-map')
    fireEvent.click(screen.getByRole('button', { name: 'Project count' }))

    await waitFor(() => {
      const props = mockState.interactiveMapProps[
        mockState.interactiveMapProps.length - 1
      ] as {
        labelMode?: string
        activeSeriesUnit?: string
        activeSeriesValuesBySirutaCode?: Map<string, number | undefined>
      }

      expect(props.labelMode).toBe('active-series')
      expect(props.activeSeriesUnit).toBe('projects')
      expect(props.activeSeriesValuesBySirutaCode?.get('123')).toBe(1)
    })
  })
})
