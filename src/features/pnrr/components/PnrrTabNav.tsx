import { t } from "@lingui/core/macro";
import type { KeyboardEvent } from "react";
import type { PnrrView } from "@/schemas/pnrr";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  ShieldAlert,
  Map,
  Building2,
} from "lucide-react";

const TABS: {
  readonly id: PnrrView;
  readonly label: string;
  readonly icon: React.ElementType;
}[] = [
  { id: "overview", label: t`Overview`, icon: LayoutDashboard },
  { id: "projects", label: t`Projects`, icon: List },
  { id: "beneficiaries", label: t`Beneficiaries`, icon: Building2 },
  { id: "map", label: t`Map`, icon: Map },
  { id: "anomalies", label: t`Semnale de verificare`, icon: ShieldAlert },
];

export function PnrrTabNav({
  view,
  onChange,
  compact = false,
  className,
  idPrefix = "pnrr-tab",
}: {
  readonly view: PnrrView;
  readonly onChange: (view: PnrrView) => void;
  readonly compact?: boolean;
  readonly className?: string;
  readonly idPrefix?: string;
}) {
  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tabIndex: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : (tabIndex + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) %
            TABS.length;
    const nextTab = TABS[nextIndex];
    if (!nextTab) return;

    onChange(nextTab.id);
    event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelector<HTMLButtonElement>(`#${idPrefix}-${nextTab.id}`)
      ?.focus();
  };

  return (
    <nav
      className={cn(
        "flex min-w-0 items-end gap-1 overflow-x-auto overflow-y-hidden hide-scrollbar border-b-2 border-[var(--pnrr-border)]",
        className,
      )}
      role="tablist"
      aria-label={t`PNRR sections`}
    >
      {TABS.map((tab, tabIndex) => {
        const Icon = tab.icon;
        const isActive = view === tab.id;
        return (
          <button
            key={tab.id}
            id={`${idPrefix}-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={isActive ? `pnrr-panel-${tab.id}` : undefined}
            aria-label={tab.label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, tabIndex)}
            className={cn(
              "group relative flex items-center gap-2 whitespace-nowrap transition-colors",
              "select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)]/60",
              compact
                ? "px-2.5 py-2 text-[13px]"
                : "px-4 py-3.5 text-base sm:px-5",
            )}
          >
            <Icon
              className={cn(
                "shrink-0 transition-colors",
                compact ? "h-4 w-4" : "h-5 w-5",
                isActive
                  ? "text-[var(--pnrr-fg)]"
                  : "text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)]",
              )}
              strokeWidth={isActive ? 2.5 : 2}
              aria-hidden="true"
            />

            <span
              className={cn(
                "transition-colors",
                isActive
                  ? "font-extrabold text-[var(--pnrr-fg)]"
                  : "font-semibold text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)]",
                "hidden sm:inline",
              )}
            >
              {tab.label}
            </span>

            {/* Active indicator */}
            <span
              className={cn(
                "absolute bottom-[-2px] left-0 right-0 h-[5px] bg-[var(--pnrr-green)] transition-all duration-200",
                isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
              )}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </nav>
  );
}
