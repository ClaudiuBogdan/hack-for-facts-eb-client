import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExperimentalMapConfigPanel } from './experimental-map-config-panel';

describe('ExperimentalMapConfigPanel', () => {
  it('calls onOpenConfig when open config button is clicked', () => {
    const onOpenConfig = vi.fn();

    render(
      <ExperimentalMapConfigPanel
        collapsed={false}
        mapName="Experimental UAT Map"
        warningCount={0}
        onToggleCollapsed={vi.fn()}
        onMapNameChange={vi.fn()}
        onOpenConfig={onOpenConfig}
        onOpenWarnings={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Open config modal'));
    expect(onOpenConfig).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleCollapsed and hides content when collapsed', () => {
    const onToggleCollapsed = vi.fn();

    const { rerender } = render(
      <ExperimentalMapConfigPanel
        collapsed={false}
        mapName="Experimental UAT Map"
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onMapNameChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue('Experimental UAT Map')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Collapse config panel'));
    expect(onToggleCollapsed).toHaveBeenCalledWith(true);

    rerender(
      <ExperimentalMapConfigPanel
        collapsed={true}
        mapName="Experimental UAT Map"
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onMapNameChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.queryByDisplayValue('Experimental UAT Map')).not.toBeInTheDocument();
  });

  it('shows warning count button and opens warnings modal callback', () => {
    const onOpenWarnings = vi.fn();

    render(
      <ExperimentalMapConfigPanel
        collapsed={false}
        mapName="Experimental UAT Map"
        warningCount={3}
        onToggleCollapsed={vi.fn()}
        onMapNameChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={onOpenWarnings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '3 warnings' }));
    expect(onOpenWarnings).toHaveBeenCalledTimes(1);
  });

  it('updates map name when the title input changes', () => {
    const onMapNameChange = vi.fn();

    render(
      <ExperimentalMapConfigPanel
        collapsed={false}
        mapName="Experimental UAT Map"
        warningCount={0}
        onToggleCollapsed={vi.fn()}
        onMapNameChange={onMapNameChange}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Map name'), {
      target: { value: 'Edited map title' },
    });

    expect(onMapNameChange).toHaveBeenCalledWith('Edited map title');
  });
});
