import { z } from "zod";

export const yearRangeSchema = z.object({
  from: z.number().nullable(),
  to: z.number().nullable(),
});

export const amountRangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

export const dataDiscoveryFilterSchema = z.object({
  counties: z.array(z.string()),
  uats: z.array(z.number()),
  yearRange: yearRangeSchema,
  searchQuery: z.string(),
  functionalCategory: z.array(z.string()),
  economicCategory: z.array(z.string()),
  amountRange: amountRangeSchema,
  displayMode: z.enum(["table", "chart", "graph"]),
  sortBy: z.enum(["amount", "date", "name"]),
  sortOrder: z.enum(["asc", "desc"]),
});

export type DataDiscoveryFilterSchema = z.infer<
  typeof dataDiscoveryFilterSchema
>;

// Example filter to help the OpenAI API understand the structure
export const exampleFilter = {
  counties: ["AB", "BH"], 
  uats: [1, 2],
  yearRange: {
    from: 2022,
    to: 2023,
  },
  searchQuery: "education",
  functionalCategory: ["65.02"],
  economicCategory: ["10"],
  amountRange: {
    min: 1000,
    max: 100000,
  },
  displayMode: "table",
  sortBy: "amount",
  sortOrder: "desc",
};
