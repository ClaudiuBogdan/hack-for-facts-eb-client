import React from "react";
import { useLocation } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import Logo from "./logo";
import { NavMain } from "./nav-main";
import { LanguageIndicator, LanguageToggle } from "@/components/theme/language-toggle";
import { CurrencyIndicator, CurrencyToggle } from "@/components/theme/currency-toggle";
import { InflationIndicator, InflationToggle } from "@/components/theme/inflation-toggle";
import { NavUser } from "./nav-user";
import { displaySettingsFor } from "./display-settings";
import type { Currency } from "@/schemas/charts";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  readonly initialCurrency?: Currency;
  readonly initialInflationAdjusted?: boolean;
};

/**
 * One setting: its current value as an icon, where the collapsed rail shows
 * it, then the label and the buttons. Collapsed, only the icon shows; opening
 * keeps it in place and fades the rest in, as the navigation labels appear.
 */
function SettingRow({ mark, label, children }: { readonly mark: React.ReactNode; readonly label: React.ReactNode; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {mark}
      <div className="flex min-w-0 flex-1 items-center gap-2 transition-opacity delay-100 duration-150 motion-reduce:transition-none group-data-[collapsible=icon]:invisible group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:delay-0">
        <span className="w-14 shrink-0 text-xs text-sidebar-foreground/70">{label}</span>
        {/* The buttons take the rest of the row, so every row lines up. */}
        <div className="flex min-w-0 flex-1 *:flex-1">{children}</div>
      </div>
    </div>
  );
}

export function AppSidebar({
  initialCurrency,
  initialInflationAdjusted,
  ...props
}: AppSidebarProps) {
  // The route is known on the server, so the first render already offers the right settings.
  const pathname = useLocation({ select: (location) => location.pathname });
  const settings = displaySettingsFor(pathname);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      {/* The settings keep the sidebar's full width while the rail widens;
          the footer clips them instead of letting them squeeze. */}
      <SidebarFooter className="overflow-hidden border-t border-sidebar-border">
        <div data-testid="display-settings" className="flex w-(--sidebar-width) shrink-0 flex-col gap-1.5 px-2 pt-1">
          {settings.currency && (
            <SettingRow mark={<CurrencyIndicator initialCurrency={initialCurrency} />} label={<Trans>Monedă</Trans>}>
              <CurrencyToggle initialCurrency={initialCurrency} />
            </SettingRow>
          )}
          {settings.inflation && (
            <SettingRow mark={<InflationIndicator initialInflationAdjusted={initialInflationAdjusted} />} label={<Trans>Prețuri</Trans>}>
              <InflationToggle initialInflationAdjusted={initialInflationAdjusted} />
            </SettingRow>
          )}
          <SettingRow mark={<LanguageIndicator />} label={<Trans>Limbă</Trans>}>
            <LanguageToggle />
          </SettingRow>
        </div>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
