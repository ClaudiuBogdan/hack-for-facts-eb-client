import { dynamicActivate } from "@/lib/i18n";
import { useLingui } from "@lingui/react/macro";
import { SegmentedChoice } from "@/components/sidebar/segmented-choice";
import { RailIndicator } from "@/components/sidebar/rail-indicator";
import { FlagGb, FlagRo } from "@/components/sidebar/flag-icons";
import { Analytics } from "@/lib/analytics";
import { getUserLocale, setUserLocale } from "@/lib/utils";
import { useNavigate, useLocation } from "@tanstack/react-router";

export function LanguageToggle() {
  const { t } = useLingui();
  const userLocale = getUserLocale();
  const navigate = useNavigate();
  const location = useLocation();

  async function setLocale(locale: "en" | "ro"): Promise<void> {
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : location.pathname;
    await dynamicActivate(locale, { pathname: currentPath });
    document.documentElement.setAttribute("lang", locale);
    setUserLocale(locale);
    Analytics.capture(Analytics.EVENTS.LanguageChanged, { locale });
    const hasLocalePrefix = /^\/(en|ro)(\/|$)/.test(currentPath);
    const nextPath = hasLocalePrefix
      ? currentPath.replace(/^\/(en|ro)/, `/${locale}`)
      : currentPath;
    // Hard reload required, as some components don't update the translation immediately
    navigate({
      to: nextPath,
      search: (prev: Record<string, unknown>) => ({ ...prev, lang: locale }),
      replace: true,
      reloadDocument: true,
    } as Parameters<typeof navigate>[0]);
  }

  return (
    <SegmentedChoice
      label={t`Limbă`}
      value={userLocale === "en" ? "en" : "ro"}
      onChange={(next) => void setLocale(next)}
      options={[
        { value: "ro", label: "RO", title: "Română", name: "Română" },
        { value: "en", label: "EN", title: "English", name: "English" },
      ]}
    />
  );
}

/** The collapsed rail's mark for the language in use: its flag. */
export function LanguageIndicator() {
  const { t } = useLingui();
  return getUserLocale() === "en"
    ? <RailIndicator icon={FlagGb} label={t`Limbă: English`} />
    : <RailIndicator icon={FlagRo} label={t`Limbă: română`} />;
}
