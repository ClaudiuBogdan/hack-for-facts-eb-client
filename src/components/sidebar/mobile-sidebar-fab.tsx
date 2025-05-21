import { MenuIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileSidebarFab() {
    const { setOpenMobile } = useSidebar();
    return (
        <div className="md:hidden fixed right-6 bottom-6 z-50">
            <Button
                onClick={() => setOpenMobile(true)}
                variant="default"
                size="icon"
                className="rounded-full shadow-lg w-14 h-14"
            >
                <MenuIcon className="w-6 h-6" />
            </Button>
        </div>
    )
}