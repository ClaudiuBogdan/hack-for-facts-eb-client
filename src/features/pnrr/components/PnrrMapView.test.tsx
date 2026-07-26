import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import { PnrrMapView } from './PnrrMapView'
import type { PnrrWorkerMapModel } from '../workers/pnrr-worker-types'

const mockState = vi.hoisted(() => ({
  geoJsonData: undefined as unknown,
  interactiveMapProps: [] as unknown[],
  mapModel: undefined as PnrrWorkerMapModel | undefined,
  projectDetail: undefined as PnrrProject | undefined,
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

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => (
      <a href="/pnrr/proiecte/test">{children}</a>
    ),
  }
})

vi.mock('../hooks/usePnrrData', () => ({
  usePnrrMapModel: () => ({
    data: mockState.mapModel
      ? { mapModel: mockState.mapModel }
      : undefined,
  }),
  usePnrrProjectDetail: (projectId: string | null | undefined) => ({
    data: mockState.projectDetail && projectId
      ? { project: mockState.projectDetail }
      : undefined,
  }),
}))

const PROJECT: PnrrProject = {
  id: 'project-1',
  engagementId: 'engagement-1',
  title: 'Test Project',
  beneficiary: 'COMUNA ION ROATA',
  cui: '12345678',
  county: 'Ialomița',
  locality: 'Ion Roată',
  fundingSource: 'grant',
  listedFundingRon: 100_000,
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

function makeMapModel(
  overrides: Partial<PnrrWorkerMapModel> = {},
): PnrrWorkerMapModel {
  return {
    seriesId: 'total-value',
    granularity: 'county',
    series: {
      id: 'total-value',
      data: [
        {
          county_code: 'IL',
          county_name: 'Ialomița',
          county_population: 250_000,
          amount: 100_000,
          total_amount: 100_000,
          per_capita_amount: 0.4,
          county_entity: { cui: '', name: 'Ialomița' },
        },
      ],
      min: 100_000,
      max: 100_000,
    },
    nationalCount: 0,
    unmappedCount: 0,
    uatProjectCount: 1,
    selectedUat: null,
    selectedCountyProjects: [PROJECT],
    selectedUatProjects: [],
    ...overrides,
  }
}

const WIDE_UAT_GEOJSON = {
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
            [20.2, 43.7],
            [20.3, 43.7],
            [20.3, 43.8],
            [20.2, 43.8],
            [20.2, 43.7],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        natcode: '456',
        name: 'Botoșani',
        county: 'Botoșani',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [29.6, 48.1],
            [29.7, 48.1],
            [29.7, 48.2],
            [29.6, 48.2],
            [29.6, 48.1],
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
    mockState.mapModel = undefined
    mockState.projectDetail = undefined
  })

  it('opens the county panel from URL panel state', () => {
    render(
      <PnrrMapView
        model={makeMapModel()}
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

  it('uses aggregate county stats when the selected project rows are capped', () => {
    render(
      <PnrrMapView
        model={makeMapModel({
          selectedCountySummary: {
            projectCount: 241,
            totalValue: 5_000_000,
            anomalyCount: 12,
            dataQualityCount: 3,
          },
          selectedCountyProjects: [PROJECT],
        })}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            panel: 'map-county',
            panelCountyCode: 'IL',
          },
        })}
      />,
    )

    expect(screen.getAllByText(/241 projects/).length).toBeGreaterThan(0)
    expect(screen.getByText('241')).toBeInTheDocument()
    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
  })

  it('opens the UAT panel from URL panel state', () => {
    render(
      <PnrrMapView
        model={makeMapModel({
          granularity: 'uat',
          series: {
            id: 'total-value',
            data: [
              {
                uat_id: '123',
                uat_code: '123',
                siruta_code: '123',
                uat_name: 'Ion Roată',
                county_code: 'IL',
                county_name: 'Ialomița',
                population: 1_000,
                amount: 100_000,
                total_amount: 100_000,
                per_capita_amount: 100,
              },
            ],
            min: 100_000,
            max: 100_000,
          },
          selectedUat: {
            name: 'Ion Roată',
            county: 'Ialomița',
            natcode: '123',
          },
          selectedCountyProjects: [],
          selectedUatProjects: [PROJECT],
        })}
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

    expect(screen.getAllByText('Ion Roată').length).toBeGreaterThan(0)
    expect(screen.getByText(/Ialomița · 1 project/)).toBeInTheDocument()
  })

  it('keeps the map panel visible with a nested project drawer', () => {
    mockState.projectDetail = PROJECT
    render(
      <PnrrMapView
        model={makeMapModel({
          granularity: 'uat',
          selectedUat: {
            name: 'Ion Roată',
            county: 'Ialomița',
            natcode: '123',
          },
          selectedCountyProjects: [],
          selectedUatProjects: [PROJECT],
        })}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            granularity: 'uat',
            panel: 'map-uat',
            panelUatSiruta: '123',
            panelProjectId: 'engagement:engagement-1',
          },
        })}
      />,
    )

    expect(screen.getAllByText('Ion Roată').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Test Project')).toHaveLength(2)
  })

  it('passes the selected project-count series to map labels', async () => {
    mockState.geoJsonData = UAT_GEOJSON
    mockState.mapModel = makeMapModel({
      seriesId: 'project-count',
      granularity: 'uat',
      series: {
        id: 'project-count',
        data: [
          {
            uat_id: '123',
            uat_code: '123',
            siruta_code: '123',
            uat_name: 'Ion Roată',
            county_code: 'IL',
            county_name: 'Ialomița',
            population: 1_000,
            amount: 1,
            total_amount: 100_000,
            per_capita_amount: 100,
          },
        ],
        min: 1,
        max: 1,
      },
      selectedCountyProjects: [],
      selectedUatProjects: [PROJECT],
    })

    render(
      <PnrrMapView
        model={makeMapModel({
          granularity: 'uat',
          series: {
            id: 'total-value',
            data: [
              {
                uat_id: '123',
                uat_code: '123',
                siruta_code: '123',
                uat_name: 'Ion Roată',
                county_code: 'IL',
                county_name: 'Ialomița',
                population: 1_000,
                amount: 100_000,
                total_amount: 100_000,
                per_capita_amount: 100,
              },
            ],
            min: 100_000,
            max: 100_000,
          },
        })}
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

  it('honors URL viewport and allows zooming farther out in map view', async () => {
    mockState.geoJsonData = WIDE_UAT_GEOJSON

    render(
      <PnrrMapView
        model={makeMapModel({
          granularity: 'uat',
          series: {
            id: 'total-value',
            data: [
              {
                uat_id: '123',
                uat_code: '123',
                siruta_code: '123',
                uat_name: 'Ion Roată',
                county_code: 'IL',
                county_name: 'Ialomița',
                population: 1_000,
                amount: 100_000,
                total_amount: 100_000,
                per_capita_amount: 100,
              },
              {
                uat_id: '456',
                uat_code: '456',
                siruta_code: '456',
                uat_name: 'Botoșani',
                county_code: 'BT',
                county_name: 'Botoșani',
                population: 2_000,
                amount: 200_000,
                total_amount: 200_000,
                per_capita_amount: 100,
              },
            ],
            min: 100_000,
            max: 200_000,
          },
          selectedCountyProjects: [],
          selectedUatProjects: [],
        })}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            granularity: 'uat',
            mapLat: 45.88896487328884,
            mapLng: 25,
            mapZoom: 10,
          },
        })}
      />,
    )

    await screen.findByTestId('interactive-map')

    const props = mockState.interactiveMapProps[
      mockState.interactiveMapProps.length - 1
    ] as {
      minZoom?: number
      center?: [number, number]
      zoom?: number
      scrollWheelZoom?: boolean
      defaultScrollWheelZoomEnabled?: boolean
    }

    expect(props.center).toEqual([45.88896487328884, 25])
    expect(props.zoom).toBe(10)
    expect(props.minZoom).toBe(3.5)
    expect(props.scrollWheelZoom).toBe(true)
    expect(props.defaultScrollWheelZoomEnabled).toBeUndefined()
  })

  it('keeps map camera changes out of URL search state', async () => {
    mockState.geoJsonData = UAT_GEOJSON
    const filterState = makeFilterState({
      search: {
        ...makeFilterState().search,
        granularity: 'uat',
      },
    })

    render(
      <PnrrMapView
        model={makeMapModel({
          granularity: 'uat',
          series: {
            id: 'total-value',
            data: [
              {
                uat_id: '123',
                uat_code: '123',
                siruta_code: '123',
                uat_name: 'Ion Roată',
                county_code: 'IL',
                county_name: 'Ialomița',
                population: 1_000,
                amount: 100_000,
                total_amount: 100_000,
                per_capita_amount: 100,
              },
            ],
            min: 100_000,
            max: 100_000,
          },
          selectedCountyProjects: [],
          selectedUatProjects: [PROJECT],
        })}
        filterState={filterState}
      />,
    )

    await screen.findByTestId('interactive-map')

    const props = mockState.interactiveMapProps[
      mockState.interactiveMapProps.length - 1
    ] as {
      onViewChange?: (center: [number, number], zoom: number) => void
    }

    props.onViewChange?.([46.123456, 24.987654], 7.26)

    expect(filterState.setMapView).not.toHaveBeenCalled()
  })

  it('keeps the previous map granularity until the requested model is ready', async () => {
    mockState.geoJsonData = UAT_GEOJSON

    render(
      <PnrrMapView
        model={makeMapModel({
          granularity: 'county',
        })}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            granularity: 'uat',
          },
        })}
      />,
    )

    await screen.findByTestId('interactive-map')

    const props = mockState.interactiveMapProps[
      mockState.interactiveMapProps.length - 1
    ] as {
      mapViewType?: string
    }

    expect(props.mapViewType).toBe('County')
  })
})
