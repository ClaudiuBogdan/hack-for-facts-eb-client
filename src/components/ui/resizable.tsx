import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";
import React from "react";
import { GripVertical } from "lucide-react";

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
);

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.Panel>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.Panel>
>(({ className, ...props }, ref) => (
  <ResizablePrimitive.Panel
    ref={ref}
    className={cn("min-w-[200px] min-h-[200px]", className)}
    {...props}
  />
));
ResizablePanel.displayName = "ResizablePanel";

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    hitAreaMargins={{ coarse: 2, fine: 1 }}
    className={cn(
      "group/handle relative flex items-center justify-center",
      // Base styles
      "bg-gray-500 dark:bg-border transition-all z-10",
      "w-[3px]",
      "data-[panel-group-direction=vertical]:h-[3px] data-[panel-group-direction=vertical]:w-full",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div
        className={cn(
          "opacity-0 group-hover/handle:opacity-100 transition-opacity absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
      >
        <GripVertical className="h-3 w-3 z-100 text-foreground bg-gray-300 dark:bg-gray-700 rounded-sm" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
