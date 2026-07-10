import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient, fireEvent, render, screen, waitFor } from '@/test/test-utils';
import type { InsDataset, PageInfo } from '@/schemas/ins';

import { InsDatasetList } from './ins-dataset-list';

const mockSearchInsDatasets = vi.fn();

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

vi.mock('@/features/statistics/api/graphql/ins-fetchers', () => ({
  searchInsDatasets: (params: unknown) => mockSearchInsDatasets(params),
}));

function createDataset(overrides: Partial<InsDataset> = {}): InsDataset {
  return {
    id: 'dataset-1',
    code: 'POP100A',
    name_ro: 'Set A',
    periodicity: ['ANNUAL'],
    has_uat_data: true,
    has_county_data: true,
    has_siruta: true,
    ...overrides,
  };
}

const pageInfo: PageInfo = {
  totalCount: 100,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('InsDatasetList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchInsDatasets.mockResolvedValue({
      nodes: [createDataset()],
      pageInfo,
    });
  });

  it('loads datasets with offset paging and propagates selection', async () => {
    const toggleSelect = vi.fn();

    mockSearchInsDatasets.mockImplementation((params: { offset?: number }) => {
      if ((params.offset ?? 0) === 0) {
        return Promise.resolve({
          nodes: [
            createDataset({ id: '1', code: 'POP100A', name_ro: 'Set A' }),
            createDataset({ id: '2', code: 'POP100B', name_ro: 'Set B' }),
          ],
          pageInfo: { totalCount: 3, hasNextPage: true, hasPreviousPage: false },
        });
      }

      return Promise.resolve({
        nodes: [createDataset({ id: '3', code: 'POP100C', name_ro: 'Set C' })],
        pageInfo: { totalCount: 3, hasNextPage: false, hasPreviousPage: true },
      });
    });

    const queryClient = createTestQueryClient();
    render(
      <InsDatasetList selectedOptions={[]} toggleSelect={toggleSelect} pageSize={2} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('POP100A - Set A')).toBeInTheDocument();
      expect(mockSearchInsDatasets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 2, offset: 0 })
      );
    });

    await waitFor(() => {
      expect(mockSearchInsDatasets).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 2, offset: 2 })
      );
    });

    fireEvent.click(screen.getByText('POP100A - Set A'));
    expect(toggleSelect).toHaveBeenCalledWith({ id: 'POP100A', label: 'POP100A - Set A' });
  });

  it('forwards typed search to API filter', async () => {
    const queryClient = createTestQueryClient();
    render(
      <InsDatasetList selectedOptions={[]} toggleSelect={vi.fn()} pageSize={100} />,
      { queryClient }
    );

    const searchInput = await screen.findByLabelText('Search INS datasets (ex: POP107D)');
    fireEvent.change(searchInput, {
      target: { value: 'divort' },
    });

    await waitFor(() => {
      expect(mockSearchInsDatasets).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({ search: 'divort' }),
        })
      );
    });
  });

  it('hides search input when option count is below threshold', async () => {
    mockSearchInsDatasets.mockResolvedValue({
      nodes: [createDataset({ id: '1', code: 'POP100A', name_ro: 'Set A' })],
      pageInfo: { totalCount: 5, hasNextPage: false, hasPreviousPage: false },
    });

    const queryClient = createTestQueryClient();
    render(
      <InsDatasetList selectedOptions={[]} toggleSelect={vi.fn()} pageSize={100} />,
      { queryClient }
    );

    await waitFor(() => {
      expect(mockSearchInsDatasets).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 })
      );
    });

    expect(
      screen.queryByLabelText('Search INS datasets (ex: POP107D)')
    ).not.toBeInTheDocument();
  });

  it('filters datasets by UAT and SIRUTA capabilities', async () => {
    mockSearchInsDatasets.mockResolvedValue({
      nodes: [
        createDataset({ id: '1', code: 'POP100A', name_ro: 'Set A', has_uat_data: true, has_siruta: true }),
        createDataset({ id: '2', code: 'POP100B', name_ro: 'Set B', has_uat_data: true, has_siruta: false }),
        createDataset({ id: '3', code: 'POP100C', name_ro: 'Set C', has_uat_data: false, has_siruta: true }),
      ],
      pageInfo: { totalCount: 3, hasNextPage: false, hasPreviousPage: false },
    });

    const queryClient = createTestQueryClient();
    render(
      <InsDatasetList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        pageSize={100}
        datasetFilter={{ hasUatData: true, hasSiruta: true }}
      />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('POP100A - Set A')).toBeInTheDocument();
    });

    expect(screen.queryByText('POP100B - Set B')).not.toBeInTheDocument();
    expect(screen.queryByText('POP100C - Set C')).not.toBeInTheDocument();
    expect(mockSearchInsDatasets).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          hasUatData: true,
        }),
      })
    );
  });

  it('keeps scanning pages when first page has no SIRUTA matches', async () => {
    mockSearchInsDatasets.mockImplementation((params: { offset?: number }) => {
      if ((params.offset ?? 0) === 0) {
        return Promise.resolve({
          nodes: [
            createDataset({
              id: '1',
              code: 'POP100A',
              name_ro: 'Set A',
              has_uat_data: true,
              has_siruta: false,
            }),
          ],
          pageInfo: { totalCount: 2, hasNextPage: true, hasPreviousPage: false },
        });
      }

      return Promise.resolve({
        nodes: [
          createDataset({
            id: '2',
            code: 'POP100B',
            name_ro: 'Set B',
            has_uat_data: true,
            has_siruta: true,
          }),
        ],
        pageInfo: { totalCount: 2, hasNextPage: false, hasPreviousPage: true },
      });
    });

    const queryClient = createTestQueryClient();
    render(
      <InsDatasetList
        selectedOptions={[]}
        toggleSelect={vi.fn()}
        pageSize={1}
        datasetFilter={{ hasUatData: true, hasSiruta: true }}
      />,
      { queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('POP100B - Set B')).toBeInTheDocument();
    });

    expect(mockSearchInsDatasets).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1, offset: 0 })
    );
    expect(mockSearchInsDatasets).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1, offset: 1 })
    );
  });
});
