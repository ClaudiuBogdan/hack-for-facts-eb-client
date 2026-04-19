import { cn } from "@/lib/utils";

/** Underline-style tabs used on the entities hub and entity detail pages. */
export const campaignAdminEntityHubTabsListClassName = cn(
  "flex h-auto w-full items-end justify-start gap-1 rounded-none border-b border-border bg-transparent p-0",
  "text-muted-foreground",
);

export const campaignAdminEntityHubTabsTriggerClassName = cn(
  "relative -mb-px gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-normal shadow-none",
  "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  "focus-visible:ring-offset-0",
  "data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none",
  "dark:data-[state=active]:border-orange-400",
);
