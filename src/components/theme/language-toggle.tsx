import { Button } from "@/components/ui/button";
import { dynamicActivate } from "@/lib/i18n";
import { Trans } from "@lingui/react/macro";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";
import { Analytics } from "@/lib/analytics";
import { getUserLocale, setUserLocale } from "@/lib/utils";
import { NavigateOptions, useNavigate, useLocation } from "@tanstack/react-router";

export function LanguageToggle() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
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
      to: nextPath as any,
      search: (prev: any) => ({ ...prev, lang: locale }),
      replace: true,
      reloadDocument: true,
    } as NavigateOptions<any>);
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Trans>Language</Trans>
      </SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild onClick={() => setLocale("en")}>
            <Button
              variant={userLocale === "en" ? "secondary" : "ghost"}
              size="icon"
              className="w-full justify-start gap-2"
            >
              <span className="text-md">🇬🇧</span>
              {!collapsed ? (
                <span className="flex-1">
                  <Trans>English</Trans>
                </span>
              ) : null}
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild onClick={() => setLocale("ro")}>
            <Button
              variant={userLocale === "ro" ? "secondary" : "ghost"}
              size="icon"
              className="w-full justify-start gap-2"
            >
              <span className="text-md">🇷🇴</span>
              {!collapsed ? (
                <span className="flex-1">
                  <Trans>Romanian</Trans>
                </span>
              ) : null}
            </Button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
