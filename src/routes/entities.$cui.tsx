import { createFileRoute, useParams } from '@tanstack/react-router';
import { useEntityDetails } from '@/lib/hooks/useEntityDetails';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { EntityHeader } from '@/components/entities/EntityHeader';
import { EntityFinancialSummary } from '@/components/entities/EntityFinancialSummary';
import { EntityFinancialTrends } from '@/components/entities/EntityFinancialTrends';
import { EntityTopItems } from '@/components/entities/EntityTopItems';

export const Route = createFileRoute('/entities/$cui')({
    component: EntityDetailsPage,
});

function EntityDetailsPage() {
    const { cui } = useParams({ from: Route.id });
    const { data: entity, isLoading, isError, error } = useEntityDetails(cui);

    // Default year for display, can be made dynamic later
    const currentYear = 2024; 
    // Default trend years, can be made dynamic later
    // const startTrendYear = 2016;
    // const endTrendYear = 2025;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                <p className="text-lg text-slate-700 dark:text-slate-300">Loading entity details...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
                <Alert variant="destructive" className="max-w-lg w-full bg-red-50 dark:bg-red-900 border-red-500 dark:border-red-700">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <AlertTitle className="text-red-700 dark:text-red-300">Error Fetching Entity Details</AlertTitle>
                    <AlertDescription className="text-red-600 dark:text-red-400">
                        There was a problem fetching the details for CUI: <strong>{cui}</strong>.
                        {error && <p className="mt-2 text-sm">Details: {error.message}</p>}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!entity) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
                <Alert className="max-w-lg w-full bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-700">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-700 dark:text-blue-300">No Data Found</AlertTitle>
                    <AlertDescription className="text-blue-600 dark:text-blue-400">
                        No entity details found for CUI: <strong>{cui}</strong>. It's possible this entity does not exist or has no associated data.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8">
            <div className="container mx-auto max-w-7xl space-y-8">
                <EntityHeader entity={entity} />

                <EntityFinancialSummary 
                    totalIncome={entity.totalIncome}
                    totalExpenses={entity.totalExpenses}
                    budgetBalance={entity.budgetBalance}
                    currentYear={currentYear}
                />

                <EntityFinancialTrends 
                    incomeTrend={entity.incomeTrend}
                    expenseTrend={entity.expenseTrend}
                    balanceTrend={entity.balanceTrend}
                />
                
                <EntityTopItems 
                    topExpenses={entity.topExpenses}
                    topIncome={entity.topIncome}
                    currentYear={currentYear}
                />
            </div>
        </div>
    );
}