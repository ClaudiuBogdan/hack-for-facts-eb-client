import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentalMapBinSchema } from '@/schemas/experimental-map';
import { ExperimentalMapBinsList } from './experimental-map-bins-list';

function makeBin(input: Parameters<typeof ExperimentalMapBinSchema.parse>[0]) {
  return ExperimentalMapBinSchema.parse(input);
}

describe('ExperimentalMapBinsList', () => {
  it('prevents deleting the last bin', () => {
    render(
      <ExperimentalMapBinsList
        bins={[makeBin({ min: 0, max: null, label: '>=0', color: '#ff0000' })]}
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
          makeBin({ min: 0, max: 100, label: '0-100', color: '#ff0000' }),
          makeBin({ min: 100, max: null, label: '>=100', color: '#00ff00' }),
        ]}
        onApplyBins={() => ({ ok: false, error: 'Bins overlap.' })}
      />
    );

    const minInputs = screen.getAllByPlaceholderText('Min');
    fireEvent.change(minInputs[1], { target: { value: '50' } });
    fireEvent.blur(minInputs[1]);

    expect(screen.getByText('Bins overlap.')).toBeInTheDocument();
  });

  it('rejects blank min input instead of coercing to zero', () => {
    const onApplyBins = vi.fn(() => ({ ok: true }));

    render(
      <ExperimentalMapBinsList
        bins={[
          makeBin({ min: 0, max: 100, label: '0-100', color: '#ff0000' }),
          makeBin({ min: 100, max: null, label: '>=100', color: '#00ff00' }),
        ]}
        onApplyBins={onApplyBins}
      />
    );

    const minInputs = screen.getAllByPlaceholderText('Min');
    fireEvent.change(minInputs[1], { target: { value: '' } });
    fireEvent.blur(minInputs[1]);

    expect(screen.getByText('Bin 2 min must be a finite number.')).toBeInTheDocument();
    expect(onApplyBins).not.toHaveBeenCalled();
  });

  it('does not mutate source bins when reorder commit is rejected', () => {
    const originalBins = [
      makeBin({ min: 0, max: 10, label: '0-10', color: '#ff0000' }),
      makeBin({ min: 10, max: null, label: '', color: '#00ff00' }),
    ];

    render(
      <ExperimentalMapBinsList
        bins={originalBins}
        onApplyBins={() => ({ ok: false, error: 'Invalid reorder.' })}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);

    expect(screen.getByText('Invalid reorder.')).toBeInTheDocument();
    expect(originalBins[0]).toMatchObject({ min: 0, max: 10, label: '0-10', color: '#ff0000' });
    expect(originalBins[1]).toMatchObject({ min: 10, max: null, label: '', color: '#00ff00' });
  });

  it('applies disabled toggle for a bin group', () => {
    const onApplyBins = vi.fn(() => ({ ok: true }));
    const firstBin = makeBin({ min: 0, max: 100, label: '0-100', color: '#ff0000' });
    const secondBin = makeBin({ min: 100, max: null, label: '>=100', color: '#00ff00' });

    render(
      <ExperimentalMapBinsList
        bins={[firstBin, secondBin]}
        onApplyBins={onApplyBins}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Disable bin' })[0]);

    expect(onApplyBins).toHaveBeenCalledWith([
      { ...firstBin, disabled: true },
      secondBin,
    ]);
  });
});
