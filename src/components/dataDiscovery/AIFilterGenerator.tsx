import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { useFilterGeneration } from "@/hooks/useFilterGeneration";
import {
  dataDiscoveryFilterSchema,
  exampleFilter,
} from "@/schemas/dataDiscoveryFilters";
import {
  DataDiscoveryFilter,
  useDataDiscoveryFilters,
} from "@/stores/dataDiscoveryFilters";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import {
  getUniqueCounties,
  getUniqueEconomicCategories,
  getUniqueEntityTypes,
  getUniqueFunctionalCategories,
} from "@/lib/api/dataDiscovery";

interface AIFilterGeneratorProps {
  onClose?: () => void;
  initialPrompt?: string;
}

export function AIFilterGenerator({
  onClose,
  initialPrompt = "",
}: AIFilterGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const { setFilter, filters: currentFilter } = useDataDiscoveryFilters();

  // Update prompt when initialPrompt changes
  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Fetch context data with react-query for LLM prompt context
  const { data: entityTypes = [] } = useQuery({
    queryKey: ["entityTypes"],
    queryFn: getUniqueEntityTypes,
  });

  const { data: counties = [] } = useQuery({
    queryKey: ["counties"],
    queryFn: getUniqueCounties,
  });

  const { data: functionalCategories = [] } = useQuery({
    queryKey: ["functionalCategories"],
    queryFn: getUniqueFunctionalCategories,
  });

  const { data: economicCategories = [] } = useQuery({
    queryKey: ["economicCategories"],
    queryFn: getUniqueEconomicCategories,
  });

  // Hook for filter generation
  const { generateFilter, isLoading, error } =
    useFilterGeneration<DataDiscoveryFilter>({
      schema: dataDiscoveryFilterSchema,
      contextData: {
        entityTypes,
        counties,
        functionalCategories,
        economicCategories,
        currentYear: new Date().getFullYear(),
      },
      defaultValues: {
        counties: [],
        uats: [],
        yearRange: {
          from: new Date().getFullYear() - 1,
          to: new Date().getFullYear(),
        },
        searchQuery: "",
        functionalCategory: [],
        economicCategory: [],
        amountRange: {
          min: null,
          max: null,
        },
        displayMode: "table",
        sortBy: "amount",
        sortOrder: "desc",
      },
      schemaDescription: `
The filter should be a JSON object with these fields:

- counties: Array of strings with county codes (e.g. ["AB", "BH"])
- uats: Array of numbers for UAT IDs
- yearRange: Object with "from" and "to" number fields representing years
- searchQuery: String for free text search
- functionalCategory: Array of strings for functional category codes
- economicCategory: Array of strings for economic category codes
- amountRange: Object with "min" and "max" number fields (can be null). IMPORTANT: This must ALWAYS be an object, never null. For example: { "min": null, "max": null } is valid when no range is specified.
- displayMode: One of "table", "chart", or "graph"
- sortBy: One of "amount", "date", or "name"
- sortOrder: One of "asc" or "desc"

Example filter:
${JSON.stringify(exampleFilter, null, 2)}

IMPORTANT: Always return amountRange as an object structure like { "min": number|null, "max": number|null }, never as null.
      `.trim(),
    });

  const handleGenerateFilter = async () => {
    if (!prompt.trim()) return;

    const filter = await generateFilter(prompt, currentFilter);

    if (filter) {
      // Apply each filter property individually to maintain proper typing
      Object.entries(filter).forEach(([key, value]) => {
        setFilter(key as keyof DataDiscoveryFilter, value);
      });

      if (onClose) onClose();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">Generate Filter with AI</h3>
        <p className="text-sm text-muted-foreground">
          Describe what data you're looking for, and our AI will create the
          appropriate filters. You can ask to modify your current filters or
          create new ones.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="E.g., Add education spending to my filter or Show me healthcare data in Cluj"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={handleGenerateFilter}
          disabled={isLoading || !prompt.trim()}
          variant="default"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.message || "Failed to generate filter. Please try again."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
