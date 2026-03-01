import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDefaultAdvancedMapAnalyticsSeries,
  createDefaultAdvancedMapAnalyticsStatsValueFilterRule,
  createDefaultAdvancedMapAnalyticsValueFilterRule,
} from '@/schemas/advanced-map-analytics';
import { AdvancedMapAnalyticsValueFilterEditorModal } from './advanced-map-analytics-value-filter-editor-modal';

describe('AdvancedMapAnalyticsValueFilterEditorModal', () => {
  it('renders threshold modal fields for editing a rule', () => {
    const rule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    rule.operator = 'lt';
    rule.value = 0;
    const series = createDefaultAdvancedMapAnalyticsSeries('line-items-aggregated-yearly');

    render(
      <AdvancedMapAnalyticsValueFilterEditorModal
        open
        mode="edit"
        rule={rule}
        ruleIndex={0}
        series={[series]}
        onOpenChange={vi.fn()}
        onRuleChange={vi.fn()}
      />
    );

    expect(screen.getByText('Edit Value Filter Rule')).toBeInTheDocument();
    expect(screen.getByLabelText('Source series')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule kind')).toBeInTheDocument();
    expect(screen.getByLabelText('Operator')).toBeInTheDocument();
    expect(screen.getByLabelText('Value')).toBeInTheDocument();
    expect(screen.queryByLabelText('Join with previous')).not.toBeInTheDocument();
  });

  it('shows join selector and stats controls for non-first stats rule', () => {
    const rule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule();

    render(
      <AdvancedMapAnalyticsValueFilterEditorModal
        open
        mode="edit"
        rule={rule}
        ruleIndex={1}
        series={[]}
        onOpenChange={vi.fn()}
        onRuleChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Join with previous')).toBeInTheDocument();
    expect(screen.getByLabelText('Stats type')).toBeInTheDocument();
    expect(screen.getByLabelText('Min percentile')).toBeInTheDocument();
    expect(screen.getByLabelText('Max percentile')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Percentile band' })).toBeInTheDocument();
    expect(screen.getByText('Tips and tricks')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Keeps UATs whose values fall between two percentiles of the selected series. Use this when absolute thresholds are misleading because data is very skewed.'
      )
    ).toBeInTheDocument();
  });

  it('updates threshold numeric values through onRuleChange', () => {
    const onRuleChange = vi.fn();
    const rule = createDefaultAdvancedMapAnalyticsValueFilterRule();
    rule.operator = 'between';
    rule.value = 10;
    rule.secondValue = 20;

    render(
      <AdvancedMapAnalyticsValueFilterEditorModal
        open
        mode="edit"
        rule={rule}
        ruleIndex={1}
        series={[]}
        onOpenChange={vi.fn()}
        onRuleChange={onRuleChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Value'), {
      target: {
        value: '12.5',
      },
    });
    fireEvent.change(screen.getByLabelText('Second value'), {
      target: {
        value: '30',
      },
    });

    expect(onRuleChange).toHaveBeenCalledWith(expect.objectContaining({ value: 12.5 }));
    expect(onRuleChange).toHaveBeenCalledWith(expect.objectContaining({ secondValue: 30 }));
  });

  it('prevents non-positive values for z-score threshold', () => {
    const onRuleChange = vi.fn();
    const rule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('zscore');

    render(
      <AdvancedMapAnalyticsValueFilterEditorModal
        open
        mode="edit"
        rule={rule}
        ruleIndex={0}
        series={[]}
        onOpenChange={vi.fn()}
        onRuleChange={onRuleChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Threshold'), {
      target: {
        value: '0',
      },
    });

    expect(onRuleChange).toHaveBeenCalledWith(expect.objectContaining({ threshold: 2 }));
  });

  it('prevents non-positive values for iqr multiplier', () => {
    const onRuleChange = vi.fn();
    const rule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('iqr_outlier');

    render(
      <AdvancedMapAnalyticsValueFilterEditorModal
        open
        mode="edit"
        rule={rule}
        ruleIndex={0}
        series={[]}
        onOpenChange={vi.fn()}
        onRuleChange={onRuleChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Multiplier'), {
      target: {
        value: '0',
      },
    });

    expect(onRuleChange).toHaveBeenCalledWith(expect.objectContaining({ multiplier: 1.5 }));
  });

  it('prevents non-positive values for mad threshold', () => {
    const onRuleChange = vi.fn();
    const rule = createDefaultAdvancedMapAnalyticsStatsValueFilterRule('mad_robust_zscore');

    render(
      <AdvancedMapAnalyticsValueFilterEditorModal
        open
        mode="edit"
        rule={rule}
        ruleIndex={0}
        series={[]}
        onOpenChange={vi.fn()}
        onRuleChange={onRuleChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Threshold'), {
      target: {
        value: '0',
      },
    });

    expect(onRuleChange).toHaveBeenCalledWith(expect.objectContaining({ threshold: 3.5 }));
  });
});
