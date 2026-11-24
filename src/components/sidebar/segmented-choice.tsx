import { cn } from "@/lib/utils";

type Option<T extends string> = {
  readonly value: T;
  readonly label: React.ReactNode;
  /** The full name, when the label is an abbreviation: a tooltip. */
  readonly title?: string;
  /** The name read out, when the label alone is too short to say it. */
  readonly name?: string;
};

type SegmentedChoiceProps<T extends string> = {
  readonly label: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
};

/** A row of buttons, one pressed: the sidebar's compact settings. 32px tall, 40px on a phone. */
export function SegmentedChoice<T extends string>({ label, options, value, onChange, className }: SegmentedChoiceProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-md border border-sidebar-border p-0.5", className)}>
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-label={option.name}
            aria-pressed={pressed}
            onClick={() => {
              if (!pressed) onChange(option.value);
            }}
            className={cn(
              "h-8 flex-1 rounded-sm px-2 text-xs font-medium max-md:h-10 max-md:text-sm text-sidebar-foreground/70 outline-hidden ring-sidebar-ring transition-colors hover:text-sidebar-foreground focus-visible:ring-2",
              pressed && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
