export interface EntitySearchNode {
  cui: string;
  name: string;
  entity_type?: string | null;
  is_uat?: boolean | null;
  uat?: {
    county_name?: string | null;
    name?: string | null;
  } | null;
}

export interface EntitySearchResult {
  nodes: EntitySearchNode[];
  // Potentially add other fields like totalCount, hasNextPage, etc. if the API provides them
}

// Interface for the API response structure if it's wrapped, e.g. { data: { entities: ... } }
export interface EntitySearchResponse {
    entities: EntitySearchResult;
}

// You can also add types for EntityDetails if they are not already defined elsewhere
// For example:
// export interface EntityDetails {
//   cui: string;
//   name: string;
//   address: string;
//   totalIncome: number;
//   totalExpenses: number;
//   budgetBalance: number;
//   incomeTrend: { year: number; amount: number }[];
//   expenseTrend: { year: number; amount: number }[];
//   balanceTrend: { year: number; amount: number }[];
//   topExpenses: { description: string; amount: number }[];
//   topIncome: { description: string; amount: number }[];
//   // ... other fields
// } 
