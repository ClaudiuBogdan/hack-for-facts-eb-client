import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentalMapBinsList } from './experimental-map-bins-list';

describe('ExperimentalMapBinsList', () => {
  it('prevents deleting the last bin', () => {
    render(
      <ExperimentalMapBinsList
        bins={[{ min: 0, max: null, label: '>=0', color: '#ff0000' }]}
        onApplyBins={() => ({ ok: true })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete bin' }));

    expect(screen.getByText('At least one bin is required.')).toBeInTheDocument();
  });

  it('shows inline error when apply callback rejects invalid update', () => {
    render(
      <ExperimentalMapBinsList
        bins={[
          { min: 0, max: 100, label: '0-100', color: '#ff0000' },
          { min: 100, max: null, label: '>=100', color: '#00ff00' },
        ]}
        onApplyBins={() => ({ ok: false, error: 'Bins overlap.' })}
      />
    );

    fireEvent.change(screen.getByLabelText('Min', { selector: 'input#bin-min-1' }), {
      target: { value: '50' },
    });
    fireEvent.blur(screen.getByLabelText('Min', { selector: 'input#bin-min-1' }));

    expect(screen.getByText('Bins overlap.')).toBeInTheDocument();
  });

  it('rejects blank min input instead of coercing to zero', () => {
    const onApplyBins = vi.fn(() => ({ ok: true }));

    render(
      <ExperimentalMapBinsList
        bins={[
          { min: 0, max: 100, label: '0-100', color: '#ff0000' },
          { min: 100, max: null, label: '>=100', color: '#00ff00' },
        ]}
        onApplyBins={onApplyBins}
      />
    );

    const minInput = screen.getByLabelText('Min', { selector: 'input#bin-min-1' });
    fireEvent.change(minInput, { target: { value: '' } });
    fireEvent.blur(minInput);

    expect(screen.getByText('Bin 2 min must be a finite number.')).toBeInTheDocument();
    expect(onApplyBins).not.toHaveBeenCalled();
  });

  it('does not mutate source bins when reorder commit is rejected', () => {
    const originalBins = [
      { min: 0, max: 10, label: '0-10', color: '#ff0000' },
      { min: 10, max: null, label: '', color: '#00ff00' },
    ];

    render(
      <ExperimentalMapBinsList
        bins={originalBins}
        onApplyBins={() => ({ ok: false, error: 'Invalid reorder.' })}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Move bin down' })[0]);

    expect(screen.getByText('Invalid reorder.')).toBeInTheDocument();
    expect(originalBins[0]).toEqual({ min: 0, max: 10, label: '0-10', color: '#ff0000' });
    expect(originalBins[1]).toEqual({ min: 10, max: null, label: '', color: '#00ff00' });
  });
});
