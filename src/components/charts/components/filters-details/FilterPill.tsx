import { ChevronRight, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FilterPillProps {
  label: string;
  value: React.ReactNode;
  href?: string;
  onRemove?: () => void;
  variant?: "default" | "exclude";
}

export function FilterPill({ label, value, href, onRemove, variant = "default" }: FilterPillProps) {
  const isInteractive = !!href;
  const isExclude = variant === "exclude";

    const baseClasses = "group flex items-center pl-3 pr-1.5 py-1 text-sm rounded-full transition-colors";
    const interactiveClasses = isExclude
      ? "bg-destructive/10 border border-destructive/30 hover:bg-destructive/20"
      : "bg-background border hover:bg-muted/50";
    const staticClasses = isExclude
      ? "bg-destructive/10 border border-destructive/30"
      : "bg-secondary/70 border border-transparent";

    const commonContent = (
        <>
            <span className={cn("font-medium underline", isExclude ? "text-destructive" : "text-foreground/80")}>{label}:</span>
            <span className={cn("ml-1.5 mr-1 font-semibold", isExclude ? "text-destructive" : "text-foreground")}>{value}</span>
            {isInteractive && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />}
        </>
    );

    const pillContent = (
        <div className={cn(baseClasses, isInteractive ? interactiveClasses : staticClasses)}>
            {commonContent}
            {onRemove && (
                <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full ml-1" onClick={onRemove}>
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    );

  if (isInteractive) {
    return (
      <Link
        to={href as '/'}
        className={cn(baseClasses, interactiveClasses)}
      >
        {commonContent}
      </Link>
    );
  }

  return pillContent;
} 
