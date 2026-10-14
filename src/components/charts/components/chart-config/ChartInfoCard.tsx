import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Chart } from '@/schemas/charts';
import { SettingsCard } from './SettingsCard';
import { t } from '@lingui/core/macro';

interface ChartInfoCardProps {
    chart: Chart;
    onUpdateChart: (updates: Partial<Chart>) => void;
}

export const ChartInfoCard = React.memo(({ chart, onUpdateChart }: ChartInfoCardProps) => {
    const [localTitle, setLocalTitle] = useState(chart.title);
    const [localDescription, setLocalDescription] = useState(chart.description || '');

    useEffect(() => {
        setLocalTitle(chart.title);
        setLocalDescription(chart.description || '');
    }, [chart.title, chart.description]);

    return (
        <div data-testid="chart-info-card">
            <SettingsCard
                icon={<Settings className="h-5 w-5" />}
                title={t`Chart Information`}
                description={t`Set the basic properties for your chart`}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="chart-title" data-testid="chart-title-label">{t`Chart Title`} *</Label>
                        {/*
                          Committed on every change, like the description: a title typed just
                          before leaving the editor is already in the chart, and no delayed
                          write is left to land on another chart after navigation.
                        */}
                        <Input
                            id="chart-title"
                            value={localTitle}
                            onChange={(e) => {
                                setLocalTitle(e.target.value);
                                onUpdateChart({ title: e.target.value });
                            }}
                            placeholder={t`Enter chart title...`}
                            data-testid="chart-title-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="chart-description">{t`Description`}</Label>
                        <Textarea
                            id="chart-description"
                            value={localDescription}
                            onChange={(e) => {
                                setLocalDescription(e.target.value);
                                onUpdateChart({ description: e.target.value });
                            }}
                            placeholder={t`Optional description for your chart...`}
                            rows={3}
                        />
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
});
