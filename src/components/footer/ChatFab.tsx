import { t } from "@lingui/core/macro";
import { MessageSquare } from "lucide-react";
import type { ReactElement } from "react";
import { clsx } from "clsx";
import { SupportMenu } from "./support-menu";

export function ChatFab(): ReactElement {
  return (
    <SupportMenu
      contentAlign="end"
      contentSideOffset={10}
      trigger={
        <button
          type="button"
          aria-label={t`Quick actions`}
          className={clsx(
            "fixed bottom-6 left-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full md:inline-flex md:bottom-[5rem] md:left-auto md:right-6",
            "bg-primary text-primary-foreground",
            "shadow-lg transition-transform hover:scale-105 hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      }
    />
  );
}
