import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultExperimentalMapBinsPreset } from '@/schemas/experimental-map';
import { ExperimentalMapBinsModal } from './experimental-map-bins-modal';

function createPreset() {
  const preset = createDefaultExperimentalMapBinsPreset('Execution bins');
  preset.config.bins = [
    { min: 0, max: 100, label: '0-100', color: '#ff0000' },
    { min: 100, max: null, label: '>=100', color: '#00ff00' },
  ];
  return preset;
}

describe('ExperimentalMapBinsModal', () => {
  it('renders editor sections and active series summary', () => {
    render(
      <ExperimentalMapBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        validationErrors={[]}
        onOpenChange={vi.fn()}
        onRegenerate={vi.fn()}
        onApplyPreset={() => ({ ok: true })}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit Bins Preset', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Active data series')).toBeInTheDocument();
    expect(screen.getByText('Execution analytics')).toBeInTheDocument();
    expect(screen.getByText('NO_DATA')).toBeInTheDocument();
  });

  it('calls onApplyPreset when applying gradient colors', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <ExperimentalMapBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        validationErrors={[]}
        onOpenChange={vi.fn()}
        onRegenerate={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply Gradient' }));
    expect(onApplyPreset).toHaveBeenCalledTimes(1);
  });

  it('renders validation errors block', () => {
    render(
      <ExperimentalMapBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        validationErrors={['Bins overlap detected']}
        onOpenChange={vi.fn()}
        onRegenerate={vi.fn()}
        onApplyPreset={() => ({ ok: true })}
      />
    );

    expect(screen.getByText('Validation errors')).toBeInTheDocument();
    expect(screen.getByText('Bins overlap detected')).toBeInTheDocument();
  });

  it('allows toggling legend bin labels visibility', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <ExperimentalMapBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        validationErrors={[]}
        onOpenChange={vi.fn()}
        onRegenerate={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Hide bin labels in legend' }));

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          showBinLabelOnLegend: false,
        }),
      })
    );
  });

  it('applies preset label edits immediately', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <ExperimentalMapBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        validationErrors={[]}
        onOpenChange={vi.fn()}
        onRegenerate={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.change(screen.getByLabelText('Preset label'), {
      target: { value: 'Updated label' },
    });

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Updated label',
      })
    );
  });
});
