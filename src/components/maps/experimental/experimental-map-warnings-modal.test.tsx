import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentalMapWarningsModal } from './experimental-map-warnings-modal';
import type { MapSeriesWarning } from '@/lib/map-series/interfaces';

describe('ExperimentalMapWarningsModal', () => {
  it('renders empty state when there are no warnings', () => {
    render(
      <ExperimentalMapWarningsModal
        open={true}
        warnings={[]}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('No warnings.')).toBeInTheDocument();
  });

  it('renders full warning entries with context and details', () => {
    const warnings: MapSeriesWarning[] = [
      {
        type: 'divide_by_zero',
        message: 'Division by zero in calc-series',
        seriesId: 'calc-series',
        dependencySeriesId: 'base-series',
        sirutaCode: '12345',
        details: { operation: 'divide', numerator: 100, denominator: 0 },
      },
    ];

    render(
      <ExperimentalMapWarningsModal
        open={true}
        warnings={warnings}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Divide By Zero')).toBeInTheDocument();
    expect(screen.getByText('Division by zero in calc-series')).toBeInTheDocument();
    expect(screen.getByText('Series: calc-series')).toBeInTheDocument();
    expect(screen.getByText('Dependency: base-series')).toBeInTheDocument();
    expect(screen.getByText('SIRUTA: 12345')).toBeInTheDocument();
    expect(screen.getByText(/"operation":\s*"divide"/)).toBeInTheDocument();
  });
});
