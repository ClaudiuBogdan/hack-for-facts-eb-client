import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsConfigPanel } from './advanced-map-analytics-config-panel';

function renderConfigPanel(overrides: Partial<ComponentProps<typeof AdvancedMapAnalyticsConfigPanel>> = {}) {
  return render(
    <AdvancedMapAnalyticsConfigPanel
      collapsed={false}
      countyBoundariesEnabled={true}
      warningCount={0}
      onToggleCollapsed={vi.fn()}
      onCountyBoundariesEnabledChange={vi.fn()}
      onOpenConfig={vi.fn()}
      onOpenWarnings={vi.fn()}
      {...overrides}
    />
  );
}

describe('AdvancedMapAnalyticsConfigPanel', () => {
  it('calls onOpenConfig when open config button is clicked', () => {
    const onOpenConfig = vi.fn();

    renderConfigPanel({ onOpenConfig });

    fireEvent.click(screen.getByLabelText('Open config modal'));
    expect(onOpenConfig).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleCollapsed and hides content when collapsed', () => {
    const onToggleCollapsed = vi.fn();

    const { rerender } = renderConfigPanel({ onToggleCollapsed });

    expect(screen.getByRole('switch', { name: 'Toggle county boundaries' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Collapse config panel'));
    expect(onToggleCollapsed).toHaveBeenCalledWith(true);

    rerender(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={true}
        countyBoundariesEnabled={true}
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onCountyBoundariesEnabledChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    // County boundaries switch is inside collapsible, so it should be hidden when collapsed
    expect(screen.queryByRole('switch', { name: 'Toggle county boundaries' })).not.toBeInTheDocument();
  });

  it('shows warning count button and opens warnings modal callback', () => {
    const onOpenWarnings = vi.fn();

    renderConfigPanel({ warningCount: 3, onOpenWarnings });

    fireEvent.click(screen.getByRole('button', { name: '3 warnings' }));
    expect(onOpenWarnings).toHaveBeenCalledTimes(1);
  });

  it('calls onCountyBoundariesEnabledChange when county boundaries switch changes', () => {
    const onCountyBoundariesEnabledChange = vi.fn();

    renderConfigPanel({
      countyBoundariesEnabled: true,
      onCountyBoundariesEnabledChange,
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle county boundaries' }));
    expect(onCountyBoundariesEnabledChange).toHaveBeenCalledWith(false);
  });

  it('does not render warnings section when warning count is zero', () => {
    renderConfigPanel();

    expect(screen.queryByRole('button', { name: /warning/i })).not.toBeInTheDocument();
  });
});
