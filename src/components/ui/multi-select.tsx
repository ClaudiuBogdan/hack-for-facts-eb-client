"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  error?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  searchPlaceholder = "Search options...",
  emptyText = "No options found.",
  className,
  error,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOptions = options.filter((option) =>
    selected.includes(option.value)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
        >
          {selectedOptions.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              {selectedOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-1">
                  {option.icon && <option.icon className="h-4 w-4 shrink-0" />}
                  <span className="truncate">{option.label}</span>
                  {selectedOptions.length > 1 && ", "}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  const newSelected = selected.includes(option.value)
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value];
                  onChange(newSelected);
                }}
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-2 flex-1">
                  {option.icon && <option.icon className="h-4 w-4 shrink-0" />}
                  {option.label}
                </div>
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    selected.includes(option.value)
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
