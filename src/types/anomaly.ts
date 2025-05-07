export interface Anomaly {
  id: string;
  title: string;
  description: string;
  status: "new" | "resolved" | "investigating";
  severity: "low" | "medium" | "high" | "critical";
  amount: number;
  currency: string;
  date: string;
  category: string;
  entity: string;
  source: string;
}
