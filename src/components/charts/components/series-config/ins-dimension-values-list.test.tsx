import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { InsDimensionValueConnection, PageInfo } from '@/schemas/ins';

import { InsDimensionValuesList } from './ins-dimension-values-list';

const mockGetInsDimensionValuesPage = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 48,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 48,
        size: 48,
      })),
    scrollOffset: 0,
    scrollToOffset: vi.fn(),
  }),
}));

vi.mock('@/lib/api/ins', () => ({
  getInsDimensionValuesPage: (params: unknown) => mockGetInsDimensionValuesPage(params),
}));

const pageInfo: PageInfo = {
  totalCount: 100,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('InsDimensionValuesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInsDimensionValuesPage.mockResolvedValue({
      nodes: [],
      pageInfo,
    } satisfies InsDimensionValueConnection);
  });

  it('maps classification values and propagates selection', async () => {
    const toggleSelect = vi.fn();

    mockGetInsDimensionValuesPage.mockResolvedValue({
      nodes: [
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
          classification_value: {
            type_code: 'SEXE',
            code: 'F',
            name_ro: 'Feminin',
          },
        },
      ],
      pageInfo,
    } satisfies InsDimensionValueConnection);

    const queryClient = createTestQueryClient();
    render(
      <InsDimensionValuesList
        selectedOptions={[]}
        toggleSelect={toggleSelect}
        datasetCode="POP107D"
        dimensionIndex={1}
        optionKind="classification"
        classificationTypeCode="SEXE"
      />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('M - Masculin')).toBeInTheDocument();
      expect(mockGetInsDimensionValuesPage).toHaveBeenCalledWith(
        expect.objectContaining({
          datasetCode: 'POP107D',
          dimensionIndex: 1,
          offset: 0,
        })
      );
    });

    fireEvent.click(screen.getByText('M - Masculin'));
    expect(toggleSelect).toHaveBeenCalledWith({ id: 'M', label: 'M - Masculin' });
  });

  it('forwards search term and filters by classification type code', async () => {
    mockGetInsDimensionValuesPage.mockResolvedValue({
      nodes: [
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
          classification_value: {
            type_code: 'MEDIU',
            code: 'URBAN',
            name_ro: 'Urban',
          },
        },
      ],
      pageInfo,
    } satisfies InsDimensionValueConnection);

    const queryClient = createTestQueryClient();
    render(
      <InsDimensionValuesList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        datasetCode="POP107D"
        dimensionIndex={1}
        optionKind="classification"
        classificationTypeCode="SEXE"
      />,
      { queryClient }
    );

    const searchInput = await screen.findByLabelText('Search classification values');
    fireEvent.change(searchInput, {
      target: { value: 'mas' },
    });

    await waitFor(() => {
      expect(mockGetInsDimensionValuesPage).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'mas',
        })
      );
    });

    expect(await screen.findByText('M - Masculin')).toBeInTheDocument();
    expect(screen.queryByText('URBAN - Urban')).not.toBeInTheDocument();
  });

  it('hides search input when option count is below threshold', async () => {
    mockGetInsDimensionValuesPage.mockResolvedValue({
      nodes: [
        {
          nom_item_id: 1,
          dimension_type: 'CLASSIFICATION',
          classification_value: {
            type_code: 'SEXE',
            code: 'M',
            name_ro: 'Masculin',
          },
        },
      ],
      pageInfo: { totalCount: 5, hasNextPage: false, hasPreviousPage: false },
    } satisfies InsDimensionValueConnection);

    const queryClient = createTestQueryClient();
    render(
      <InsDimensionValuesList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        datasetCode="POP107D"
        dimensionIndex={1}
        optionKind="classification"
        classificationTypeCode="SEXE"
      />,
      { queryClient }
    );

    await waitFor(() => {
      expect(mockGetInsDimensionValuesPage).toHaveBeenCalledWith(
        expect.objectContaining({ datasetCode: 'POP107D', dimensionIndex: 1 })
      );
    });

    expect(screen.queryByLabelText('Search classification values')).not.toBeInTheDocument();
  });

  it('filters territorial options by allowed territory levels', async () => {
    mockGetInsDimensionValuesPage.mockResolvedValue({
      nodes: [
        {
          nom_item_id: 1,
          dimension_type: 'TERRITORIAL',
          territory: {
            code: 'RO',
            level: 'NATIONAL',
            name_ro: 'Romania',
          },
        },
        {
          nom_item_id: 2,
          dimension_type: 'TERRITORIAL',
          territory: {
            code: 'CJ',
            level: 'NUTS3',
            name_ro: 'Cluj',
          },
        },
        {
          nom_item_id: 3,
          dimension_type: 'TERRITORIAL',
          territory: {
            code: '4001',
            siruta_code: '4001',
            level: 'LAU',
            name_ro: 'Localitate Test',
          },
        },
      ],
      pageInfo,
    } satisfies InsDimensionValueConnection);

    const queryClient = createTestQueryClient();
    render(
      <InsDimensionValuesList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        datasetCode="POP107D"
        dimensionIndex={3}
        optionKind="territory"
        allowedTerritoryLevels={['LAU']}
      />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('4001 - Localitate Test')).toBeInTheDocument();
    });

    expect(screen.queryByText('RO - Romania')).not.toBeInTheDocument();
    expect(screen.queryByText('CJ - Cluj')).not.toBeInTheDocument();
  });

  it('refetches when territory level policy changes', async () => {
    mockGetInsDimensionValuesPage.mockResolvedValue({
      nodes: [
        {
          nom_item_id: 1,
          dimension_type: 'TERRITORIAL',
          territory: {
            code: 'RO',
            level: 'NATIONAL',
            name_ro: 'Romania',
          },
        },
        {
          nom_item_id: 2,
          dimension_type: 'TERRITORIAL',
          territory: {
            code: '4001',
            siruta_code: '4001',
            level: 'LAU',
            name_ro: 'Localitate Test',
          },
        },
      ],
      pageInfo,
    } satisfies InsDimensionValueConnection);

    const queryClient = createTestQueryClient();
    const rendered = render(
      <InsDimensionValuesList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        datasetCode="POP107D"
        dimensionIndex={3}
        optionKind="territory"
        allowedTerritoryLevels={['LAU']}
      />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('4001 - Localitate Test')).toBeInTheDocument();
      expect(screen.queryByText('RO - Romania')).not.toBeInTheDocument();
    });

    rendered.rerender(
      <InsDimensionValuesList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        datasetCode="POP107D"
        dimensionIndex={3}
        optionKind="territory"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('RO - Romania')).toBeInTheDocument();
    });

    expect(mockGetInsDimensionValuesPage).toHaveBeenCalledTimes(2);
  });
});
