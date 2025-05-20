import React from 'react';
import { TopExecutionItem } from '@/lib/api/entities';
import { formatCurrency } from '@/lib/utils';
// Lucide icons can be passed as props if needed, so removing direct imports here

interface TopItemsListProps {
  items: TopExecutionItem[] | undefined;
  title: string;
  nameKey: 'economicClassification' | 'functionalClassification';
  currentYear: number;
  icon?: React.ElementType;
  iconColor?: string;
}

export const TopItemsList: React.FC<TopItemsListProps> = ({ items, title, nameKey, currentYear, icon: Icon, iconColor }) => {
  if (!items || items.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
             {Icon && <Icon className={`h-12 w-12 mb-3 ${iconColor || 'text-slate-400 dark:text-slate-500'}`} />}
            <p className="text-sm text-center text-slate-500 dark:text-slate-400">No data available for {title.toLowerCase()} in {currentYear}.</p>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
        <div className="flex items-center mb-3">
            {Icon && <Icon className={`h-6 w-6 mr-2 ${iconColor || 'text-slate-600 dark:text-slate-300'}`} />}
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title} ({currentYear})</h3>
        </div>
      <ul className="space-y-2 flex-grow">
        {items.map((item, index) => {
          const itemName = nameKey === 'economicClassification' 
            ? item.economicClassification?.economic_name 
            : item.functionalClassification?.functional_name;
          return (
            <li 
                key={index} 
                className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2" title={itemName}>{itemName || 'N/A'}</span>
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatCurrency(item.amount)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}; 