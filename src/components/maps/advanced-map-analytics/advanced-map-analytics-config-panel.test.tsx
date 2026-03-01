import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsConfigPanel } from './advanced-map-analytics-config-panel';

describe('AdvancedMapAnalyticsConfigPanel', () => {
  it('calls onOpenConfig when open config button is clicked', () => {
    const onOpenConfig = vi.fn();

    render(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={false}
        activeView="map"
        mapName="Untitled map"
        warningCount={0}
        onToggleCollapsed={vi.fn()}
        onActiveViewChange={vi.fn()}
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
      <AdvancedMapAnalyticsConfigPanel
        collapsed={false}
        activeView="map"
        mapName="Untitled map"
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onActiveViewChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.getByText('Untitled map')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Collapse config panel'));
    expect(onToggleCollapsed).toHaveBeenCalledWith(true);

    rerender(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={true}
        activeView="map"
        mapName="Untitled map"
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onActiveViewChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.queryByText('Untitled map')).not.toBeInTheDocument();
  });

  it('shows warning count button and opens warnings modal callback', () => {
    const onOpenWarnings = vi.fn();

    render(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={false}
        activeView="map"
        mapName="Untitled map"
        warningCount={3}
        onToggleCollapsed={vi.fn()}
        onActiveViewChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={onOpenWarnings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '3 warnings' }));
    expect(onOpenWarnings).toHaveBeenCalledTimes(1);
  });

  it('calls onActiveViewChange when the view selector changes', () => {
    const onActiveViewChange = vi.fn();

    render(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={false}
        activeView="map"
        mapName="Untitled map"
        warningCount={0}
        onToggleCollapsed={vi.fn()}
        onActiveViewChange={onActiveViewChange}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Table'));
    expect(onActiveViewChange).toHaveBeenCalledWith('table');
  });

  it('does not render warnings section when warning count is zero', () => {
    render(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={false}
        activeView="map"
        mapName="Untitled map"
        warningCount={0}
        onToggleCollapsed={vi.fn()}
        onActiveViewChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    expect(screen.queryByText('No warnings')).not.toBeInTheDocument();
  });

});
