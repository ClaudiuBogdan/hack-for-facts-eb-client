import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterTagProps = {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
};

export function FilterTag({
  label,
  value,
  onRemove,
  className,
}: FilterTagProps) {
  return (
    <Badge variant="outline" className={cn("px-2 py-1 gap-1", className)}>
      <span className="font-medium text-muted-foreground">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export type FilterTagsContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function FilterTagsContainer({
  children,
  className,
}: FilterTagsContainerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 my-2", className)}>{children}</div>
  );
}
