import { ThemeProvider } from "@/components/theme/theme-provider";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Toaster } from "sonner";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { HotkeysProvider } from "react-hotkeys-hook";
import { MobileSidebarFab } from "@/components/sidebar/mobile-sidebar-fab";

const queryClient = new QueryClient();

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
