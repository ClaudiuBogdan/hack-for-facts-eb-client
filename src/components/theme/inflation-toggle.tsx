import { useLingui } from "@lingui/react/macro";
import { ShoppingBasket, Tag } from "lucide-react";
import { SegmentedChoice } from "@/components/sidebar/segmented-choice";
import { RailIndicator } from "@/components/sidebar/rail-indicator";
import { useUserInflationAdjusted } from "@/lib/hooks/useUserInflationAdjusted";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { setPreferenceCookie, USER_INFLATION_ADJUSTED_STORAGE_KEY } from "@/lib/user-preferences";
import { parseBooleanParam, resolveNormalizationSettings, type NormalizationInput } from "@/lib/globalSettings/params";

type InflationToggleProps = {
    readonly initialInflationAdjusted?: boolean;
};

/** Whether prices are adjusted for inflation (a URL override wins), and how to change it. */
function useInflationChoice(initialInflationAdjusted?: boolean) {
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

    return { selectedInflationAdjusted, applyInflationAdjusted };
}

export function InflationToggle({ initialInflationAdjusted }: InflationToggleProps) {
    const { t } = useLingui();
    const { selectedInflationAdjusted, applyInflationAdjusted } = useInflationChoice(initialInflationAdjusted);
    return (
        <SegmentedChoice
            label={t`Prețuri`}
            value={selectedInflationAdjusted ? "real" : "nominal"}
            onChange={(next) => applyInflationAdjusted(next === "real")}
            options={[
                { value: "nominal", label: t`Nominal`, title: t`Prețuri curente` },
                { value: "real", label: t`Real`, title: t`Ajustat cu inflația` },
            ]}
        />
    );
}

/** The collapsed rail's mark for the prices in effect: a price tag, or a basket for what the money buys. */
export function InflationIndicator({ initialInflationAdjusted }: InflationToggleProps) {
    const { t } = useLingui();
    const { selectedInflationAdjusted } = useInflationChoice(initialInflationAdjusted);
    return selectedInflationAdjusted
        ? <RailIndicator icon={ShoppingBasket} label={t`Prețuri: ajustate cu inflația`} />
        : <RailIndicator icon={Tag} label={t`Prețuri: curente`} />;
}
