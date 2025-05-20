import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TopItemsList } from './TopItemsList';
import { EntityDetailsData } from '@/lib/api/entities';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'; // Icons for expenses and income

interface EntityTopItemsProps {
  topExpenses: EntityDetailsData['topExpenses'];
  topIncome: EntityDetailsData['topIncome'];
  currentYear: number;
}

export const EntityTopItems: React.FC<EntityTopItemsProps> = ({ topExpenses, topIncome, currentYear }) => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card className="shadow-lg dark:bg-slate-800 h-full flex flex-col">
        <CardHeader>
          {/* CardTitle is removed from here and integrated into TopItemsList for better alignment with icon */}
        </CardHeader>
        <CardContent className="flex-grow">
          <TopItemsList 
            items={topExpenses?.nodes} 
            title="Top 5 Expenses" 
            nameKey="economicClassification" 
            currentYear={currentYear} 
            icon={ArrowDownCircle}
            iconColor="text-red-500 dark:text-red-400"
          />
        </CardContent>
      </Card>
      <Card className="shadow-lg dark:bg-slate-800 h-full flex flex-col">
        <CardHeader>
          {/* CardTitle is removed from here and integrated into TopItemsList for better alignment with icon */}
        </CardHeader>
        <CardContent className="flex-grow">
          <TopItemsList 
            items={topIncome?.nodes} 
            title="Top 5 Income Sources" 
            nameKey="functionalClassification" 
            currentYear={currentYear} 
            icon={ArrowUpCircle}
            iconColor="text-green-500 dark:text-green-400"
          />
        </CardContent>
      </Card>
    </section>
  );
}; 