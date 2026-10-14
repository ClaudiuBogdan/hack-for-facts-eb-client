import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useChartStore } from '@/components/charts/hooks/useChartStore';
import { ChartInfoCard } from '../chart-config/ChartInfoCard';
import { GlobalSettingsCard } from '../chart-config/GlobalSettingsCard';
import { DataSeriesCard } from '../chart-config/DataSeriesCard';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnnotationsList } from '../chart-annotations/AnnotationsList';
import { FilterBulkEdit } from '../chart-config/FilterBulkEdit';
import { Trans } from '@lingui/react/macro';

export function ChartConfigView() {
    const { chart, updateChart, goToOverview, deleteChart } = useChartStore();

    return (
        <div className="container mx-auto py-6 space-y-6 px-4 md:px-6" data-testid="chart-config-view">
            <header className="space-y-2">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <a href="#" onClick={(e) => { e.preventDefault(); goToOverview(); }}><Trans>Chart</Trans></a>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage><Trans>Chart Config</Trans></BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight" data-testid="chart-config-heading">
                            <Trans>Chart Configuration</Trans>
                        </h1>
                        <p className="text-muted-foreground">{chart.title || <Trans>Untitled Chart</Trans>}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={goToOverview} className="gap-2">
                            <Eye className="h-4 w-4" />
                            <Trans>View Chart</Trans>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,22rem,22rem] lg:items-start gap-6">
                <div className="space-y-6">
                    <ChartInfoCard chart={chart} onUpdateChart={updateChart} />
                    <GlobalSettingsCard chart={chart} onUpdateChart={updateChart} />
                </div>

                <div className="space-y-6">
                    <DataSeriesCard />
                </div>

                <div className="space-y-6">
                    <AnnotationsList />
                </div>
            </div>

            <FilterBulkEdit withCard />

            {/* Danger zone */}
            <Card>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                    <div>
                        <p className="font-medium"><Trans>Delete Chart</Trans></p>
                        <p className="text-sm text-muted-foreground"><Trans>This action cannot be undone. It will permanently remove the chart and its configuration.</Trans></p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="destructive" className="gap-2">
                                <Trash2 className="h-4 w-4" />
                                <Trans>Delete Chart</Trans>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                            <DropdownMenuLabel><Trans>Delete this chart?</Trans></DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:bg-destructive focus:text-white"
                                onClick={deleteChart}
                            >
                                <Trans>Confirm Delete</Trans>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Trans>Cancel</Trans>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardContent>
            </Card>
        </div>
    );
}
