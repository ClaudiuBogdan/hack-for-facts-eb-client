export interface HeatmapUATDataPoint {
  uat_id: string;
  uat_code: string;
  uat_name: string;
  siruta_code: string;
  county_code: string;
  county_name: string;
  population: number;
  amount: number;
  total_amount: number;
  per_capita_amount: number;
}

export interface YearlyAmount {
  year: number;
  totalAmount: number;
}

interface Entity {
  cui: string;
  name: string;
}

export interface HeatmapCountyDataPoint {
  county_code: string;
  county_name: string;
  county_population: number;
  amount: number;
  total_amount: number;
  per_capita_amount: number;
  county_entity: Entity | null;
}

