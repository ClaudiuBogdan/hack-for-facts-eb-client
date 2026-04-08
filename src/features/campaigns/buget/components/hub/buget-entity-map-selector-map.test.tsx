import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
  type ReactNode,
} from 'react'
import { render } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BugetEntityMapSelectorMap } from './buget-entity-map-selector-map'
import { buildSubscriptionLegendBins, SUBSCRIPTION_NO_DATA_COLOR } from '../../utils/subscription-scale'

const tooltipContents: string[] = []
const fillColors: string[] = []

const removeLayerMock = vi.fn()

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    style,
    className,
  }: {
    readonly children: ReactNode
    readonly style?: Record<string, string>
    readonly className?: string
  }) => (
    <div
      data-testid="mock-map-container"
      style={style}
      className={className}
    >
      {children}
    </div>
  ),
  GeoJSON: forwardRef(function MockGeoJson(
    {
      data,
      onEachFeature,
      style,
    }: {
      readonly data: {
        readonly type?: string
        readonly features?: readonly unknown[]
      }
      readonly onEachFeature?: (feature: unknown, layer: unknown) => void
      readonly style?: (feature?: unknown) => { readonly fillColor?: string }
    },
    ref: ForwardedRef<{ eachLayer: (callback: (layer: unknown) => void) => void }>,
  ) {
    const layersRef = useRef<unknown[]>([])

    useImperativeHandle(ref, () => ({
      eachLayer: (callback) => {
        for (const layer of layersRef.current) {
          callback(layer)
        }
      },
    }))

    // Intentionally mount-only: the real Leaflet layer does not recreate features on prop changes.
    // The component under test must update the existing layer via refs/effects.
    useEffect(() => {
      if (data.type !== 'FeatureCollection') {
        return
      }

      layersRef.current = (data.features ?? []).map((feature) => {
        const layer = {
          feature,
          bindTooltip: (content: string) => {
            tooltipContents.push(content)
          },
          getTooltip: () => ({
            setContent: (content: string) => {
              tooltipContents.push(content)
            },
          }),
          setTooltipContent: (content: string) => {
            tooltipContents.push(content)
          },
          setStyle: (nextStyle: { readonly fillColor?: string }) => {
            fillColors.push(nextStyle.fillColor ?? '')
          },
          on: vi.fn(),
        }

        if (style) {
          fillColors.push(style(feature).fillColor ?? '')
        }

        if (onEachFeature) {
          onEachFeature(feature, layer)
        }

        return layer
      })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return <div data-testid="mock-geojson-layer" />
  }),
  useMap: () => ({
    removeLayer: removeLayerMock,
  }),
}))

vi.mock('./campaign-subscription-map-legend', () => ({
  CampaignSubscriptionMapLegend: () => <div data-testid="mock-map-legend" />,
}))

vi.mock('./buget-uat-name-canvas-label-layer', () => ({
  BugetUatNameCanvasLabelLayer: class MockBugetUatNameCanvasLabelLayer {
    addTo() {
      return this
    }

    updateOptions() {}
  },
}))

const uatGeoJson = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        natcode: '55274',
        name: 'Florești',
        cui: '4485391',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [],
      },
    },
  ],
}

const countyGeoJson = {
  type: 'FeatureCollection' as const,
  features: [],
}

describe('BugetEntityMapSelectorMap', () => {
  beforeEach(() => {
    tooltipContents.length = 0
    fillColors.length = 0
    removeLayerMock.mockReset()
  })

  it('refreshes choropleth tooltips and styles when normalized SIRUTA counts arrive after mount', () => {
    const { rerender } = render(
      <BugetEntityMapSelectorMap
        uatGeoJson={uatGeoJson}
        countyGeoJson={countyGeoJson}
        locale="ro"
        onUatSelect={vi.fn()}
        highlightSubscriptions={true}
        subscriptionCountsByNatcode={new Map()}
        subscriptionLegendBins={buildSubscriptionLegendBins([3])}
      />,
    )

    expect(tooltipContents[tooltipContents.length - 1]).toContain('0 participanți')
    expect(fillColors[fillColors.length - 1]).toBe(SUBSCRIPTION_NO_DATA_COLOR)

    rerender(
      <BugetEntityMapSelectorMap
        uatGeoJson={uatGeoJson}
        countyGeoJson={countyGeoJson}
        locale="ro"
        onUatSelect={vi.fn()}
        highlightSubscriptions={true}
        subscriptionCountsByNatcode={new Map([['055274', 3]])}
        subscriptionLegendBins={buildSubscriptionLegendBins([3])}
      />,
    )

    expect(tooltipContents[tooltipContents.length - 1]).toContain('3 participanți')
    expect(fillColors[fillColors.length - 1]).not.toBe(SUBSCRIPTION_NO_DATA_COLOR)
    expect(document.querySelector('[data-testid="mock-map-container"]')).toHaveStyle({
      height: '100%',
      width: '100%',
    })
  })
})
