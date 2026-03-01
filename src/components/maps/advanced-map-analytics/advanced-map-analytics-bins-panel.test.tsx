import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultAdvancedMapAnalyticsBinsPreset } from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsBinsPanel } from './advanced-map-analytics-bins-panel';

describe('AdvancedMapAnalyticsBinsPanel', () => {
  it('calls add callback when plus button is clicked', () => {
    const onAddPreset = vi.fn();

    render(
      <AdvancedMapAnalyticsBinsPanel
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
    const preset = createDefaultAdvancedMapAnalyticsBinsPreset('Preset 1');

    render(
      <AdvancedMapAnalyticsBinsPanel
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

    expect(screen.getByText('1 preset configured')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set active bins preset' }));
    expect(onSetActivePreset).toHaveBeenCalledWith(preset.id);
  });
});
