import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";
import { Trans } from "@lingui/react/macro";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";
import { useSearch } from "@tanstack/react-router";
import { setPreferenceCookie, USER_CURRENCY_STORAGE_KEY } from "@/lib/user-preferences";
import type { Currency } from "@/schemas/charts";
import { parseCurrencyParam, resolveNormalizationSettings, type NormalizationInput } from "@/lib/globalSettings/params";

export function CurrencyToggle() {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    const [userCurrency, setUserCurrency] = useUserCurrency();
    const search = useSearch({ strict: false });

    const normalizationRaw = (search as Record<string, unknown>).normalization as NormalizationInput | undefined;
    const { forcedOverrides } = normalizationRaw
        ? resolveNormalizationSettings(normalizationRaw)
        : { forcedOverrides: {} as ReturnType<typeof resolveNormalizationSettings>["forcedOverrides"] };

    const urlCurrency = parseCurrencyParam((search as Record<string, unknown>).currency as string | undefined);
    const selectedCurrency = forcedOverrides.currency ?? urlCurrency ?? userCurrency;

    const applyCurrency = (next: Currency) => {
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(USER_CURRENCY_STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn("Failed to write currency to localStorage", e);
            }
        }
        setPreferenceCookie(USER_CURRENCY_STORAGE_KEY, next);
        setUserCurrency(next);

        const nextCurrencyParam = forcedOverrides.currency !== undefined ? undefined : next;

        if (typeof window === "undefined") return;

        const nextUrl = new URL(window.location.href);
        if (nextCurrencyParam === undefined) {
            nextUrl.searchParams.delete("currency");
        } else {
            nextUrl.searchParams.set("currency", nextCurrencyParam);
        }

        // Force a full reload so route loaders and persisted hooks pick up the new currency consistently.
        window.location.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel >
                <Trans>Currency</Trans>
            </SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild onClick={() => applyCurrency("RON")}>
                        <Button variant={selectedCurrency === 'RON' ? "secondary" : "ghost"} size="icon" className="w-full justify-start gap-2">
                            <span className="text-md">🇷🇴</span>
                            {!collapsed && <span className="flex-1 text-left"><Trans>RON</Trans></span>}
                        </Button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild onClick={() => applyCurrency("EUR")}>
                        <Button variant={selectedCurrency === 'EUR' ? "secondary" : "ghost"} size="icon" className="w-full justify-start gap-2">
                            <span className="text-md">🇪🇺</span>
                            {!collapsed && <span className="flex-1 text-left"><Trans>EUR</Trans></span>}
                        </Button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild onClick={() => applyCurrency("USD")}>
                        <Button variant={selectedCurrency === 'USD' ? "secondary" : "ghost"} size="icon" className="w-full justify-start gap-2">
                            <span className="text-md">🇺🇸</span>
                            {!collapsed && <span className="flex-1 text-left"><Trans>USD</Trans></span>}
                        </Button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}
