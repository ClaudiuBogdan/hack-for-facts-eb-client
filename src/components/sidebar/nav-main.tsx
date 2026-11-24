import { Activity, BarChart2, Map, ListOrdered, Boxes, Landmark, Scale, Building2, Briefcase, Vote, HeartHandshake, FileStack, Gavel, House, Users } from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Trans } from "@lingui/react/macro";
import { isFeatureEnabled, type FeatureFlag } from "@/config/feature-flags";

type MainItemUrl =
  | "/"
  | "/map"
  | "/charts"
  | "/national-budget"
  | "/entity-analytics"
  | "/procurement"
  | "/pnrr"
  | "/companies"
  | "/public-enterprises"
  | "/legislation"
  | "/justice"
  | "/parlament"
  | "/alegeri"
  | "/ngos"
  | "/ins";

type NavItem = {
  readonly title: React.ReactNode;
  readonly url: MainItemUrl;
  readonly icon: typeof House;
  /** An area switched off in this build (`src/config/feature-flags.ts`) is not linked. */
  readonly feature?: FeatureFlag;
};

type NavGroup = {
  readonly key: string;
  readonly title: React.ReactNode;
  readonly items: readonly NavItem[];
};

const HOME: NavItem = { title: <Trans>Acasă</Trans>, url: "/", icon: House };

/**
 * The sidebar's own list (owner, 24 November 2026: `docs/design/sidebar/design.md`).
 * It starts as the landing's four groups (`landing-groups.ts`) but is kept
 * apart on purpose, so the two can be worded and ordered differently. A new
 * section goes in both.
 */
const GROUPS: readonly NavGroup[] = [
  {
    key: "bani",
    title: <Trans>Banii publici</Trans>,
    items: [
      { title: <Trans>Buget național</Trans>, url: "/national-budget", icon: Boxes },
      { title: <Trans>Achiziții publice</Trans>, url: "/procurement", icon: Landmark },
      { title: <Trans>PNRR</Trans>, url: "/pnrr", icon: FileStack },
    ],
  },
  {
    key: "institutii",
    title: <Trans>Instituții și organizații</Trans>,
    items: [
      { title: <Trans>Instituții publice</Trans>, url: "/entity-analytics", icon: ListOrdered },
      // Building2 stands for "Întreprinderi publice"; private companies need their own mark.
      { title: <Trans>Firme</Trans>, url: "/companies", icon: Briefcase },
      { title: <Trans>Întreprinderi publice</Trans>, url: "/public-enterprises", icon: Building2 },
      { title: <Trans>ONG-uri</Trans>, url: "/ngos", icon: HeartHandshake },
    ],
  },
  {
    key: "lege",
    title: <Trans>Lege, justiție și alegeri</Trans>,
    items: [
      { title: <Trans>Legislație</Trans>, url: "/legislation", icon: Scale },
      { title: <Trans>Justiție</Trans>, url: "/justice", icon: Gavel },
      { title: <Trans>Parlament</Trans>, url: "/parlament", icon: Users },
      { title: <Trans>Alegeri</Trans>, url: "/alegeri", icon: Vote, feature: "elections" },
    ],
  },
  {
    key: "instrumente",
    title: <Trans>Statistici și instrumente</Trans>,
    items: [
      { title: <Trans>Hartă</Trans>, url: "/map", icon: Map },
      { title: <Trans>Grafice</Trans>, url: "/charts", icon: BarChart2 },
      { title: <Trans>Statistici INS</Trans>, url: "/ins", icon: Activity },
    ],
  },
];

const isOffered = (item: NavItem) => item.feature === undefined || isFeatureEnabled(item.feature);

function isActivePath(currentPath: string, url: string) {
  if (url === "/") return currentPath === "/";
  return currentPath === url || currentPath.startsWith(`${url}/`);
}

export function NavMain() {
  const matches = useMatches();
  const currentPath = matches.length > 0 ? matches[matches.length - 1].pathname : "/";
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) {
      setOpenMobile(false);
      return;
    }
    // A link chosen from the keyboard would keep the opened rail over the
    // page; letting go of focus closes it. A pointer still over it keeps it open.
    event.currentTarget.blur();
  };

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActivePath(currentPath, item.url)}>
        <Link to={item.url} preload="intent" onClick={handleLinkClick}>
          <item.icon aria-hidden="true" />
          {/* Collapsed to its icon, the link keeps its name for screen readers. */}
          <span className={collapsed ? "sr-only" : undefined}>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <>
      <SidebarGroup className="pb-0">
        <SidebarMenu className="gap-0.5">{renderItem(HOME)}</SidebarMenu>
      </SidebarGroup>
      {GROUPS.map((group) => (
        <SidebarGroup key={group.key} className="py-0">
          {/* Collapsed, the heading keeps its height and shows as a rule, so
              the icons do not move when the sidebar opens under the pointer. */}
          <SidebarGroupLabel asChild className="relative h-6 group-data-[collapsible=icon]:opacity-100">
            <h2>
              <span className="truncate group-data-[collapsible=icon]:opacity-0">{group.title}</span>
              <span aria-hidden="true" className="absolute inset-x-2 top-1/2 hidden h-px bg-sidebar-border group-data-[collapsible=icon]:block" />
            </h2>
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">{group.items.filter(isOffered).map(renderItem)}</SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
