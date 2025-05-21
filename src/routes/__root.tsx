import { ThemeProvider } from "@/components/theme/theme-provider";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Toaster } from "sonner";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { HotkeysProvider } from "react-hotkeys-hook";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileSidebarFab } from "@/components/sidebar/mobile-sidebar-fab";

const queryClient = new QueryClient();

// Create route guards

// New component for mobile header
const MobileHeader = () => {
  const { isMobile } = useSidebar();

  if (!isMobile) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
      <span className="text-lg font-semibold">App</span> {/* Placeholder App Name, moved to the left */}
      <SidebarTrigger className="h-8 w-8" /> {/* Ensured size and clarity */}
    </div>
  );
};

export const Route = createRootRoute({
  component: () => (
    <ErrorProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <HotkeysProvider>
            <SidebarProvider>
              <div className="flex min-h-screen min-w-screen overflow-auto">
                <AppSidebar />
                <SidebarInset>
                  <main className="flex-1 overflow-y-auto">
                    <div>
                      <Outlet />
                      <Toaster />
                    </div>
                  </main>
                  <MobileSidebarFab />
                </SidebarInset>
              </div>
            </SidebarProvider>
          </HotkeysProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorProvider>
  ),
  beforeLoad: async () => { },
});
