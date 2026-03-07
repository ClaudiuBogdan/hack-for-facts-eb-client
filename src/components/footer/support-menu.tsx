import type { ComponentProps, ReactElement } from "react";
import { t } from "@lingui/core/macro";
import {
  Copy,
  LifeBuoy,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SendErrorAction } from "@/components/sentry/SendErrorAction";
import { SendFeedbackAction } from "@/components/sentry/SendFeedbackAction";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "contact@transparenta.eu";
const TOAST_CONFIG = { duration: 1000 };

type SupportMenuProps = {
  readonly trigger: ReactElement;
  readonly contentAlign?: ComponentProps<typeof DropdownMenuContent>["align"];
  readonly contentSide?: ComponentProps<typeof DropdownMenuContent>["side"];
  readonly contentSideOffset?: number;
  readonly contentClassName?: string;
};

const openMailClient = () => {
  const subject = encodeURIComponent(t`Transparenta.eu – Support`);
  const body = encodeURIComponent(
    t`Hello,\n\nI need help with: \n\nPage: ${typeof window !== "undefined" ? window.location.href : "N/A"}`
  );

  window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
};

const copyEmailAddress = async () => {
  try {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    toast.success(t`Email address copied to clipboard!`, TOAST_CONFIG);
  } catch (error) {
    console.error("Failed to copy email:", error);
    toast.error(t`Failed to copy email address.`, TOAST_CONFIG);
  }
};

export function SupportMenu({
  trigger,
  contentAlign = "end",
  contentSide,
  contentSideOffset = 10,
  contentClassName,
}: SupportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={contentAlign}
        side={contentSide}
        sideOffset={contentSideOffset}
        className={cn("w-64 py-2", contentClassName)}
      >
        <DropdownMenuLabel className="flex items-center gap-2 font-semibold">
          <LifeBuoy className="h-5 w-5" />
          {t`Need help?`}
        </DropdownMenuLabel>
        <p className="px-2 pb-2 text-sm text-muted-foreground">
          {t`Find resources, report issues, or get in touch.`}
        </p>
        <DropdownMenuGroup>
          <SendFeedbackAction />
          <SendErrorAction />
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={openMailClient}
            className="flex cursor-pointer items-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>{t`Contact Support`}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void copyEmailAddress();
            }}
            className="flex cursor-pointer items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            <span>{t`Copy Support Email`}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
