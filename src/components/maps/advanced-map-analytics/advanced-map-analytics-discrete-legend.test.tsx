import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsDiscreteLegend } from './advanced-map-analytics-discrete-legend';

describe('AdvancedMapAnalyticsDiscreteLegend', () => {
  it('splits composed labels into aligned label and interval text', () => {
    render(
      <AdvancedMapAnalyticsDiscreteLegend
        title="Data series 2"
        entries={[
          {
            groupId: 'g1',
            label: 'Label 1 — 227 - 47.699,4',
            color: '#fee391',
          },
        ]}
      />
    );

    expect(screen.getByText('Label 1')).toBeInTheDocument();
    expect(screen.getByText('227 - 47.699,4')).toBeInTheDocument();
    expect(screen.queryByText('Label 1 — 227 - 47.699,4')).not.toBeInTheDocument();
  });

  it('does not render em dash separators in legend rows', () => {
    const { container } = render(
      <AdvancedMapAnalyticsDiscreteLegend
        title="Data series 2"
        entries={[
          {
            groupId: 'g1',
            label: 'Label 1 — 227 - 47.699,4',
            color: '#fee391',
          },
          {
            groupId: 'g2',
            label: 'Label 2 — >= 190.116,6',
            color: '#d7301f',
          },
        ]}
      />
    );

    expect(container.textContent ?? '').not.toContain('—');
  });

  it('renders no-data row without interval text', () => {
    render(
      <AdvancedMapAnalyticsDiscreteLegend
        title="Data series 2"
        entries={[
          {
            groupId: 'g1',
            label: 'Label 1 — 227 - 47.699,4',
            color: '#fee391',
          },
          {
            groupId: 'NO_DATA',
            label: 'Fara date',
            color: '#cccccc',
          },
        ]}
      />
    );

    expect(screen.getByText('Fara date')).toBeInTheDocument();
    expect(screen.queryByText('NO_DATA')).not.toBeInTheDocument();
  });
});
