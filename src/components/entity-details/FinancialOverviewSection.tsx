import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FinancialOverviewSectionProps {
    cui: string;
    // selectedPeriod: { year: number; periodType: string }; // Example type, adjust as needed
    // TODO: Add props for selected period
}

export function FinancialOverviewSection({ cui /*, selectedPeriod */ }: FinancialOverviewSectionProps) {
    // TODO: Fetch financial overview data using cui and selectedPeriod
    // Data source: vw_BudgetSummary_ByEntityPeriod, vw_UAT_Aggregated_Metrics
    // Metrics: Total Income, Total Expense, Budget Balance (trends & latest), Per Capita Income/Expense (trends & latest)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Privire Generală Financiară</CardTitle>
            </CardHeader>
            <CardContent>
                <p>CUI: {cui}</p>
                {/* Placeholder for KPI cards and trend charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>{/* KPI: Total Income (Latest) */}</div>
                    <div>{/* KPI: Total Expense (Latest) */}</div>
                    <div>{/* KPI: Budget Balance (Latest) */}</div>
                </div>
                <div>{/* Chart: Income/Expense/Balance Trend */}</div>
                <div>{/* Chart: Per Capita Income/Expense Trend (if UAT) */}</div>
                <p className="text-sm text-muted-foreground mt-2">
                    Secțiune Privire Generală Financiară în construcție.
                </p>
            </CardContent>
        </Card>
    );
} 