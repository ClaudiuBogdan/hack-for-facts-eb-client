import type { ComponentType } from "react";

type RailIndicatorProps = {
  readonly icon: ComponentType<{ readonly className?: string; readonly "aria-hidden"?: boolean }>;
  /** The setting and its value, read out and shown as a tooltip: „Monedă: euro”. */
  readonly label: string;
};

/**
 * The collapsed rail's mark for a setting's current value: one icon, no text.
 * Not a control: hover or keyboard focus opens the rail with the full row.
 */
export function RailIndicator({ icon: Icon, label }: RailIndicatorProps) {
  return (
    <div role="img" aria-label={label} title={label} className="flex size-8 items-center justify-center text-sidebar-foreground/70">
      <Icon className="size-4" aria-hidden />
    </div>
  );
}
