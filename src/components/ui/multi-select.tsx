import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";

export type Option = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = t`Select options`,
  className,
}: MultiSelectProps) {

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleClear = () => {
    onChange([]);
  };
  const selectedOptions = options.filter((option) =>
    selected.includes(option.value)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "h-auto min-h-10 w-full justify-between",
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="flex max-w-[280px] items-center gap-1 rounded-md px-2 py-1"
                >
                  {option.icon && (
                    <option.icon className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate font-normal" title={option.label}>{option.label}</span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[400px] p-0"
        align="start"
      >
        <div className="max-h-64 overflow-auto">
          {options.length > 0 ? (
            options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleSelect(option.value)}
                onSelect={(e) => e.preventDefault()} // Prevent closing on select
                className="flex cursor-pointer items-center gap-2"
              >
                {option.icon && <option.icon className="h-4 w-4 shrink-0" />}
                <span className="truncate" title={option.label}>{option.label}</span>
              </DropdownMenuCheckboxItem>
            ))
          ) : (
            <p className="p-2 text-center text-sm text-muted-foreground">
              <Trans>No options found.</Trans>
            </p>
          )}
        </div>

        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleClear}
              className="cursor-pointer justify-center text-center text-sm"
            >
              <Trans>Clear all</Trans>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
