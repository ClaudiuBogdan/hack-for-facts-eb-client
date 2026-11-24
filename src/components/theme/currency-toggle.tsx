import { useLingui } from "@lingui/react/macro";
import { Banknote, DollarSign, Euro } from "lucide-react";
import { SegmentedChoice } from "@/components/sidebar/segmented-choice";
import { RailIndicator } from "@/components/sidebar/rail-indicator";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";
import { useSearch } from "@tanstack/react-router";
import { setPreferenceCookie, USER_CURRENCY_STORAGE_KEY } from "@/lib/user-preferences";
import type { Currency } from "@/schemas/charts";
import { parseCurrencyParam, resolveNormalizationSettings, type NormalizationInput } from "@/lib/globalSettings/params";

type CurrencyToggleProps = {
    readonly initialCurrency?: Currency;
};

/** The currency in effect (a URL override wins over the saved choice), and how to change it. */
function useCurrencyChoice(initialCurrency?: Currency) {
    const [userCurrency, setUserCurrency] = useUserCurrency(initialCurrency);
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

    return { selectedCurrency, applyCurrency };
}

export function CurrencyToggle({ initialCurrency }: CurrencyToggleProps) {
    const { t } = useLingui();
    const { selectedCurrency, applyCurrency } = useCurrencyChoice(initialCurrency);
    return (
        <SegmentedChoice
            label={t`Monedă`}
            value={selectedCurrency}
            onChange={applyCurrency}
            options={[
                { value: "RON", label: "RON", title: t`Lei` },
                { value: "EUR", label: "EUR", title: t`Euro` },
                { value: "USD", label: "USD", title: t`Dolari americani` },
            ]}
        />
    );
}

const CURRENCY_ICONS = { RON: Banknote, EUR: Euro, USD: DollarSign } as const satisfies Record<Currency, unknown>;

/** The collapsed rail's mark for the currency in effect. */
export function CurrencyIndicator({ initialCurrency }: CurrencyToggleProps) {
    const { t } = useLingui();
    const { selectedCurrency } = useCurrencyChoice(initialCurrency);
    return <RailIndicator icon={CURRENCY_ICONS[selectedCurrency]} label={t`Monedă: ${selectedCurrency}`} />;
}
