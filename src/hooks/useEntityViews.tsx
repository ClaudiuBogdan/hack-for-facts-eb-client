import { EntityDetailsData } from '@/lib/api/entities';
import { FileText, HomeIcon, MapIcon, TrendingDownIcon, TrendingUpIcon, BarChart3, Building2Icon, ScrollText, FileCheck2, LineChart } from 'lucide-react';
import { t } from '@lingui/core/macro';

export type EntityView = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isDefault?: boolean;
};

export const useEntityViews = (entity: EntityDetailsData | null | undefined): EntityView[] => {
  const views: EntityView[] = [
    { id: 'overview', label: t`Overview`, isDefault: true, icon: <HomeIcon className="w-4 h-4" /> },
  ];

  if (!entity) {
    return views;
  }

  views.push({ id: 'contracts', label: t`Contracts`, icon: <ScrollText className="w-4 h-4" /> });

  views.push({ id: 'commitments', label: t`Commitments`, icon: <FileCheck2 className="w-4 h-4" /> });

  if (entity.is_uat || entity.entity_type === 'admin_county_council') {
    views.push({ id: 'ins-stats', label: t`INS Stats`, icon: <LineChart className="w-4 h-4" /> });
  }


  views.push({ id: 'expense-trends', label: t`Expense Trends`, icon: <TrendingDownIcon className="w-4 h-4" /> });
  views.push({ id: 'income-trends', label: t`Income Trends`, icon: <TrendingUpIcon className="w-4 h-4" /> });

  // TODO: Add ranking view. Not implemented yet.
  // views.push({ id: 'ranking', label: 'Ranking' });

  if (entity.is_uat) {
    views.push({ id: 'map', label: t`Map`, icon: <MapIcon className="w-4 h-4" /> });
  }

  views.push({ id: 'related-charts', label: t`Charts`, icon: <BarChart3 className="w-4 h-4" /> });


  views.push({ id: 'relationships', label: t`Entities`, icon: <Building2Icon className="w-4 h-4" /> });

  views.push({ id: 'reports', label: t`Reports`, icon: <FileText className="w-4 h-4" /> });

  return views;
};
