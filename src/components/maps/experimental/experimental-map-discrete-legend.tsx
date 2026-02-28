interface ExperimentalMapDiscreteLegendEntry {
  groupId: string;
  label: string;
  color: string;
}

interface ExperimentalMapDiscreteLegendProps {
  title: string;
  entries: ExperimentalMapDiscreteLegendEntry[];
  showBinLabel: boolean;
}

export function ExperimentalMapDiscreteLegend({
  title,
  entries,
  showBinLabel,
}: Readonly<ExperimentalMapDiscreteLegendProps>) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="w-[300px] rounded-md border border-border bg-card/90 p-3 shadow-sm backdrop-blur-sm">
      <h4 className="mb-2 text-xs font-semibold">{title}</h4>
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div key={entry.groupId} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              {showBinLabel ? (
                <span className="truncate text-xs text-foreground">{entry.label}</span>
              ) : null}
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">{entry.groupId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
