import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsConfigPanel } from './advanced-map-analytics-config-panel';

function renderConfigPanel(overrides: Partial<ComponentProps<typeof AdvancedMapAnalyticsConfigPanel>> = {}) {
  return render(
    <AdvancedMapAnalyticsConfigPanel
      collapsed={false}
      activeView="map"
      mapName="Untitled map"
      showCountyBoundaries={true}
      mapDescription=""
      warningCount={0}
      onToggleCollapsed={vi.fn()}
      onActiveViewChange={vi.fn()}
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
        activeView="map"
        mapName="Untitled map"
        showCountyBoundaries={true}
        mapDescription=""
        warningCount={0}
        onToggleCollapsed={onToggleCollapsed}
        onActiveViewChange={vi.fn()}
        onShowCountyBoundariesChange={vi.fn()}
        onOpenConfig={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.getByText('Untitled map')).toBeInTheDocument();
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('shows warning count button and opens warnings modal callback', () => {
    const onOpenWarnings = vi.fn();

    renderConfigPanel({ warningCount: 3, onOpenWarnings });

    fireEvent.click(screen.getByRole('button', { name: '3 warnings' }));
    expect(onOpenWarnings).toHaveBeenCalledTimes(1);
  });

  it('calls onActiveViewChange when the view selector changes', () => {
    const onActiveViewChange = vi.fn();

    renderConfigPanel({ onActiveViewChange });

    fireEvent.click(screen.getByText('Table'));
    expect(onActiveViewChange).toHaveBeenCalledWith('table');
  });

  it('calls onActiveViewChange when analytics view is selected', () => {
    const onActiveViewChange = vi.fn();

    renderConfigPanel({ onActiveViewChange });

    fireEvent.click(screen.getByText('Analytics'));
    expect(onActiveViewChange).toHaveBeenCalledWith('analytics');
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

    expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    expect(screen.queryByText('No warnings')).not.toBeInTheDocument();
  });

  it('does not render description textarea in quick settings', () => {
    renderConfigPanel({ mapDescription: '# Title' });

    expect(screen.queryByLabelText('Map description')).not.toBeInTheDocument();
  });

  it('renders full-width accent Read more button in owner mode', () => {
    renderConfigPanel({ mapDescription: '# Budget map' });

    const readMoreButton = screen.getByRole('button', { name: 'Read more' });
    expect(readMoreButton).toHaveClass('w-full');
    expect(readMoreButton).toHaveClass('bg-accent');
    expect(readMoreButton).toHaveClass('text-accent-foreground');
  });

  it('renders full-width accent Read more button in public mode', () => {
    renderConfigPanel({
      readOnly: true,
      mapDescription: '# Public map',
    });

    const readMoreButton = screen.getByRole('button', { name: 'Read more' });
    expect(readMoreButton).toHaveClass('w-full');
    expect(readMoreButton).toHaveClass('bg-accent');
    expect(readMoreButton).toHaveClass('text-accent-foreground');
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

  it('disables description modal button when public description is empty', () => {
    renderConfigPanel({
      readOnly: true,
      mapDescription: '   ',
    });

    expect(screen.getByRole('button', { name: 'Read more' })).toBeDisabled();
  });

});
