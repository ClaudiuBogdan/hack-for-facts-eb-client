import { createLogger } from "../logger";
import { Anomaly } from "@/types/anomaly";
import { AnomalyFilter } from "@/stores/anomalyFilters";

const logger = createLogger("anomalies-api");

// Mock data for development
const mockAnomalies: Anomaly[] = [
  {
    id: "1",
    title: "Unusual payment to unknown vendor",
    description:
      "Payment of over $50,000 to a vendor with no prior transaction history",
    status: "new",
    severity: "high",
    amount: 54320.87,
    currency: "USD",
    date: "2023-11-25T14:32:15Z",
    category: "Procurement",
    entity: "Department of Transportation",
    source: "Vendor Payment System",
  },
  {
    id: "2",
    title: "Multiple small payments to same recipient",
    description:
      "Pattern of payments just below approval threshold to same entity over 2 weeks",
    status: "investigating",
    severity: "medium",
    amount: 9890.0,
    currency: "USD",
    date: "2023-12-05T09:15:40Z",
    category: "Finance",
    entity: "Department of Health",
    source: "Financial Records System",
  },
  {
    id: "3",
    title: "Large contract with insufficient bidders",
    description: "Contract worth $2M awarded with only single qualified bidder",
    status: "new",
    severity: "critical",
    amount: 2000000.0,
    currency: "USD",
    date: "2023-12-10T16:45:22Z",
    category: "Contracts",
    entity: "City Council",
    source: "Contract Management System",
  },
  {
    id: "4",
    title: "Delayed project with continued payments",
    description:
      "Project 8 months behind schedule but full payments continuing monthly",
    status: "investigating",
    severity: "high",
    amount: 350000.0,
    currency: "USD",
    date: "2023-10-18T11:20:33Z",
    category: "Projects",
    entity: "Department of Infrastructure",
    source: "Project Management System",
  },
  {
    id: "5",
    title: "Vendor with political connections",
    description:
      "New vendor with connections to local officials received fast-tracked contract",
    status: "resolved",
    severity: "medium",
    amount: 125000.0,
    currency: "USD",
    date: "2023-09-30T15:10:45Z",
    category: "Procurement",
    entity: "Department of Parks",
    source: "Vendor Management System",
  },
];

export type GetAnomaliesParams = {
  filters: AnomalyFilter;
};

export const getAnomalies = async ({
  filters,
}: GetAnomaliesParams): Promise<Anomaly[]> => {
  // In a real application, this would be an API call
  logger.info("Fetching anomalies with filters", { filters });

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Apply filters to the mock data
  return mockAnomalies.filter((anomaly) => {
    // Filter by status
    if (filters.status !== "all" && anomaly.status !== filters.status) {
      return false;
    }

    // Filter by severity
    if (filters.severity !== "all" && anomaly.severity !== filters.severity) {
      return false;
    }

    // Filter by date range
    if (filters.dateRange.from) {
      const anomalyDate = new Date(anomaly.date);
      if (anomalyDate < filters.dateRange.from) {
        return false;
      }
    }

    if (filters.dateRange.to) {
      const anomalyDate = new Date(anomaly.date);
      if (anomalyDate > filters.dateRange.to) {
        return false;
      }
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = anomaly.title.toLowerCase().includes(query);
      const matchesDescription = anomaly.description
        .toLowerCase()
        .includes(query);
      const matchesEntity = anomaly.entity.toLowerCase().includes(query);

      if (!matchesTitle && !matchesDescription && !matchesEntity) {
        return false;
      }
    }

    // Filter by category
    if (
      filters.category.length > 0 &&
      !filters.category.includes(anomaly.category)
    ) {
      return false;
    }

    return true;
  });
};

export const getUniqueCategories = (): string[] => {
  return Array.from(new Set(mockAnomalies.map((anomaly) => anomaly.category)));
};
