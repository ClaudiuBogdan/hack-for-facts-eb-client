import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvancedMapAnalyticsConfigModal } from './advanced-map-analytics-config-modal';

describe('AdvancedMapAnalyticsConfigModal', () => {
  it('renders minimal config summary', () => {
    render(
      <AdvancedMapAnalyticsConfigModal
        open={true}
        mapName="Untitled map"
        warningCount={0}
        onMapNameChange={vi.fn()}
        onOpenChange={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    expect(screen.getByText('Map Config')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Untitled map')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View warnings' })).not.toBeInTheDocument();
  });

  it('opens warnings and closes config modal when view warnings is clicked', () => {
    const onOpenWarnings = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AdvancedMapAnalyticsConfigModal
        open={true}
        mapName="Untitled map"
        warningCount={2}
        onMapNameChange={vi.fn()}
        onOpenChange={onOpenChange}
        onOpenWarnings={onOpenWarnings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'View warnings' }));

    expect(onOpenWarnings).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('updates map name when input changes', () => {
    const onMapNameChange = vi.fn();

    render(
      <AdvancedMapAnalyticsConfigModal
        open={true}
        mapName="Untitled map"
        warningCount={0}
        onMapNameChange={onMapNameChange}
        onOpenChange={vi.fn()}
        onOpenWarnings={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Map name'), {
      target: { value: 'Edited modal title' },
    });

    expect(onMapNameChange).toHaveBeenCalledWith('Edited modal title');
  });
});
