import { AggregatedBudgetData } from "@/lib/api/dataDiscovery";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface DataChartProps {
  data: AggregatedBudgetData[];
  isLoading: boolean;
}

const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#dc2626", // red-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
  "#4f46e5", // indigo-600
  "#0d9488", // teal-600
  "#db2777", // pink-600
];

export function DataChart({ data, isLoading }: DataChartProps) {
  const [activeTab, setActiveTab] = useState("bar");

  // Prepare formatted data and pie chart data with "Others" category
  const { formattedData, pieChartData } = useMemo(() => {
    const formatted =
      data?.map((item) => ({
        ...item,
        // Shorten name for display if too long
        shortName:
          item.name.length > 18 ? `${item.name.slice(0, 16)}...` : item.name,
      })) || [];

    const limit = 5;

    if (formatted.length <= limit) {
      return { formattedData: formatted, pieChartData: formatted };
    }

    // Sort by value in descending order and take top 10
    const sortedData = [...formatted].sort((a, b) => b.value - a.value);
    const slicedData = sortedData.slice(0, limit);

    // Aggregate the rest as "Others"
    const othersValue = sortedData
      .slice(limit)
      .reduce((sum, item) => sum + item.value, 0);

    if (othersValue > 0) {
      return {
        formattedData: formatted,
        pieChartData: [
          ...slicedData,
          {
            name: "Others",
            shortName: "Others",
            value: othersValue,
          },
        ],
      };
    }

    return { formattedData: formatted, pieChartData: slicedData };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px] text-muted-foreground">
          No data available for visualization
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Breakdown</CardTitle>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          </TabsList>

          <TabsContent value="bar" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={formattedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 70,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shortName"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Amount",
                  ]}
                />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="pie" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="shortName"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {pieChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Amount",
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}
