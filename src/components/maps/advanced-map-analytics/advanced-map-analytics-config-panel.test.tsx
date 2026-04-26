import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsConfigPanel } from './advanced-map-analytics-config-panel';

function renderConfigPanel(overrides: Partial<ComponentProps<typeof AdvancedMapAnalyticsConfigPanel>> = {}) {
  return render(
    <AdvancedMapAnalyticsConfigPanel
      collapsed={false}
      mapName="Untitled map"
      showCountyBoundaries={true}
      mapDescription=""
      warningCount={0}
      onToggleCollapsed={vi.fn()}
      onShowCountyBoundariesChange={vi.fn()}
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

    expect(screen.getByText('Untitled map')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Collapse config panel'));
    expect(onToggleCollapsed).toHaveBeenCalledWith(true);

    rerender(
      <AdvancedMapAnalyticsConfigPanel
        collapsed={true}
        mapName="Untitled map"
        showCountyBoundaries={true}
        mapDescription=""
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onShowCountyBoundariesChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    // Map name is inside collapsible, so it should be hidden when collapsed
    expect(screen.queryByText('Untitled map')).not.toBeInTheDocument();
  });

  it('shows warning count button and opens warnings modal callback', () => {
    const onOpenWarnings = vi.fn();

    renderConfigPanel({ warningCount: 3, onOpenWarnings });

    fireEvent.click(screen.getByRole('button', { name: '3 warnings' }));
    expect(onOpenWarnings).toHaveBeenCalledTimes(1);
  });

  it('calls onShowCountyBoundariesChange when county boundaries switch changes', () => {
    const onShowCountyBoundariesChange = vi.fn();

    renderConfigPanel({
      showCountyBoundaries: true,
      onShowCountyBoundariesChange,
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Toggle county boundaries' }));
    expect(onShowCountyBoundariesChange).toHaveBeenCalledWith(false);
  });

  it('does not render warnings section when warning count is zero', () => {
    renderConfigPanel();

    expect(screen.queryByRole('button', { name: /warning/i })).not.toBeInTheDocument();
  });

  it('does not render description textarea in quick settings', () => {
    renderConfigPanel({ mapDescription: '# Title' });

    expect(screen.queryByLabelText('Map description')).not.toBeInTheDocument();
  });

  it('renders Read more link when description exists', () => {
    renderConfigPanel({ mapDescription: '# Budget map' });

    const readMoreLink = screen.getByRole('button', { name: 'Read more' });
    expect(readMoreLink).toBeInTheDocument();
  });

  it('does not render Read more link when description is empty', () => {
    renderConfigPanel({
      readOnly: true,
      mapDescription: '   ',
    });

    expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument();
  });

  it('opens preview markdown description modal from quick settings', () => {
    renderConfigPanel({
      mapDescription: '# Public map description',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Read more' }));

    expect(screen.getByText('Map description')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Public map description' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Map description markdown editor')).not.toBeInTheDocument();
    expect(screen.queryByText('Rendered markdown description for this map.')).not.toBeInTheDocument();
  });
});
