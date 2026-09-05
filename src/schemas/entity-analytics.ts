export type EntityAnalyticsDataPoint = {
  entity_cui: string
  entity_name: string
  entity_type?: string | null
  uat_id?: string | null
  county_code?: string | null
  county_name?: string | null
  population?: number | null
  amount: number
  total_amount: number
  per_capita_amount: number | null
}

export type EntityAnalyticsConnection = {
  nodes: EntityAnalyticsDataPoint[]
  pageInfo: {
    totalCount: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export type SortOrder = {
  by: string
  order: 'asc' | 'desc' | 'ASC' | 'DESC'
}

export type AggregatedLineItem = {
  fn_c: string; // functional code
  fn_n: string; // functional name
  ec_c: string; // economic code
  ec_n: string; // economic name
  amount: number;
  count: number;
}

export type AggregatedLineItemConnection = {
  nodes: AggregatedLineItem[];
  pageInfo: {
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};


