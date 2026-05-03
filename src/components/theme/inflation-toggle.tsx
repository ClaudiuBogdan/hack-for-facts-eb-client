import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";
import { Trans } from "@lingui/react/macro";
import { useUserInflationAdjusted } from "@/lib/hooks/useUserInflationAdjusted";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { setPreferenceCookie, USER_INFLATION_ADJUSTED_STORAGE_KEY } from "@/lib/user-preferences";
import { parseBooleanParam, resolveNormalizationSettings, type NormalizationInput } from "@/lib/globalSettings/params";

export function InflationToggle({
    initialInflationAdjusted,
}: {
    readonly initialInflationAdjusted?: boolean;
}) {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";
    const [userInflationAdjusted, setUserInflationAdjusted] =
        useUserInflationAdjusted(initialInflationAdjusted);
    const navigate = useNavigate();
    const search = useSearch({ strict: false });

    const normalizationRaw = (search as Record<string, unknown>).normalization as NormalizationInput | undefined;
    const { forcedOverrides } = normalizationRaw
        ? resolveNormalizationSettings(normalizationRaw)
        : { forcedOverrides: {} as ReturnType<typeof resolveNormalizationSettings>["forcedOverrides"] };

    const urlInflationAdjusted = parseBooleanParam((search as Record<string, unknown>).inflation_adjusted as string | boolean | undefined);
    const selectedInflationAdjusted = forcedOverrides.inflationAdjusted ?? urlInflationAdjusted ?? userInflationAdjusted;

    const applyInflationAdjusted = (next: boolean) => {
        if (typeof window !== "undefined") {
            try {
                window.localStorage.setItem(USER_INFLATION_ADJUSTED_STORAGE_KEY, JSON.stringify(next));
            } catch (e) {
                console.warn("Failed to write inflation preference to localStorage", e);
            }
        }
        setPreferenceCookie(USER_INFLATION_ADJUSTED_STORAGE_KEY, String(next));
        setUserInflationAdjusted(next);

        const nextInflationParam = forcedOverrides.inflationAdjusted !== undefined ? undefined : next;

        navigate({
            to: '.' as const,
            search: (prev: Record<string, unknown>) => {
                if (nextInflationParam === undefined) {
                    const { inflation_adjusted: _inflation_adjusted, ...rest } = prev ?? {};
                    return rest;
                }
                return { ...(prev ?? {}), inflation_adjusted: nextInflationParam };
            },
            replace: true,
            resetScroll: false,
        } as Parameters<typeof navigate>[0]);
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>
                <Trans>Prices</Trans>
            </SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild onClick={() => applyInflationAdjusted(false)}>
                        <Button
                            variant={selectedInflationAdjusted ? "ghost" : "secondary"}
                            size="icon"
                            className="w-full justify-start gap-2"
                        >
                            <span className="text-md">N</span>
                            {!collapsed && <span className="flex-1 text-left"><Trans>Nominal</Trans></span>}
                        </Button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild onClick={() => applyInflationAdjusted(true)}>
                        <Button
                            variant={selectedInflationAdjusted ? "secondary" : "ghost"}
                            size="icon"
                            className="w-full justify-start gap-2"
                        >
                            <span className="text-md">R</span>
                            {!collapsed && <span className="flex-1 text-left"><Trans>Real (2024)</Trans></span>}
                        </Button>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}
