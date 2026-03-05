import { EntitySearchNode } from '@/schemas/entities';

export const PREDEFINED_ENTITIES: EntitySearchNode[] = [
  { cui: '4270740', name: 'Mun. Sibiu', entity_type: 'admin_municipality', uat: { name: 'Sibiu', county_name: 'Jud. Sibiu' } },
  { cui: '4267117', name: 'Mun. București', entity_type: 'admin_municipality', uat: { name: 'București', county_name: 'București' } },
  { cui: '4305857', name: 'Mun. Cluj-Napoca', entity_type: 'admin_municipality', uat: { name: 'Cluj-Napoca', county_name: 'Jud. Cluj' } },
  { cui: '14756536', name: 'Mun. Timișoara', entity_type: 'admin_municipality', uat: { name: 'Timișoara', county_name: 'Jud. Timiș' } },
  { cui: '4541580', name: 'Mun. Iași', entity_type: 'admin_municipality', uat: { name: 'Iași', county_name: 'Jud. Iași' } },
  { cui: '4266456', name: 'Min. Sănătății', uat: { name: 'București', county_name: 'București' } },
  { cui: '13729380', name: 'Min. Educației', uat: { name: 'București', county_name: 'București' } },
];
