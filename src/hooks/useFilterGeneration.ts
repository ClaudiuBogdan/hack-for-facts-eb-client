import { useState } from "react";
import { z } from "zod";

// Define a generic type for filter options
type FilterOptions<T> = {
  schema: z.ZodType<T>;
  contextData: {
    entityTypes?: string[];
    counties?: Array<{ code: string; name: string }>;
    functionalCategories?: Array<{ code: string; name: string }>;
    economicCategories?: Array<{ code: string; name: string }>;
    [key: string]: unknown;
  };
  defaultValues: T;
  schemaDescription?: string;
};

// Define the server response interface
interface ServerResponse<T> {
  filter: T;
}

// Function to generate a filter using the server-side API
async function generateFilterWithLLM<T>(
  prompt: string,
  options: FilterOptions<T>,
  currentFilter?: T
): Promise<T> {
  try {
    // Use the server endpoint instead of a client API route
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/filter-generator`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          contextData: options.contextData,
          currentFilter: currentFilter || null,
          // Use the provided human-readable schema description or create a simple one from defaultValues
          schemaDescription:
            options.schemaDescription ||
            `The filter should be a JSON object with similar structure to: ${JSON.stringify(options.defaultValues, null, 2)}`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate filter: ${errorText}`);
    }

    const data = (await response.json()) as ServerResponse<T>;

    // Validate the generated filter against the schema
    return options.schema.parse(data.filter);
  } catch (error) {
    console.error("Error generating filter:", error);
    throw error;
  }
}

// Hook for generating filters via LLM
export function useFilterGeneration<T>(options: FilterOptions<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [generatedFilter, setGeneratedFilter] = useState<T | null>(null);

  // Function to generate the filter
  const generateFilter = async (
    prompt: string,
    currentFilter?: T
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const filter = await generateFilterWithLLM<T>(
        prompt,
        options,
        currentFilter
      );
      setGeneratedFilter(filter);
      return filter;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Return the hook state and function
  return {
    generateFilter,
    isLoading,
    error,
    generatedFilter,
  };
}
