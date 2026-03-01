import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@lingui/core/macro';
import type {
  AdvancedMapAnalyticsStatsFilterType,
  AdvancedMapAnalyticsStatsValueFilterRule,
  AdvancedMapAnalyticsThresholdValueFilterRule,
  AdvancedMapAnalyticsValueFilterOperator,
  AdvancedMapAnalyticsValueFilterRule,
  AdvancedMapAnalyticsValueFilterRuleKind,
  AdvancedMapAnalyticsValueFilterSeriesRef,
  MapSupportedSeries,
} from '@/schemas/advanced-map-analytics';

interface AdvancedMapAnalyticsValueFilterEditorModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  rule?: AdvancedMapAnalyticsValueFilterRule;
  ruleIndex?: number;
  series: MapSupportedSeries[];
  onOpenChange: (open: boolean) => void;
  onRuleChange: (nextRule: AdvancedMapAnalyticsValueFilterRule) => void;
}

const OPERATOR_OPTIONS: Array<{ value: AdvancedMapAnalyticsValueFilterOperator; label: string }> = [
  { value: 'is_defined', label: t`Is defined` },
  { value: 'is_undefined', label: t`Is undefined` },
  { value: 'gt', label: t`Greater than` },
  { value: 'gte', label: t`Greater or equal` },
  { value: 'lt', label: t`Less than` },
  { value: 'lte', label: t`Less or equal` },
  { value: 'eq', label: t`Equal to` },
  { value: 'neq', label: t`Not equal to` },
  { value: 'between', label: t`Between (inclusive)` },
  { value: 'not_between', label: t`Not between (inclusive)` },
];

const RULE_KIND_OPTIONS: Array<{ value: AdvancedMapAnalyticsValueFilterRuleKind; label: string }> = [
  { value: 'threshold', label: t`Threshold` },
  { value: 'stats', label: t`Stats` },
];

const STATS_TYPE_OPTIONS: Array<{ value: AdvancedMapAnalyticsStatsFilterType; label: string }> = [
  {
    value: 'percentile_band',
    label: t`Percentile band`,
  },
  {
    value: 'rank',
    label: t`Rank (top/bottom N)`,
  },
  {
    value: 'median_compare',
    label: t`Median compare`,
  },
  {
    value: 'zscore',
    label: t`Z-score`,
  },
  {
    value: 'iqr_outlier',
    label: t`IQR outlier`,
  },
  {
    value: 'mad_robust_zscore',
    label: t`MAD robust z-score`,
  },
];

interface StatsFilterExplanation {
  title: string;
  explanation: string;
  example: string;
  tips: string[];
}

const STATS_FILTER_EXPLANATIONS: Record<AdvancedMapAnalyticsStatsFilterType, StatsFilterExplanation> = {
  percentile_band: {
    title: t`Percentile band`,
    explanation:
      t`Keeps UATs whose values fall between two percentiles of the selected series. Use this when absolute thresholds are misleading because data is very skewed.`,
    example:
      t`Example: 80-100 selects the top 20% by population. Combine with spending display to inspect high-population UATs.`,
    tips: [
      t`Percentiles are inclusive and min/max are normalized if swapped.`,
      t`Use with OR to add extreme percentile groups without losing current matches.`,
      t`Best for cross-county comparisons where scales are very different.`,
    ],
  },
  rank: {
    title: t`Rank (Top/Bottom N)`,
    explanation:
      t`Selects exactly N UATs from the highest or lowest values in the selected source series.`,
    example:
      t`Example: Top 25 by population, while displaying budget deficit values on the map.`,
    tips: [
      t`Good for shortlists used in audits, reporting, or manual review.`,
      t`Tie-breaking is deterministic by value, then SIRUTA code.`,
      t`If you need broader cohorts, use percentile instead of a very large N.`,
    ],
  },
  median_compare: {
    title: t`Median compare`,
    explanation:
      t`Splits UATs relative to the median value. More robust than mean-based filters when outliers exist.`,
    example:
      t`Example: >= median population, then AND with negative spending threshold.`,
    tips: [
      t`Use gt/gte/lt/lte based on how strict your split should be around the center.`,
      t`Useful as a first segmentation before anomaly filters.`,
      t`Prefer median over mean when one or two UATs dominate values.`,
    ],
  },
  zscore: {
    title: t`Z-score`,
    explanation:
      t`Selects UATs by standardized distance from mean in standard deviations. Great for anomaly detection when distribution is roughly normal.`,
    example:
      t`Example: |z| >= 2 highlights statistically unusual UATs in the selected source series.`,
    tips: [
      t`Requires variation; rule is skipped if standard deviation is zero.`,
      t`Use abs_gte for two-sided anomalies, gte/lte for one-sided anomalies.`,
      t`For heavily skewed data, compare with IQR or MAD robust z-score.`,
    ],
  },
  iqr_outlier: {
    title: t`IQR outlier`,
    explanation:
      t`Detects outliers using quartile fences: Q1 - m*IQR and Q3 + m*IQR. Works well for heavy-tailed financial data.`,
    example:
      t`Example: side=upper, multiplier=1.5 to focus on unusually high spending UATs.`,
    tips: [
      t`Multiplier 1.5 is standard; use 3.0 for stricter outlier detection.`,
      t`Use both sides when you want high and low extremes.`,
      t`Needs enough sample coverage; otherwise rule is skipped with warning.`,
    ],
  },
  mad_robust_zscore: {
    title: t`MAD robust z-score`,
    explanation:
      t`Robust anomaly detection based on median absolute deviation (MAD), less sensitive to extreme outliers than z-score.`,
    example:
      t`Example: threshold 3.5 to identify strong anomalies in volatile spending distributions.`,
    tips: [
      t`Use when z-score is unstable due to extreme values.`,
      t`Rule is skipped when MAD is zero (no robust dispersion).`,
      t`Start at 3.5, then lower gradually if you need more candidates.`,
    ],
  },
};

export function AdvancedMapAnalyticsValueFilterEditorModal({
  open,
  mode,
  rule,
  ruleIndex,
  series,
  onOpenChange,
  onRuleChange,
}: Readonly<AdvancedMapAnalyticsValueFilterEditorModalProps>) {
  if (!rule) {
    return null;
  }

  const modalTitle = mode === 'add' ? t`Add Value Filter Rule` : t`Edit Value Filter Rule`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            {t`Configure source series and filtering logic for this UAT-level value filter.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {(ruleIndex ?? 0) > 0 ? (
            <div className="space-y-1">
              <Label htmlFor="value-filter-join">{t`Join with previous`}</Label>
              <Select
                value={rule.joinWithPrevious}
                onValueChange={(value) => {
                  if (value === 'AND' || value === 'OR') {
                    onRuleChange({
                      ...rule,
                      joinWithPrevious: value,
                    });
                  }
                }}
              >
                <SelectTrigger id="value-filter-join">
                  <SelectValue placeholder={t`Connector`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">{t`AND`}</SelectItem>
                  <SelectItem value="OR">{t`OR`}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="value-filter-source">{t`Source series`}</Label>
            <Select
              value={getSeriesRefSelectValue(rule.seriesRef)}
              onValueChange={(value) =>
                onRuleChange({
                  ...rule,
                  seriesRef: parseSeriesRefSelectValue(value),
                })
              }
              >
              <SelectTrigger id="value-filter-source">
                <SelectValue placeholder={t`Source series`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t`Active series (dynamic)`}</SelectItem>
                {series.map((seriesEntry) => (
                  <SelectItem key={seriesEntry.id} value={`series:${seriesEntry.id}`}>
                    {seriesEntry.label.trim().length > 0 ? seriesEntry.label : seriesEntry.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="value-filter-kind">{t`Rule kind`}</Label>
            <Select
              value={rule.kind}
              onValueChange={(value) => {
                const nextKind = RULE_KIND_OPTIONS.find((option) => option.value === value)?.value;
                if (!nextKind) {
                  return;
                }

                onRuleChange(nextKind === 'threshold' ? toThresholdRule(rule) : toStatsRule(rule));
              }}
              >
              <SelectTrigger id="value-filter-kind">
                <SelectValue placeholder={t`Rule kind`} />
              </SelectTrigger>
              <SelectContent>
                {RULE_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rule.kind === 'threshold' ? (
            <ThresholdEditor
              rule={rule}
              onRuleChange={onRuleChange}
            />
          ) : (
            <StatsEditor
              rule={rule}
              onRuleChange={onRuleChange}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThresholdEditor({
  rule,
  onRuleChange,
}: Readonly<{
  rule: AdvancedMapAnalyticsThresholdValueFilterRule;
  onRuleChange: (nextRule: AdvancedMapAnalyticsValueFilterRule) => void;
}>) {
  const operatorArity = getOperatorArity(rule.operator);

  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="value-filter-operator">{t`Operator`}</Label>
        <Select
          value={rule.operator}
          onValueChange={(value) => {
            const nextOperator = OPERATOR_OPTIONS.find((option) => option.value === value)?.value;
            if (!nextOperator) {
              return;
            }

            const nextRule: AdvancedMapAnalyticsThresholdValueFilterRule = {
              ...rule,
              operator: nextOperator,
            };

            if (nextOperator === 'is_defined' || nextOperator === 'is_undefined') {
              nextRule.value = undefined;
              nextRule.secondValue = undefined;
            } else if (nextOperator !== 'between' && nextOperator !== 'not_between') {
              nextRule.secondValue = undefined;
            }

            onRuleChange(nextRule);
          }}
        >
          <SelectTrigger id="value-filter-operator">
            <SelectValue placeholder={t`Operator`} />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {operatorArity >= 1 ? (
        <div className="space-y-1">
          <Label htmlFor="value-filter-value">{t`Value`}</Label>
          <Input
            id="value-filter-value"
            type="number"
            step="any"
            value={rule.value ?? ''}
            onChange={(event) =>
              onRuleChange({
                ...rule,
                value: parseNumericInput(event.currentTarget.value),
              })
            }
            placeholder={t`e.g. 0`}
          />
        </div>
      ) : null}

      {operatorArity >= 2 ? (
        <div className="space-y-1">
          <Label htmlFor="value-filter-second-value">{t`Second value`}</Label>
          <Input
            id="value-filter-second-value"
            type="number"
            step="any"
            value={rule.secondValue ?? ''}
            onChange={(event) =>
              onRuleChange({
                ...rule,
                secondValue: parseNumericInput(event.currentTarget.value),
              })
            }
            placeholder={t`e.g. 1000`}
          />
        </div>
      ) : null}
    </>
  );
}

function StatsEditor({
  rule,
  onRuleChange,
}: Readonly<{
  rule: AdvancedMapAnalyticsStatsValueFilterRule;
  onRuleChange: (nextRule: AdvancedMapAnalyticsValueFilterRule) => void;
}>) {
  return (
    <>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="value-filter-stats-type">{t`Stats type`}</Label>
        <Select
          value={rule.statsType}
          onValueChange={(value) => {
            const nextStatsType = STATS_TYPE_OPTIONS.find((option) => option.value === value)?.value;
            if (!nextStatsType) {
              return;
            }

            onRuleChange(convertStatsRuleType(rule, nextStatsType));
          }}
        >
          <SelectTrigger id="value-filter-stats-type">
            <SelectValue placeholder={t`Stats type`} />
          </SelectTrigger>
          <SelectContent>
            {STATS_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rule.statsType === 'percentile_band' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="value-filter-min-percentile">{t`Min percentile`}</Label>
            <Input
              id="value-filter-min-percentile"
              type="number"
              step="any"
              min={0}
              max={100}
              value={rule.minPercentile}
              onChange={(event) =>
                onRuleChange({
                  ...rule,
                  minPercentile: parseNumericInput(event.currentTarget.value) ?? 0,
                })
              }
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="value-filter-max-percentile">{t`Max percentile`}</Label>
            <Input
              id="value-filter-max-percentile"
              type="number"
              step="any"
              min={0}
              max={100}
              value={rule.maxPercentile}
              onChange={(event) =>
                onRuleChange({
                  ...rule,
                  maxPercentile: parseNumericInput(event.currentTarget.value) ?? 100,
                })
              }
              placeholder="100"
            />
          </div>
        </>
      ) : null}

      {rule.statsType === 'rank' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="value-filter-rank-direction">{t`Direction`}</Label>
            <Select
              value={rule.direction}
              onValueChange={(value) => {
                if (value === 'top' || value === 'bottom') {
                  onRuleChange({
                    ...rule,
                    direction: value,
                  });
                }
              }}
            >
              <SelectTrigger id="value-filter-rank-direction">
                <SelectValue placeholder={t`Direction`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">{t`Top`}</SelectItem>
                <SelectItem value="bottom">{t`Bottom`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="value-filter-rank-count">{t`Count`}</Label>
            <Input
              id="value-filter-rank-count"
              type="number"
              step={1}
              min={1}
              value={rule.count}
              onChange={(event) => {
                const parsedValue = parseNumericInput(event.currentTarget.value);
                const nextCount = parsedValue === undefined
                  ? 1
                  : Math.max(1, Math.round(parsedValue));
                onRuleChange({
                  ...rule,
                  count: nextCount,
                });
              }}
              placeholder="10"
            />
          </div>
        </>
      ) : null}

      {rule.statsType === 'median_compare' ? (
        <div className="space-y-1">
          <Label htmlFor="value-filter-median-mode">{t`Mode`}</Label>
          <Select
            value={rule.mode}
            onValueChange={(value) => {
              if (value === 'gt' || value === 'gte' || value === 'lt' || value === 'lte') {
                onRuleChange({
                  ...rule,
                  mode: value,
                });
              }
            }}
          >
            <SelectTrigger id="value-filter-median-mode">
              <SelectValue placeholder={t`Mode`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gt">{t`> median`}</SelectItem>
              <SelectItem value="gte">{t`>= median`}</SelectItem>
              <SelectItem value="lt">{t`< median`}</SelectItem>
              <SelectItem value="lte">{t`<= median`}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {rule.statsType === 'zscore' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="value-filter-zscore-mode">{t`Mode`}</Label>
            <Select
              value={rule.mode}
              onValueChange={(value) => {
                if (value === 'abs_gte' || value === 'gte' || value === 'lte') {
                  onRuleChange({
                    ...rule,
                    mode: value,
                  });
                }
              }}
            >
              <SelectTrigger id="value-filter-zscore-mode">
                <SelectValue placeholder={t`Mode`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abs_gte">{t`|z| >= threshold`}</SelectItem>
                <SelectItem value="gte">{t`z >= threshold`}</SelectItem>
                <SelectItem value="lte">{t`z <= threshold`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="value-filter-zscore-threshold">{t`Threshold`}</Label>
            <Input
              id="value-filter-zscore-threshold"
              type="number"
              step="any"
              min="0.000001"
              value={rule.threshold}
              onChange={(event) =>
                onRuleChange({
                  ...rule,
                  threshold: parsePositiveNumericInput(event.currentTarget.value, rule.threshold),
                })
              }
              placeholder="2"
            />
          </div>
        </>
      ) : null}

      {rule.statsType === 'iqr_outlier' ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="value-filter-iqr-side">{t`Side`}</Label>
            <Select
              value={rule.side}
              onValueChange={(value) => {
                if (value === 'upper' || value === 'lower' || value === 'both') {
                  onRuleChange({
                    ...rule,
                    side: value,
                  });
                }
              }}
            >
              <SelectTrigger id="value-filter-iqr-side">
                <SelectValue placeholder={t`Side`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upper">{t`Upper fence`}</SelectItem>
                <SelectItem value="lower">{t`Lower fence`}</SelectItem>
                <SelectItem value="both">{t`Both fences`}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="value-filter-iqr-multiplier">{t`Multiplier`}</Label>
            <Input
              id="value-filter-iqr-multiplier"
              type="number"
              step="any"
              min="0.000001"
              value={rule.multiplier}
              onChange={(event) =>
                onRuleChange({
                  ...rule,
                  multiplier: parsePositiveNumericInput(event.currentTarget.value, rule.multiplier),
                })
              }
              placeholder="1.5"
            />
          </div>
        </>
      ) : null}

      {rule.statsType === 'mad_robust_zscore' ? (
        <div className="space-y-1">
          <Label htmlFor="value-filter-mad-threshold">{t`Threshold`}</Label>
          <Input
            id="value-filter-mad-threshold"
            type="number"
            step="any"
            min="0.000001"
            value={rule.threshold}
            onChange={(event) =>
              onRuleChange({
                ...rule,
                threshold: parsePositiveNumericInput(event.currentTarget.value, rule.threshold),
              })
            }
            placeholder="3.5"
          />
        </div>
      ) : null}

      <StatsFilterExplanationCard statsType={rule.statsType} />
    </>
  );
}

function StatsFilterExplanationCard({ statsType }: Readonly<{ statsType: AdvancedMapAnalyticsStatsFilterType }>) {
  const explanation = STATS_FILTER_EXPLANATIONS[statsType];

  return (
    <div className="sm:col-span-2 rounded-lg border border-border/80 bg-muted/20 p-3">
      <h4 className="text-sm font-semibold">{explanation.title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {explanation.explanation}
      </p>
      <p className="mt-2 text-xs leading-relaxed">
        <span className="font-semibold">{t`Example:`}</span>{' '}
        <span className="text-muted-foreground">{explanation.example}</span>
      </p>
      <div className="mt-2">
        <p className="text-xs font-semibold">{t`Tips and tricks`}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {explanation.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function getOperatorArity(operator: AdvancedMapAnalyticsValueFilterOperator): 0 | 1 | 2 {
  if (operator === 'is_defined' || operator === 'is_undefined') {
    return 0;
  }

  if (operator === 'between' || operator === 'not_between') {
    return 2;
  }

  return 1;
}

function parseNumericInput(rawValue: string): number | undefined {
  const trimmedValue = rawValue.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function parsePositiveNumericInput(rawValue: string, fallback: number): number {
  const parsedValue = parseNumericInput(rawValue);
  if (parsedValue === undefined || parsedValue <= 0) {
    return fallback;
  }
  return parsedValue;
}

function getSeriesRefSelectValue(seriesRef: AdvancedMapAnalyticsValueFilterSeriesRef): string {
  if (seriesRef.mode === 'active') {
    return 'active';
  }

  return `series:${seriesRef.seriesId}`;
}

function parseSeriesRefSelectValue(rawValue: string): AdvancedMapAnalyticsValueFilterSeriesRef {
  if (rawValue === 'active') {
    return {
      mode: 'active',
    };
  }

  if (rawValue.startsWith('series:')) {
    return {
      mode: 'series',
      seriesId: rawValue.slice('series:'.length),
    };
  }

  return {
    mode: 'active',
  };
}

function toThresholdRule(rule: AdvancedMapAnalyticsValueFilterRule): AdvancedMapAnalyticsThresholdValueFilterRule {
  if (rule.kind === 'threshold') {
    return rule;
  }

  return {
    id: rule.id,
    enabled: rule.enabled,
    joinWithPrevious: rule.joinWithPrevious,
    seriesRef: rule.seriesRef,
    kind: 'threshold',
    operator: 'is_defined',
    value: undefined,
    secondValue: undefined,
  };
}

function toStatsRule(rule: AdvancedMapAnalyticsValueFilterRule): AdvancedMapAnalyticsStatsValueFilterRule {
  if (rule.kind === 'stats') {
    return rule;
  }

  return {
    id: rule.id,
    enabled: rule.enabled,
    joinWithPrevious: rule.joinWithPrevious,
    seriesRef: rule.seriesRef,
    kind: 'stats',
    statsType: 'percentile_band',
    minPercentile: 0,
    maxPercentile: 100,
  };
}

function convertStatsRuleType(
  rule: AdvancedMapAnalyticsStatsValueFilterRule,
  statsType: AdvancedMapAnalyticsStatsFilterType
): AdvancedMapAnalyticsStatsValueFilterRule {
  const base = {
    id: rule.id,
    enabled: rule.enabled,
    joinWithPrevious: rule.joinWithPrevious,
    seriesRef: rule.seriesRef,
    kind: 'stats' as const,
  };

  if (statsType === 'percentile_band') {
    return {
      ...base,
      statsType,
      minPercentile: 0,
      maxPercentile: 100,
    };
  }

  if (statsType === 'rank') {
    return {
      ...base,
      statsType,
      direction: 'top',
      count: 10,
    };
  }

  if (statsType === 'median_compare') {
    return {
      ...base,
      statsType,
      mode: 'gte',
    };
  }

  if (statsType === 'zscore') {
    return {
      ...base,
      statsType,
      mode: 'abs_gte',
      threshold: 2,
    };
  }

  if (statsType === 'iqr_outlier') {
    return {
      ...base,
      statsType,
      side: 'both',
      multiplier: 1.5,
    };
  }

  return {
    ...base,
    statsType,
    threshold: 3.5,
  };
}
