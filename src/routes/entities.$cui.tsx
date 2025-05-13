import { createFileRoute, useParams } from '@tanstack/react-router';
import { EntityProfileCard } from '@/components/entity-details/EntityProfileCard';
import { GlobalPeriodSelector } from '@/components/entity-details/GlobalPeriodSelector';
import { FinancialOverviewSection } from '@/components/entity-details/FinancialOverviewSection';
import { IncomeAnalysisSection } from '@/components/entity-details/IncomeAnalysisSection';
import { ExpenseAnalysisSection } from '@/components/entity-details/ExpenseAnalysisSection';
import { ComparativeAnalysisSection } from '@/components/entity-details/ComparativeAnalysisSection';
import { ReportingHistoryTable } from '@/components/entity-details/ReportingHistoryTable';
import { DetailedExecutionLineItemsTable } from '@/components/entity-details/DetailedExecutionLineItemsTable';

export const Route = createFileRoute('/entities/$cui')({
    component: EntityDetailsPage,
});

function EntityDetailsPage() {
    const { cui } = useParams({ from: Route.id });
    // TODO: Add state for selected period (year, type) from GlobalPeriodSelector
    // TODO: Fetch entity data based on CUI and selected period

    return (
        <div className="container mx-auto p-4 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Detalii Entitate: {cui}</h1>
                {/* GlobalPeriodSelector will likely go here or in a sub-header */}
                <GlobalPeriodSelector />
            </header>

            {/* Section 5.1: Entity Profile */}
            <EntityProfileCard cui={cui as string} />

            {/* Section 5.2: Financial Overview */}
            <FinancialOverviewSection cui={cui as string} /* selectedPeriod={selectedPeriod} */ />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section 5.3: Income Analysis */}
                <IncomeAnalysisSection cui={cui as string} /* selectedPeriod={selectedPeriod} */ />

                {/* Section 5.4: Expense Analysis */}
                <ExpenseAnalysisSection cui={cui as string} /* selectedPeriod={selectedPeriod} */ />
            </div>

            {/* Section 5.5: Comparative Analysis & Anomaly Indicators */}
            <ComparativeAnalysisSection cui={cui as string} /* selectedPeriod={selectedPeriod} */ />

            {/* Section 5.6: Reporting History */}
            <ReportingHistoryTable cui={cui as string} />

            {/* Section 5.7: Detailed Execution Line Items */}
            <DetailedExecutionLineItemsTable cui={cui as string} /* selectedPeriod={selectedPeriod} */ />

        </div>
    );
}

// Default export for lazy loading, if applicable
// export default EntityDetailsPage; // TanStack Router handles this via the Route object 