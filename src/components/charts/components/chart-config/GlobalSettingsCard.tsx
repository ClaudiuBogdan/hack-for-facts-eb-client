import React, { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Chart, COMPANIES_ANALYTICS_FIRST_YEAR, defaultYearRange } from '@/schemas/charts';
import { SettingsCard } from './SettingsCard';
import { getChartTypeIcon } from '../../utils';
import { ChartTypeSelect } from './ChartTypeSelect';
import { ColorPicker } from './ColorPicker';
import { ToggleSwitch } from './ToggleSwitch';
import { YearRangeSlider } from './YearRangeSlider';
import { t } from '@lingui/core/macro';

interface GlobalSettingsCardProps {
    chart: Chart;
    onUpdateChart: (updates: Partial<Chart>) => void;
}

export const GlobalSettingsCard = React.memo(({ chart, onUpdateChart }: GlobalSettingsCardProps) => {
    const handleConfigChange = useCallback((updates: Partial<Chart['config']>) => {
        onUpdateChart({ config: { ...chart.config, ...updates } });
    }, [chart.config, onUpdateChart]);

    const handleYearRangeChange = useCallback((newRange: [number, number]) => {
        handleConfigChange({ yearRange: { start: newRange[0], end: newRange[1] } });
    }, [handleConfigChange]);

    // Company figures reach back to 2008, and a saved range may start before the builder's default: the slider keeps it.
    const hasCompanies = chart.series.some((series) => series.type === 'companies-analytics');
    const minYear = Math.min(defaultYearRange.start, hasCompanies ? COMPANIES_ANALYTICS_FIRST_YEAR : defaultYearRange.start, chart.config.yearRange?.start ?? defaultYearRange.start);
    const maxYear = Math.max(defaultYearRange.end, chart.config.yearRange?.end ?? defaultYearRange.end);
    const startYear = chart.config.yearRange?.start ?? minYear;
    const endYear = chart.config.yearRange?.end ?? maxYear;

    return (
        <SettingsCard
            icon={getChartTypeIcon(chart.config.chartType)}
            title={t`Global Chart Settings`}
            description={t`Default settings that apply to all series (can be overridden per series)`}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t`Chart Type`}</Label>
                        <ChartTypeSelect
                            value={chart.config.chartType}
                            onValueChange={(value) => handleConfigChange({ chartType: value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="default-color">{t`Default Color`}</Label>
                        <ColorPicker
                            value={chart.config.color}
                            onChange={(value) => handleConfigChange({ color: value })}
                        />
                    </div>
                </div>
                <YearRangeSlider
                    value={[startYear, endYear]}
                    onChange={handleYearRangeChange}
                    min={minYear}
                    max={maxYear}
                />
                <div className="grid grid-cols-2 gap-4">
                    <ToggleSwitch id="show-grid-lines" label={t`Show Grid Lines`} checked={chart.config.showGridLines ?? false} onCheckedChange={(checked) => handleConfigChange({ showGridLines: checked })} />
                    <ToggleSwitch id="show-legend" label={t`Show Legend`} checked={chart.config.showLegend ?? false} onCheckedChange={(checked) => handleConfigChange({ showLegend: checked })} />
                    <ToggleSwitch id="show-data-labels" label={t`Show Data Labels`} checked={chart.config.showDataLabels ?? false} onCheckedChange={(checked) => handleConfigChange({ showDataLabels: checked })} />
                    <ToggleSwitch id="show-relative-values" label={t`Show Relative Values (%)`} checked={chart.config.showRelativeValues ?? false} onCheckedChange={(checked) => handleConfigChange({ showRelativeValues: checked })} />
                    <ToggleSwitch id="show-tooltip" label={t`Show Tooltip`} checked={chart.config.showTooltip ?? false} onCheckedChange={(checked) => handleConfigChange({ showTooltip: checked })} />
                    <ToggleSwitch id="show-annotations" label={t`Show Annotations`} checked={chart.config.showAnnotations ?? false} onCheckedChange={(checked) => handleConfigChange({ showAnnotations: checked })} />
                    <ToggleSwitch id="edit-annotations" label={t`Edit Annotations`} checked={chart.config.editAnnotations ?? false} onCheckedChange={(checked) => handleConfigChange({ editAnnotations: checked })} />
                </div>
            </div>
        </SettingsCard>
    );
});
