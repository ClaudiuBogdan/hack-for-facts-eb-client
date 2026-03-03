import type { NationalBudgetSectorDefinition } from './national-budget-types'

export const NATIONAL_BUDGET_SECTOR_ORDER: string[] = ['1', '2', '3', '4', '5']

export const NATIONAL_BUDGET_SECTOR_DEFINITIONS: NationalBudgetSectorDefinition[] = [
  {
    id: '1',
    label: 'Bugetul de stat',
    badge: 'Administrație centrală',
    order: 1,
  },
  {
    id: '2',
    label: 'Bugetul local',
    badge: 'Administrație locală',
    order: 2,
  },
  {
    id: '3',
    label: 'Bugetul asigurărilor sociale de stat',
    badge: 'Asigurări sociale',
    order: 3,
  },
  {
    id: '4',
    label: 'Bugetul fondului de șomaj',
    badge: 'Asigurări de șomaj',
    order: 4,
  },
  {
    id: '5',
    label: 'Bugetul fondului de sănătate (FNUASS)',
    badge: 'Fondul de sănătate',
    order: 5,
  },
]

export const DOCUMENT_ONLY_BUDGETS: string[] = [
  'Bugetul instituțiilor publice finanțate integral/parțial din venituri proprii',
  'Fonduri Externe Nerambursabile',
  'Bugetul Trezoreriei Statului',
]

export function getSectorDefinitionById(sectorId: string): NationalBudgetSectorDefinition | undefined {
  return NATIONAL_BUDGET_SECTOR_DEFINITIONS.find((definition) => definition.id === sectorId)
}
