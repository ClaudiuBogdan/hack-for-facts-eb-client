import React from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ChevronsUpDown, Keyboard, LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { Trans, useLingui } from "@lingui/react/macro";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { createLogger } from "@/lib/logger";
import { AUTH_ACCOUNT_URL, useAuth, AuthSignInButton } from "@/lib/auth";
import { ThemeSwitcher } from "./theme-switcher";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";

const logger = createLogger({ context: "NavUser" });

type NavUserProps = {
  readonly user?: {
    readonly name?: string | null;
    readonly email?: string | null;
    readonly avatarUrl?: string | null;
  } | null;
};

export function NavUser(_props: NavUserProps) {
  const { t } = useLingui();
  const { isMobile, setIsOverlayLockedOpen, setOpenMobile } = useSidebar();
  const { user, isSignedIn, isLoaded, signOut } = useAuth();
  const [shortcutsModalOpen, setShortcutsModalOpen] = React.useState(false);

  const signedIn = isLoaded && isSignedIn && user != null;
  const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "";
  const displayName = !user ? t`Invitat` : fullName || t`Utilizator`;
  const initials = user
    ? `${(user.firstName?.[0] ?? "U").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`.slice(0, 2)
    : null;
  const email = user?.email ?? "";

  const handleUserMenuNavigate = React.useCallback(() => {
    // On a phone, close the sheet when the menu navigates.
    if (isMobile) {
      setOpenMobile(false);
    }
    // Also release the overlay lock the open menu holds.
    setIsOverlayLockedOpen(false);
  }, [isMobile, setOpenMobile, setIsOverlayLockedOpen]);

  const handleLogout = async () => {
    try {
      logger.info("Logout Triggered");
      await signOut();
    } catch (error) {
      logger.error("Logout Failed", { error: String(error) });
    }
  };

  // A guest has no picture or initials: a person mark stands in.
  const avatar = (
    <Avatar className="size-8 rounded-lg">
      <AvatarImage src={undefined} alt={displayName} />
      <AvatarFallback className="rounded-lg bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground">
        {initials ?? <UserRound className="size-4" aria-hidden="true" />}
      </AvatarFallback>
    </Avatar>
  );

  return (
    // Inset like the setting rows, so the avatar sits on the rail's icon line.
    <SidebarMenu className="px-2">
      <SidebarMenuItem>
        <DropdownMenu
          onOpenChange={(open) => {
            // Keep the sidebar open while its menu is.
            setIsOverlayLockedOpen(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              // Same size and no padding open or collapsed, so the avatar never moves.
              className="h-10 gap-2 px-0 group-data-[state=expanded]:px-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:h-10! group-data-[collapsible=icon]:w-8! group-data-[collapsible=icon]:p-0!"
              aria-label={t`Meniul contului`}
            >
              {avatar}
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{displayName}</span>
                {email && <span className="truncate text-xs text-sidebar-foreground/70">{email}</span>}
              </div>
              <ChevronsUpDown className="mr-2 ml-auto size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* Who is signed in; a guest needs no header repeating the button. */}
            {signedIn && (
              <>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    {avatar}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{displayName}</span>
                      {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              {signedIn ? (
                <DropdownMenuItem asChild>
                  <a href={AUTH_ACCOUNT_URL} onClick={handleUserMenuNavigate} rel="noreferrer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span><Trans>Cont</Trans></span>
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/settings/profile" onClick={handleUserMenuNavigate}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span><Trans>Setări</Trans></span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/settings/notifications" onClick={handleUserMenuNavigate}>
                  <Bell className="mr-2 h-4 w-4" />
                  <span><Trans>Notificări</Trans></span>
                </Link>
              </DropdownMenuItem>
              {!isMobile && (
                <DropdownMenuItem onClick={() => setShortcutsModalOpen(true)}>
                  <Keyboard className="mr-2 h-4 w-4" />
                  <span><Trans>Scurtături tastatură</Trans></span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeSwitcher />
            <DropdownMenuSeparator />
            {signedIn ? (
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span><Trans>Deconectare</Trans></span>
              </DropdownMenuItem>
            ) : (
              <AuthSignInButton>
                <DropdownMenuItem>
                  <LogIn className="mr-2 h-4 w-4" />
                  <span><Trans>Conectare</Trans></span>
                </DropdownMenuItem>
              </AuthSignInButton>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <ShortcutsModal open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen} />
    </SidebarMenu>
  );
}
