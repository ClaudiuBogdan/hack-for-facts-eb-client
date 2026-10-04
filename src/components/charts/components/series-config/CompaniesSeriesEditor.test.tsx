import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseFixture, releaseRef } from '@/features/private-companies/api/company-analytics.fixture';
import { CompaniesAnalyticsSeriesConfigurationSchema, type CompaniesAnalyticsSeriesConfiguration } from '@/schemas/charts';
import { CompaniesSeriesEditor } from './CompaniesSeriesEditor';

/**
 * The company series' editor names the ONRC edition its pinned release was
 * exported from — the date as ONRC published it — and lists a saved scope's
 * consensus basis key and ONRC observations in words; a pin the API no longer
 * serves says so and names no edition.
 */

const api = vi.hoisted(() => ({ refuse: false, releases: [] as unknown[] }));

vi.mock('@/lib/graphql/graphql-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/graphql/graphql-client')>();
  return {
    ...actual,
    graphqlQuery: (_document: string, variables: Record<string, unknown>, options: { readonly operationName: string }) => {
      api.releases.push(variables.release);
      if (options.operationName !== 'CompanyAnalysisRelease') return Promise.reject(new Error(`unexpected ${options.operationName}`));
      if (api.refuse && variables.release === '7') return Promise.reject(new actual.GraphQLRequestError('gone', { graphQLErrors: [{ message: 'gone', extensions: { code: 'INVALID_INPUT', field: 'release' } }] }));
      return Promise.resolve({ companyAnalysisRelease: releaseFixture({ release: releaseRef(String(variables.release ?? '8')) }) });
    },
  };
});

const store = vi.hoisted(() => ({ updateSeries: vi.fn() }));

vi.mock('@/components/charts/hooks/useChartStore', () => ({
  useChartStore: () => ({ chart: { config: { chartType: 'line' }, series: [] }, updateSeries: store.updateSeries }),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => <a className={className}>{children}</a>,
}));

function series(overrides: Partial<CompaniesAnalyticsSeriesConfiguration> = {}): CompaniesAnalyticsSeriesConfiguration {
  return CompaniesAnalyticsSeriesConfigurationSchema.parse({
    id: 'companies',
    type: 'companies-analytics',
    label: 'Turnover',
    metric: 'TURNOVER',
    scope: { county: { in: ['(multiple_values)'] }, onrc: { status: ['1048'], onrcCaen: ['rev2:6201'] } },
    release: { id: '7', policy: 'pinned' },
    ...overrides,
  });
}

function renderEditor(value: CompaniesAnalyticsSeriesConfiguration) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CompaniesSeriesEditor series={value} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.refuse = false;
  api.releases = [];
  store.updateSeries.mockReset();
});

describe('CompaniesSeriesEditor', () => {
  it('names the pinned release’s ONRC edition and the date ONRC published it', async () => {
    renderEditor(series());
    expect(await screen.findByText(/Its counties, statuses and legal forms are those of ONRC edition 41, published by ONRC on 30 September 2026\./u)).toHaveTextContent(/^Pinned to release 7\./u);
  });

  it('lists a saved consensus basis key and the ONRC observations in words', async () => {
    renderEditor(series());
    expect(await screen.findByText(/Fără județ comun — valori diferite în înscrieri/u)).toHaveTextContent('aceeași înscriere ONRC: starea 1048 · CAEN exact rev2:6201');
  });

  it('says a pin the API refuses as no longer available, names no edition, and pins nothing by itself', async () => {
    api.refuse = true;
    renderEditor(series());
    expect(await screen.findByText(/Release 7 of the companies analysis is no longer available/u)).toBeInTheDocument();
    expect(screen.queryByText(/ONRC edition/u)).not.toBeInTheDocument();
    expect(store.updateSeries).not.toHaveBeenCalled();
  });
});
