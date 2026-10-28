import { FC } from "react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo/logo-mark.webp";

const Logo: FC = () => {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center">
          <SidebarMenuButton
            size={"default"}
            className="h-8 w-full overflow-hidden"
            onClick={() => setOpenMobile(false)}
            asChild
          >
            <Link to="/" className="flex w-full items-center gap-2">
              <img src={logo} alt="Transparenta.eu" className="h-4 w-4 text-black dark:text-white" />
              <span
                className="font-semibold text-lg whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0"
              >
                Transparenta.eu
              </span>
            </Link>
          </SidebarMenuButton>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default Logo;
