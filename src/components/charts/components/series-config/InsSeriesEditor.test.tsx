import { useEffect, useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@/test/test-utils';
import type {
  InsDataset,
  InsDatasetDetails,
  InsDimensionValueConnection,
  PageInfo,
} from '@/schemas/ins';

import { InsSeriesEditor } from './InsSeriesEditor';

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}));

vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AccordionTrigger: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AccordionContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./ins-dataset-list', () => ({
  InsDatasetList: ({
    toggleSelect,
    datasetFilter,
  }: {
    toggleSelect: (option: { id: string; label: string }) => void;
    datasetFilter?: { hasUatData?: boolean; hasSiruta?: boolean };
  }) => {
    lastDatasetFilter = datasetFilter;

    return (
      <div>
        <button
          type="button"
          onClick={() =>
            toggleSelect({ id: 'POP107D', label: 'POP107D - Populatia dupa domiciliu' })
          }
        >
          Dataset POP107D
        </button>
        <button
          type="button"
          onClick={() =>
            toggleSelect({ id: 'POP212B', label: 'POP212B - Divorturi pe judete' })
          }
        >
          Dataset POP212B
        </button>
      </div>
    );
  },
}));

vi.mock('./ins-dimension-values-list', () => ({
  InsDimensionValuesList: ({
    optionKind,
    dimensionIndex,
    toggleSelect,
    allowedTerritoryLevels,
  }: {
    optionKind: 'classification' | 'unit' | 'territory' | 'siruta' | 'source-territory';
    dimensionIndex: number;
    toggleSelect: (option: { id: string; label: string }) => void;
    allowedTerritoryLevels?: string[];
  }) => {
    lastAllowedTerritoryLevelsByOptionKind[optionKind] = allowedTerritoryLevels;

    if (optionKind === 'source-territory') {
      return <button type="button" onClick={() => toggleSelect({ id: '7', label: `7 - Source D${dimensionIndex}` })}>Source D{dimensionIndex}</button>;
    }

    if (optionKind === 'classification') {
      return (
        <div>
          <button
            type="button"
            onClick={() => toggleSelect({ id: 'M', label: 'M - Masculin' })}
          >
            Masculin
          </button>
          <button
            type="button"
            onClick={() => toggleSelect({ id: 'F', label: 'F - Feminin' })}
          >
            Feminin
          </button>
        </div>
      );
    }

    if (optionKind === 'unit') {
      return (
        <div>
          <button
            type="button"
            onClick={() => toggleSelect({ id: 'PERS', label: 'PERS - Persoane' })}
          >
            Persoane
          </button>
        </div>
      );
    }

    if (optionKind === 'territory') {
      return (
        <div>
          <button
            type="button"
            onClick={() => toggleSelect({ id: 'CJ', label: 'CJ - Cluj' })}
          >
            CJ
          </button>
        </div>
      );
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => toggleSelect({ id: '54975', label: '54975 - Municipiul Sibiu (SB)' })}
        >
          Localitate 54975
        </button>
      </div>
    );
  },
}));

const mockUpdateSeries = vi.fn();
let applySeriesPatch: ((seriesId: string, patch: Record<string, unknown>) => void) | null = null;
let lastDatasetFilter: { hasUatData?: boolean; hasSiruta?: boolean } | undefined;
let lastAllowedTerritoryLevelsByOptionKind: Record<string, string[] | undefined> = {};

vi.mock('../../hooks/useChartStore', () => ({
  useChartStore: () => ({
    updateSeries: mockUpdateSeries,
  }),
}));

const mockGetInsDatasetDetails = vi.fn();
const mockGetInsDimensionValuesPage = vi.fn();

vi.mock('@/features/statistics/api/graphql/ins-fetchers', () => ({
  getInsDatasetDetails: (code: string) => mockGetInsDatasetDetails(code),
  getInsDimensionValuesPage: (params: unknown) => mockGetInsDimensionValuesPage(params),
}));

const pageInfo: PageInfo = {
  totalCount: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function createDataset(overrides: Partial<InsDataset> = {}): InsDataset {
  return {
    id: 'dataset-1',
    code: 'POP107D',
    name_ro: 'Populatia dupa domiciliu',
    periodicity: ['ANNUAL'],
    has_uat_data: true,
    has_county_data: true,
    has_siruta: true,
    ...overrides,
  };
}

function createDatasetDetails(overrides: Partial<InsDatasetDetails> = {}): InsDatasetDetails {
  return {
    ...createDataset(),
    dimensions: [],
    ...overrides,
  };
}

function createSeries(overrides: Record<string, unknown> = {}) {
  return {
    id: 'series-1',
    type: 'ins-series',
    enabled: true,
    label: 'INS Series',
    unit: '',
    config: {
      color: '#0000ff',
      showDataLabels: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aggregation: 'sum',
    hasValue: true,
    ...overrides,
  } as any;
}

function renderEditor(seriesOverrides: Record<string, unknown> = {}) {
  const queryClient = createTestQueryClient();
  const initialSeries = createSeries(seriesOverrides);

  function StatefulEditor() {
    const [series, setSeries] = useState(initialSeries);

    useEffect(() => {
      applySeriesPatch = (seriesId, patch) => {
        if (seriesId !== series.id) return;
        setSeries((current: Record<string, unknown>) => ({ ...current, ...patch }));
      };

      return () => {
        applySeriesPatch = null;
      };
    }, [series.id]);

    return <InsSeriesEditor series={series} />;
  }

  return render(<StatefulEditor />, { queryClient });
}

function renderEditorWithAdapter(params: {
  seriesOverrides?: Record<string, unknown>;
  adapterOverrides?: Record<string, unknown>;
  applyPatch?: (patch: Partial<Record<string, unknown>>) => void;
}) {
  const queryClient = createTestQueryClient();
  const series = createSeries(params.seriesOverrides);
  const applyPatch = params.applyPatch ?? vi.fn();

  render(
    <InsSeriesEditor
      adapter={{
        series,
        applyPatch,
        ...(params.adapterOverrides ?? {}),
      }}
    />,
    { queryClient }
  );

  return { applyPatch };
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

const emptyDimensionConnection: InsDimensionValueConnection = {
  nodes: [],
  pageInfo,
};

function createDimensionConnection(
  nodes: InsDimensionValueConnection['nodes']
): InsDimensionValueConnection {
  return {
    nodes,
    pageInfo: {
      totalCount: nodes.length,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

describe('InsSeriesEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applySeriesPatch = null;
    lastDatasetFilter = undefined;
    lastAllowedTerritoryLevelsByOptionKind = {};
    mockUpdateSeries.mockImplementation((seriesId, patch) => {
      applySeriesPatch?.(seriesId, patch as Record<string, unknown>);
    });

    mockGetInsDatasetDetails.mockResolvedValue(createDatasetDetails());
    mockGetInsDimensionValuesPage.mockResolvedValue(emptyDimensionConnection);
  });

  it('keeps nested county and locality picks as separate source dimensions', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(createDatasetDetails({
      dimensions: [0, 1].map((index) => ({
        index, type: 'TERRITORIAL', label_ro: index === 0 ? 'Judete' : 'Localitati',
        classification_type: { code: `D${index}`, name_ro: '', name_en: null, is_hierarchical: false },
      })),
    }));
    renderEditor({ datasetCode: 'POP107D' });
    fireEvent.click(await screen.findByRole('button', { name: 'Source D0' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Source D1' }));
    await waitFor(() => expect(mockUpdateSeries).toHaveBeenCalledWith('series-1', expect.objectContaining({
      classificationSelections: { D0: ['7'], D1: ['7'] },
    })));
    expect(mockUpdateSeries.mock.calls.some(([, patch]) => Array.isArray(patch.territoryCodes) || Array.isArray(patch.sirutaCodes))).toBe(false);
  });

  it('requires explicit reselection before removing saved canonical territory filters', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(createDatasetDetails({ dimensions: [] }));
    renderEditor({ datasetCode: 'POP107D', territoryCodes: ['CJ'], sirutaCodes: ['54975'] });
    const reset = await screen.findByRole('button', { name: 'Reselect dataset' });
    expect(mockUpdateSeries.mock.calls.some(([, patch]) => Object.prototype.hasOwnProperty.call(patch, 'territoryCodes'))).toBe(false);
    fireEvent.click(reset);
    await waitFor(() => expect(mockUpdateSeries).toHaveBeenCalledWith('series-1', expect.objectContaining({
      datasetCode: 'POP107D', territoryCodes: undefined, sirutaCodes: undefined,
    })));
  });

  it('initializes each geographic default by its own source member', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(createDatasetDetails({
      dimensions: [0, 1].map((index) => ({
        index, type: 'TERRITORIAL', label_ro: `D${index}`,
        classification_type: { code: `D${index}`, name_ro: '', name_en: null, is_hierarchical: false },
      })),
    }));
    mockGetInsDimensionValuesPage.mockImplementation(async ({ dimensionIndex }: { dimensionIndex: number }) => createDimensionConnection([{
      nom_item_id: 7, dimension_type: 'TERRITORIAL', label_ro: 'Total',
      classification_value: { type_code: `D${dimensionIndex}`, code: '7', name_ro: 'Total' },
      territory: dimensionIndex === 0 ? { code: 'CJ', level: 'NUTS3' } : { code: '54975', siruta_code: '54975', level: 'LAU' },
    }]));
    renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Dataset POP107D' }));
    await waitFor(() => expect(mockUpdateSeries).toHaveBeenCalledWith('series-1', expect.objectContaining({
      classificationSelections: { D0: ['7'], D1: ['7'] },
    })));
    expect(mockUpdateSeries.mock.calls.some(([, patch]) => Array.isArray(patch.territoryCodes) || Array.isArray(patch.sirutaCodes))).toBe(false);
  });

  it('updates dataset code and label when selecting a dataset', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP212B',
        name_ro: 'Divorturi pe judete',
      })
    );

    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({
          datasetCode: 'POP212B',
          label: 'Divorturi pe judete',
        })
      );
    });
  });

  it('renders INS Tempo source attribution for selected dataset', () => {
    renderEditor({
      datasetCode: 'POP107D',
    });

    expect(screen.getByText('Data source:')).toBeInTheDocument();
    const sourceLink = screen.getByRole('link', { name: /INS Tempo/i });
    expect(sourceLink).toHaveAttribute('href', expect.stringContaining('ind=POP107D'));
    expect(sourceLink).toHaveAttribute('href', expect.stringContaining('page=tempo3'));
  });

  it('does not render source attribution when no dataset is selected', () => {
    renderEditor();

    expect(screen.queryByText('Data source:')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /INS Tempo/i })).not.toBeInTheDocument();
  });

  it('clears stale INS dimension filters when selecting a new dataset', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP212B',
        dimensions: [],
      })
    );

    renderEditor({
      datasetCode: 'POP107D',
      unitCodes: ['PERS'],
      territoryCodes: ['CJ'],
      sirutaCodes: ['54975'],
      classificationSelections: { SEXE: ['M'] },
    });

    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    await waitFor(() => {
      const resetCall = mockUpdateSeries.mock.calls.find(([, payload]) => {
        const patch = payload as Record<string, unknown> | undefined;
        return (
          patch?.datasetCode === 'POP212B' &&
          Object.prototype.hasOwnProperty.call(patch, 'unitCodes') &&
          Object.prototype.hasOwnProperty.call(patch, 'territoryCodes') &&
          Object.prototype.hasOwnProperty.call(patch, 'sirutaCodes') &&
          Object.prototype.hasOwnProperty.call(patch, 'classificationSelections')
        );
      });

      expect(resetCall).toBeDefined();

      const patch = resetCall?.[1] as Record<string, unknown>;
      expect(patch.unitCodes).toBeUndefined();
      expect(patch.territoryCodes).toBeUndefined();
      expect(patch.sirutaCodes).toBeUndefined();
      expect(patch.classificationSelections).toBeUndefined();
    });
  });

  it('ignores stale dataset defaults when another dataset is selected afterwards', async () => {
    const firstDeferred = createDeferred<InsDatasetDetails | null>();
    const secondDeferred = createDeferred<InsDatasetDetails | null>();

    mockGetInsDatasetDetails.mockImplementation((code: string) => {
      if (code === 'POP107D') return firstDeferred.promise;
      if (code === 'POP212B') return secondDeferred.promise;
      return Promise.resolve(createDatasetDetails());
    });

    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Dataset POP107D/i }));
    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    secondDeferred.resolve(
      createDatasetDetails({
        code: 'POP212B',
        periodicity: ['ANNUAL'],
        year_range: [2020, 2024],
      })
    );

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({
          period: expect.objectContaining({
            type: 'YEAR',
            selection: expect.objectContaining({
              interval: expect.objectContaining({
                start: '2020',
                end: '2024',
              }),
            }),
          }),
        })
      );
    });

    firstDeferred.resolve(
      createDatasetDetails({
        code: 'POP107D',
        periodicity: ['MONTHLY'],
        year_range: [2022, 2023],
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const monthlyDefaultCalls = mockUpdateSeries.mock.calls.filter(([, payload]) => {
      const patch = payload as { period?: { type?: string } } | undefined;
      return patch?.period?.type === 'MONTH';
    });
    expect(monthlyDefaultCalls).toHaveLength(0);
  });

  it('ignores stale dimension defaults after dataset reselection', async () => {
    const fallbackDeferred = createDeferred<InsDimensionValueConnection>();

    mockGetInsDatasetDetails.mockImplementation((code: string) => {
      if (code === 'POP107D') {
        return Promise.resolve(
          createDatasetDetails({
            code: 'POP107D',
            dimensions: [
              {
                index: 2,
                type: 'UNIT_OF_MEASURE',
                label_ro: 'Unitate',
              },
            ],
          })
        );
      }

      if (code === 'POP212B') {
        return Promise.resolve(
          createDatasetDetails({
            code: 'POP212B',
            dimensions: [],
          })
        );
      }

      return Promise.resolve(createDatasetDetails());
    });

    mockGetInsDimensionValuesPage.mockImplementation(() => fallbackDeferred.promise);

    renderEditor({ datasetCode: 'POP107D', unitCodes: ['PERS'] });

    fireEvent.click(await screen.findByRole('button', { name: /^Persoane$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({ datasetCode: 'POP212B' })
      );
    });

    fallbackDeferred.resolve(
      createDimensionConnection([
        {
          nom_item_id: 11,
          dimension_type: 'UNIT_OF_MEASURE',
          unit: {
            code: 'PERS',
            name_ro: 'Persoane',
          },
        },
      ])
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const staleUnitFallbackCalls = mockUpdateSeries.mock.calls.filter(
      ([, payload]) => Array.isArray(payload?.unitCodes) && payload.unitCodes.includes('PERS')
    );
    expect(staleUnitFallbackCalls).toHaveLength(0);
  });

  it('applies full-interval default period from selected dataset', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP212B',
        periodicity: ['MONTHLY'],
        year_range: [2022, 2023],
      })
    );

    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({
          period: {
            type: 'MONTH',
            selection: {
              interval: {
                start: '2022-01',
                end: '2023-12',
              },
            },
          },
        })
      );
    });
  });

  it('replaces incompatible existing period with constrained dataset default', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        periodicity: ['ANNUAL'],
        year_range: [2020, 2024],
      })
    );

    renderEditor({
      datasetCode: 'POP107D',
      period: {
        type: 'MONTH',
        selection: { dates: ['2025-03'] },
      },
    });

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({
          period: {
            type: 'YEAR',
            selection: {
              interval: {
                start: '2020',
                end: '2024',
              },
            },
          },
        })
      );
    });
  });

  it('supports add and remove in classification multi-select', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 1,
            type: 'CLASSIFICATION',
            label_ro: 'Sex',
            classification_type: { code: 'SEXE', name_ro: 'Sex' },
          },
        ],
      })
    );

    renderEditor({ datasetCode: 'POP107D', classificationSelections: {} });

    const masculineButton = await screen.findByRole('button', { name: /^Masculin$/i });
    fireEvent.click(masculineButton);
    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          classificationSelections: { SEXE: ['M'] },
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /^Feminin$/i }));
    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          classificationSelections: { SEXE: ['M', 'F'] },
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /^Masculin$/i }));
    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          classificationSelections: { SEXE: ['F'] },
        })
      );
    });
  });

  it('reapplies default classification when last item is removed', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 1,
            type: 'CLASSIFICATION',
            label_ro: 'Sex',
            classification_type: { code: 'SEXE', name_ro: 'Sex' },
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 1,
          dimension_type: 'CLASSIFICATION',
          classification_value: {
            type_code: 'SEXE',
            code: 'M',
            name_ro: 'Masculin',
          },
        },
        {
          nom_item_id: 2,
          dimension_type: 'CLASSIFICATION',
          label_ro: 'TOTAL',
          classification_value: {
            type_code: 'SEXE',
            code: 'TOTAL',
            name_ro: 'Total',
          },
        },
      ])
    );

    renderEditor({ datasetCode: 'POP107D', classificationSelections: { SEXE: ['M'] } });

    fireEvent.click(await screen.findByRole('button', { name: /^Masculin$/i }));

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          classificationSelections: { SEXE: ['TOTAL'] },
        })
      );
    });
  });

  it('preserves concurrent classification updates while default fallback resolves', async () => {
    const fallbackDeferred = createDeferred<InsDimensionValueConnection>();

    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 1,
            type: 'CLASSIFICATION',
            label_ro: 'Sex',
            classification_type: { code: 'SEXE', name_ro: 'Sex' },
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockImplementation(() => fallbackDeferred.promise);

    renderEditor({
      datasetCode: 'POP107D',
      classificationSelections: { SEXE: ['M'], MEDIU: ['URBAN'] },
    });

    fireEvent.click(await screen.findByRole('button', { name: /^Masculin$/i }));

    applySeriesPatch?.('series-1', {
      classificationSelections: { SEXE: ['M'], MEDIU: ['RURAL'] },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    fallbackDeferred.resolve(
      createDimensionConnection([
        {
          nom_item_id: 2,
          dimension_type: 'CLASSIFICATION',
          label_ro: 'TOTAL',
          classification_value: {
            type_code: 'SEXE',
            code: 'TOTAL',
            name_ro: 'Total',
          },
        },
      ])
    );

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenCalledWith(
        'series-1',
        expect.objectContaining({
          classificationSelections: { SEXE: ['TOTAL'], MEDIU: ['RURAL'] },
        })
      );
    });
  });

  it('reapplies default unit when last item is removed', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 2,
            type: 'UNIT_OF_MEASURE',
            label_ro: 'Unitate',
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 10,
          dimension_type: 'UNIT_OF_MEASURE',
          unit: {
            code: 'PERS',
            name_ro: 'Persoane',
          },
        },
      ])
    );

    renderEditor({ datasetCode: 'POP107D', unitCodes: ['PERS'] });

    const unitButton = await screen.findByRole('button', { name: /^Persoane$/i });
    fireEvent.click(unitButton);
    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({ unitCodes: ['PERS'] })
      );
    });
  });

  it('reapplies default unit when clear is clicked', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 2,
            type: 'UNIT_OF_MEASURE',
            label_ro: 'Unitate',
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 10,
          dimension_type: 'UNIT_OF_MEASURE',
          unit: {
            code: 'PERS',
            name_ro: 'Persoane',
          },
        },
      ])
    );

    renderEditor({ datasetCode: 'POP107D', unitCodes: ['PERS'] });

    await screen.findByRole('button', { name: /^Persoane$/i });
    const clearButtons = await screen.findAllByRole('button', { name: /^Clear$/i });
    fireEvent.click(clearButtons[clearButtons.length - 1]!);

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({ unitCodes: ['PERS'] })
      );
    });
  });

  it('updates county selections without overriding locality selections', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Teritoriu',
          },
        ],
      })
    );

    renderEditor({ datasetCode: 'POP107D', sirutaCodes: ['54975'], territoryCodes: [] });

    const territoryButton = await screen.findByRole('button', { name: /^CJ$/i });
    fireEvent.click(territoryButton);

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          territoryCodes: ['CJ'],
        })
      );
    });

    const localityClears = mockUpdateSeries.mock.calls.filter(
      ([, payload]) =>
        Object.prototype.hasOwnProperty.call(payload ?? {}, 'sirutaCodes') &&
        payload?.sirutaCodes === undefined
    );
    expect(localityClears).toHaveLength(0);
  });

  it('reapplies default county when last county is removed', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Teritoriu',
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 1,
          dimension_type: 'TERRITORIAL',
          territory: { code: 'RO', name_ro: 'Romania' },
        },
        {
          nom_item_id: 2,
          dimension_type: 'TERRITORIAL',
          territory: { code: 'CJ', name_ro: 'Cluj' },
        },
      ])
    );

    renderEditor({ datasetCode: 'POP107D', territoryCodes: ['CJ'] });

    fireEvent.click(await screen.findByRole('button', { name: /^CJ$/i }));

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          territoryCodes: ['RO'],
        })
      );
    });
  });

  it('reapplies default locality when last locality is removed', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 2,
            type: 'TERRITORIAL',
            label_ro: 'Judete',
          },
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Localitati',
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 11,
          dimension_type: 'TERRITORIAL',
          territory: {
            siruta_code: '54976',
            code: 'SB',
            name_ro: 'Orasul Cisnadie',
          },
        },
      ])
    );

    renderEditor({ datasetCode: 'POP107D', sirutaCodes: ['54975'] });

    fireEvent.click(await screen.findByRole('button', { name: /Localitate 54975/i }));

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          sirutaCodes: ['54976'],
        })
      );
    });
  });

  it('keeps county and locality selections isolated across territorial dimensions', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 2,
            type: 'TERRITORIAL',
            label_ro: 'Judete',
          },
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Localitati',
          },
        ],
      })
    );

    renderEditor({ datasetCode: 'POP107D', territoryCodes: ['SB'], sirutaCodes: [] });

    const localityButton = await screen.findByRole('button', { name: /Localitate 54975/i });
    fireEvent.click(localityButton);

    await waitFor(() => {
      expect(mockUpdateSeries).toHaveBeenLastCalledWith(
        'series-1',
        expect.objectContaining({
          sirutaCodes: ['54975'],
        })
      );
    });

    const countyClears = mockUpdateSeries.mock.calls.filter(
      ([, payload]) =>
        Object.prototype.hasOwnProperty.call(payload ?? {}, 'territoryCodes') &&
        payload?.territoryCodes === undefined
    );
    expect(countyClears).toHaveLength(0);
  });

  it('does not render old CSV inputs for territory, siruta, and unit codes', async () => {
    renderEditor({ datasetCode: 'POP107D' });

    await waitFor(() => {
      expect(screen.queryByText('Territory Codes')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('SIRUTA Codes')).not.toBeInTheDocument();
    expect(screen.queryByText('Unit Codes')).not.toBeInTheDocument();
  });

  it('does not auto-select territorial defaults in map policy mode', async () => {
    const applyPatch = vi.fn();

    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP212B',
        name_ro: 'Divorturi pe judete',
        dimensions: [
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Teritoriu',
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 1,
          dimension_type: 'TERRITORIAL',
          territory: { code: 'RO', level: 'NATIONAL', name_ro: 'Romania' },
        },
        {
          nom_item_id: 2,
          dimension_type: 'TERRITORIAL',
          territory: { code: '54975', siruta_code: '54975', level: 'LAU', name_ro: 'Sibiu' },
        },
      ])
    );

    renderEditorWithAdapter({
      applyPatch,
      adapterOverrides: {
        allowedTerritoryLevels: ['LAU'],
        autoSelectTerritoryDefaults: false,
        autoReapplyTerritoryOnEmpty: false,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    await waitFor(() => {
      expect(applyPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetCode: 'POP212B',
        })
      );
    });

    const territorialSelectionCalls = applyPatch.mock.calls.filter(([patch]) => {
      const recordPatch = patch as Record<string, unknown> | undefined;
      return (
        Array.isArray(recordPatch?.territoryCodes) || Array.isArray(recordPatch?.sirutaCodes)
      );
    });

    expect(territorialSelectionCalls).toHaveLength(0);
  });

  it('keeps territorial selection empty when cleared in map policy mode', async () => {
    const applyPatch = vi.fn();

    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Teritoriu',
          },
        ],
      })
    );
    mockGetInsDimensionValuesPage.mockResolvedValue(
      createDimensionConnection([
        {
          nom_item_id: 1,
          dimension_type: 'TERRITORIAL',
          territory: { code: 'RO', level: 'NATIONAL', name_ro: 'Romania' },
        },
      ])
    );

    renderEditorWithAdapter({
      applyPatch,
      seriesOverrides: {
        datasetCode: 'POP107D',
        territoryCodes: ['CJ'],
      },
      adapterOverrides: {
        allowedTerritoryLevels: ['LAU'],
        autoSelectTerritoryDefaults: false,
        autoReapplyTerritoryOnEmpty: false,
      },
    });

    const clearButtons = await screen.findAllByRole('button', { name: /^Clear$/i });
    fireEvent.click(clearButtons[clearButtons.length - 1]!);

    await waitFor(() => {
      expect(applyPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          territoryCodes: undefined,
        })
      );
    });

    const fallbackCalls = applyPatch.mock.calls.filter(([patch]) => {
      const recordPatch = patch as Record<string, unknown> | undefined;
      return (
        Array.isArray(recordPatch?.territoryCodes) &&
        recordPatch.territoryCodes.includes('RO')
      );
    });
    expect(fallbackCalls).toHaveLength(0);
  });

  it('forwards LAU-only territory policy to dimension lists in adapter mode', async () => {
    mockGetInsDatasetDetails.mockResolvedValue(
      createDatasetDetails({
        code: 'POP107D',
        dimensions: [
          {
            index: 2,
            type: 'TERRITORIAL',
            label_ro: 'Judete',
          },
          {
            index: 3,
            type: 'TERRITORIAL',
            label_ro: 'Localitati',
          },
        ],
      })
    );

    renderEditorWithAdapter({
      seriesOverrides: {
        datasetCode: 'POP107D',
      },
      adapterOverrides: {
        allowedTerritoryLevels: ['LAU'],
      },
    });

    await waitFor(() => {
      expect(lastAllowedTerritoryLevelsByOptionKind['territory']).toEqual(['LAU']);
      expect(lastAllowedTerritoryLevelsByOptionKind['siruta']).toEqual(['LAU']);
    });
  });

  it('supports adapter mode and forwards dataset capability filter', async () => {
    const applyPatch = vi.fn();
    const series = createSeries();

    const queryClient = createTestQueryClient();
    render(
      <InsSeriesEditor
        adapter={{
          series,
          applyPatch,
          datasetFilter: {
            hasUatData: true,
            hasSiruta: true,
          },
        }}
      />,
      { queryClient }
    );

    fireEvent.click(screen.getByRole('button', { name: /Dataset POP212B/i }));

    await waitFor(() => {
      expect(applyPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetCode: 'POP212B',
        })
      );
    });
    expect(lastDatasetFilter).toEqual({
      hasUatData: true,
      hasSiruta: true,
    });
  });
});
