import { Trans } from "@lingui/react/macro";
import { Building2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type PnrrEntityShortcutLinksProps = {
  readonly cui: string | null | undefined;
  readonly entityLabel?: string;
  readonly className?: string;
  readonly compact?: boolean;
};

const ENTITY_SHORTCUTS = [
  {
    label: "Transparenta.eu",
    href: (cui: string) => `https://transparenta.eu/entities/${cui}`,
  },
  {
    label: "Sicap.ai",
    href: (cui: string) =>
      `https://sicap.ai/autoritate/${cui}?utm_source=transparenta.eu`,
  },
  {
    label: "DemoAnaf",
    href: (cui: string) => `https://demoanaf.ro/verificare-cui/${cui}`,
  },
] as const;

function normalizeEntityCui(cui: string | null | undefined): string | null {
  const digits = String(cui ?? "").replace(/\D/g, "");
  return /^[0-9]{2,10}$/.test(digits) ? digits : null;
}

export function PnrrEntityShortcutLinks({
  cui,
  entityLabel,
  className,
  compact = false,
}: PnrrEntityShortcutLinksProps) {
  const normalizedCui = normalizeEntityCui(cui);
  if (!normalizedCui) return null;

  return (
    <div
      className={cn(
        "border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)]",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--pnrr-muted)]">
        <Trans>Check entity</Trans>
      </p>
      {entityLabel && (
        <p className="mb-3 text-sm font-black uppercase leading-snug text-[var(--pnrr-fg)]">
          {entityLabel} · CUI {normalizedCui}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href={`/pnrr/organizatii/${encodeURIComponent(normalizedCui)}`}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "inline-flex items-center justify-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-fg)] font-black text-[var(--pnrr-bg)] transition-colors hover:bg-[var(--pnrr-card)] hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]",
            compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
          )}
        >
          <Trans>View PNRR profile</Trans>
          <Building2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </a>
        {ENTITY_SHORTCUTS.map((shortcut) => (
          <a
            key={shortcut.label}
            href={shortcut.href(encodeURIComponent(normalizedCui))}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "inline-flex items-center justify-center gap-2 border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-bg)] font-black text-[var(--pnrr-fg)] transition-colors hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]",
              compact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm",
            )}
          >
            {shortcut.label}
            <ExternalLink className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </a>
        ))}
      </div>
    </div>
  );
}
