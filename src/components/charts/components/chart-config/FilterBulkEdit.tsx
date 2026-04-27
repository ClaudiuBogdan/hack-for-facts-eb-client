import { useMemo, useState } from 'react';
import { useChartStore } from '@/components/charts/hooks/useChartStore';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Analytics } from '@/lib/analytics';
import { collectUniqueFilterValues, countPotentialReplacements, ReplaceableFilterKey, replaceFilterValue, useFilterKeyLabel } from '@/lib/chart-filter-utils';
import { ArrowLeftRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ChartSchema } from '@/schemas/charts';

interface FilterBulkEditProps {
    withCard?: boolean;
    onClose?: () => void;
}

export function FilterBulkEdit({ withCard = true, onClose }: FilterBulkEditProps) {
    const { chart, updateChart } = useChartStore();
    const filterKeyMap = useFilterKeyLabel();
    const [bulkField, setBulkField] = useState<ReplaceableFilterKey | ''>('');
    const currentOptions = useMemo(() => bulkField ? collectUniqueFilterValues(chart, bulkField) : [], [chart, bulkField]);
    const [fromValue, setFromValue] = useState<string>('');
    const [toValue, setToValue] = useState<string>('');
    const replacementCount = useMemo(() => (bulkField && fromValue) ? countPotentialReplacements(chart, bulkField, fromValue) : 0, [chart, bulkField, fromValue]);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleReplace = () => {
        if (!bulkField) return;
        const updated = replaceFilterValue(chart, bulkField, fromValue, toValue);

        // Validate chart schema
        try {
            ChartSchema.parse(updated);
        } catch (_error) {
            toast.error(t`Invalid chart schema`);
            return;
        }

        updateChart(updated);
        setConfirmOpen(false);
        Analytics.capture(Analytics.EVENTS.ChartUpdated, { action: 'bulk_filter_replace', field: bulkField, from: fromValue, to: toValue, occurrences: replacementCount });
        toast.success('Filters updated', { description: `Replaced ${replacementCount} occurrence${replacementCount === 1 ? '' : 's'}.`, icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> });
        setFromValue('');
        setToValue('');
        onClose?.();
    }

    const Content = (
        <div className="py-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold">Bulk edit filters</h2>
                    <p className="text-sm text-muted-foreground">Find and replace a filter value across all series.</p>
                </div>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label><Trans>Filter field</Trans></Label>
                    <Select value={bulkField} onValueChange={(v) => { setBulkField(v as ReplaceableFilterKey); setFromValue(''); }}>
                        <SelectTrigger>
                            <SelectValue placeholder={t`Select field`} />
                        </SelectTrigger>
                        <SelectContent>
                            {(([
                                'entity_cuis',
                                'entity_types',
                                'uat_ids',
                                'functional_codes',
                                'economic_codes',
                                'budget_sector_ids',
                                'funding_source_ids',
                                'functional_prefixes',
                                'economic_prefixes',
                                'account_category',
                                'report_type',
                                'is_uat',
                                'normalization',
                            ]) as ReplaceableFilterKey[]).map((key) => (
                                <SelectItem key={key} value={key}>{filterKeyMap(key)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label><Trans>Replace value</Trans></Label>
                    <Select value={fromValue} onValueChange={setFromValue} disabled={!bulkField || currentOptions.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={bulkField ? (currentOptions.length ? t`Select current value` : t`No values to replace`) : t`Select field first`} />
                        </SelectTrigger>
                        <SelectContent>
                            {currentOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label><Trans>New value</Trans></Label>
                    <Input placeholder={t`Enter new value`} value={toValue} onChange={(e) => setToValue(e.target.value)} disabled={!bulkField || !fromValue} />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {replacementCount > 0 ? <Trans>Found {replacementCount} occurrence{replacementCount === 1 ? '' : 's'}</Trans> : <Trans>No matches yet</Trans>}
                </div>
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <AlertDialogTrigger asChild>
                        <Button
                            disabled={!bulkField || !fromValue || !toValue || replacementCount === 0}
                            className="gap-2"
                            variant="secondary"
                        >
                            <ArrowLeftRight className="h-4 w-4" />
                            <Trans>Replace</Trans>
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle><Trans>Confirm replace</Trans></AlertDialogTitle>
                            <AlertDialogDescription>
                                {`Replace "${fromValue}" with "${toValue}" in ${filterKeyMap(bulkField || '')} across ${replacementCount} occurrence${replacementCount === 1 ? '' : 's'}?`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleReplace}
                            >
                                <Trans>Confirm</Trans>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );

    if (withCard) {
        return (
            <Card>
                <CardContent>{Content}</CardContent>
            </Card>
        );
    }
    return Content;
}

export default FilterBulkEdit;


