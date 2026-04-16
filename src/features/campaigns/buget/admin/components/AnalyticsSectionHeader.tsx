import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

type AnalyticsSectionHeaderProps = {
  readonly title: string;
  readonly description: string;
  readonly actionHref?: string;
  readonly actionLabel?: string;
};

export function AnalyticsSectionHeader({
  title,
  description,
  actionHref,
  actionLabel,
}: AnalyticsSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          to={actionHref as '/'}
          className="group flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-xs font-medium uppercase tracking-[0.12em]">
            {actionLabel}
          </span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ) : null}
    </div>
  );
}
