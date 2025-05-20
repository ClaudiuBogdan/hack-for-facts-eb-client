import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from './TrendChart';
import { EntityDetailsData } from '@/lib/api/entities';

interface EntityFinancialTrendsProps {
  incomeTrend: EntityDetailsData['incomeTrend'];
  expenseTrend: EntityDetailsData['expenseTrend'];
  balanceTrend: EntityDetailsData['balanceTrend'];
}

export const EntityFinancialTrends: React.FC<EntityFinancialTrendsProps> = ({ incomeTrend, expenseTrend, balanceTrend }) => {
  const trendsAvailable = incomeTrend?.length || expenseTrend?.length || balanceTrend?.length;

  return (
    <Card className="shadow-lg dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-200">Financial Trends (2016-2025)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        {!trendsAvailable && <p className="text-center text-slate-500 dark:text-slate-400 py-4">No trend data is currently available for this entity.</p>}
        {incomeTrend && incomeTrend.length > 0 && (
          <TrendChart data={incomeTrend} title="Income Trend" dataKey="totalAmount" color="#10B981" yAxisLabel="Total Income" />
        )}
        {expenseTrend && expenseTrend.length > 0 && (
          <TrendChart data={expenseTrend} title="Expense Trend" dataKey="totalAmount" color="#EF4444" yAxisLabel="Total Expenses" />
        )}
        {balanceTrend && balanceTrend.length > 0 && (
          <TrendChart data={balanceTrend} title="Balance Trend" dataKey="totalAmount" color="#3B82F6" yAxisLabel="Budget Balance" />
        )}
      </CardContent>
    </Card>
  );
}; 