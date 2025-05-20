import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react'; // Example icons

interface EntityFinancialSummaryCardProps {
  title: string;
  value: number | null | undefined;
  icon?: React.ElementType;
  currentYear: number;
}

export const EntityFinancialSummaryCard: React.FC<EntityFinancialSummaryCardProps> = ({ title, value, icon: Icon, currentYear }) => {
  const displayValue = value !== null && value !== undefined ? formatCurrency(value) : 'N/A';
  let iconColor = "text-slate-500 dark:text-slate-400";
  if (title.toLowerCase().includes("income")) iconColor = "text-green-500 dark:text-green-400";
  if (title.toLowerCase().includes("expenses")) iconColor = "text-red-500 dark:text-red-400";

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 dark:bg-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">{title} ({currentYear})</CardTitle>
        {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{displayValue}</p>
        {/* You could add a small percentage change here if data is available */}
        {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
      </CardContent>
    </Card>
  );
};

interface EntityFinancialSummaryProps {
  totalIncome: number | null | undefined;
  totalExpenses: number | null | undefined;
  budgetBalance: number | null | undefined;
  currentYear: number;
}

export const EntityFinancialSummary: React.FC<EntityFinancialSummaryProps> = (
  { totalIncome, totalExpenses, budgetBalance, currentYear }
) => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <EntityFinancialSummaryCard title="Total Income" value={totalIncome} icon={TrendingUp} currentYear={currentYear} />
      <EntityFinancialSummaryCard title="Total Expenses" value={totalExpenses} icon={TrendingDown} currentYear={currentYear} />
      <EntityFinancialSummaryCard title="Budget Balance" value={budgetBalance} icon={Scale} currentYear={currentYear} />
    </section>
  );
}; 