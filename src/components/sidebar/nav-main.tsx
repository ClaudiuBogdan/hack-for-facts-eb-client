import { Activity, LayoutDashboard, BarChart2, Map, ListOrdered, Boxes, Landmark, Scale, Building2, Briefcase, Vote, HeartHandshake } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button-variants";
import { isPublicEnterpriseMockEnabled } from "@/features/public-enterprises/lib/mock-mode";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Trans } from "@lingui/react/macro";

type MainItemUrl =
  | "/"
  | "/map"
  | "/charts"
  | "/budget-explorer"
  | "/entity-analytics"
  | "/procurement"
  | "/companies"
  | "/legislation"
  | "/intreprinderi-publice"
  | "/alegeri"
  | "/ong-uri"
  | "/statistici";

const mainItems: ReadonlyArray<{
  title: React.ReactNode;
  url: MainItemUrl;
  icon: typeof LayoutDashboard;
}> = [
  {
    title: <Trans>Dashboard</Trans>,
    url: "/",
    icon: LayoutDashboard,
  },
  // {
  //   title: "Anomalies",
  //   url: "/anomalies",
  //   icon: AlertTriangle,
  // },
  {
    title: <Trans>Map</Trans>,
    url: "/map",
    icon: Map,
  },
  {
    title: <Trans>Charts</Trans>,
    url: "/charts",
    icon: BarChart2,
  },
  {
    title: <Trans>National Budget</Trans>,
    url: "/budget-explorer",
    icon: Boxes,
  },
  {
    title: <Trans>ONG-uri</Trans>,
    url: "/ong-uri",
    icon: HeartHandshake,
  },
  {
    title: <Trans>Entity Analytics</Trans>,
    url: "/entity-analytics",
    icon: ListOrdered,
  },
  {
    title: <Trans>Achiziții publice</Trans>,
    url: "/procurement",
    icon: Landmark,
  },
  {
    // Building2 already stands for "Întreprinderi publice"; private companies
    // need their own mark.
    title: <Trans>Firme</Trans>,
    url: "/companies",
    icon: Briefcase,
  },
  {
    title: <Trans>Legislație</Trans>,
    url: "/legislation",
    icon: Scale,
  },
  ...(isPublicEnterpriseMockEnabled()
    ? [
        {
          title: <Trans>Întreprinderi publice</Trans>,
          url: "/intreprinderi-publice" as const,
          icon: Building2,
        },
      ]
    : []),
  {
    title: <Trans>Alegeri</Trans>,
    url: "/alegeri",
    icon: Vote,
  },
  {
    title: <Trans>Statistici</Trans>,
    url: "/statistici",
    icon: Activity,
  },
];

export function NavMain() {
  const matches = useMatches();
  const currentPath =
    matches.length > 0 ? matches[matches.length - 1].pathname : "/";
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (url: string) => {
    if (url === "/") {
      return currentPath === "/";
    }
    return currentPath === url || currentPath.startsWith(`${url}/`);
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    // Note: Scroll-to-top is now handled automatically by router scroll restoration
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 py-2">
        <SidebarGroup>
          <SidebarMenu>
            {mainItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild>
                  <Link
                    to={item.url}
                    preload="intent"
                    onClick={handleLinkClick}
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "w-full justify-start gap-2",
                      isActive(item.url) && "bg-muted font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="flex-1">{item.title}</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </div>
    </div>
  );
}
