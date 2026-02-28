import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultExperimentalMapBinsPreset } from '@/schemas/experimental-map';
import { ExperimentalMapBinsPanel } from './experimental-map-bins-panel';

describe('ExperimentalMapBinsPanel', () => {
  it('calls add callback when plus button is clicked', () => {
    const onAddPreset = vi.fn();

    render(
      <ExperimentalMapBinsPanel
        collapsed={false}
        presets={[]}
        onToggleCollapsed={vi.fn()}
        onAddPreset={onAddPreset}
        onSetActivePreset={vi.fn()}
        onEditPreset={vi.fn()}
        onDeletePreset={vi.fn()}
        onReorderPresets={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add bins preset' }));
    expect(onAddPreset).toHaveBeenCalledTimes(1);
  });

  it('sets preset active when preset icon is clicked', () => {
    const onSetActivePreset = vi.fn();
    const preset = createDefaultExperimentalMapBinsPreset('Preset 1');

    render(
      <ExperimentalMapBinsPanel
        collapsed={false}
        presets={[preset]}
        onToggleCollapsed={vi.fn()}
        onAddPreset={vi.fn()}
        onSetActivePreset={onSetActivePreset}
        onEditPreset={vi.fn()}
        onDeletePreset={vi.fn()}
        onReorderPresets={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set active bins preset' }));
    expect(onSetActivePreset).toHaveBeenCalledWith(preset.id);
  });
});
