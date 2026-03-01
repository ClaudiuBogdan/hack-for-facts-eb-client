import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsBinSchema, createDefaultAdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsBinsModal } from './advanced-map-analytics-bins-modal';

function createPreset() {
  const preset = createDefaultAdvancedMapAnalyticsBinsPreset('Execution bins');
  preset.config.bins = [
    AdvancedMapAnalyticsBinSchema.parse({ min: 0, max: 100, label: '0-100', color: '#ff0000' }),
    AdvancedMapAnalyticsBinSchema.parse({ min: 100, max: null, label: '>=100', color: '#00ff00' }),
  ];
  return preset;
}

function createContinuousPreset() {
  const preset = createPreset();
  preset.config.intervalMode = 'continuous';
  preset.config.continuousPercentiles = {
    min: 7.5,
    max: 92.25,
  };
  return preset;
}

describe('AdvancedMapAnalyticsBinsModal', () => {
  it('renders editor sections and active series summary', () => {
    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={() => ({ ok: true })}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit Bins Preset', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Active data series')).toBeInTheDocument();
    expect(screen.getByText('Execution analytics')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('keeps edits local and commits on close', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApplyPreset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onApplyPreset).toHaveBeenCalledTimes(1);
  });

  it('renders validation errors block', () => {
    const invalidPreset = createPreset();
    invalidPreset.config.bins = [
      AdvancedMapAnalyticsBinSchema.parse({ min: 0, max: 10, label: '0-10', color: '#ff0000' }),
      AdvancedMapAnalyticsBinSchema.parse({ min: 9, max: null, label: '>=9', color: '#00ff00' }),
    ];

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={invalidPreset}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={() => ({ ok: true })}
      />
    );

    expect(screen.getByText('Validation errors')).toBeInTheDocument();
    expect(screen.getByText(/overlaps with bin/i)).toBeInTheDocument();
  });

  it('commits bins title edits on close', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.change(screen.getByLabelText('Bins title'), {
      target: { value: 'Revenue bands' },
    });
    expect(onApplyPreset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          title: 'Revenue bands',
        }),
      })
    );
  });

  it('commits preset label edits on close', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.change(screen.getByLabelText('Preset label'), {
      target: { value: 'Updated label' },
    });
    expect(onApplyPreset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Updated label',
      })
    );
  });

  it('keeps modal open while editing bin range fields', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    const minInputs = screen.getAllByPlaceholderText('Min');
    fireEvent.change(minInputs[0], { target: { value: '12' } });
    fireEvent.blur(minInputs[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onApplyPreset).not.toHaveBeenCalled();
  });

  it('updates gradient anchors without crashing and commits on close', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    const startColorInput = document.querySelector<HTMLInputElement>(
      '#advanced-map-analytics-bins-gradient-start'
    );
    const endColorInput = document.querySelector<HTMLInputElement>(
      '#advanced-map-analytics-bins-gradient-end'
    );

    if (!startColorInput || !endColorInput) {
      throw new Error('Expected gradient color inputs to be rendered');
    }

    fireEvent.change(startColorInput, { target: { value: '#112233' } });
    fireEvent.change(endColorInput, { target: { value: '#445566' } });

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          gradient: expect.objectContaining({
            startColor: '#112233',
            endColor: '#445566',
          }),
        }),
      })
    );
  });

  it('switches gradient anchor colors with the swap button', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch gradient colors' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          gradient: expect.objectContaining({
            startColor: '#d7301f',
            endColor: '#fff7bc',
          }),
        }),
      })
    );
  });

  it('shows percentile inputs and hides bins section in continuous mode', () => {
    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createContinuousPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={() => ({ ok: true })}
      />
    );

    expect(screen.getByLabelText('Min percentile')).toHaveValue(7.5);
    expect(screen.getByLabelText('Max percentile')).toHaveValue(92.25);
    expect(screen.queryByRole('button', { name: 'Regenerate from active data' })).not.toBeInTheDocument();
  });

  it('commits normalized continuous percentile bounds on blur', () => {
    const onApplyPreset = vi.fn().mockReturnValue({ ok: true });

    render(
      <AdvancedMapAnalyticsBinsModal
        open={true}
        preset={createContinuousPreset()}
        activeSeriesLabel="Execution analytics"
        activeSeriesValues={new Map()}
        onOpenChange={vi.fn()}
        onApplyPreset={onApplyPreset}
      />
    );

    const minInput = screen.getByLabelText('Min percentile');
    fireEvent.change(minInput, { target: { value: '100' } });
    fireEvent.blur(minInput);

    const maxInput = screen.getByLabelText('Max percentile');
    fireEvent.change(maxInput, { target: { value: '95.5' } });
    fireEvent.blur(maxInput);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          continuousPercentiles: expect.objectContaining({
            min: expect.any(Number),
            max: 95.5,
          }),
        }),
      })
    );

    const committedConfig = onApplyPreset.mock.calls[0]?.[0]?.config;
    expect(committedConfig.continuousPercentiles.min).toBeLessThan(
      committedConfig.continuousPercentiles.max
    );
  });
});
